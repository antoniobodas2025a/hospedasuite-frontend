import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { checkRateLimit } from '@/lib/redis-rate-limiter';

// 🛡️ CONFIGURACIÓN DE RATE LIMITING
const RATE_LIMIT_WINDOW_MS = 60000; // Ventana de 1 minuto
const MAX_REQUESTS_PER_WINDOW = 60; // Límite: 60 peticiones por minuto

// 🛡️ FALLBACK: Rate limiting en memoria para desarrollo (sin Redis)
const ipMap = new Map<string, { count: number; lastReset: number }>();

function checkRateLimitMemory(ip: string): { success: boolean; retryAfter?: number } {
  const now = Date.now();
  const ipRecord = ipMap.get(ip);

  if (!ipRecord || now - ipRecord.lastReset > RATE_LIMIT_WINDOW_MS) {
    ipMap.set(ip, { count: 1, lastReset: now });
    return { success: true };
  }

  ipRecord.count += 1;
  if (ipRecord.count > MAX_REQUESTS_PER_WINDOW) {
    const resetAt = ipRecord.lastReset + RATE_LIMIT_WINDOW_MS;
    const retryAfter = Math.ceil((resetAt - now) / 1000);
    return { success: false, retryAfter };
  }

  return { success: true };
}

/**
 * Gets client IP safely.
 * Uses x-forwarded-for only in production (behind known proxy).
 * Falls back to direct connection IP.
 */
function getClientIp(request: NextRequest): string {
  // In production behind Coolify/Hetzner proxy, use x-forwarded-for
  if (process.env.NODE_ENV === 'production') {
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
      // Take first IP (original client)
      const firstIp = forwarded.split(',')[0]?.trim();
      if (firstIp) return firstIp;
    }
  }
  
  // Fallback to direct connection or x-real-ip
  return request.headers.get('x-real-ip') || '127.0.0.1';
}

export async function updateSession(request: NextRequest, initialResponse?: NextResponse) {
  // --- 🛡️ BARRERA 1: RATE LIMITING (Zero-Trust) ---
  const ip = getClientIp(request);
  
  // Skip rate limiting for localhost in development
  const isLocalhost = process.env.NODE_ENV !== 'production' && 
    (ip === '::1' || ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.'));
  
  if (!isLocalhost) {
    let rateLimitResult;
    
    // Usar Redis en producción, fallback a memoria en desarrollo
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      rateLimitResult = await checkRateLimit(ip, {
        maxRequests: MAX_REQUESTS_PER_WINDOW,
        windowMs: RATE_LIMIT_WINDOW_MS,
      });
    } else {
      const memoryResult = checkRateLimitMemory(ip);
      rateLimitResult = {
        success: memoryResult.success,
        remaining: 0,
        resetAt: Date.now() + RATE_LIMIT_WINDOW_MS,
        retryAfter: memoryResult.retryAfter,
      };
    }

    if (!rateLimitResult.success) {
      console.warn(`🚨 [SEC-OPS] Rate limit exceeded. IP: ${ip}`);
      return new NextResponse(
        JSON.stringify({ 
          error: 'Too Many Requests', 
          message: 'Detectamos tráfico inusual. Por favor, espera un momento.',
          retryAfter: rateLimitResult.retryAfter 
        }),
        { 
          status: 429, 
          headers: { 
            'Content-Type': 'application/json',
            'Retry-After': String(rateLimitResult.retryAfter || 60)
          } 
        }
      );
    }
  }

  // --- 🛡️ BARRERA 2: GESTIÓN DE SESIÓN Y SEGURIDAD DE RUTAS ---
  // Usar el response inicial si viene de otro middleware (ej: next-intl)
  let supabaseResponse = initialResponse ?? NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          // Clone the initial response preserving headers and status
          if (initialResponse) {
            supabaseResponse = new NextResponse(initialResponse.body, {
              status: initialResponse.status,
              statusText: initialResponse.statusText,
              headers: initialResponse.headers,
            });
          } else {
            supabaseResponse = NextResponse.next({
              request,
            });
          }
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // 🛡️ 1. Protección Básica: Invitados no pueden entrar a zonas seguras
  if ((path.startsWith('/dashboard') || path.startsWith('/admin')) && !user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 🛡️ 2. Protección Avanzada: Zero-Trust para rutas Super Admin
  if (path.startsWith('/admin') && user) {
    // Consultamos la tabla de roles usando el cliente de SSR (Respeta RLS)
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError || !roleData || roleData.role !== 'superadmin') {
      console.warn(`🚨 [SEC-OPS] Intento de escalada de privilegios bloqueado. User ID: ${user.id}`);
      // Expulsamos al usuario a su dashboard normal
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // 🔄 Redirigir si ya está logueado e intenta ir al login
  if (path.startsWith('/login') && user) {
     return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return supabaseResponse;
}

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

// Ignorar rutas estáticas y assets para no penalizar el Rate Limit
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};