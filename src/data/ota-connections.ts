/**
 * Channel Connections — DAL Module
 *
 * Server-only data access layer for Channel (Online Travel Agency) connections.
 * Enforces plan-based Channel limits on connection.
 *
 * Pattern (Next.js best practice):
 *   1. Auth → verify user owns the hotel
 *   2. Authorization → check Channel limit
 *   3. Execute → perform the operation
 *   4. Revalidate → revalidateTag for cache invalidation
 */

import 'server-only'

import { createClient } from '@supabase/supabase-js'
import { checkChannelLimit } from './plan-guard'
import { verifyHotelOwnership } from './hotels'

// ─── Types ────────────────────────────────────────────────────

export interface ChannelConnectionDTO {
  roomId: string
  roomName: string
  hotelId: string
  icalImportUrl: string
  icalExportUrl: string | null
  syncStatus: string | null
  lastSync: string | null
  otaName: string
}

export interface ConnectChannelInput {
  hotelId: string
  roomId: string
  icalImportUrl: string
  icalExportUrl?: string
}

// ─── Helpers ──────────────────────────────────────────────────

function detectOtaName(url: string): string {
  if (!url) return 'Unknown'
  const lower = url.toLowerCase()
  if (lower.includes('booking.com')) return 'Booking.com'
  if (lower.includes('airbnb')) return 'Airbnb'
  if (lower.includes('expedia') || lower.includes('vrbo')) return 'Expedia/VRBO'
  if (lower.includes('homeaway')) return 'HomeAway'
  if (lower.includes('tripadvisor')) return 'TripAdvisor'
  if (lower.includes('despegar')) return 'Despegar'
  return 'Other Channel'
}

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// ─── Queries ──────────────────────────────────────────────────

/**
 * Get all Channel connections for a hotel.
 */
export async function getHotelChannelConnections(hotelId: string): Promise<ChannelConnectionDTO[]> {
  const supabase = getAdminClient()

  const { data, error } = await supabase
    .from('rooms')
    .select('id, name, hotel_id, ical_import_url, ical_export_url, ical_sync_status, last_ical_sync')
    .eq('hotel_id', hotelId)
    .not('ical_import_url', 'is', null)

  if (error) return []

  return (data || []).map(room => ({
    roomId: room.id,
    roomName: room.name,
    hotelId: room.hotel_id,
    icalImportUrl: room.ical_import_url,
    icalExportUrl: room.ical_export_url,
    syncStatus: room.ical_sync_status,
    lastSync: room.last_ical_sync,
    otaName: detectOtaName(room.ical_import_url),
  }))
}

/**
 * Get a single Channel connection by room ID.
 */
export async function getChannelConnection(roomId: string): Promise<ChannelConnectionDTO | null> {
  const supabase = getAdminClient()

  const { data, error } = await supabase
    .from('rooms')
    .select('id, name, hotel_id, ical_import_url, ical_export_url, ical_sync_status, last_ical_sync')
    .eq('id', roomId)
    .not('ical_import_url', 'is', null)
    .single()

  if (error || !data) return null

  return {
    roomId: data.id,
    roomName: data.name,
    hotelId: data.hotel_id,
    icalImportUrl: data.ical_import_url,
    icalExportUrl: data.ical_export_url,
    syncStatus: data.ical_sync_status,
    lastSync: data.last_ical_sync,
    otaName: detectOtaName(data.ical_import_url),
  }
}

// ─── Mutations ────────────────────────────────────────────────

/**
 * Connect an Channel to a room with plan limit validation.
 * Returns error if the hotel has reached its Channel limit.
 */
export async function connectChannel(
  input: ConnectChannelInput
): Promise<{ ok: boolean; data?: ChannelConnectionDTO; error?: string }> {
  // 1. Auth: verify ownership
  const isOwner = await verifyHotelOwnership(input.hotelId)
  if (!isOwner) {
    return { ok: false, error: 'Unauthorized: you do not own this hotel' }
  }

  // 2. Authorization: check Channel limit
  const limitCheck = await checkChannelLimit(input.hotelId)
  if (!limitCheck.ok) {
    return { ok: false, error: limitCheck.reason }
  }

  // 3. Check for duplicate connection
  const supabase = getAdminClient()

  const { data: existing } = await supabase
    .from('rooms')
    .select('id, name')
    .eq('hotel_id', input.hotelId)
    .eq('ical_import_url', input.icalImportUrl)
    .single()

  if (existing) {
    return {
      ok: false,
      error: `Esta URL de iCal ya está conectada a la habitación "${existing.name}".`,
    }
  }

  // Verify room exists and belongs to hotel
  const { data: room } = await supabase
    .from('rooms')
    .select('id, name')
    .eq('id', input.roomId)
    .eq('hotel_id', input.hotelId)
    .single()

  if (!room) {
    return { ok: false, error: 'Habitación no encontrada o no pertenece a este hotel' }
  }

  // 4. Execute
  const { error } = await supabase
    .from('rooms')
    .update({
      ical_import_url: input.icalImportUrl,
      ical_export_url: input.icalExportUrl || null,
      ical_sync_status: 'pending',
      last_ical_sync: null,
    })
    .eq('id', input.roomId)

  if (error) {
    console.error('[Channel DAL] Error connecting Channel:', error)
    return { ok: false, error: error.message }
  }

  return {
    ok: true,
    data: {
      roomId: room.id,
      roomName: room.name,
      hotelId: input.hotelId,
      icalImportUrl: input.icalImportUrl,
      icalExportUrl: input.icalExportUrl || null,
      syncStatus: 'pending',
      lastSync: null,
      otaName: detectOtaName(input.icalImportUrl),
    },
  }
}

/**
 * Disconnect an Channel from a room.
 */
export async function disconnectChannel(
  roomId: string
): Promise<{ ok: boolean; error?: string }> {
  // 1. Auth: verify ownership
  const supabase = getAdminClient()

  const { data: room } = await supabase
    .from('rooms')
    .select('id, name, hotel_id, ical_import_url')
    .eq('id', roomId)
    .single()

  if (!room) return { ok: false, error: 'Habitación no encontrada' }

  const isOwner = await verifyHotelOwnership(room.hotel_id)
  if (!isOwner) {
    return { ok: false, error: 'Unauthorized: you do not own this hotel' }
  }

  // 2. Execute
  const { error } = await supabase
    .from('rooms')
    .update({
      ical_import_url: null,
      ical_export_url: null,
      ical_sync_status: null,
      last_ical_sync: null,
    })
    .eq('id', roomId)

  if (error) {
    console.error('[Channel DAL] Error disconnecting Channel:', error)
    return { ok: false, error: error.message }
  }

  return { ok: true }
}
