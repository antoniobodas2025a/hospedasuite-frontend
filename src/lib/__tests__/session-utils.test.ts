import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { signSession, verifySession, forgeSession, getSessionCookieOptions } from '../session-utils';

// Mock environment variable
const ORIGINAL_ENV = process.env.SESSION_SECRET;

beforeEach(() => {
  vi.stubEnv('SESSION_SECRET', 'test-secret-key-for-unit-tests-32bytes!');
});

afterEach(() => {
  if (ORIGINAL_ENV !== undefined) {
    vi.stubEnv('SESSION_SECRET', ORIGINAL_ENV);
  } else {
    vi.unstubAllEnvs();
  }
});

describe('session-utils', () => {
  const validSession = {
    id: 'staff-123',
    name: 'John Doe',
    role: 'Administrador',
    hotel_id: 'hotel-456',
  };

  describe('signSession', () => {
    it('should return a signed string with payload.signature format', () => {
      const signed = signSession(validSession);
      const parts = signed.split('.');
      
      expect(parts).toHaveLength(2);
      expect(parts[0]).toBeDefined(); // base64 payload
      expect(parts[1]).toBeDefined(); // hex signature
      expect(parts[1]).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex
    });

    it('should produce different signatures for different sessions', () => {
      const signed1 = signSession(validSession);
      const signed2 = signSession({ ...validSession, id: 'different' });
      
      expect(signed1).not.toBe(signed2);
    });

    it('should produce same signature for same input', () => {
      const signed1 = signSession(validSession);
      const signed2 = signSession(validSession);
      
      expect(signed1).toBe(signed2);
    });
  });

  describe('verifySession', () => {
    it('should verify a valid signed session', () => {
      const signed = signSession(validSession);
      const result = verifySession(signed);
      
      expect(result).toEqual(validSession);
    });

    it('should return null for tampered payload', () => {
      const signed = signSession(validSession);
      const [payload, signature] = signed.split('.');
      
      // Tamper with payload
      const tamperedPayload = Buffer.from(JSON.stringify({ ...validSession, role: 'SuperAdmin' })).toString('base64');
      const tampered = `${tamperedPayload}.${signature}`;
      
      const result = verifySession(tampered);
      expect(result).toBeNull();
    });

    it('should return null for tampered signature', () => {
      const signed = signSession(validSession);
      const [payload] = signed.split('.');
      
      // Tamper with signature
      const tampered = `${payload}.0000000000000000000000000000000000000000000000000000000000000000`;
      
      const result = verifySession(tampered);
      expect(result).toBeNull();
    });

    it('should return null for empty string', () => {
      const result = verifySession('');
      expect(result).toBeNull();
    });

    it('should return null for string without signature', () => {
      const result = verifySession('payload-only');
      expect(result).toBeNull();
    });

    it('should return null for corrupted base64', () => {
      const result = verifySession('!!!invalid-base64!!!.signature');
      expect(result).toBeNull();
    });

    it('should return null for missing required fields', () => {
      const incompleteSession = { id: '123', name: 'John' }; // missing role, hotel_id
      const signed = signSession(incompleteSession as any);
      const result = verifySession(signed);
      
      expect(result).toBeNull();
    });
  });

  describe('forgeSession', () => {
    it('should create a forged session (test helper only)', () => {
      const signed = signSession(validSession);
      const forged = forgeSession(signed, { role: 'SuperAdmin' });
      
      expect(forged).not.toBeNull();
      
      const result = verifySession(forged!);
      expect(result).not.toBeNull();
      expect(result?.role).toBe('SuperAdmin');
      expect(result?.id).toBe(validSession.id);
    });

    it('should return null if original session is invalid', () => {
      const forged = forgeSession('invalid-session', { role: 'SuperAdmin' });
      expect(forged).toBeNull();
    });
  });

  describe('getSessionCookieOptions', () => {
    it('should return valid cookie options', () => {
      const options = getSessionCookieOptions();
      
      expect(options.httpOnly).toBe(true);
      expect(options.sameSite).toBe('lax');
      expect(options.path).toBe('/');
      expect(options.maxAge).toBe(43200); // 12 hours
    });

    it('should set secure in production', () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      const options = getSessionCookieOptions();
      expect(options.secure).toBe(true);
      
      process.env.NODE_ENV = originalNodeEnv;
    });
  });

  describe('security', () => {
    it('should throw if SESSION_SECRET is missing', () => {
      vi.unstubAllEnvs();
      vi.stubEnv('SESSION_SECRET', '');
      
      expect(() => signSession(validSession)).toThrow('SESSION_SECRET');
      
      // Restore for other tests
      vi.stubEnv('SESSION_SECRET', 'test-secret-key-for-unit-tests-32bytes!');
    });

    it('should use timing-safe comparison', () => {
      const signed = signSession(validSession);
      const [payload, signature] = signed.split('.');
      
      // Create a signature that differs by only one byte
      const altSignature = '0' + signature.slice(1);
      
      const result = verifySession(`${payload}.${altSignature}`);
      expect(result).toBeNull();
    });
  });
});
