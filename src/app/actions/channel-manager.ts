'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { checkPlanFeature } from '@/data/plan-guard';

// ============================================================================
export async function syncChannelManagerAction(hotelId: string) {
  try {
    // ─── Plan Gating: Channel Manager requires Pro+ ─────────────
    const featureCheck = await checkPlanFeature(hotelId, 'channel_manager')
    if (!featureCheck.ok) {
      return { success: false, error: featureCheck.reason }
    }

    // 🚨 BARRERA ZERO-TRUST: Verificar sesión y permisos ANTES de actuar
    const cookieStore = await cookies();
    const supabaseUser = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll() { /* Los Server Actions no deben setear cookies aquí */ },
        },
      }
    );

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      throw new Error('No autorizado. Sesión inválida.');
    }

    // Verificamos propiedad del hotel mediante RLS (Si no es su hotel, falla)
    const { data: hotelAccess, error: accessError } = await supabaseUser
      .from('hotels')
      .select('id')
      .eq('id', hotelId)
      .single();

    if (accessError || !hotelAccess) {
      throw new Error('Violación de seguridad: No tiene permisos sobre este hotel.');
    }

    // ─── Use the new sync engine with circuit breaker + jitter + cache ──
    const { syncHotelChannels } = await import('@/lib/ical-sync');
    const { supabaseAdmin } = await import('@/lib/supabase-admin');

    // Fetch hotel name for alerts
    const { data: hotelData } = await supabaseAdmin
      .from('hotels')
      .select('name')
      .eq('id', hotelId)
      .single();

    // Fetch Channel connections for this hotel
    const { data: rooms } = await supabaseAdmin
      .from('rooms')
      .select('id, name, hotel_id, ical_import_url, ical_export_url, last_ical_sync, ical_sync_status')
      .eq('hotel_id', hotelId)
      .not('ical_import_url', 'is', null);

    if (!rooms || rooms.length === 0) {
      return { success: true, message: 'No hay enlaces iCal de Booking/Airbnb configurados en las habitaciones.' };
    }

    // Map rooms to ChannelConnection format
    const connections = rooms.map((room: any) => ({
      id: room.id,
      hotelId: room.hotel_id,
      hotelName: hotelData?.name || hotelId,
      otaName: detectOtaSource(room.ical_import_url),
      icalUrl: room.ical_import_url,
      pushUrl: room.ical_export_url || undefined,
      lastSyncAt: room.last_ical_sync ? new Date(room.last_ical_sync) : null,
      isActive: room.ical_sync_status !== 'error',
    }));

    // Run sync through the new engine (jitter + circuit breaker + cache + alerts)
    const results = await syncHotelChannels(hotelId, hotelData?.name || hotelId, connections);

    // Aggregate results
    const totalNew = results.reduce((sum, r) => sum + r.eventsNew, 0);
    const totalCancelled = results.reduce((sum, r) => sum + r.eventsCancelled, 0);
    const errors = results.filter(r => r.status === 'error').map(r => r.errorMessage);

    // Update room sync status
    for (const result of results) {
      await supabaseAdmin
        .from('rooms')
        .update({
          last_ical_sync: new Date().toISOString(),
          ical_sync_status: result.status === 'error' ? 'error' : 'ok',
        })
        .eq('id', result.otaId);
    }

    // Log to ota_sync_log
    const durationMs = results.reduce((sum, r) => sum + r.duration, 0);
    await supabaseAdmin.from('ota_sync_log').insert({
      hotel_id: hotelId,
      rooms_synced: results.length,
      bookings_created: totalNew,
      bookings_cancelled: totalCancelled,
      bookings_unchanged: 0,
      status: errors.length === 0 ? 'success' : errors.length === results.length ? 'error' : 'partial',
      error_message: errors.length > 0 ? errors.join('; ') : null,
      sync_source: 'ical',
      duration_ms: durationMs,
    });

    // Limpiamos la caché del frontend para que el calendario se actualice al instante
    revalidatePath('/dashboard/calendar');

    return {
      success: true,
      message: totalNew > 0
        ? `Sincronización exitosa. Se bloquearon ${totalNew} nuevas fechas desde las Channels.`
        : `Inventario sincronizado. No hay nuevas reservas externas.`,
      bookingsCreated: totalNew,
      bookingsCancelled: totalCancelled,
      roomsSynced: results.length,
    };

  } catch (error: any) {
    console.error('[SEC-OPS] Error fatal en Seguro Anti-Sobreventa:', error);
    return { success: false, error: error.message };
  }
}

function detectOtaSource(url: string): string {
  const lower = url.toLowerCase();
  if (lower.includes('booking.com')) return 'booking.com';
  if (lower.includes('airbnb')) return 'airbnb';
  if (lower.includes('expedia') || lower.includes('vrbo')) return 'expedia';
  return 'other_ota';
}