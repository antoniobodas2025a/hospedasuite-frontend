import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyWompiSignature } from '@/lib/wompi-crypto';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const event = payload?.event;
    const dataObj = payload?.data?.transaction;

    console.log(`🛡️ [HQ-SEC] Webhook Wompi B2B: ${event} | TX: ${dataObj?.id}`);

    const secret = process.env.WOMPI_EVENTS_SECRET;
    if (!secret) return NextResponse.json({ error: 'Missing security config' }, { status: 500 });

    const isAuthentic = verifyWompiSignature(payload, secret);
    if (!isAuthentic) {
      console.error('🚨 [HQ-SEC] Falsificación de firma bloqueada.');
      return NextResponse.json({ error: 'Firma inválida' }, { status: 403 });
    }

    if (!dataObj || !dataObj.id || !dataObj.status) {
      return NextResponse.json({ error: 'Payload incompleto' }, { status: 400 });
    }

    const transactionId = dataObj.id;
    const status = dataObj.status;

    // Máquina de Estados B2B
    if (event === 'transaction.updated') {
      
      if (status === 'APPROVED') {
        const { data: existing } = await supabaseAdmin
          .from('tenant_payments')
          .select('id')
          .eq('wompi_transaction_id', transactionId)
          .single();

        if (existing) return NextResponse.json({ received: true, status: 'already_processed' }, { status: 200 });

        const amountInCents = dataObj.amount_in_cents;
        const reference = dataObj.reference; 

        await supabaseAdmin.from('tenant_payments').insert([{
          wompi_transaction_id: transactionId,
          reference: reference,
          amount_cop: amountInCents / 100,
          method: dataObj.payment_method_type,
          status: 'APPROVED',
        }]);

        console.log(`✅ [HQ-FINANZAS] Pago B2B de $${amountInCents / 100} registrado.`);
      } 
      else if (status === 'DECLINED' || status === 'ERROR') {
        // Trazabilidad de fallos B2B para inteligencia de negocios
        console.warn(`⚠️ [HQ-FINANZAS] Intento de pago fallido B2B. TX: ${transactionId} | Razón: ${status}`);
      }
      else if (status === 'VOIDED') {
        // Reversión de pago
        await supabaseAdmin.from('tenant_payments')
          .update({ status: 'VOIDED' })
          .eq('wompi_transaction_id', transactionId);
        console.error(`🚨 [HQ-FINANZAS] ALERTA: Pago B2B Anulado (VOIDED). TX: ${transactionId}`);
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });

  } catch (error: any) {
    console.error('❌ [HQ-SEC] Fallo Interno Webhook:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}