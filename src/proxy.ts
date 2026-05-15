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

  // Formato esperado: {hotel-slug}-{channel}
  // Ej: hotel-paraiso-cartagena-instagram
  // El canal es siempre la última parte
  const parts = refParam.split('-');
  if (parts.length < 2) return null;

  const channel = parts[parts.length - 1].toLowerCase();
  if (!VALID_CHANNELS.includes(channel as (typeof VALID_CHANNELS)[number])) return null;

  // El hotel slug es todo menos la última parte
  const hotelSlug = parts.slice(0, -1).join('-');
  if (!hotelSlug) return null;

  return { hotelSlug, channel };
}

function handleReferralTracking(request: NextRequest, response: NextResponse): void {
  const ref = extractRefFromUrl(request.nextUrl);
  if (!ref) return;

  // Solo trackear en rutas de booking directo
  if (!request.nextUrl.pathname.startsWith('/book/') && !request.nextUrl.pathname.startsWith('/(direct)/')) return;

  response.cookies.set(REF_COOKIE_NAME, JSON.stringify(ref), {
    maxAge: REF_COOKIE_MAX_AGE,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    httpOnly: false, // Necesario para que el client-side lo lea
  });
}

export async function proxy(request: NextRequest) {
  // 1. Tracking de referral (antes de cualquier otra lógica)
  const response = await updateSession(request);

  // 2. Aplicar tracking de referral al response
  handleReferralTracking(request, response);

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
