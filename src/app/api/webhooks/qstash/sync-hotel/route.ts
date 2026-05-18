export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';
import { logAuditEvent } from '@/lib/audit-logger';
import { supabaseAdmin } from '@/lib/supabase-admin';

import { createClient } from '@supabase/supabase-js';

// Type alias for the admin client
type AdminClient = ReturnType<typeof createClient>;

// ============================================================================
// iCal Sync Engine — Diff Algorithm
//
// Compara eventos del iCal de la OTA con reservas existentes en la DB:
// - UID en iCal pero NO en DB → NUEVA reserva OTA → INSERT
// - UID en DB pero NO en iCal → CANCELADA en OTA → UPDATE status
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

/**
 * Descarga y parsea un calendario iCal desde una URL.
 * Retorna array de eventos VEVENT normalizados.
 */
async function fetchIcalEvents(url: string): Promise<IcalEvent[]> {
  const ical = (await import('node-ical')).default || await import('node-ical');
  const events = await ical.async.fromURL(url);
  const result: IcalEvent[] = [];

  for (const event of Object.values(events)) {
    if (event?.type === 'VEVENT' && event.uid && event.start && event.end) {
      result.push({
        uid: event.uid,
        start: event.start,
        end: event.end,
        summary: typeof event.summary === 'string' ? event.summary : undefined,
      });
    }
  }

  return result;
}

/**
 * Obtiene todas las reservas OTA existentes para un hotel.
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
    .in('status', ['blocked_ota', 'confirmed', 'pending'])
    .returns<BookingRow[]>();

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
 * Obtiene o crea el huésped genérico para reservas OTA.
 */
async function ensureOtaGuest(
  supabaseAdmin: AdminClient,
  hotelId: string
): Promise<string | null> {
  const { data: otaGuest } = await supabaseAdmin
    .from('guests')
    .select('id')
    .eq('hotel_id', hotelId)
    .eq('doc_number', 'OTA-GUEST-000')
    .single();

  if (otaGuest) return otaGuest.id;

  const { data: newGuest, error } = await supabaseAdmin
    .from('guests')
    .insert([{
      hotel_id: hotelId,
      full_name: 'Reserva Externa (Booking/Airbnb)',
      doc_number: 'OTA-GUEST-000',
      phone: 'N/A',
    }])
    .select('id')
    .single();

  if (error || !newGuest) return null;
  return newGuest.id;
}

/**
 * Determina el source OTA basado en la URL del iCal.
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

    console.log(`⚙️ [QSTASH WORKER] Sync iCal Hotel: ${hotelId}`);
    const { supabaseAdmin } = await import('@/lib/supabase-admin');

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

    // 2. Asegurar huésped OTA
    const guestId = await ensureOtaGuest(supabaseAdmin, hotelId);
    if (!guestId) throw new Error('No se pudo resolver huésped OTA');

    // 3. Cargar reservas OTA existentes (para diff)
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

    // 4. Iterar habitaciones y procesar iCal
    for (const room of rooms) {
      if (!room.ical_import_url || room.ical_import_url.trim() === '') continue;

      try {
        const events = await fetchIcalEvents(room.ical_import_url);
        result.roomsSynced++;

        for (const event of events) {
          uidsFromIcal.add(event.uid);

          const checkIn = new Date(event.start).toISOString().split('T')[0];
          const checkOut = new Date(event.end as Date).toISOString().split('T')[0];

          // Ignorar eventos pasados
          if (checkOut <= today) continue;

          const existing = existingBookings.get(event.uid);

          if (!existing) {
            // NUEVA reserva OTA → INSERT
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
              console.error(`[SYNC] Error insertando reserva OTA ${event.uid}:`, insertError.message);
              result.errors.push(`Insert failed for ${event.uid}: ${insertError.message}`);
            } else {
              result.bookingsCreated++;
              console.log(`[SYNC] Nueva reserva OTA: ${event.uid} → Room ${room.name}`);

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
        // La reserva fue cancelada/removida de la OTA
        const { error: cancelError } = await supabaseAdmin
          .from('bookings')
          .update({ status: 'cancelled' })
          .eq('id', booking.id);

        if (cancelError) {
          console.error(`[SYNC] Error cancelando reserva ${booking.id}:`, cancelError.message);
          result.errors.push(`Cancel failed for ${booking.id}`);
        } else {
          result.bookingsCancelled++;
          console.log(`[SYNC] Reserva OTA cancelada: ${externalId} (Booking ${booking.id})`);

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
      errors: result.errors,
      durationMs,
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
