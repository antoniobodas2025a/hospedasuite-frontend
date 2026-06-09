/**
 * PIN Security — Pure utility functions for staff PIN management.
 * 
 * Uses Web Crypto API for SHA-256 hashing. No external dependencies.
 * Salted hashes prevent rainbow table attacks.
 * 
 * Usage:
 *   const hash = await hashPin('1234');
 *   const isValid = await verifyPin('1234', storedHash);
 */

// Static salt for consistency across server instances.
// In production, this should be an environment variable.
const PIN_SALT = process.env.PIN_SALT || 'hospedasuite-pin-salt-v1';

/**
 * Hashes a PIN using SHA-256 with a static salt.
 */
export async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin + PIN_SALT);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verifies a PIN against a stored hash.
 */
export async function verifyPinHash(pin: string, storedHash: string): Promise<boolean> {
  const computedHash = await hashPin(pin);
  return computedHash === storedHash;
}
