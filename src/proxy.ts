import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from './utils/supabase/middleware';

// ============================================================================
// SOCIAL LINK TRACKER — Atribución de canal directo
//
// Detecta ?ref={hotel-slug}-{channel} en URLs de /book/*
// Guarda cookie hs_ref con expiry de 30 días
// Canales válidos: instagram, whatsapp, facebook, tiktok, google
// ============================================================================

const VALID_CHANNELS = ['instagram', 'whatsapp', 'facebook', 'tiktok', 'google'] as const;
const REF_COOKIE_NAME = 'hs_ref';
const REF_COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 días en segundos

function extractRefFromUrl(url: URL): { hotelSlug: string; channel: string } | null {
  const refParam = url.searchParams.get('ref');
  if (!refParam) return null;

  const parts = refParam.split('-');
  if (parts.length < 2) return null;

  const channel = parts[parts.length - 1].toLowerCase();
  if (!VALID_CHANNELS.includes(channel as (typeof VALID_CHANNELS)[number])) return null;

  const hotelSlug = parts.slice(0, -1).join('-');
  if (!hotelSlug) return null;

  return { hotelSlug, channel };
}

function handleReferralTracking(request: NextRequest, response: NextResponse): void {
  const ref = extractRefFromUrl(request.nextUrl);
  if (!ref) return;

  if (!request.nextUrl.pathname.startsWith('/book/') && !request.nextUrl.pathname.startsWith('/(direct)/')) return;

  response.cookies.set(REF_COOKIE_NAME, JSON.stringify(ref), {
    maxAge: REF_COOKIE_MAX_AGE,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    httpOnly: false,
  });
}

// ============================================================================
// I18N — Detección de idioma sin redirección
//
// Detecta el idioma preferido del navegador y guarda cookie NEXT_LOCALE.
// NO redirige — las rutas son las mismas, solo cambia el contenido.
// ============================================================================

const SUPPORTED_LOCALES = ['es', 'en'] as const;
const DEFAULT_LOCALE = 'es';

function detectLocale(request: NextRequest): string {
  // 1. Check explicit cookie
  const existingLocale = request.cookies.get('NEXT_LOCALE')?.value;
  if (existingLocale && SUPPORTED_LOCALES.includes(existingLocale as (typeof SUPPORTED_LOCALES)[number])) {
    return existingLocale;
  }

  // 2. Check Accept-Language header
  const acceptLanguage = request.headers.get('accept-language') || '';
  const preferred = acceptLanguage.split(',')[0]?.split('-')[0]?.toLowerCase();

  if (preferred === 'en') return 'en';
  return DEFAULT_LOCALE;
}

export async function proxy(request: NextRequest) {
  // 1. Detect and set locale cookie (no redirect)
  const locale = detectLocale(request);
  const response = await updateSession(request);

  // Set locale cookie if not already set or different
  if (request.cookies.get('NEXT_LOCALE')?.value !== locale) {
    response.cookies.set('NEXT_LOCALE', locale, {
      path: '/',
      maxAge: 365 * 24 * 60 * 60, // 1 year
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
  }

  // 2. Referral tracking
  handleReferralTracking(request, response);

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|monitoring|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
