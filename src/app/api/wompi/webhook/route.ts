import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { event, data } = body;

    console.log('🔔 Webhook Wompi Recibido:', event, data?.transaction?.id);

    if (event === 'transaction.updated' && data.transaction.status === 'APPROVED') {
      const reference = data.transaction.reference; 
      const transactionId = data.transaction.id;
      const amount = data.transaction.amount_in_cents / 100;

      // 🚨 FIX QA (IDEMPOTENCIA): ¿Ya registramos esta transacción antes?
      const { data: existingPayment } = await supabaseAdmin
        .from('payments')
        .select('id')
        .ilike('notes', `%${transactionId}%`) // Buscamos el TX ID en las notas
        .maybeSingle();

      if (existingPayment) {
        console.log(`⚠️ Transacción ${transactionId} ya fue procesada anteriormente. Ignorando.`);
        return NextResponse.json({ success: true, message: 'Pago duplicado ignorado' }, { status: 200 });
      }

      const { data: booking, error: bookingError } = await supabaseAdmin
        .from('bookings')
        .select('source')
        .eq('id', reference)
        .single();

      const isOta = booking?.source === 'ota';
      const attributionTag = isOta ? '[Comisión: OTA 10%]' : '[Comisión: Directo 0%]';
      const paymentNotes = `Wompi TX: ${transactionId} | ${attributionTag}`;

      const { error: paymentError } = await supabaseAdmin.from('payments').insert({
          booking_id: reference,
          amount: amount,
          method: 'wompi',
          notes: paymentNotes,
          staff_id: null 
      });

      if (paymentError) throw new Error('Error insertando el recibo: ' + paymentError.message);

      const { error: updateError } = await supabaseAdmin
        .from('bookings')
        .update({ status: 'confirmed' })
        .eq('id', reference);

      if (updateError) throw new Error('Error actualizando reserva: ' + updateError.message);

      console.log(`✅ Pago de $${amount} procesado exitosamente.`);
    }

    return NextResponse.json({ success: true, message: 'Webhook procesado' }, { status: 200 });

  } catch (error: any) {
    console.error('❌ Error en Wompi Webhook:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}