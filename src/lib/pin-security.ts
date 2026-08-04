/**
 * PIN Security — Pure utility functions for staff PIN management.
 * 
 * Uses Web Crypto API for SHA-256 hashing. No external dependencies.
 * Salted hashes prevent rainbow table attacks.
 * Timing-safe comparison prevents timing attacks.
 * 
 * Usage:
 *   const hash = await hashPin('1234');
 *   const isValid = await verifyPin('1234', storedHash);
 */

import { timingSafeEqual } from 'crypto';

// ============================================================================
// PIN SECURITY - SHA-256 with salt, timing-safe comparison
// ============================================================================

/**
 * Returns the PIN salt from environment.
 * Throws immediately if missing — never use a fallback.
 */
function getPinSalt(): string {
  const salt = process.env.PIN_SALT;
  if (!salt) {
    throw new Error(
      'PIN_SALT environment variable is required. ' +
      'Set it to a random string for production.'
    );
  }
  return salt;
}

/**
 * Hashes a PIN using SHA-256 with a salt.
 * Salt is read from environment at call time.
 */
export async function hashPin(pin: string): Promise<string> {
  const salt = getPinSalt();
  const encoder = new TextEncoder();
  const data = encoder.encode(pin + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verifies a PIN against a stored hash using timing-safe comparison.
 * Prevents timing attacks that could leak hash bytes.
 */
export async function verifyPinHash(pin: string, storedHash: string): Promise<boolean> {
  const computedHash = await hashPin(pin);
  
  // Convert to buffers for timing-safe comparison
  const storedBuffer = Buffer.from(storedHash, 'hex');
  const computedBuffer = Buffer.from(computedHash, 'hex');
  
  // Timing-safe comparison — always compares all bytes
  return storedBuffer.length === computedBuffer.length && 
         timingSafeEqual(storedBuffer, computedBuffer);
}

/**
 * Generates a random 6-digit PIN for new staff members.
 * Returns the plain PIN (to be shown to user) and its hash (to be stored).
 */
export async function generatePin(): Promise<{ plain: string; hash: string }> {
  const plain = String(Math.floor(100000 + Math.random() * 900000));
  const hash = await hashPin(plain);
  return { plain, hash };
}

/**
 * Verifies a PIN against a stored hash.
 */
export async function verifyPinHash(pin: string, storedHash: string): Promise<boolean> {
  const computedHash = await hashPin(pin);
  return computedHash === storedHash;
}
