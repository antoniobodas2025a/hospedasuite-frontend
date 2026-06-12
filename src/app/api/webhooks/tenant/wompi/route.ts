export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { Client } from '@upstash/qstash';
import { verifyWompiSignature, WompiEventPayload } from '@/lib/wompi-crypto';
import { supabaseAdmin } from '@/lib/supabase-admin';

const qstashClient = new Client({ token: process.env.QSTASH_TOKEN! });

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as WompiEventPayload;
    const event = payload?.event;
    const dataObj = payload?.data?.transaction;
    
    // 1. VALIDACIÓN DE CONTRATO (Fail-Fast)
    if (!dataObj?.reference || !dataObj?.id || !dataObj?.status) {
      return NextResponse.json({ error: 'Payload malformado' }, { status: 400 });
    }

    console.log(`🛡️ [SecOps] Webhook Interceptado: ${event} | Status: ${dataObj.status} | TX: ${dataObj.id}`);

    // 2. VERIFICACIÓN DE INTEGRIDAD REFERENCIAL
    const { data: booking, error: bookingErr } = await supabaseAdmin
      .from('bookings')
      .select('id, hotel_id, source, status, total_price')
      .eq('id', dataObj.reference)
      .single();

    if (bookingErr || !booking) {
      return NextResponse.json({ error: 'Referencia de reserva inexistente' }, { status: 404 });
    }

    // 3. RECUPERACIÓN DE SECRETO POR TENANT (Multi-tenant Security)
    const { data: hotel, error: hotelErr } = await supabaseAdmin
      .from('hotels')
      .select('wompi_integrity_secret, name')
      .eq('id', booking.hotel_id)
      .single();

    if (hotelErr || !hotel?.wompi_integrity_secret) {
      return NextResponse.json({ error: 'Configuración de seguridad incompleta' }, { status: 500 });
    }

    // 4. BARRERA CRIPTOGRÁFICA (Anti-Spoofing)
    const isAuthentic = verifyWompiSignature(payload, hotel.wompi_integrity_secret);
    if (!isAuthentic) {
      console.error(`🚨 [SecOps] Firma Inválida detectada en TX: ${dataObj.id}`);
      return NextResponse.json({ error: 'Falsificación de firma bloqueada' }, { status: 403 });
    }

    // ==========================================
    // MÁQUINA DE ESTADOS DETERMINISTA
    // ==========================================
    
    if (event === 'transaction.updated') {
      const { status, id: transactionId, reference } = dataObj;

      // CASO A: TRANSACCIÓN APROBADA (Ingreso de Activos)
      if (status === 'APPROVED') {
        
        // 🔒 FILTRO DE IDEMPOTENCIA (Prevención de duplicidad)
        const finalStatuses = ['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT'];
        if (finalStatuses.includes(booking.status)) {
           return NextResponse.json({ success: true, message: 'Idempotencia: Nodo ya procesado' });
        }

        const amount = (dataObj.amount_in_cents || 0) / 100;
        const attribution = booking.source === 'ota' ? 'Channel [Fee 10%]' : 'DIRECTO [Fee 0%]';

        /**
         * 🧪 TRANSACCIÓN SECUENCIAL PROTEGIDA
         * Registramos el pago PRIMERO. Si esto falla, la reserva sigue PENDING.
         * Justificación: Es preferible un excedente financiero sin reserva que una reserva confirmada sin abono.
         */
        const { error: paymentError } = await supabaseAdmin.from('payments').insert({
          booking_id: reference,
          amount: amount,
          method: 'wompi',
          notes: `Wompi TX: ${transactionId} | ${attribution}`,
          staff_id: null 
        });

        if (paymentError) throw new Error(`Fallo en Registro de Pago: ${paymentError.message}`);

        // Actualización de estado vinculada
        const { error: updateError } = await supabaseAdmin.from('bookings')
          .update({ status: 'CONFIRMED' }) 
          .eq('id', reference);

        if (updateError) {
          console.error(`🚨 [CRITICAL] Pago recibido pero reserva no actualizada! TX: ${transactionId}`);
          throw new Error('Inconsistencia Crítica en el Ledger.');
        }

        console.log(`💳 [Finanzas] Reconciliación exitosa. Reserva ${reference} CONFIRMADA.`);

        // 📧 NOTIFICACIÓN ASÍNCRONA VÍA QSTASH (con reintentos automáticos)
        try {
          const { data: bookingDetails } = await supabaseAdmin
            .from('bookings')
            .select('*, guests(email, full_name), rooms(name)')
            .eq('id', reference)
            .single();

          if (bookingDetails?.guests?.email) {
            await qstashClient.publishJSON({
              url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/qstash/send-confirmation`,
              body: {
                guestEmail: bookingDetails.guests.email,
                guestName: bookingDetails.guests.full_name,
                hotelName: hotel.name,
                checkIn: bookingDetails.check_in,
                checkOut: bookingDetails.check_out,
                roomName: bookingDetails.rooms?.name || 'Habitación Reservada',
                bookingId: reference,
                amount: amount,
              },
              // 🛡️ QStash reintenta hasta 3 veces si el worker falla
              retries: 3,
            });
            console.log(`✅ [Notificaciones] Email encolado para ${bookingDetails.guests.email}`);
          }
        } catch (notifErr) {
          // ⚠️ El enqueuing a QStash rara vez falla (solo si el token es inválido
          // o la URL es incorrecta). Si pasa, se loggea pero no detiene el flujo.
          console.error('⚠️ [SecOps] Falla al encolar notificación en QStash: ', notifErr);
        }
      } 
      
      // CASO B: REVERSIÓN / ANULACIÓN (Rollback)
      else if (status === 'VOIDED') {
        console.warn(`🚨 [Finanzas] TX VOIDED. Revirtiendo Reserva: ${reference}`);
        
        await supabaseAdmin.from('bookings')
          .update({ status: 'PENDING' }) 
          .eq('id', reference);
          
        await supabaseAdmin.from('payments')
          .update({ notes: `[VOIDED] TX: ${transactionId} - Reversión ejecutada` })
          .match({ booking_id: reference });
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error: any) {
    const msg = error instanceof Error ? error.message : 'Excepción desconocida';
    console.error('❌ [CRITICAL SecOps] Colapso en Webhook Pipeline:', msg);
    return NextResponse.json({ error: 'Internal Transactional Error', detail: msg }, { status: 500 });
  }
}