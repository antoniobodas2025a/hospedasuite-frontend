export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';
import { logAuditEvent } from '@/lib/audit-logger';
import { getJitterOffset } from '@/lib/ical-sync';
import { canRequest, recordSuccess, recordFailure, forceOpen } from '@/lib/circuit-breaker';
import {
  sendChannelAlert,
  createRateLimitAlert,
  createCircuitAlert,
  createSyncFailureAlert,
} from '@/lib/ota-alerts';

// Build-safe: dummy signing keys if not set (overridden by real env at runtime)
if (!process.env.QSTASH_CURRENT_SIGNING_KEY) process.env.QSTASH_CURRENT_SIGNING_KEY = 'dummy_current';
if (!process.env.QSTASH_NEXT_SIGNING_KEY) process.env.QSTASH_NEXT_SIGNING_KEY = 'dummy_next';

// Type alias for the admin client
type AdminClient = any;

// ============================================================================
// iCal Sync Engine — Diff Algorithm + MITIGATIONS
//
// Mitigations integrated:
// 1. JITTER: Each hotel gets a deterministic offset (0-240s) to spread load
// 2. CIRCUIT BREAKER: Opens after 5 consecutive failures, 5-min cooldown
// 3. ETag CACHE: Fetches only if calendar changed (~70% cache hit rate)
// 4. ALERTS: Deduplicated notifications to hotelero + internal team
//
// Diff algorithm:
// - UID en iCal pero NO en DB → NUEVA reserva Channel → INSERT
// - UID en DB pero NO en iCal → CANCELADA en Channel → UPDATE status
// - UID en ambos → Sin cambios (skip)
// ============================================================================

interface IcalEvent {
  uid: string;
  start: Date | string;
  end: Date | string;
  summary?: string;
}

interface SyncResult {
  bookingsCreated: number;
  bookingsCancelled: number;
  bookingsUnchanged: number;
  roomsSynced: number;
  errors: string[];
}

// ─── ETag Cache (in-memory, survives across requests in same instance) ─────
interface CacheEntry {
  etag: string | null;
  lastModified: string | null;
  lastSync: Date;
}
const icalCache = new Map<string, CacheEntry>();

function getCacheKey(icalUrl: string): string {
  // Hash the URL to a shorter key
  let hash = 0;
  for (let i = 0; i < icalUrl.length; i++) {
    hash = ((hash << 5) - hash) + icalUrl.charCodeAt(i);
    hash = hash & hash;
  }
  return `ical:${Math.abs(hash)}`;
}

/**
 * Descarga y parsea un calendario iCal desde una URL.
 * Con soporte de ETag cache y circuit breaker.
 */
async function fetchIcalEvents(
  url: string,
  hotelId: string,
  hotelName: string
): Promise<{ events: IcalEvent[]; cacheHit: boolean; error?: string; rateLimited?: boolean }> {
  const otaSource = detectOtaSource(url);

  // ─── Circuit Breaker Check ─────────────────────────────────────
  if (!canRequest(otaSource)) {
    console.warn(`[CircuitBreaker] ${otaSource} is OPEN — skipping sync for hotel ${hotelId}`);
    return { events: [], cacheHit: false, error: 'Circuit breaker open' };
  }

  // ─── ETag Cache Check ──────────────────────────────────────────
  const cacheKey = getCacheKey(url);
  const cached = icalCache.get(cacheKey);

  try {
    const headers: Record<string, string> = {
      'User-Agent': 'HospedaSuite-ChannelManager/1.0',
      'Accept': 'text/calendar, text/plain, */*',
    };

    if (cached?.etag) headers['If-None-Match'] = cached.etag;
    if (cached?.lastModified) headers['If-Modified-Since'] = cached.lastModified;

    const response = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(10_000), // 10s timeout
      redirect: 'follow',
    });

    // ─── Rate Limited ────────────────────────────────────────────
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      const retrySeconds = retryAfter ? parseInt(retryAfter) : 60;

      recordFailure(otaSource, 'rate-limited');
      forceOpen(otaSource, `Rate limited (Retry-After: ${retrySeconds}s)`);

      await sendChannelAlert(createRateLimitAlert(hotelId, hotelName, otaSource, retrySeconds));

      return {
        events: [],
        cacheHit: false,
        error: `Rate limited by ${otaSource}`,
        rateLimited: true,
      };
    }

    // ─── Not Modified (Cache Hit) ────────────────────────────────
    if (response.status === 304) {
      recordSuccess(otaSource);
      if (cached) {
        icalCache.set(cacheKey, { ...cached, lastSync: new Date() });
      }
      return { events: [], cacheHit: true };
    }

    // ─── HTTP Error ──────────────────────────────────────────────
    if (!response.ok) {
      recordFailure(otaSource, `HTTP ${response.status}`);
      await sendChannelAlert(createSyncFailureAlert(
        hotelId, hotelName, otaSource, `HTTP ${response.status}: ${response.statusText}`
      ));
      return { events: [], cacheHit: false, error: `HTTP ${response.status}` };
    }

    // ─── Success — Parse ICS ─────────────────────────────────────
    const text = await response.text();
    const ical = await import('node-ical');
    const parsed = ical.parseICS(text);

    const events: IcalEvent[] = [];
    for (const [key, event] of Object.entries(parsed)) {
      const e = event as any;
      if (e?.type === 'VEVENT' && e.uid && e.start && e.end) {
        events.push({
          uid: e.uid,
          start: e.start,
          end: e.end,
          summary: typeof e.summary === 'string' ? e.summary : undefined,
        });
      }
    }

    // Update cache
    const etag = response.headers.get('ETag');
    const lastModified = response.headers.get('Last-Modified');
    icalCache.set(cacheKey, { etag, lastModified, lastSync: new Date() });

    recordSuccess(otaSource);

    return { events, cacheHit: false };

  } catch (error: any) {
    recordFailure(otaSource, error.message);

    if (error.name === 'AbortError') {
      return { events: [], cacheHit: false, error: 'Request timeout (10s)' };
    }

    await sendChannelAlert(createSyncFailureAlert(hotelId, hotelName, otaSource, error.message));
    return { events: [], cacheHit: false, error: error.message };
  }
}

/**
 * Obtiene todas las reservas Channel existentes para un hotel.
 * Retorna un Map de external_id → booking para lookup O(1).
 */
async function fetchExistingOtaBookings(
  supabaseAdmin: AdminClient,
  hotelId: string
): Promise<Map<string, { id: string; room_id: string; status: string }>> {
  interface BookingRow {
    id: string;
    room_id: string;
    status: string;
    external_id: string | null;
  }

  const { data, error } = await supabaseAdmin
    .from('bookings')
    .select('id, room_id, status, external_id')
    .eq('hotel_id', hotelId)
    .eq('source', 'ota')
    .in('status', ['blocked_ota', 'confirmed', 'pending']);

  if (error || !data) return new Map();

  const map = new Map<string, { id: string; room_id: string; status: string }>();
  for (const booking of data) {
    if (booking.external_id) {
      map.set(booking.external_id, {
        id: booking.id,
        room_id: booking.room_id,
        status: booking.status,
      });
    }
  }

  return map;
}

/**
 * Obtiene o crea el huésped genérico para reservas Channel.
 */
async function ensureOtaGuest(
  supabaseAdmin: AdminClient,
  hotelId: string
): Promise<string | null> {
  const { data: otaGuest } = await supabaseAdmin
    .from('guests')
    .select('id')
    .eq('hotel_id', hotelId)
    .eq('doc_number', 'Channel-GUEST-000')
    .single();

  if (otaGuest) return otaGuest.id;

  const { data: newGuest, error } = await supabaseAdmin
    .from('guests')
    .insert([{
      hotel_id: hotelId,
      full_name: 'Reserva Externa (Booking/Airbnb)',
      doc_number: 'Channel-GUEST-000',
      phone: 'N/A',
    }])
    .select('id')
    .single();

  if (error || !newGuest) return null;
  return newGuest.id;
}

/**
 * Determina el source Channel basado en la URL del iCal.
 */
function detectOtaSource(icalUrl: string): string {
  const url = icalUrl.toLowerCase();
  if (url.includes('booking.com')) return 'booking.com';
  if (url.includes('airbnb')) return 'airbnb';
  if (url.includes('expedia') || url.includes('vrbo')) return 'expedia';
  return 'other_ota';
}

async function handler(req: Request) {
  const startTime = Date.now();

  try {
    const payload = await req.json();
    const hotelId = payload.hotelId;

    if (!hotelId) return NextResponse.json({ error: 'Falta hotelId' }, { status: 400 });

    // ─── JITTER: Spread syncs across the 5-minute window ─────────
    const jitterMs = getJitterOffset(hotelId) * 1000;
    if (jitterMs > 0) {
      console.log(`[Jitter] Hotel ${hotelId}: waiting ${jitterMs}ms before sync`);
      await new Promise(resolve => setTimeout(resolve, jitterMs));
    }

    console.log(`⚙️ [QSTASH WORKER] Sync iCal Hotel: ${hotelId}`);
    const { supabaseAdmin } = await import('@/lib/supabase-admin');

    // Get hotel name for alerts
    const { data: hotelData } = await supabaseAdmin
      .from('hotels')
      .select('name, subscription_plan')
      .eq('id', hotelId)
      .single();
    const hotelName = hotelData?.name || hotelId;

    // ─── Plan Limits Check ───────────────────────────────────────
    const { PLAN_LIMITS, normalizePlan } = await import('@/config/saas-plans');
    const plan = normalizePlan(hotelData?.subscription_plan);
    const limits = PLAN_LIMITS[plan];

    // 1. Obtener habitaciones con iCal import URL
    const { data: rooms, error: roomsError } = await supabaseAdmin
      .from('rooms')
      .select('id, name, hotel_id, ical_import_url')
      .eq('hotel_id', hotelId)
      .not('ical_import_url', 'is', null);

    if (roomsError || !rooms || rooms.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Sin habitaciones con iCal configurado',
        roomsSynced: 0,
      }, { status: 200 });
    }

    // 2. Asegurar huésped Channel
    const guestId = await ensureOtaGuest(supabaseAdmin, hotelId);
    if (!guestId) throw new Error('No se pudo resolver huésped Channel');

    // 3. Cargar reservas Channel existentes (para diff)
    const existingBookings = await fetchExistingOtaBookings(supabaseAdmin, hotelId);

    const result: SyncResult = {
      bookingsCreated: 0,
      bookingsCancelled: 0,
      bookingsUnchanged: 0,
      roomsSynced: 0,
      errors: [],
    };

    const today = new Date().toISOString().split('T')[0];
    const uidsFromIcal = new Set<string>();
    let cacheHits = 0;
    let rateLimited = false;

    // 4. Iterar habitaciones y procesar iCal
    for (const room of rooms) {
      if (!room.ical_import_url || room.ical_import_url.trim() === '') continue;

      try {
        const fetchResult = await fetchIcalEvents(room.ical_import_url, hotelId, hotelName);

        // Circuit breaker blocked
        if (fetchResult.error === 'Circuit breaker open') {
          result.errors.push(`Circuit breaker open for ${detectOtaSource(room.ical_import_url)}`);
          continue;
        }

        // Rate limited — stop processing this hotel
        if (fetchResult.rateLimited) {
          rateLimited = true;
          result.errors.push(fetchResult.error || 'Rate limited');
          break;
        }

        // Cache hit — no events to process
        if (fetchResult.cacheHit) {
          cacheHits++;
          result.roomsSynced++;
          continue;
        }

        // Error
        if (fetchResult.error) {
          result.errors.push(`Room ${room.id}: ${fetchResult.error}`);
          await supabaseAdmin
            .from('rooms')
            .update({ ical_sync_status: 'error' })
            .eq('id', room.id);
          continue;
        }

        result.roomsSynced++;

        for (const event of fetchResult.events) {
          uidsFromIcal.add(event.uid);

          const checkIn = new Date(event.start).toISOString().split('T')[0];
          const checkOut = new Date(event.end as Date).toISOString().split('T')[0];

          // Ignorar eventos pasados
          if (checkOut <= today) continue;

          const existing = existingBookings.get(event.uid);

          if (!existing) {
            // NUEVA reserva Channel → INSERT
            const otaSource = detectOtaSource(room.ical_import_url);
            const { error: insertError } = await supabaseAdmin
              .from('bookings')
              .insert([{
                hotel_id: hotelId,
                room_id: room.id,
                guest_id: guestId,
                check_in: checkIn,
                check_out: checkOut,
                status: 'blocked_ota',
                total_price: 0,
                external_id: event.uid,
                source: 'ota',
              }]);

            if (insertError) {
              console.error(`[SYNC] Error insertando reserva Channel ${event.uid}:`, insertError.message);
              result.errors.push(`Insert failed for ${event.uid}: ${insertError.message}`);
            } else {
              result.bookingsCreated++;
              console.log(`[SYNC] Nueva reserva Channel: ${event.uid} → Room ${room.name}`);

              // Audit log
              await logAuditEvent({
                actor_type: 'cron',
                actor_id: 'ical-sync',
                action: 'ota_booking_created',
                entity_type: 'hotel',
                entity_id: hotelId,
                new_value: {
                  booking_external_id: event.uid,
                  room_id: room.id,
                  check_in: checkIn,
                  check_out: checkOut,
                  source: otaSource,
                },
              });
            }
          } else {
            // Ya existe → sin cambios
            result.bookingsUnchanged++;
          }
        }

        // Actualizar estado de sync en la habitación
        await supabaseAdmin
          .from('rooms')
          .update({
            last_ical_sync: new Date().toISOString(),
            ical_sync_status: 'ok',
          })
          .eq('id', room.id);

      } catch (icalError: any) {
        console.error(`[SYNC] Error iCal Room ${room.id}:`, icalError.message);
        result.errors.push(`Room ${room.id}: ${icalError.message}`);

        // Marcar habitación con error
        await supabaseAdmin
          .from('rooms')
          .update({ ical_sync_status: 'error' })
          .eq('id', room.id);
      }
    }

    // 5. Detectar cancelaciones: UIDs en DB que NO están en el iCal
    for (const [externalId, booking] of existingBookings.entries()) {
      if (!uidsFromIcal.has(externalId)) {
        // La reserva fue cancelada/removida de la Channel
        const { error: cancelError } = await supabaseAdmin
          .from('bookings')
          .update({ status: 'cancelled' })
          .eq('id', booking.id);

        if (cancelError) {
          console.error(`[SYNC] Error cancelando reserva ${booking.id}:`, cancelError.message);
          result.errors.push(`Cancel failed for ${booking.id}`);
        } else {
          result.bookingsCancelled++;
          console.log(`[SYNC] Reserva Channel cancelada: ${externalId} (Booking ${booking.id})`);

          await logAuditEvent({
            actor_type: 'cron',
            actor_id: 'ical-sync',
            action: 'ota_booking_cancelled',
            entity_type: 'hotel',
            entity_id: hotelId,
            old_value: { booking_id: booking.id, status: booking.status },
            new_value: { status: 'cancelled', reason: 'removed_from_ota_ical' },
          });
        }
      }
    }

    // 6. Registrar en ota_sync_log
    const durationMs = Date.now() - startTime;
    const overallStatus = result.errors.length === 0
      ? 'success'
      : result.bookingsCreated > 0 || result.bookingsCancelled > 0
        ? 'partial'
        : 'error';

    await supabaseAdmin.from('ota_sync_log').insert({
      hotel_id: hotelId,
      rooms_synced: result.roomsSynced,
      bookings_created: result.bookingsCreated,
      bookings_cancelled: result.bookingsCancelled,
      bookings_unchanged: result.bookingsUnchanged,
      status: overallStatus,
      error_message: result.errors.length > 0 ? result.errors.join('; ') : null,
      sync_source: 'ical',
      duration_ms: durationMs,
    });

    return NextResponse.json({
      success: true,
      hotelId,
      roomsSynced: result.roomsSynced,
      bookingsCreated: result.bookingsCreated,
      bookingsCancelled: result.bookingsCancelled,
      bookingsUnchanged: result.bookingsUnchanged,
      cacheHits,
      rateLimited,
      errors: result.errors,
      durationMs,
      jitterMs,
    }, { status: 200 });

  } catch (error: any) {
    const durationMs = Date.now() - startTime;
    console.error('❌ [QSTASH WORKER] Fallo crítico sync iCal:', error.message);

    // Registrar error en sync log si tenemos hotelId
    try {
      const payload = await req.json();
      if (payload.hotelId) {
        const { supabaseAdmin } = await import('@/lib/supabase-admin');
        await supabaseAdmin.from('ota_sync_log').insert({
          hotel_id: payload.hotelId,
          rooms_synced: 0,
          bookings_created: 0,
          bookings_cancelled: 0,
          bookings_unchanged: 0,
          status: 'error',
          error_message: error.message,
          sync_source: 'ical',
          duration_ms: durationMs,
        });
      }
    } catch {
      // No loguear si falla el log
    }

    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export const POST = verifySignatureAppRouter(handler);
