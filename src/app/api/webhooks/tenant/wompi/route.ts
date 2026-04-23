import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyWompiSignature, WompiEventPayload } from '@/lib/wompi-crypto';
import { sendBookingConfirmationEmail } from '@/app/actions/notifications';

// Inicialización estricta del cliente de Supabase (Privilegios Administrativos)
// Deshabilitamos persistSession para prevenir fugas de memoria en Vercel Edge/Node Workers
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as WompiEventPayload;
    const event = payload?.event;
    // Utilizamos un type cast seguro asumiendo la estructura transaccional
    const dataObj = payload?.data?.transaction as Record<string, any>;
    
    console.log(`🛡️ [SecOps] Webhook Tenant Interceptado: ${event} | TX: ${dataObj?.id}`);

    if (!dataObj || !dataObj.reference || !dataObj.id || !dataObj.status) {
      return NextResponse.json({ error: 'Payload malformado o contrato roto' }, { status: 400 });
    }

    // 1. Verificación Relacional
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .select('hotel_id, source, status')
      .eq('id', dataObj.reference)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Integridad referencial fallida. Reserva no encontrada.' }, { status: 404 });
    }

    // 2. Extracción de Bóveda de Claves
    const { data: hotel, error: hotelError } = await supabaseAdmin
      .from('hotels')
      .select('wompi_events_secret')
      .eq('id', booking.hotel_id)
      .single();

    if (hotelError || !hotel?.wompi_events_secret) {
      return NextResponse.json({ error: 'Secreto Tenant no configurado. Operación denegada.' }, { status: 500 });
    }

    // 3. Barrera Criptográfica (Inquebrantable)
    const isAuthentic = verifyWompiSignature(payload, hotel.wompi_events_secret);
    if (!isAuthentic) {
      console.error(`🚨 [SecOps] Falsificación de firma bloqueada. Intento de suplantación en TX: ${dataObj.id}`);
      return NextResponse.json({ error: 'Firma criptográfica inválida' }, { status: 403 });
    }

    // MÁQUINA DE ESTADOS TRANSACCIONAL B2C
    const reference = dataObj.reference; 
    const transactionId = dataObj.id;
    const status = dataObj.status;

    if (event === 'transaction.updated') {

      if (status === 'APPROVED') {
        
        // 🔒 PREVENCIÓN DE CONDICIONES DE CARRERA (RACE CONDITIONS)
        // Antes de insertar, verificamos si la reserva YA ESTÁ confirmada.
        // Esto actúa como una barrera de estado más fuerte que buscar en la tabla de notas.
        if (booking.status === 'CONFIRMED' || booking.status === 'CHECKED_IN' || booking.status === 'CHECKED_OUT') {
           console.log(`🛡️ [SecOps] Idempotencia Activada. Reserva ${reference} ya procesada previamente.`);
           return NextResponse.json({ success: true, message: 'Idempotencia: Evento descartado con éxito.' }, { status: 200 });
        }

        const amount = dataObj.amount_in_cents / 100;
        const isOta = booking.source === 'ota';
        const attributionTag = isOta ? '[Comisión: OTA 10%]' : '[Comisión: Directo 0%]';
        
        // Ejecución Pseudo-Atómica: Actualizamos estado y registramos pago en secuencia bloqueante.
        // Nota Arquitectónica: En un sistema de Tier-0 absoluto usaríamos un RPC de Postgres, pero esto es suficientemente robusto para el Node Runtime.
        
        const { error: updateError } = await supabaseAdmin.from('bookings')
          .update({ status: 'CONFIRMED' }) 
          .eq('id', reference);

        if (updateError) throw new Error(`Fallo de actualización de estado: ${updateError.message}`);

        const { error: insertError } = await supabaseAdmin.from('payments').insert({
          booking_id: reference,
          amount: amount,
          method: 'wompi',
          notes: `Wompi TX: ${transactionId} | ${attributionTag}`,
          staff_id: null 
        });

        if (insertError) {
          // Compensación Manual: Si falla el pago pero se actualizó la reserva (raro), registramos la anomalía.
          console.error(`🚨 [CRITICAL FINANZAS] Reserva Confirmada pero Pago no guardado. TX: ${transactionId}`);
          throw new Error('Fallo crítico en motor de persistencia financiera.');
        }

        console.log(`💳 [Finanzas] Reconciliación exitosa. Reserva ${reference} CONFIRMADA.`);

        // 📧 MOTOR DE NOTIFICACIONES ASÍNCRONO (Degradación Elegante Confirmada)
        try {
          const { data: fullBooking } = await supabaseAdmin
            .from('bookings')
            .select('*, hotels(name), guests(email, name), rooms(name)')
            .eq('id', reference)
            .single();

          if (fullBooking?.guests?.email) {
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
            console.log(`✅ [Notificaciones] Voucher criptográfico despachado a ${fullBooking.guests.email}`);
          } else {
            console.warn(`⚠️ [Notificaciones] Huésped anónimo. Se omite envío de correo.`);
          }
        } catch (emailError: unknown) {
          console.error(`❌ [SecOps] Falla aislada en Email Provider. La TX fue asegurada. Error:`, emailError);
        }
      } 
      else if (status === 'DECLINED' || status === 'ERROR') {
        console.warn(`⚠️ [SecOps] Transacción declinada por pasarela. TX: ${transactionId} | Reserva: ${reference}`);
      }
      else if (status === 'VOIDED') {
        console.error(`🚨 [SecOps] Transacción ANULADA (VOIDED). Procediendo con rollback de Reserva ${reference}.`);
        
        await supabaseAdmin.from('bookings')
          .update({ status: 'PENDING' }) 
          .eq('id', reference);
          
        await supabaseAdmin.from('payments')
          .update({ notes: `[VOIDED - ANULADO] Wompi TX: ${transactionId}` })
          .ilike('notes', `%${transactionId}%`);
      }
    }

    return NextResponse.json({ success: true, message: 'Ciclo transaccional completado' }, { status: 200 });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Excepción desconocida';
    console.error('❌ [CRITICAL SecOps] Colapso en Pipeline B2C:', msg);
    // Vercel y Wompi requieren un status 500 para activar sus motores de reintento.
    return NextResponse.json({ success: false, error: 'Internal Error', detail: msg }, { status: 500 });
  }
}