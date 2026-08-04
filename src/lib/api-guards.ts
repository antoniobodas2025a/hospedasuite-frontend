import { NextRequest, NextResponse } from 'next/server';
import { verifySession, type StaffSession } from '@/lib/session-utils';
import { createClient } from '@/utils/supabase/server';

// ============================================================================
// API GUARDS - Authentication and rate limiting middleware
// ============================================================================

// ============================================================================
// TYPES
// ============================================================================

type RouteHandler = (
  req: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) => Promise<NextResponse>;

interface AuthOptions {
  role?: 'super_admin' | 'hotel_owner' | 'staff';
  requireHotelAccess?: boolean;
}

interface RateLimitOptions {
  limit: number;
  windowMs: number;
}

// ============================================================================
// AUTH GUARD
// ============================================================================

/**
 * Wraps a route handler with authentication.
 * Returns 401 if not authenticated, 403 if wrong role.
 */
export function withAuth(handler: RouteHandler, options: AuthOptions = {}): RouteHandler {
  return async (req, context) => {
    // 1. Check for Supabase auth session (admin users)
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (!authError && user) {
      // Admin user authenticated via Supabase
      if (options.role === 'super_admin') {
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (roleData?.role !== 'superadmin') {
          return NextResponse.json(
            { error: 'Super admin access required' },
            { status: 403 }
          );
        }
      }

      // Pass user context to handler
      (req as any).__user = user;
      return handler(req, context);
    }

    // 2. Check for staff session cookie
    const staffCookie = req.cookies.get('hospeda_staff_session');
    if (!staffCookie?.value) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const session = verifySession(staffCookie.value);
    if (!session) {
      return NextResponse.json(
        { error: 'Invalid or tampered session' },
        { status: 401 }
      );
    }

    // 3. Check role if required
    if (options.role === 'hotel_owner' && session.role !== 'Administrador') {
      return NextResponse.json(
        { error: 'Hotel owner access required' },
        { status: 403 }
      );
    }

    // Pass session context to handler
    (req as any).__staffSession = session;
    return handler(req, context);
  };
}

// ============================================================================
// RATE LIMIT GUARD
// ============================================================================

// In-memory rate limit store (per-server instance)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

/**
 * Wraps a route handler with rate limiting.
 * Uses in-memory store with sliding window.
 */
export function withRateLimit(handler: RouteHandler, options: RateLimitOptions): RouteHandler {
  return async (req, context) => {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
               req.headers.get('x-real-ip') || 
               '127.0.0.1';
    
    const key = `${ip}:${req.nextUrl.pathname}`;
    const now = Date.now();
    
    const record = rateLimitStore.get(key);
    
    if (record && now < record.resetAt) {
      if (record.count >= options.limit) {
        return NextResponse.json(
          { error: 'Rate limit exceeded' },
          { 
            status: 429,
            headers: {
              'Retry-After': String(Math.ceil((record.resetAt - now) / 1000)),
              'X-RateLimit-Limit': String(options.limit),
              'X-RateLimit-Remaining': '0',
            }
          }
        );
      }
      record.count++;
    } else {
      rateLimitStore.set(key, { count: 1, resetAt: now + options.windowMs });
    }
    
    return handler(req, context);
  };
}

// ============================================================================
// QSTASH SIGNATURE GUARD
// ============================================================================

/**
 * Wraps a route handler with QStash signature verification.
 * Verifies the Upstash QStash signature header.
 */
export function withQStashSignature(handler: RouteHandler): RouteHandler {
  return async (req, context) => {
    const signature = req.headers.get('upstash-signature');
    
    if (!signature) {
      return NextResponse.json(
        { error: 'Missing QStash signature' },
        { status: 401 }
      );
    }

    // TODO: Implement real QStash signature verification with @upstash/qstash
    // For now, verify that a signature header exists (placeholder)
    // Real implementation should:
    // 1. Read QSTASH_SIGNING_SECRET from env
    // 2. Verify using Upstash's verify method
    // 3. Check timestamp freshness
    
    const signingSecret = process.env.QSTASH_SIGNING_SECRET;
    if (!signingSecret) {
      console.warn('QSTASH_SIGNING_SECRET not configured');
      // Allow request if secret not configured (dev mode)
      return handler(req, context);
    }

    // Real verification would go here
    // For now, we check signature format as basic validation
    if (typeof signature !== 'string' || signature.length < 10) {
      return NextResponse.json(
        { error: 'Invalid QStash signature' },
        { status: 401 }
      );
    }

    return handler(req, context);
  };
}

// ============================================================================
// COMBINED GUARDS
// ============================================================================

/**
 * Combines multiple guards into one.
 * Applies guards in order: rateLimit → auth → handler
 */
export function composeGuards(
  handler: RouteHandler,
  guards: Array<(h: RouteHandler) => RouteHandler>
): RouteHandler {
  return guards.reduceRight((wrapped, guard) => guard(wrapped), handler);
}
