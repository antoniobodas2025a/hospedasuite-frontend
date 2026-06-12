/**
 * Plan Actions — Server Actions for Plan Gating
 *
 * Thin server actions that delegate to the DAL (src/data/plan-guard.ts).
 * Called from client components to check plan access before rendering features.
 *
 * Pattern (Next.js best practice):
 *   - 'use server' directive
 *   - Delegates to DAL for auth + authorization
 *   - Returns minimal result (no sensitive data)
 */

'use server'

import { checkPlanFeature, requirePlan, checkChannelLimit, checkUnitLimit, checkStaffLimit, type PlanKey } from '@/data/plan-guard'

// ─── Feature Access ───────────────────────────────────────────

/**
 * Check if a hotel has access to a specific feature.
 * Called from client components to conditionally render features.
 */
export async function checkPlanAccess(
  hotelId: string,
  feature: string
): Promise<{ ok: boolean; reason?: string; currentPlan?: string; availableIn?: PlanKey }> {
  const result = await checkPlanFeature(hotelId, feature as any)
  return {
    ok: result.ok,
    reason: result.ok ? undefined : result.reason,
    currentPlan: result.currentPlan,
    availableIn: result.ok ? undefined : result.availableIn,
  }
}

/**
 * Require a minimum plan level for an action.
 * Returns error with upgrade info if the plan is insufficient.
 */
export async function requirePlanAction(
  hotelId: string,
  requiredPlan: string
): Promise<{ ok: boolean; reason?: string; currentPlan?: string; upgradeTo?: PlanKey }> {
  const result = await requirePlan(hotelId, requiredPlan as PlanKey)
  return {
    ok: result.ok,
    reason: result.ok ? undefined : result.reason,
    currentPlan: result.ok ? result.plan : result.currentPlan,
    upgradeTo: result.ok ? undefined : result.upgradeTo,
  }
}

// ─── Limit Checks ─────────────────────────────────────────────

/**
 * Check Channel connection limit.
 */
export async function checkChannelLimitAction(hotelId: string) {
  return await checkChannelLimit(hotelId)
}

/**
 * Check room/unit limit.
 */
export async function checkUnitLimitAction(hotelId: string) {
  return await checkUnitLimit(hotelId)
}

/**
 * Check staff limit.
 */
export async function checkStaffLimitAction(hotelId: string) {
  return await checkStaffLimit(hotelId)
}

// ─── Plan Info ────────────────────────────────────────────────

/**
 * Get current plan info for a hotel.
 */
export async function getHotelPlanAction(hotelId: string): Promise<{
  ok: boolean
  plan?: string
  status?: string
  trialEndsAt?: string | null
  error?: string
}> {
  try {
    const { getHotelWithPlan } = await import('@/data/hotels')
    const hotel = await getHotelWithPlan(hotelId)

    if (!hotel) {
      return { ok: false, error: 'Hotel not found' }
    }

    return {
      ok: true,
      plan: hotel.subscription_plan,
      status: hotel.subscription_status,
      trialEndsAt: hotel.trial_ends_at,
    }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
