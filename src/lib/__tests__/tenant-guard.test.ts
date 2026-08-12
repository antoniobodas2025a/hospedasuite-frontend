import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { requireHotelAccess, tenantQuery, tenantInsert } from '../tenant-guard';
import { signSession } from '../session-utils';

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

describe('tenant-guard', () => {
  describe('requireHotelAccess', () => {
    it('should return allowed=false when no session cookie', async () => {
      const result = await requireHotelAccess('hotel-123');

      expect(result.allowed).toBe(false);
      expect(result.error).toBe('No session cookie provided');
    });

    it('should return allowed=false when session is tampered', async () => {
      const validSession = signSession({
        id: '123',
        name: 'Test',
        role: 'Administrador',
        hotel_id: 'hotel-123',
      });

      const [payload] = validSession.split('.');
      const tampered = `${payload}.0000000000000000000000000000000000000000000000000000000000000000`;

      const result = await requireHotelAccess('hotel-123', tampered);

      expect(result.allowed).toBe(false);
      expect(result.error).toBe('Invalid session');
    });

    it('should return allowed=false when hotel_id mismatch', async () => {
      const session = signSession({
        id: '123',
        name: 'Test',
        role: 'Administrador',
        hotel_id: 'hotel-456',
      });

      const result = await requireHotelAccess('hotel-123', session);

      expect(result.allowed).toBe(false);
      expect(result.error).toContain('hotel_id mismatch');
    });

    it('should return allowed=true when hotel_id matches', async () => {
      const session = signSession({
        id: '123',
        name: 'Test',
        role: 'Administrador',
        hotel_id: 'hotel-123',
      });

      const result = await requireHotelAccess('hotel-123', session);

      expect(result.allowed).toBe(true);
      expect(result.session).toBeDefined();
      expect(result.session?.hotel_id).toBe('hotel-123');
    });
  });

  describe('tenantQuery', () => {
    it('should add hotel_id filter to query', () => {
      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
      };

      const result = tenantQuery(mockQuery, 'hotel-123');

      expect(mockQuery.eq).toHaveBeenCalledWith('hotel_id', 'hotel-123');
      expect(result).toBe(mockQuery);
    });
  });

  describe('tenantInsert', () => {
    it('should add hotel_id to data', () => {
      const data = { name: 'Test Room', price: 100 };

      const result = tenantInsert(data, 'hotel-123');

      expect(result).toEqual({ name: 'Test Room', price: 100, hotel_id: 'hotel-123' });
    });

    it('should overwrite existing hotel_id', () => {
      const data = { name: 'Test Room', hotel_id: 'hotel-456' };

      const result = tenantInsert(data, 'hotel-123');

      expect(result.hotel_id).toBe('hotel-123');
    });
  });
});
