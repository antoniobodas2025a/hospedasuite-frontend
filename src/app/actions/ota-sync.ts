'use server';

import { createClient } from '@supabase/supabase-js';
import type { OtaSyncLog } from '@/types';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export interface OtaSyncStatus {
  hasIcalConfigured: boolean;
  lastSync: OtaSyncLog | null;
  roomsWithIcal: number;
  totalRooms: number;
  recentSyncs: OtaSyncLog[];
}

/**
 * Obtiene el estado de sincronización OTA de un hotel.
 */
export async function getOtaSyncStatusAction(hotelId: string): Promise<{ success: boolean; status?: OtaSyncStatus; error?: string }> {
  try {
    // 1. Contar habitaciones con iCal configurado
    const { data: roomsWithIcal, error: roomsError } = await supabaseAdmin
      .from('rooms')
      .select('id, name, ical_import_url, last_ical_sync, ical_sync_status')
      .eq('hotel_id', hotelId);

    if (roomsError) throw new Error('Error leyendo habitaciones');

    const totalRooms = roomsWithIcal?.length || 0;
    const roomsConfigured = roomsWithIcal?.filter(r => r.ical_import_url).length || 0;

    if (roomsConfigured === 0) {
      return {
        success: true,
        status: {
          hasIcalConfigured: false,
          lastSync: null,
          roomsWithIcal: 0,
          totalRooms,
          recentSyncs: [],
        },
      };
    }

    // 2. Último sync log
    const { data: lastSync, error: lastSyncError } = await supabaseAdmin
      .from('ota_sync_log')
      .select('*')
      .eq('hotel_id', hotelId)
      .order('executed_at', { ascending: false })
      .limit(1)
      .single();

    if (lastSyncError && lastSyncError.code !== 'PGRST116') {
      // PGRST116 = no rows found, which is fine
      console.error('Error leyendo último sync log:', lastSyncError.message);
    }

    // 3. Últimos 5 syncs
    const { data: recentSyncs, error: recentError } = await supabaseAdmin
      .from('ota_sync_log')
      .select('*')
      .eq('hotel_id', hotelId)
      .order('executed_at', { ascending: false })
      .limit(5);

    if (recentError) {
      console.error('Error leyendo syncs recientes:', recentError.message);
    }

    const status: OtaSyncStatus = {
      hasIcalConfigured: roomsConfigured > 0,
      lastSync: lastSync || null,
      roomsWithIcal: roomsConfigured,
      totalRooms,
      recentSyncs: (recentSyncs || []).map(r => ({
        id: r.id,
        hotel_id: r.hotel_id,
        rooms_synced: r.rooms_synced,
        bookings_created: r.bookings_created,
        bookings_cancelled: r.bookings_cancelled,
        bookings_unchanged: r.bookings_unchanged,
        status: r.status,
        error_message: r.error_message,
        sync_source: r.sync_source,
        executed_at: r.executed_at,
        duration_ms: r.duration_ms,
      })),
    };

    return { success: true, status };
  } catch (error: any) {
    console.error('[OTA SYNC] Error obteniendo estado:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Dispara un sync manual vía QStash.
 */
export async function triggerManualSyncAction(hotelId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    const qstashToken = process.env.QSTASH_TOKEN;

    if (!appUrl || !qstashToken) {
      throw new Error('Variables de entorno faltantes (NEXT_PUBLIC_APP_URL o QSTASH_TOKEN)');
    }

    const { Client } = await import('@upstash/qstash');
    const qstashClient = new Client({ token: qstashToken });

    await qstashClient.publishJSON({
      url: `${appUrl}/api/webhooks/qstash/sync-hotel`,
      body: { hotelId },
      retries: 3,
    });

    return { success: true };
  } catch (error: any) {
    console.error('[OTA SYNC] Error disparando sync manual:', error.message);
    return { success: false, error: error.message };
  }
}
