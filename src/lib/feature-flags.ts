/**
 * Feature flags for gradual rollout of risky features.
 *
 * Usage:
 *   if (FEATURES.WIZARD_WOMPI_SUBSCRIPTION) {
 *     // new code path
 *   }
 *
 * Deactivate by flipping the env var — no code change needed.
 *
 * Runtime evaluation via isFeatureEnabled() adds database-backed overrides
 * with per-hotel granularity. Evaluation chain:
 *   per-hotel DB → global DB → static FEATURES → false
 */

import { supabaseAdmin } from '@/lib/supabase-admin';

function isEnabled(key: string): boolean {
  // Default to false unless explicitly enabled
  return process.env[`FEATURE_${key}`] === 'true';
}

export const FEATURES = {
  /** Create saas_subscriptions + save Wompi token on wizard provisioning */
  WIZARD_WOMPI_SUBSCRIPTION: isEnabled('WIZARD_WOMPI_SUBSCRIPTION'),
} as const;

/**
 * Runtime feature flag evaluation with per-hotel override support.
 *
 * Evaluation chain:
 *   1. Per-hotel DB override (if hotelId provided)
 *   2. Global DB flag (hotel_id IS NULL)
 *   3. Static FEATURES object fallback
 *   4. Return false if no match at any level
 *
 * @param flagKey - The flag key to check (e.g. 'WIZARD_WOMPI_SUBSCRIPTION')
 * @param hotelId - Optional hotel UUID for per-hotel override lookup
 * @returns Promise<boolean> — whether the feature is enabled
 */
export async function isFeatureEnabled(
  flagKey: string,
  hotelId?: string | null,
): Promise<boolean> {
  try {
    // Step 1: Check per-hotel override if hotelId is provided
    if (hotelId) {
      const { data: hotelOverride, error: hotelError } = await supabaseAdmin
        .from('feature_flags')
        .select('enabled')
        .eq('flag_key', flagKey)
        .eq('hotel_id', hotelId)
        .limit(1)
        .maybeSingle();

      if (!hotelError && hotelOverride) {
        return hotelOverride.enabled;
      }
    }

    // Step 2: Check global flag (hotel_id IS NULL)
    const { data: globalFlag, error: globalError } = await supabaseAdmin
      .from('feature_flags')
      .select('enabled')
      .eq('flag_key', flagKey)
      .is('hotel_id', null)
      .limit(1)
      .maybeSingle();

    if (!globalError && globalFlag) {
      return globalFlag.enabled;
    }

    // Step 3: Fall back to static FEATURES object
    if (flagKey in FEATURES) {
      return FEATURES[flagKey as keyof typeof FEATURES];
    }

    // Step 4: Unknown flag → false
    return false;
  } catch (err: any) {
    console.error(`[isFeatureEnabled] Error evaluating flag "${flagKey}":`, err.message);
    // On error, fall back to static FEATURES if available, else false
    if (flagKey in FEATURES) {
      return FEATURES[flagKey as keyof typeof FEATURES];
    }
    return false;
  }
}
