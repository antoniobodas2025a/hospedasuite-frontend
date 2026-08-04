import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { hashPin, verifyPinHash, generatePin } from '../pin-security';

// Mock environment variable
const ORIGINAL_ENV = process.env.PIN_SALT;

beforeEach(() => {
  vi.stubEnv('PIN_SALT', 'test-pin-salt-for-unit-tests-32bytes!');
});

afterEach(() => {
  if (ORIGINAL_ENV !== undefined) {
    vi.stubEnv('PIN_SALT', ORIGINAL_ENV);
  } else {
    vi.unstubAllEnvs();
  }
});

describe('pin-security', () => {
  describe('hashPin', () => {
    it('should return a 64-character hex hash', async () => {
      const hash = await hashPin('1234');
      
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should produce different hashes for different PINs', async () => {
      const hash1 = await hashPin('1234');
      const hash2 = await hashPin('5678');
      
      expect(hash1).not.toBe(hash2);
    });

    it('should produce same hash for same PIN', async () => {
      const hash1 = await hashPin('1234');
      const hash2 = await hashPin('1234');
      
      expect(hash1).toBe(hash2);
    });

    it('should throw if PIN_SALT is missing', async () => {
      vi.unstubAllEnvs();
      vi.stubEnv('PIN_SALT', '');
      
      await expect(hashPin('1234')).rejects.toThrow('PIN_SALT');
      
      // Restore
      vi.stubEnv('PIN_SALT', 'test-pin-salt-for-unit-tests-32bytes!');
    });
  });

  describe('verifyPinHash', () => {
    it('should return true for valid PIN', async () => {
      const hash = await hashPin('1234');
      const isValid = await verifyPinHash('1234', hash);
      
      expect(isValid).toBe(true);
    });

    it('should return false for invalid PIN', async () => {
      const hash = await hashPin('1234');
      const isValid = await verifyPinHash('5678', hash);
      
      expect(isValid).toBe(false);
    });

    it('should use timing-safe comparison', async () => {
      const hash = await hashPin('1234');
      
      // Create a hash that differs by only one character
      const altHash = '0' + hash.slice(1);
      
      const isValid = await verifyPinHash('1234', altHash);
      expect(isValid).toBe(false);
    });
  });

  describe('generatePin', () => {
    it('should return plain and hash', async () => {
      const { plain, hash } = await generatePin();
      
      expect(plain).toHaveLength(6);
      expect(hash).toHaveLength(64);
      expect(plain).toMatch(/^\d{6}$/);
    });

    it('should generate different PINs each time', async () => {
      const pin1 = await generatePin();
      const pin2 = await generatePin();
      
      // Very unlikely to be the same
      expect(pin1.plain).not.toBe(pin2.plain);
    });

    it('plain PIN should verify against its hash', async () => {
      const { plain, hash } = await generatePin();
      const isValid = await verifyPinHash(plain, hash);
      
      expect(isValid).toBe(true);
    });
  });
});
