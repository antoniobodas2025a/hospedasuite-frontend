import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withRateLimit, withQStashSignature } from '../api-guards';
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

// Mock createClient
vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: new Error('Not authenticated') }),
    },
  })),
}));

describe('api-guards', () => {
  const mockHandler = vi.fn().mockResolvedValue(NextResponse.json({ success: true }));
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('withAuth', () => {
    it('should return 401 when no session cookie', async () => {
      const guard = withAuth(mockHandler);
      const req = new NextRequest('http://localhost/api/test');
      
      const response = await guard(req);
      const body = await response.json();
      
      expect(response.status).toBe(401);
      expect(body.error).toBe('Authentication required');
      expect(mockHandler).not.toHaveBeenCalled();
    });

    it('should return 401 when session is tampered', async () => {
      const guard = withAuth(mockHandler);
      const req = new NextRequest('http://localhost/api/test');
      
      // Create a valid session, then tamper with it
      const validSession = signSession({
        id: '123',
        name: 'Test',
        role: 'Administrador',
        hotel_id: 'hotel-123',
      });
      
      // Tamper: change the signature
      const [payload] = validSession.split('.');
      const tampered = `${payload}.0000000000000000000000000000000000000000000000000000000000000000`;
      
      req.cookies.set('hospeda_staff_session', tampered);
      
      const response = await guard(req);
      const body = await response.json();
      
      expect(response.status).toBe(401);
      expect(body.error).toBe('Invalid or tampered session');
    });

    it('should call handler when session is valid', async () => {
      const guard = withAuth(mockHandler);
      const req = new NextRequest('http://localhost/api/test');
      
      const session = signSession({
        id: '123',
        name: 'Test',
        role: 'Administrador',
        hotel_id: 'hotel-123',
      });
      
      req.cookies.set('hospeda_staff_session', session);
      
      const response = await guard(req);
      
      expect(mockHandler).toHaveBeenCalled();
      expect(response.status).toBe(200);
    });

    it('should return 403 when role is hotel_owner but staff is not Administrador', async () => {
      const guard = withAuth(mockHandler, { role: 'hotel_owner' });
      const req = new NextRequest('http://localhost/api/test');
      
      const session = signSession({
        id: '123',
        name: 'Test',
        role: 'Cajero', // Not Administrador
        hotel_id: 'hotel-123',
      });
      
      req.cookies.set('hospeda_staff_session', session);
      
      const response = await guard(req);
      const body = await response.json();
      
      expect(response.status).toBe(403);
      expect(body.error).toBe('Hotel owner access required');
    });
  });

  describe('withRateLimit', () => {
    it('should allow request within rate limit', async () => {
      const guard = withRateLimit(mockHandler, { limit: 5, windowMs: 60000 });
      const req = new NextRequest('http://localhost/api/test');
      
      const response = await guard(req);
      
      expect(mockHandler).toHaveBeenCalled();
      expect(response.status).toBe(200);
    });

    it('should block request when rate limit exceeded', async () => {
      const guard = withRateLimit(mockHandler, { limit: 2, windowMs: 60000 });
      const req = new NextRequest('http://localhost/api/test');
      
      // Make 2 requests (at limit)
      await guard(req);
      await guard(req);
      
      // Third request should be blocked
      const response = await guard(req);
      const body = await response.json();
      
      expect(response.status).toBe(429);
      expect(body.error).toBe('Rate limit exceeded');
    });
  });

  describe('withQStashSignature', () => {
    it('should return 401 when no signature header', async () => {
      const guard = withQStashSignature(mockHandler);
      const req = new NextRequest('http://localhost/api/test');
      
      const response = await guard(req);
      const body = await response.json();
      
      expect(response.status).toBe(401);
      expect(body.error).toBe('Missing QStash signature');
    });

    it('should call handler when signature is present', async () => {
      const guard = withQStashSignature(mockHandler);
      const req = new NextRequest('http://localhost/api/test');
      req.headers.set('upstash-signature', 'test-signature-12345678');
      
      // Mock QSTASH_SIGNING_SECRET
      process.env.QSTASH_SIGNING_SECRET = 'test-secret';
      
      const response = await guard(req);
      
      expect(mockHandler).toHaveBeenCalled();
      
      delete process.env.QSTASH_SIGNING_SECRET;
    });
  });
});
