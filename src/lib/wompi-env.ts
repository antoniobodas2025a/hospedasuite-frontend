/**
 * Wompi Environment Configuration
 *
 * Manages sandbox vs production mode for Wompi integration.
 * Provides typed access to keys based on environment.
 */

export type WompiEnvironment = 'sandbox' | 'production';

export interface WompiConfig {
  publicKey: string;
  integritySecret: string;
  environment: WompiEnvironment;
  isSandbox: boolean;
}

/**
 * Determines the current Wompi environment based on:
 * 1. Explicit WOMPI_ENV environment variable
 * 2. Fallback to NODE_ENV (production -> production, else sandbox)
 */
export function getWompiEnvironment(): WompiEnvironment {
  const explicit = process.env.WOMPI_ENV;
  if (explicit === 'sandbox' || explicit === 'production') {
    return explicit;
  }
  return process.env.NODE_ENV === 'production' ? 'production' : 'sandbox';
}

/**
 * Gets the effective Wompi configuration for a hotel.
 * Uses hotel keys if available, falls back to platform keys.
 */
export function getWompiConfig(
  hotelPublicKey?: string | null,
  hotelIntegritySecret?: string | null
): WompiConfig {
  const env = getWompiEnvironment();
  const isSandbox = env === 'sandbox';

  // Use hotel keys if available, otherwise fallback to platform keys
  const publicKey = hotelPublicKey || process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY || '';
  const integritySecret = hotelIntegritySecret || process.env.WOMPI_PLATFORM_INTEGRITY_SECRET || '';

  return {
    publicKey,
    integritySecret,
    environment: env,
    isSandbox,
  };
}

/**
 * Validates that Wompi configuration is complete.
 * Returns true only if both public key and integrity secret are present.
 */
export function isWompiConfigured(config: WompiConfig): boolean {
  return config.publicKey.length > 0 && config.integritySecret.length > 0;
}

/**
 * Gets a display label for the current Wompi environment.
 */
export function getWompiEnvironmentLabel(): string {
  const env = getWompiEnvironment();
  return env === 'sandbox' ? '🧪 Sandbox' : '🟢 Producción';
}
