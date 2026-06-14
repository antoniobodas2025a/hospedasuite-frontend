'use server';

import { supabaseAdmin } from '@/lib/supabase-admin';
import { checkPlanFeature } from '@/data/plan-guard';
import type { OtaSyncLog } from '@/types';

export interface OtaSyncStatus {
  hasIcalConfigured: boolean;
  lastSync: OtaSyncLog | null;
  roomsWithIcal: number;
  totalRooms: number;
  recentSyncs: OtaSyncLog[];
}

/**
 * Obtiene el estado de sincronización Channel de un hotel.
 */
export async function getOtaSyncStatusAction(hotelId: string): Promise<{ success: boolean; status?: OtaSyncStatus; error?: string }> {
  try {
    if (!hotelId) {
      return { success: false, error: 'hotelId es requerido' };
    }

    // 1. Contar habitaciones con iCal configurado
    const { data: roomsWithIcal, error: roomsError } = await supabaseAdmin
      .from('rooms')
      .select('id, name, ical_import_url')
      .eq('hotel_id', hotelId);

    if (roomsError) {
      console.error('[Channel SYNC] Error rooms query:', roomsError.message, roomsError.details);
      // Si falla, retornamos status básico en lugar de lanzar error
      return {
        success: true,
        status: {
          hasIcalConfigured: false,
          lastSync: null,
          roomsWithIcal: 0,
          totalRooms: 0,
          recentSyncs: [],
        },
      };
    }

    const totalRooms = roomsWithIcal?.length || 0;
    const roomsConfigured = roomsWithIcal?.filter((r: any) => r.ical_import_url).length || 0;

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
      recentSyncs: (recentSyncs || []).map((r: any) => ({
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
    console.error('[Channel SYNC] Error obteniendo estado:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Dispara un sync manual vía QStash.
 * Requiere Seguro Anti-Sobreventa (Pro+ plan).
 */
export async function triggerManualSyncAction(hotelId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // ─── Plan Gating: Seguro Anti-Sobreventa requiere Pro+ ─────────────
    const featureCheck = await checkPlanFeature(hotelId, 'channel_manager')
    if (!featureCheck.ok) {
      return { success: false, error: featureCheck.reason }
    }

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
    console.error('[Channel SYNC] Error disparando sync manual:', error.message);
    return { success: false, error: error.message };
  }
}
