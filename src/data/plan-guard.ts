/**
 * Plan Guard — DAL Module
 *
 * Server-only authorization layer that enforces plan-based feature access.
 * All feature-gated operations MUST pass through this module.
 *
 * Usage:
 *   const guard = await requirePlan(hotelId, 'pro')
 *   if (!guard.ok) return { error: guard.reason } // Show upgrade prompt
 *
 * Pattern (Next.js best practice):
 *   1. Auth → verify user owns the hotel
 *   2. Authorization → check plan level
 *   3. Execute → perform the operation
 *   4. Revalidate → revalidateTag for cache invalidation
 */

import 'server-only'

import { PLAN_LIMITS, normalizePlan, PlanKey, hasPlanAccess, SAAS_PLANS } from '@/config/saas-plans'
import { getHotelWithPlan, verifyHotelOwnership } from './hotels'

// Re-export PlanKey for consumers
export type { PlanKey } from '@/config/saas-plans'

// ─── Result Types ─────────────────────────────────────────────
export type PlanGuardResult =
  | { ok: true; plan: string; limits: typeof PLAN_LIMITS[PlanKey] }
  | { ok: false; reason: string; currentPlan: string; upgradeTo?: PlanKey }

export type FeatureCheckResult =
  | { ok: true; plan: string; currentPlan: string }
  | { ok: false; reason: string; currentPlan: string; availableIn: PlanKey }

// ─── Core Guards ──────────────────────────────────────────────

/**
 * Require a minimum plan level for an action.
 * Returns ok:true if the hotel's plan meets or exceeds requiredPlan.
 */
export async function requirePlan(
  hotelId: string,
  requiredPlan: PlanKey
): Promise<PlanGuardResult> {
  const hotel = await getHotelWithPlan(hotelId)

  if (!hotel) {
    return { ok: false, reason: 'Hotel no encontrado', currentPlan: 'unknown' }
  }

  const current = normalizePlan(hotel.subscription_plan)
  const meetsRequirement = hasPlanAccess(current, requiredPlan)

  if (!meetsRequirement) {
    const currentLevel = PLAN_LIMITS[current]
    const requiredLevel = PLAN_LIMITS[requiredPlan]
    const upgradeTo: PlanKey = current === 'starter' ? 'pro' : 'enterprise'

    return {
      ok: false,
      reason: `Esta funcionalidad requiere el plan ${SAAS_PLANS[requiredPlan].label}. Tu plan actual: ${SAAS_PLANS[current].label}.`,
      currentPlan: current,
      upgradeTo,
    }
  }

  return {
    ok: true,
    plan: current,
    limits: PLAN_LIMITS[current],
  }
}

/**
 * Check if a specific feature is available for the hotel's plan.
 */
export async function checkPlanFeature(
  hotelId: string,
  feature: PlanFeature
): Promise<FeatureCheckResult> {
  const hotel = await getHotelWithPlan(hotelId)

  if (!hotel) {
    return { ok: false, reason: 'Hotel no encontrado', currentPlan: 'unknown', availableIn: 'starter' }
  }

  const plan = normalizePlan(hotel.subscription_plan)
  const limits = PLAN_LIMITS[plan]

  const featureAvailability: Record<PlanFeature, { available: boolean; minPlan: PlanKey }> = {
    channel_manager: { available: limits.maxChannels > 0, minPlan: 'pro' },
    carta_digital: { available: plan !== 'starter', minPlan: 'pro' },
    forensic_book: { available: plan !== 'starter', minPlan: 'pro' },
    pos: { available: plan !== 'starter', minPlan: 'pro' },
    reports_advanced: { available: plan === 'enterprise', minPlan: 'enterprise' },
    priority_support: { available: plan === 'enterprise', minPlan: 'enterprise' },
  }

  const featureInfo = featureAvailability[feature]

  if (!featureInfo.available) {
    return {
      ok: false,
      reason: `Tu plan ${SAAS_PLANS[plan].label} no incluye ${getFeatureLabel(feature)}. Disponible en plan ${SAAS_PLANS[featureInfo.minPlan].label}.`,
      currentPlan: plan,
      availableIn: featureInfo.minPlan,
    }
  }

  return { ok: true, plan, currentPlan: plan }
}

/**
 * Check Channel connection limit and return remaining slots.
 */
export async function checkChannelLimit(hotelId: string): Promise<{
  ok: boolean
  currentCount: number
  maxAllowed: number
  remaining: number
  plan: string
  reason?: string
}> {
  const hotel = await getHotelWithPlan(hotelId)

  if (!hotel) {
    return { ok: false, currentCount: 0, maxAllowed: 0, remaining: 0, plan: 'unknown', reason: 'Hotel no encontrado' }
  }

  const plan = normalizePlan(hotel.subscription_plan)
  const limits = PLAN_LIMITS[plan]

  if (limits.maxChannels === 0) {
    return {
      ok: false,
      currentCount: 0,
      maxAllowed: 0,
      remaining: 0,
      plan,
      reason: `Tu plan ${SAAS_PLANS[plan].label} no incluye el Seguro Anti-Sobreventa. Sube a Pro para conectar canales.`,
    }
  }

  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { count, error } = await supabase
    .from('rooms')
    .select('*', { count: 'exact', head: true })
    .eq('hotel_id', hotelId)
    .not('ical_import_url', 'is', null)

  if (error) {
    console.error('[PlanGuard] Error counting Channel connections:', error)
    return { ok: false, currentCount: 0, maxAllowed: limits.maxChannels, remaining: 0, plan, reason: 'Error verificando límites' }
  }

  const currentCount = count || 0
  const remaining = limits.maxChannels - currentCount

  if (remaining <= 0) {
    return {
      ok: false,
      currentCount,
      maxAllowed: limits.maxChannels,
      remaining: 0,
      plan,
      reason: `Alcanzaste el límite de ${limits.maxChannels} Channels de tu plan ${SAAS_PLANS[plan].label}.`,
    }
  }

  return {
    ok: true,
    currentCount,
    maxAllowed: limits.maxChannels,
    remaining,
    plan,
  }
}

/**
 * Check room/unit limit and return remaining slots.
 */
export async function checkUnitLimit(hotelId: string): Promise<{
  ok: boolean
  currentCount: number
  maxAllowed: number
  remaining: number
  plan: string
  reason?: string
}> {
  const hotel = await getHotelWithPlan(hotelId)

  if (!hotel) {
    return { ok: false, currentCount: 0, maxAllowed: 0, remaining: 0, plan: 'unknown', reason: 'Hotel no encontrado' }
  }

  const plan = normalizePlan(hotel.subscription_plan)
  const limits = PLAN_LIMITS[plan]

  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { count, error } = await supabase
    .from('rooms')
    .select('*', { count: 'exact', head: true })
    .eq('hotel_id', hotelId)

  if (error) {
    console.error('[PlanGuard] Error counting rooms:', error)
    return { ok: false, currentCount: 0, maxAllowed: limits.maxUnits, remaining: 0, plan, reason: 'Error verificando límites' }
  }

  const currentCount = count || 0
  const remaining = limits.maxUnits - currentCount

  if (remaining <= 0) {
    return {
      ok: false,
      currentCount,
      maxAllowed: limits.maxUnits,
      remaining: 0,
      plan,
      reason: `Alcanzaste el límite de ${limits.maxUnits} unidades de tu plan ${SAAS_PLANS[plan].label}. Subí a ${plan === 'starter' ? 'Pro' : 'Enterprise'} para tener más capacidad.`,
    }
  }

  return {
    ok: true,
    currentCount,
    maxAllowed: limits.maxUnits,
    remaining,
    plan,
  }
}

/**
 * Check staff limit and return remaining slots.
 */
export async function checkStaffLimit(hotelId: string): Promise<{
  ok: boolean
  currentCount: number
  maxAllowed: number
  remaining: number
  plan: string
  reason?: string
}> {
  const hotel = await getHotelWithPlan(hotelId)

  if (!hotel) {
    return { ok: false, currentCount: 0, maxAllowed: 0, remaining: 0, plan: 'unknown', reason: 'Hotel no encontrado' }
  }

  const plan = normalizePlan(hotel.subscription_plan)
  const limits = PLAN_LIMITS[plan]

  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { count, error } = await supabase
    .from('staff')
    .select('*', { count: 'exact', head: true })
    .eq('hotel_id', hotelId)

  if (error) {
    console.error('[PlanGuard] Error counting staff:', error)
    return { ok: false, currentCount: 0, maxAllowed: limits.maxStaff, remaining: 0, plan, reason: 'Error verificando límites' }
  }

  const currentCount = count || 0
  const remaining = limits.maxStaff - currentCount

  if (remaining <= 0) {
    return {
      ok: false,
      currentCount,
      maxAllowed: limits.maxStaff,
      remaining: 0,
      plan,
      reason: `Alcanzaste el límite de ${limits.maxStaff} cuentas de staff de tu plan ${SAAS_PLANS[plan].label}.`,
    }
  }

  return {
    ok: true,
    currentCount,
    maxAllowed: limits.maxStaff,
    remaining,
    plan,
  }
}

// ─── Helpers ──────────────────────────────────────────────────

type PlanFeature = 'channel_manager' | 'carta_digital' | 'forensic_book' | 'pos' | 'reports_advanced' | 'priority_support'

function getFeatureLabel(feature: PlanFeature): string {
  const labels: Record<PlanFeature, string> = {
    channel_manager: 'Seguro Anti-Sobreventa',
    carta_digital: 'Carta Digital',
    forensic_book: 'Libro Registro Forense',
    pos: 'Punto de Venta (POS)',
    reports_advanced: 'Reportes Avanzados',
    priority_support: 'Soporte Prioritario',
  }
  return labels[feature]
}
