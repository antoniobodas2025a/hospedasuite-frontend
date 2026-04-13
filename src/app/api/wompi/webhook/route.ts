import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Inicialización estricta del cliente de Supabase (Privilegios Administrativos)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { event, data, signature, timestamp } = body;

    console.log(`🛡️ [SecOps] Webhook Wompi Interceptado: ${event} | TX: ${data?.transaction?.id}`);

    // 1. VALIDACIÓN FORENSE (Zero-Trust)
    const secret = process.env.WOMPI_EVENTS_SECRET;
    if (!secret) {
      console.error('🚨 [SecOps] Falla de Configuración: WOMPI_EVENTS_SECRET no definido.');
      return NextResponse.json({ success: false, error: 'Configuración de seguridad incompleta' }, { status: 500 });
    }

    // Prevención temprana de manipulación de tipos (Type Confusion)
    if (!signature || typeof signature.checksum !== 'string' || !timestamp) {
      console.error('🚨 [SecOps] Ataque bloqueado: Payload carece de firma criptográfica válida.');
      return NextResponse.json({ success: false, error: 'Firma ausente o malformada' }, { status: 401 });
    }

    const tx = data?.transaction;
    if (!tx || !tx.id || !tx.status || typeof tx.amount_in_cents === 'undefined') {
      console.error('🚨 [SecOps] Payload malformado: Faltan datos de la transacción.');
      return NextResponse.json({ success: false, error: 'Estructura de datos inválida' }, { status: 400 });
    }

    // Wompi requiere concatenar: ID + STATUS + AMOUNT_IN_CENTS + TIMESTAMP + SECRET
    const stringToHash = `${tx.id}${tx.status}${tx.amount_in_cents}${timestamp}${secret}`;
    const generatedHash = crypto.createHash('sha256').update(stringToHash).digest('hex');

    // Mitigación de vector DoS en timingSafeEqual 
    const hashBuffer = Buffer.from(generatedHash);
    const signatureBuffer = Buffer.from(signature.checksum);

    if (hashBuffer.length !== signatureBuffer.length) {
      console.error('🚨 [SecOps] Ataque bloqueado: Longitud de firma no coincide (Posible DoS/Spoofing).');
      return NextResponse.json({ success: false, error: 'Firma inválida' }, { status: 401 });
    }

    // Mitigación de Timing Attacks usando comparación segura
    const isValidSignature = crypto.timingSafeEqual(hashBuffer, signatureBuffer);

    if (!isValidSignature) {
      console.error('🚨 [SecOps] Ataque bloqueado: Falsificación de firma detectada.');
      return NextResponse.json({ success: false, error: 'Firma inválida' }, { status: 401 });
    }

    console.log(`✅ [SecOps] Firma criptográfica verificada para TX: ${tx.id}`);

    // 2. PROCESAMIENTO TRANSACCIONAL SEGURO
    if (event === 'transaction.updated' && tx.status === 'APPROVED') {
      const reference = tx.reference; // Corresponde al booking.id
      const transactionId = tx.id;
      const amount = tx.amount_in_cents / 100;

      // Idempotencia Estricta: Prevenir doble registro de pagos
      const { data: existingPayment } = await supabaseAdmin
        .from('payments')
        .select('id')
        .ilike('notes', `%${transactionId}%`)
        .maybeSingle();

      if (existingPayment) {
        console.log(`⚠️ [Idempotencia] TX ${transactionId} ya procesada. Abortando duplicado.`);
        return NextResponse.json({ success: true, message: 'Pago duplicado ignorado de forma segura' }, { status: 200 });
      }

      // Obtener metadatos de la reserva original
      const { data: booking, error: bookingError } = await supabaseAdmin
        .from('bookings')
        .select('source')
        .eq('id', reference)
        .single();

      if (bookingError || !booking) {
        throw new Error('Reserva huérfana o no encontrada.');
      }

      const isOta = booking.source === 'ota';
      const attributionTag = isOta ? '[Comisión: OTA 10%]' : '[Comisión: Directo 0%]';
      const paymentNotes = `Wompi TX: ${transactionId} | ${attributionTag}`;

      // Insertar el recibo de pago
      const { error: paymentError } = await supabaseAdmin.from('payments').insert({
        booking_id: reference,
        amount: amount,
        method: 'wompi',
        notes: paymentNotes,
        staff_id: null 
      });

      if (paymentError) throw new Error(`Fallo insertando pago: ${paymentError.message}`);

      // Confirmar el estado del inventario
      const { error: updateError } = await supabaseAdmin
        .from('bookings')
        .update({ status: 'CONFIRMED' }) 
        .eq('id', reference);

      if (updateError) throw new Error(`Fallo actualizando reserva: ${updateError.message}`);

      console.log(`💳 [Finanzas] Pago de $${amount} reconciliado y reserva ${reference} CONFIRMADA.`);
    }

    return NextResponse.json({ success: true, message: 'Transacción asegurada y procesada' }, { status: 200 });

  } catch (error: any) {
    console.error('❌ [SecOps] Falla en Pipeline de Webhook:', error.message);
    return NextResponse.json({ success: false, error: 'Fallo interno del servidor' }, { status: 500 });
  }
}