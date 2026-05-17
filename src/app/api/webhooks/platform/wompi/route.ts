export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { verifyWompiSignature, WompiEventPayload } from '@/lib/wompi-crypto';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { Resend } from 'resend';
import { logAuditEvent } from '@/lib/audit-logger';
import { trackPaymentCompleted, trackPlanUpgraded } from '@/lib/analytics-server';

/**
 * 🛡️ CONFIGURACIÓN DE SEGURIDAD — Plataforma (HospedaSuite cobrando suscripciones)
 *
 * Este webhook recibe notificaciones de Wompi para los pagos de suscripción
 * que los hoteles hacen a HospedaSuite. Es ANÁLOGO al webhook tenant/wompi
 * pero con la cuenta Wompi de la PLATAFORMA, no la del hotel.
 *
 * La verificación de firma usa WOMPI_PLATFORM_INTEGRITY_SECRET.
 */

// Inicializar Resend solo si la API key existe
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

/**
 * POST /api/webhooks/platform/wompi
 *
 * Wompi envía eventos de transacción (transaction.updated) a este endpoint.
 * Verificamos la firma criptográfica con el secreto de integridad de la plataforma
 * y actualizamos el estado de suscripción del hotel automáticamente.
 */
export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as WompiEventPayload;
    const event = payload?.event;
    const dataObj = payload?.data?.transaction;

    // 1. VALIDACIÓN DE CONTRATO
    if (!dataObj?.reference || !dataObj?.id || !dataObj?.status) {
      return NextResponse.json({ error: 'Payload malformado' }, { status: 400 });
    }

    console.log(
      `🛡️ [Platform Wompi] Evento: ${event} | TX: ${dataObj.id} | Status: ${dataObj.status}`
    );

    // 2. VERIFICACIÓN CRIPTOGRÁFICA con el secreto de PLATAFORMA
    const platformSecret = process.env.WOMPI_PLATFORM_INTEGRITY_SECRET;
    if (!platformSecret) {
      console.error('❌ [Platform Wompi] WOMPI_PLATFORM_INTEGRITY_SECRET no configurado.');
      return NextResponse.json(
        { error: 'Configuración de seguridad de plataforma incompleta' },
        { status: 500 }
      );
    }

    const isAuthentic = verifyWompiSignature(payload, platformSecret);
    if (!isAuthentic) {
      console.error(`🚨 [Platform Wompi] Firma inválida — TX: ${dataObj.id}`);
      return NextResponse.json(
        { error: 'Falsificación de firma bloqueada' },
        { status: 403 }
      );
    }

    // 3. MÁQUINA DE ESTADOS — Solo procesamos transaction.updated
    if (event !== 'transaction.updated') {
      return NextResponse.json(
        { success: true, message: 'Evento no procesable — ignorado' },
        { status: 200 }
      );
    }

    const { status, id: transactionId, reference } = dataObj;

    // 4. EXTRAER hotelId DE LA REFERENCIA
    // Formatos posibles:
    //   billing-{hotelId}-{YYYY-MM}          → factura mensual
    //   billing-upgrade-{hotelId}-{plan}      → cambio de plan
    const isUpgrade = reference.startsWith('billing-upgrade-');
    const parts = reference.split('-');
    const hotelId = isUpgrade ? parts[2] : parts[1];

    if (!hotelId) {
      console.error('❌ [Platform Wompi] No se pudo extraer hotelId:', reference);
      return NextResponse.json({ error: 'Referencia inválida' }, { status: 400 });
    }

    // 5. ACTUALIZAR SEGÚN ESTADO DE LA TRANSACCIÓN
    if (status === 'APPROVED') {
      // 🛡️ IDEMPOTENCIA: Verificar si ya procesamos este transaction_id
      const { data: existingInvoice } = await supabaseAdmin
        .from('billing_invoices')
        .select('id')
        .eq('wompi_transaction_id', transactionId)
        .single();

      if (existingInvoice) {
        console.log(`⚠️ [Platform Wompi] Evento duplicado ignorado — TX: ${transactionId}`);
        return NextResponse.json({ success: true, message: 'Evento ya procesado' }, { status: 200 });
      }

      const updateData: Record<string, unknown> = {
        date_paid: new Date().toISOString(),
        subscription_status: 'active',
      };

      // Si es upgrade, cambiar el plan también
      if (isUpgrade) {
        const newPlan = parts.slice(3).join('-').toLowerCase();
        if (['starter', 'pro', 'enterprise'].includes(newPlan)) {
          updateData.subscription_plan = newPlan;
          console.log(`🔄 [Platform Wompi] Upgrade a ${newPlan} para hotel ${hotelId}`);
        }
      }

      const { error: updateError } = await supabaseAdmin
        .from('hotels')
        .update(updateData)
        .eq('id', hotelId);

      if (updateError) {
        console.error('❌ [Platform Wompi] Error actualizando hotel:', updateError.message);
        return NextResponse.json(
          { error: 'Error actualizando suscripción' },
          { status: 500 }
        );
      }

      // 📝 Audit log: pago recibido
      await logAuditEvent({
        actor_type: 'webhook',
        actor_id: 'wompi-platform',
        action: 'payment_received',
        entity_type: 'hotel',
        entity_id: hotelId,
        new_value: {
          amount: (dataObj.amount_in_cents || 0) / 100,
          wompi_reference: reference,
          transaction_id: transactionId,
          status: 'active',
        },
      });

      // 📊 Analytics: pago completado
      await trackPaymentCompleted(
        hotelId,
        (dataObj.amount_in_cents || 0) / 100,
        'unknown', // Would need to fetch current plan
        reference
      );

      // 📝 Audit log: cambio de plan (si es upgrade)
      if (isUpgrade) {
        const newPlan = parts.slice(3).join('-').toLowerCase();
        if (['starter', 'pro', 'enterprise'].includes(newPlan)) {
          await logAuditEvent({
            actor_type: 'webhook',
            actor_id: 'wompi-platform',
            action: 'plan_changed',
            entity_type: 'subscription',
            entity_id: hotelId,
            old_value: { plan: hotelId },
            new_value: { plan: newPlan, reason: 'upgrade_payment' },
          });

          // 📊 Analytics: upgrade
          await trackPlanUpgraded(hotelId, 'unknown', newPlan);
        }
      }

      // 📝 Registrar factura pagada (audit trail)
      await supabaseAdmin
        .from('billing_invoices')
        .insert({
          hotel_id: hotelId,
          period_start: new Date().toISOString().split('T')[0], // Approximate
          period_end: new Date().toISOString().split('T')[0],
          plan_fee: 0, // Would need to fetch from invoice calculation
          total: (dataObj.amount_in_cents || 0) / 100,
          status: 'paid',
          wompi_reference: reference,
          wompi_transaction_id: transactionId,
          paid_at: new Date().toISOString(),
        });

      console.log(
        `✅ [Platform Wompi] Suscripción actualizada — Hotel: ${hotelId} | TX: ${transactionId}`
      );

      // 📧 Enviar email de confirmación de pago
      if (resend) {
        try {
          // Obtener email del hotel
          const { data: hotelData } = await supabaseAdmin
            .from('hotels')
            .select('name, email')
            .eq('id', hotelId)
            .single();

          if (hotelData?.email) {
            const amountFormatted = new Intl.NumberFormat('es-CO', {
              style: 'currency',
              currency: 'COP',
              minimumFractionDigits: 0,
            }).format((dataObj.amount_in_cents || 0) / 100);

            const monthNames = [
              'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
              'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
            ];
            const currentMonth = monthNames[new Date().getMonth()];
            const currentYear = new Date().getFullYear();

            await resend.emails.send({
              from: process.env.EMAIL_FROM || 'HospedaSuite <reservas@hospedasuite.com>',
              to: [hotelData.email],
              subject: `✅ Pago confirmado — Factura ${currentMonth} ${currentYear}`,
              html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2>Pago confirmado ✅</h2>
                  <p>Hola, ${hotelData.name || 'equipo'} 👋</p>
                  <p>Tu pago de <strong>${amountFormatted} COP</strong> fue procesado exitosamente.</p>
                  <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                    <tr><td style="padding: 8px; border-bottom: 1px solid #eee;">Referencia:</td><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">${reference}</td></tr>
                    <tr><td style="padding: 8px; border-bottom: 1px solid #eee;">Transacción Wompi:</td><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">${transactionId}</td></tr>
                    <tr><td style="padding: 8px; border-bottom: 1px solid #eee;">Fecha:</td><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">${new Date().toLocaleDateString('es-CO')}</td></tr>
                    <tr><td style="padding: 8px;">Estado:</td><td style="padding: 8px; font-weight: bold; color: #059669;">Activo</td></tr>
                  </table>
                  <p style="color: #666; font-size: 12px; margin-top: 32px;">
                    ¿Necesitás ayuda? Escribinos a soporte@hospedasuite.com
                  </p>
                </div>
              `,
            });
            console.log(`📧 [Platform Wompi] Email de confirmación enviado a ${hotelData.email}`);
          }
        } catch (emailError: any) {
          // Error de email no debe romper el webhook
          console.error(`[Platform Wompi] Error enviando email:`, emailError.message);
        }
      }
    } else if (status === 'VOIDED' || status === 'DECLINED') {
      console.warn(
        `⚠️ [Platform Wompi] Transacción revertida/rechazada — ${reference} | TX: ${transactionId}`
      );
      
      // 🚨 Marcar como past_due para limitar funcionalidad
      await supabaseAdmin
        .from('hotels')
        .update({ subscription_status: 'past_due' })
        .eq('id', hotelId);
        
      console.log(`🔒 [Platform Wompi] Hotel ${hotelId} marcado como past_due`);

      // 📝 Audit log: pago rechazado
      await logAuditEvent({
        actor_type: 'webhook',
        actor_id: 'wompi-platform',
        action: 'payment_declined',
        entity_type: 'hotel',
        entity_id: hotelId,
        new_value: {
          wompi_reference: reference,
          transaction_id: transactionId,
          status: 'past_due',
          reason: status,
        },
      });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    const msg = error instanceof Error ? error.message : 'Excepción desconocida';
    console.error('❌ [Platform Wompi] Colapso en webhook:', msg);
    return NextResponse.json(
      { error: 'Internal Transactional Error', detail: msg },
      { status: 500 }
    );
  }
}
