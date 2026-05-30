/**
 * Feature flags for gradual rollout of risky features.
 *
 * Usage:
 *   if (FEATURES.WIZARD_WOMPI_SUBSCRIPTION) {
 *     // new code path
 *   }
 *
 * Deactivate by flipping the env var — no code change needed.
 */

function isEnabled(key: string): boolean {
  // Default to false unless explicitly enabled
  return process.env[`FEATURE_${key}`] === 'true';
}

export const FEATURES = {
  /** Create saas_subscriptions + save Wompi token on wizard provisioning */
  WIZARD_WOMPI_SUBSCRIPTION: isEnabled('WIZARD_WOMPI_SUBSCRIPTION'),
} as const;
