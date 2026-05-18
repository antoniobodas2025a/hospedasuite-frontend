export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * 🧾 Webhook de redirección post-pago Wompi (Plataforma).
 *
 * Wompi redirige al usuario acá después de completar (o fallar) el pago.
 * Parsea los search params que Wompi adjunta en la URL de redirección.
 *
 * Params esperados:
 *   - id_wompi:  ID de la transacción en Wompi
 *   - reference: Referencia que generamos (billing-{hotelId}-{YYYY-MM} o billing-upgrade-{hotelId}-{plan})
 *   - status:    Estado de la transacción (APPROVED, DECLINED, etc.)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const wompiTxId = searchParams.get('id_wompi');
    const reference = searchParams.get('reference');
    const status = searchParams.get('status');

    console.log(
      `🧾 [Billing] Redirección Wompi: TX=${wompiTxId} | Ref=${reference} | Status=${status}`
    );

    if (!reference) {
      return NextResponse.redirect(
        new URL('/dashboard/billing?payment=failed', request.url)
      );
    }

    // Si el pago fue aprobado, actualizar la suscripción del hotel
    if (status?.toUpperCase() === 'APPROVED') {
      // Extraer hotelId de la referencia
      // Formato: billing-{hotelId}-{YYYY-MM} o billing-upgrade-{hotelId}-{plan}
      const parts = reference.split('-');
      // billing-{uuid}-{YYYY}-{MM} → parts[1] es el hotelId (UUID)
      // billing-upgrade-{uuid}-{plan} → parts[2] es el hotelId
      const isUpgrade = reference.startsWith('billing-upgrade-');
      const hotelId = isUpgrade ? parts[2] : parts[1];

      if (!hotelId) {
        console.error('❌ [Billing] No se pudo extraer hotelId de la referencia:', reference);
        return NextResponse.redirect(
          new URL('/dashboard/billing?payment=failed', request.url)
        );
      }

      // Actualizar hotel: marcar como pagado, estado activo
      const updateData: Record<string, unknown> = {
        date_paid: new Date().toISOString(),
        subscription_status: 'active',
      };

      // Si es upgrade, también actualizar el plan
      if (isUpgrade) {
        // El plan está en parts[3] (billing-upgrade-{hotelId}-{plan})
        const newPlan = parts.slice(3).join('-').toLowerCase();
        if (['starter', 'pro', 'enterprise'].includes(newPlan)) {
          updateData.subscription_plan = newPlan;
        }
      }

      const { error: updateError } = await supabaseAdmin
        .from('hotels')
        .update(updateData)
        .eq('id', hotelId);

      if (updateError) {
        console.error('❌ [Billing] Error actualizando suscripción:', updateError.message);
        return NextResponse.redirect(
          new URL('/dashboard/billing?payment=failed', request.url)
        );
      }

      // Registrar el pago (console por ahora, migración pendiente)
      console.log(
        `✅ [Billing] Pago registrado — Hotel: ${hotelId} | TX: ${wompiTxId} | ${isUpgrade ? 'Upgrade a ' + parts.slice(3).join('-') : 'Factura mensual'}`
      );

      // TODO: Insertar en billing_payments cuando la tabla exista
      // try {
      //   await supabaseAdmin.from('billing_payments').insert({
      //     hotel_id: hotelId,
      //     wompi_tx_id: wompiTxId,
      //     reference: reference,
      //     amount: 0, // Lo obtendríamos confirmando con Wompi API
      //     type: isUpgrade ? 'upgrade' : 'monthly',
      //   });
      // } catch (e) { console.warn('billing_payments no disponible aún'); }

      return NextResponse.redirect(
        new URL('/dashboard/billing?payment=success', request.url)
      );
    }

    // Pago no aprobado
    return NextResponse.redirect(
      new URL('/dashboard/billing?payment=failed', request.url)
    );
  } catch (error: any) {
    console.error('❌ [Billing] Error en webhook de facturación:', error.message);
    return NextResponse.redirect(
      new URL('/dashboard/billing?payment=failed', request.url)
    );
  }
}
