import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyWompiSignature } from '@/lib/wompi-crypto';

// 🛡️ Aislamiento Tier-0 sin persistencia de sesión para Vercel Edge
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const event = payload?.event;
    const dataObj = payload?.data?.transaction;

    console.log(`🛡️ [HQ-SEC] Webhook Wompi B2B: ${event} | TX: ${dataObj?.id}`);

    // 1. VALIDACIÓN DEL SECRETO MAESTRO DE HQ
    const secret = process.env.HQ_WOMPI_EVENTS_SECRET || process.env.WOMPI_EVENTS_SECRET;
    if (!secret) return NextResponse.json({ error: 'Configuración criptográfica faltante en el servidor' }, { status: 500 });

    // 2. BARRERA CRIPTOGRÁFICA (Anti-Spoofing)
    const isAuthentic = verifyWompiSignature(payload, secret);
    if (!isAuthentic) {
      console.error('🚨 [HQ-SEC] Falsificación de firma bloqueada. Intento de vulneración SaaS.');
      return NextResponse.json({ error: 'Firma inválida' }, { status: 403 });
    }

    if (!dataObj || !dataObj.id || !dataObj.status || !dataObj.reference) {
      return NextResponse.json({ error: 'Payload incompleto' }, { status: 400 });
    }

    const transactionId = dataObj.id;
    const status = dataObj.status;
    const reference = dataObj.reference;

    // ==========================================
    // DECODIFICACIÓN FORENSE DEL PAYLOAD
    // ==========================================
    // Extracción segura del UUID del Hotel. Patrón esperado: ONB-[UUID_HOTEL]-[TIMESTAMP]
    const refMatch = reference.match(/^ONB-(.+)-(\d+)$/);
    const hotelId = refMatch ? refMatch[1] : null;

    if (!hotelId) {
      console.warn(`⚠️ [HQ-FINANZAS] Pago recibido sin trazabilidad de Tenant. Referencia atípica: ${reference}`);
      // Nota: Aquí se podría insertar el pago como 'Huérfano' para revisión manual.
    }

    // ==========================================
    // MÁQUINA DE ESTADOS B2B (SaaS)
    // ==========================================
    if (event === 'transaction.updated') {
      
      if (status === 'APPROVED') {
        // 🔒 FILTRO DE IDEMPOTENCIA
        const { data: existing } = await supabaseAdmin
          .from('tenant_payments')
          .select('id')
          .eq('wompi_transaction_id', transactionId)
          .single();

        if (existing) return NextResponse.json({ received: true, status: 'already_processed' }, { status: 200 });

        const amountInCents = dataObj.amount_in_cents;
        const amountCop = amountInCents / 100;

        // 💰 REGISTRO DEL INGRESO
        await supabaseAdmin.from('tenant_payments').insert([{
          wompi_transaction_id: transactionId,
          reference: reference,
          hotel_id: hotelId, // Vinculación recuperada
          amount_cop: amountCop,
          method: dataObj.payment_method_type,
          status: 'APPROVED',
        }]);

        // 🚀 ACTIVACIÓN DE SUSCRIPCIÓN (Provisioning)
        if (hotelId) {
          await supabaseAdmin.from('hotels').update({
            status: 'active', // El software se enciende formalmente
            ...(amountCop > 0 && { subscription_plan: 'pro' }) // Si paga, es Pro. (Ajustable a lógica de negocio)
          }).eq('id', hotelId);
        }

        console.log(`✅ [HQ-FINANZAS] Suscripción Procesada. Tenant: ${hotelId} | Monto: $${amountCop}`);
      } 
      else if (status === 'DECLINED' || status === 'ERROR') {
        console.warn(`⚠️ [HQ-FINANZAS] Pago Rechazado. TX: ${transactionId} | Tenant: ${hotelId}`);
        // Si el pago falla (ej. tarjeta expirada en el mes 4), se suspende el servicio
        if (hotelId) {
           await supabaseAdmin.from('hotels').update({ status: 'suspended' }).eq('id', hotelId);
           console.log(`🛑 [HQ-OPS] Operaciones suspendidas para Tenant: ${hotelId} por impago.`);
        }
      }
      else if (status === 'VOIDED') {
        await supabaseAdmin.from('tenant_payments').update({ status: 'VOIDED' }).eq('wompi_transaction_id', transactionId);
        console.error(`🚨 [HQ-FINANZAS] ALERTA: Pago SaaS Anulado. Revirtiendo TX: ${transactionId}`);
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });

  } catch (error: any) {
    console.error('❌ [HQ-CRITICAL] Fallo en Motor de Webhook SaaS:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}