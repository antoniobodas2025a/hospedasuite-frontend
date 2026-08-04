import { createHmac, timingSafeEqual } from 'crypto';

// ============================================================================
// SESSION UTILITIES - HMAC-signed cookies for staff sessions
// ============================================================================

const ALGORITHM = 'sha256';
const MAX_AGE_SECONDS = 60 * 60 * 12; // 12 hours

// ============================================================================
// TYPES
// ============================================================================

export interface StaffSession {
  id: string;
  name: string;
  role: string;
  hotel_id: string;
}

interface SignedSession {
  payload: string;
  signature: string;
}

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Validates that SESSION_SECRET is configured.
 * Throws immediately if missing — never use a fallback.
 */
function validateSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error(
      'SESSION_SECRET environment variable is required. ' +
      'Set it to a 32+ byte random string.'
    );
  }
  return secret;
}

/**
 * Creates HMAC signature for a payload.
 * Uses timing-safe comparison for security.
 */
function createSignature(payload: string): string {
  const secret = validateSecret();
  return createHmac(ALGORITHM, secret)
    .update(payload)
    .digest('hex');
}

/**
 * Verifies HMAC signature using timing-safe comparison.
 * Prevents timing attacks that could leak signature bytes.
 */
function verifySignature(payload: string, signature: string): boolean {
  const expected = createSignature(payload);
  
  // Convert to buffers for timing-safe comparison
  const sigBuffer = Buffer.from(signature, 'hex');
  const expectedBuffer = Buffer.from(expected, 'hex');
  
  // Timing-safe comparison — always compares all bytes
  return sigBuffer.length === expectedBuffer.length && 
         timingSafeEqual(sigBuffer, expectedBuffer);
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Signs a staff session and returns cookie value.
 * Format: `{base64-payload}.{hex-signature}`
 */
export function signSession(session: StaffSession): string {
  const payload = JSON.stringify(session);
  const signature = createSignature(payload);
  
  // Base64 encode payload for safe cookie storage
  const encodedPayload = Buffer.from(payload).toString('base64');
  
  return `${encodedPayload}.${signature}`;
}

/**
 * Verifies and decodes a signed session cookie.
 * Returns null if signature is invalid or payload is corrupted.
 */
export function verifySession(signedValue: string): StaffSession | null {
  try {
    const [encodedPayload, signature] = signedValue.split('.');
    
    if (!encodedPayload || !signature) {
      return null;
    }
    
    // Decode payload
    const payload = Buffer.from(encodedPayload, 'base64').toString('utf-8');
    
    // Verify signature (timing-safe)
    if (!verifySignature(payload, signature)) {
      return null;
    }
    
    // Parse and validate session structure
    const session = JSON.parse(payload) as StaffSession;
    
    // Validate required fields
    if (!session.id || !session.name || !session.role || !session.hotel_id) {
      return null;
    }
    
    return session;
  } catch {
    return null;
  }
}

/**
 * Tests if a session value has been tampered with.
 * Used in unit tests only.
 */
export function forgeSession(original: string, modifications: Partial<StaffSession>): string | null {
  try {
    const session = verifySession(original);
    if (!session) return null;
    
    const forged = { ...session, ...modifications };
    return signSession(forged);
  } catch {
    return null;
  }
}

/**
 * Returns cookie options for staff session.
 */
export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  };
}
