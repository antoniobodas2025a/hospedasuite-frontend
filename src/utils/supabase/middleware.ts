import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// 🛡️ MEMORIA EDGE PARA RATE LIMITING (Protección DDoS Burst)
const ipMap = new Map<string, { count: number; lastReset: number }>();
const RATE_LIMIT_WINDOW_MS = 60000; // Ventana de 1 minuto
const MAX_REQUESTS_PER_WINDOW = 60; // Límite: 60 peticiones por minuto

// 🛡️ RECOLECCIÓN DE BASURA PEREZOSA (Edge-Safe Memory Management)
function sweepExpiredIPs(now: number) {
  if (ipMap.size > 1000) {
    for (const [key, val] of ipMap.entries()) {
      if (now - val.lastReset > RATE_LIMIT_WINDOW_MS) {
        ipMap.delete(key);
      }
    }
  }
}

export async function updateSession(request: NextRequest) {
  const now = Date.now();
  
  // Limpieza de memoria asíncrona pasiva para evitar fugas en V8 Isolates
  sweepExpiredIPs(now);

  // --- 🛡️ BARRERA 1: RATE LIMITING (Zero-Trust) ---
  const ip = request.ip || request.headers.get('x-forwarded-for') || '127.0.0.1';
  const ipRecord = ipMap.get(ip);

  if (!ipRecord || now - ipRecord.lastReset > RATE_LIMIT_WINDOW_MS) {
    ipMap.set(ip, { count: 1, lastReset: now });
  } else {
    ipRecord.count += 1;
    if (ipRecord.count > MAX_REQUESTS_PER_WINDOW) {
      console.warn(`🚨 [SEC-OPS EDGE] Tráfico anómalo bloqueado. IP: ${ip}`);
      return new NextResponse(
        JSON.stringify({ error: 'Too Many Requests', message: 'Detectamos tráfico inusual. Por favor, espera un momento.' }),
        { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': '60' } }
      );
    }
  }

  // --- 🛡️ BARRERA 2: GESTIÓN DE SESIÓN Y SEGURIDAD DE RUTAS ---
  let supabaseResponse = NextResponse.next({
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
          supabaseResponse = NextResponse.next({
            request,
          });
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

  // Protección básica de rutas
  if (request.nextUrl.pathname.startsWith('/dashboard') && !user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Redirigir si ya está logueado e intenta ir al login
  if (request.nextUrl.pathname.startsWith('/login') && user) {
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