import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyWompiSignature } from '@/lib/wompi-crypto';
import { sendBookingConfirmationEmail } from '@/app/actions/notifications';

// Inicialización estricta del cliente de Supabase (Privilegios Administrativos)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const event = payload?.event;
    const dataObj = payload?.data?.transaction;
    
    console.log(`🛡️ [SecOps] Webhook Tenant Interceptado: ${event} | TX: ${dataObj?.id}`);

    if (!dataObj || !dataObj.reference || !dataObj.id || !dataObj.status) {
      return NextResponse.json({ error: 'Payload malformado' }, { status: 400 });
    }

    const { data: booking } = await supabaseAdmin
      .from('bookings')
      .select('hotel_id, source')
      .eq('id', dataObj.reference)
      .single();

    if (!booking) return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 });

    const { data: hotel } = await supabaseAdmin
      .from('hotels')
      .select('wompi_events_secret')
      .eq('id', booking.hotel_id)
      .single();

    if (!hotel?.wompi_events_secret) {
      return NextResponse.json({ error: 'Secreto Tenant no configurado' }, { status: 500 });
    }

    const isAuthentic = verifyWompiSignature(payload, hotel.wompi_events_secret);
    if (!isAuthentic) {
      console.error('🚨 [SecOps] Falsificación de firma bloqueada. Ataque detectado.');
      return NextResponse.json({ error: 'Firma inválida' }, { status: 403 });
    }

    // MÁQUINA DE ESTADOS TRANSACCIONAL B2C
    const reference = dataObj.reference; 
    const transactionId = dataObj.id;
    const status = dataObj.status;

    if (event === 'transaction.updated') {

      if (status === 'APPROVED') {
        const { data: existingPayment } = await supabaseAdmin
          .from('payments')
          .select('id')
          .ilike('notes', `%${transactionId}%`)
          .maybeSingle();

        if (existingPayment) {
          return NextResponse.json({ success: true, message: 'Pago duplicado ignorado' }, { status: 200 });
        }

        const amount = dataObj.amount_in_cents / 100;
        const isOta = booking.source === 'ota';
        const attributionTag = isOta ? '[Comisión: OTA 10%]' : '[Comisión: Directo 0%]';
        
        await supabaseAdmin.from('payments').insert({
          booking_id: reference,
          amount: amount,
          method: 'wompi',
          notes: `Wompi TX: ${transactionId} | ${attributionTag}`,
          staff_id: null 
        });

        await supabaseAdmin.from('bookings')
          .update({ status: 'CONFIRMED' }) 
          .eq('id', reference);

        console.log(`💳 [Finanzas] Pago reconciliado. Reserva ${reference} CONFIRMADA.`);

        // 📧 MOTOR DE NOTIFICACIONES ASÍNCRONO
        try {
          console.log(`📨 [Notificaciones] Preparando Voucher para TX: ${transactionId}`);
          const { data: fullBooking } = await supabaseAdmin
            .from('bookings')
            .select('*, hotels(name), guests(email, name), rooms(name)')
            .eq('id', reference)
            .single();

          if (fullBooking?.guests?.email) {
            // Usamos await para que Serverless no mate el hilo, pero dentro de un try/catch seguro.
            await sendBookingConfirmationEmail({
              guestEmail: fullBooking.guests.email,
              guestName: fullBooking.guests.name,
              hotelName: fullBooking.hotels.name,
              checkIn: fullBooking.check_in,
              checkOut: fullBooking.check_out,
              roomName: fullBooking.rooms.name,
              bookingId: reference,
              amount: amount
            });
            console.log(`✅ [Notificaciones] Voucher despachado a ${fullBooking.guests.email}`);
          } else {
            console.warn(`⚠️ [Notificaciones] Huésped sin email. Se omite envío de correo.`);
          }
        } catch (emailError) {
          // Degradación Elegante: Si falla el correo, tragamos el error para no romper la respuesta 200 de Wompi.
          console.error(`❌ [SecOps] Falla en proveedor de email. Pago asegurado, pero email falló:`, emailError);
        }
      } 
      else if (status === 'DECLINED' || status === 'ERROR') {
        console.warn(`⚠️ [SecOps] Transacción rechazada/error. TX: ${transactionId} | Booking: ${reference}`);
      }
      else if (status === 'VOIDED') {
        console.error(`🚨 [SecOps] Transacción ANULADA (VOIDED) por el banco. Revirtiendo Reserva ${reference}.`);
        
        await supabaseAdmin.from('bookings')
          .update({ status: 'PENDING' }) 
          .eq('id', reference);
          
        await supabaseAdmin.from('payments')
          .update({ notes: `[VOIDED - ANULADO] Wompi TX: ${transactionId}` })
          .ilike('notes', `%${transactionId}%`);
      }
    }

    return NextResponse.json({ success: true, message: 'Procesado' }, { status: 200 });

  } catch (error: any) {
    console.error('❌ [SecOps] Falla en Pipeline B2C:', error.message);
    return NextResponse.json({ success: false, error: 'Internal Error' }, { status: 500 });
  }
}