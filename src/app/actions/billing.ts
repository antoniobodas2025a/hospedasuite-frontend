'use server';

import { getCurrentHotel } from '@/lib/hotel-context';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { SAAS_PLANS, normalizePlan, PLAN_LABELS, PLAN_LEVELS, type PlanKey } from '@/config/saas-plans';
import { isTrialActive, getEffectivePlanCost, type TrialHotel } from '@/lib/trial-check';
import { logAuditEvent } from '@/lib/audit-logger';
import { trackDowngradeRequested } from '@/lib/analytics-server';
import type { OtaCommission } from '@/types';

export interface BillingStatement {
  hotelName: string;
  planName: string;
  subscriptionFee: number;
  platformFeesTotal: number; // Suma de OTA (10%) + Upsell (3%)
  otaCommissionDetails: OtaCommission[]; // Detalle de cada comisión OTA
  totalDue: number;
  bookingsCount: number;
  period: string;
}

export async function getHotelBillingAction() {
  try {
    // 1. Identidad Criptográfica del Tenant Actual
    const currentHotel = await getCurrentHotel();
    if (!currentHotel) throw new Error('Fallo de Autenticación: Identidad del hotel no verificada.');

    // 2. Extracción de Plan de Suscripción
    const { data: hotel, error: hotelError } = await supabaseAdmin
      .from('hotels')
      .select('id, name, subscription_plan, subscription_status, trial_ends_at')
      .eq('id', currentHotel.id)
      .single();

    if (hotelError || !hotel) throw new Error('Error de integridad: Datos de facturación del hotel corruptos.');

    // 3. Barrido Financiero del Mes Actual (🛡️ CORRECCIÓN TIMEZONE: Aislando UTC-5 Colombia)
    const now = new Date();
    const colTimeStr = now.toLocaleString("en-US", { timeZone: "America/Bogota" });
    const colTime = new Date(colTimeStr);
    
    // Fijamos el día 1 del mes actual a las 00:00:00 hora local de Colombia
    const startOfMonth = new Date(colTime.getFullYear(), colTime.getMonth(), 1, 0, 0, 0);

    // 4. Extracción de Ledger (🛡️ CORRECCIÓN DE ESTADO: Ignorar reservas canceladas)
    const { data: bookings, error: bookingsError } = await supabaseAdmin
      .from('bookings')
      .select('platform_fee, total_price, source, id')
      .eq('hotel_id', currentHotel.id)
      .neq('status', 'cancelled') // BARRERA ANTI-SOBREFACTURACIÓN
      .gte('created_at', startOfMonth.toISOString());

    if (bookingsError) throw new Error('Error al calcular el libro mayor de comisiones.');

    // 5. Consolidación de Deuda + cálculo de comisiones OTA (10%)
    const platformFeesTotal = bookings.reduce((sum: number, b: any) => sum + Number(b.platform_fee || 0), 0);

    // Detalle de comisiones OTA: 10% sobre total_price de reservas con source='ota'
    const otaCommissionDetails: OtaCommission[] = (bookings || [])
      .filter((b: any) => b.source === 'ota')
      .map((b: any) => ({
        booking_id: b.id,
        source: 'ota',
        total: Number(b.total_price || 0),
        commission: Math.round(Number(b.total_price || 0) * 0.10 * 100) / 100,
      }));

    const otaCommissionsTotal = otaCommissionDetails.reduce((sum, c) => sum + c.commission, 0);

    // 🧪 Si está en trial activo, el plan cuesta $0
    const trialHotel: TrialHotel = {
      subscription_status: hotel.subscription_status,
      subscription_plan: hotel.subscription_plan,
      trial_ends_at: hotel.trial_ends_at,
    };
    const subscriptionFee = getEffectivePlanCost(trialHotel);

    const totalDue = subscriptionFee + otaCommissionsTotal + platformFeesTotal;

    // 6. Formateador de meses agnóstico para servidores Vercel/Node
    const monthNames = [
      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];
    const periodString = `${monthNames[colTime.getMonth()]} ${colTime.getFullYear()}`;

    const planKey = normalizePlan(hotel.subscription_plan);
    const planName = isTrialActive(trialHotel) ? 'TRIAL ACTIVO' : PLAN_LABELS[planKey];

    const statement: BillingStatement = {
      hotelName: hotel.name,
      planName,
      subscriptionFee,
      platformFeesTotal,
      otaCommissionDetails,
      totalDue,
      bookingsCount: bookings.length,
      period: periodString
    };

    return { success: true, statement };
  } catch (error: any) {
    console.error('[SEC-OPS] Fallo en facturación B2B:', error.message);
    return { success: false, error: error.message };
  }
}

// ——— Tipos para facturación mensual ———

export interface MonthlyInvoice {
  planCost: number;
  otaCommissions: number;
  otaCommissionDetails: OtaCommission[];
  upsellCommissions: number;
  total: number;
  currency: string;
  period: string;
  planName: string;
}

/**
 * Calcula la factura mensual para un hotel.
 * Incluye costo del plan + comisiones OTA + comisiones Upsell del ciclo actual.
 */
export async function calculateMonthlyInvoiceAction(
  hotelId: string
): Promise<{ success: boolean; invoice?: MonthlyInvoice; error?: string }> {
  try {
    // 1. Obtener datos del hotel (incluyendo trial para cálculo correcto)
    const { data: hotel, error: hotelError } = await supabaseAdmin
      .from('hotels')
      .select('id, name, subscription_plan, subscription_status, trial_ends_at, billing_cycle_start')
      .eq('id', hotelId)
      .single();

    if (hotelError || !hotel) {
      throw new Error('Hotel no encontrado o datos corruptos.');
    }

    // 2. Costo del plan (🧪 $0 si está en trial activo)
    const trialHotel: TrialHotel = {
      subscription_status: hotel.subscription_status,
      subscription_plan: hotel.subscription_plan,
      trial_ends_at: hotel.trial_ends_at,
    };
    const planCost = getEffectivePlanCost(trialHotel);
    const planKey = normalizePlan(hotel.subscription_plan);

    // 3. Ventana de facturación (hora Colombia)
    const now = new Date();
    const colTimeStr = now.toLocaleString('en-US', { timeZone: 'America/Bogota' });
    const colTime = new Date(colTimeStr);
    const startOfMonth = new Date(colTime.getFullYear(), colTime.getMonth(), 1, 0, 0, 0);

    // 4. Comisiones OTA (reservas de source='ota' en el ciclo) — 10% sobre total_price
    const { data: otaBookings, error: otaError } = await supabaseAdmin
      .from('bookings')
      .select('id, total_price, source')
      .eq('hotel_id', hotelId)
      .eq('source', 'ota')
      .neq('status', 'cancelled')
      .gte('created_at', startOfMonth.toISOString());

    if (otaError) {
      console.error('Error al calcular comisiones OTA:', otaError.message);
    }

    const otaCommissionDetails: OtaCommission[] = (otaBookings || []).map((b: any) => ({
      booking_id: b.id,
      source: 'ota',
      total: Number(b.total_price || 0),
      commission: Math.round(Number(b.total_price || 0) * 0.10 * 100) / 100,
    }));

    const otaCommissions = otaCommissionDetails.reduce((sum, c) => sum + c.commission, 0);

    // 5. Comisiones Upsell (transacciones de la tabla upsell_transactions en el ciclo)
    let upsellCommissions = 0;
    try {
      const { data: upsellTx, error: upsellError } = await supabaseAdmin
        .from('upsell_transactions')
        .select('commission')
        .eq('hotel_id', hotelId)
        .gte('created_at', startOfMonth.toISOString());

      if (!upsellError && upsellTx) {
        upsellCommissions = upsellTx.reduce(
          (sum: number, t: any) => sum + Number(t.commission || 0),
          0
        );
      }
    } catch {
      // Tabla upsell_transactions puede no existir aún — ignoramos silenciosamente
    }

    // 6. Total
    const total = planCost + otaCommissions + upsellCommissions;

    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
    ];
    const period = `${monthNames[colTime.getMonth()]} ${colTime.getFullYear()}`;

    const invoice: MonthlyInvoice = {
      planCost,
      otaCommissions,
      otaCommissionDetails,
      upsellCommissions,
      total,
      currency: 'COP',
      period,
      planName: isTrialActive(trialHotel) ? 'TRIAL ACTIVO' : PLAN_LABELS[planKey],
    };

    return { success: true, invoice };
  } catch (error: any) {
    console.error('[BILLING] Error calculando factura:', error.message);
    return { success: false, error: error.message };
  }
}

export interface BillingPaymentLink {
  paymentUrl: string;
  reference: string;
  amount: number;
}

/**
 * Genera un enlace de pago Wompi para la facturación de un hotel.
 * Usa la cuenta Wompi de HospedaSuite (PLATAFORMA), no la del hotel.
 */
export async function generateBillingPaymentLinkAction(
  hotelId: string,
  planUpgrade?: boolean
): Promise<{ success: boolean; link?: BillingPaymentLink; error?: string }> {
  try {
    // 1. Calcular factura
    const { success, invoice, error } = await calculateMonthlyInvoiceAction(hotelId);
    if (!success || !invoice) {
      throw new Error(error || 'No se pudo calcular la factura.');
    }

    // 2. Generar referencia única
    const now = new Date();
    const colTimeStr = now.toLocaleString('en-US', { timeZone: 'America/Bogota' });
    const colTime = new Date(colTimeStr);
    const yearMonth = `${colTime.getFullYear()}-${String(colTime.getMonth() + 1).padStart(2, '0')}`;

    const reference = planUpgrade
      ? `billing-upgrade-${hotelId}-${invoice.planName}`
      : `billing-${hotelId}-${yearMonth}`;

    // 3. Clave pública de la PLATAFORMA (HospedaSuite cobrando al hotel)
    const publicKey = process.env.WOMPI_PLATFORM_PUBLIC_KEY;
    if (!publicKey) {
      throw new Error(
        'WOMPI_PLATFORM_PUBLIC_KEY no está configurada en las variables de entorno.'
      );
    }

    // 4. Monto en centavos (Wompi requiere centavos)
    const amountInCents = Math.round(invoice.total * 100);

    // 5. URL de redirección post-pago
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const redirectUrl = `${appUrl}/api/webhooks/billing-success`;

    // 6. Construir enlace de checkout Wompi
    const paymentUrl =
      `https://checkout.wompi.co/p/?` +
      `public-key=${encodeURIComponent(publicKey)}` +
      `&currency=COP` +
      `&amount-in-cents=${amountInCents}` +
      `&reference=${encodeURIComponent(reference)}` +
      `&redirect-url=${encodeURIComponent(redirectUrl)}`;

    const link: BillingPaymentLink = {
      paymentUrl,
      reference,
      amount: invoice.total,
    };

    return { success: true, link };
  } catch (error: any) {
    console.error('[BILLING] Error generando enlace de pago:', error.message);
    return { success: false, error: error.message };
  }
}

// ——— Historial de Facturas ———

export interface InvoiceRecord {
  id: string;
  periodStart: string;
  periodEnd: string;
  planFee: number;
  otaCommissions: number;
  otaCommissionDetails: OtaCommission[];
  upsellCommissions: number;
  total: number;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  wompiReference: string | null;
  paidAt: string | null;
  createdAt: string;
}

/**
 * Obtiene el historial de facturas de un hotel.
 */
export async function getInvoiceHistoryAction(
  hotelId: string
): Promise<{ success: boolean; invoices?: InvoiceRecord[]; error?: string }> {
  try {
    const { data, error } = await supabaseAdmin
      .from('billing_invoices')
      .select('*')
      .eq('hotel_id', hotelId)
      .order('period_start', { ascending: false });

    if (error) {
      throw new Error('Error leyendo historial de facturas.');
    }

    const invoices: InvoiceRecord[] = (data || []).map((row: any) => ({
      id: row.id,
      periodStart: row.period_start,
      periodEnd: row.period_end,
      planFee: row.plan_fee || 0,
      otaCommissions: row.ota_commissions_total || 0,
      otaCommissionDetails: row.ota_commissions || [],
      upsellCommissions: row.upsell_commissions || 0,
      total: row.total,
      status: row.status,
      wompiReference: row.wompi_reference,
      paidAt: row.paid_at,
      createdAt: row.created_at,
    }));

    return { success: true, invoices };
  } catch (error: any) {
    console.error('[BILLING] Error leyendo historial:', error.message);
    return { success: false, error: error.message };
  }
}

// ——— Downgrade de Plan ———

/**
 * Solicita un downgrade de plan. El cambio se aplica al inicio del próximo ciclo.
 */
export async function requestPlanDowngradeAction(
  hotelId: string,
  newPlan: 'starter' | 'pro' | 'enterprise'
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Obtener hotel actual
    const { data: hotel, error: hotelError } = await supabaseAdmin
      .from('hotels')
      .select('id, subscription_plan, subscription_status')
      .eq('id', hotelId)
      .single();

    if (hotelError || !hotel) {
      throw new Error('Hotel no encontrado.');
    }

    // 2. Validar que sea un downgrade real
    const currentLevel = PLAN_LEVELS[hotel.subscription_plan as PlanKey] ?? 0;
    const newLevel = PLAN_LEVELS[newPlan];

    if (newLevel >= currentLevel) {
      throw new Error('El nuevo plan debe ser inferior al actual.');
    }

    // 3. Guardar como pending (se aplica al inicio del próximo ciclo)
    const { error: updateError } = await supabaseAdmin
      .from('hotels')
      .update({ pending_plan_change: newPlan })
      .eq('id', hotelId);

    if (updateError) {
      throw new Error('Error guardando el cambio de plan.');
    }

    // 📝 Audit log: downgrade solicitado
    await logAuditEvent({
      actor_type: 'user',
      actor_id: hotelId,
      action: 'downgrade_requested',
      entity_type: 'subscription',
      entity_id: hotelId,
      old_value: { plan: hotel.subscription_plan },
      new_value: { pending_plan: newPlan, applies_at: 'next_billing_cycle' },
    });

    // 📊 Analytics: downgrade solicitado
    await trackDowngradeRequested(hotelId, hotel.subscription_plan || 'starter', newPlan);

    console.log(`[BILLING] Downgrade solicitado: ${hotel.subscription_plan} → ${newPlan} para hotel ${hotelId}`);

    return { success: true };
  } catch (error: any) {
    console.error('[BILLING] Error en downgrade:', error.message);
    return { success: false, error: error.message };
  }
}
