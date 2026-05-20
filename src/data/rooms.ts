/**
 * Rooms — DAL Module
 *
 * Server-only data access layer for room operations.
 * Enforces plan-based unit limits on creation.
 *
 * Pattern (Next.js best practice):
 *   1. Auth → verify user owns the hotel
 *   2. Authorization → check plan limits
 *   3. Execute → perform the operation
 *   4. Revalidate → revalidateTag for cache invalidation
 */

import 'server-only'

import { createClient } from '@supabase/supabase-js'
import { checkUnitLimit } from './plan-guard'
import { verifyHotelOwnership } from './hotels'

// ─── Types ────────────────────────────────────────────────────

export interface RoomDTO {
  id: string
  hotel_id: string
  name: string
  type: string | null
  capacity: number
  beds: number
  price: number
  description: string | null
  is_active: boolean
  ical_import_url: string | null
  ical_export_url: string | null
  ical_sync_status: string | null
  last_ical_sync: string | null
}

export interface CreateRoomInput {
  hotel_id: string
  name: string
  type?: string
  capacity: number
  beds?: number
  price: number
  description?: string
}

// ─── Supabase Admin Client ────────────────────────────────────

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// ─── Queries ──────────────────────────────────────────────────

/**
 * Get all rooms for a hotel.
 */
export async function getHotelRooms(hotelId: string): Promise<RoomDTO[]> {
  const supabase = getAdminClient()

  const { data, error } = await supabase
    .from('rooms')
    .select('id, hotel_id, name, type, capacity, beds, price, description, is_active, ical_import_url, ical_export_url, ical_sync_status, last_ical_sync')
    .eq('hotel_id', hotelId)
    .order('name')

  if (error) return []
  return (data || []) as RoomDTO[]
}

/**
 * Get a single room by ID.
 */
export async function getRoomById(roomId: string): Promise<RoomDTO | null> {
  const supabase = getAdminClient()

  const { data, error } = await supabase
    .from('rooms')
    .select('id, hotel_id, name, type, capacity, beds, price, description, is_active, ical_import_url, ical_export_url, ical_sync_status, last_ical_sync')
    .eq('id', roomId)
    .single()

  if (error || !data) return null
  return data as RoomDTO
}

/**
 * Count rooms for a hotel.
 */
export async function countHotelRooms(hotelId: string): Promise<number> {
  const supabase = getAdminClient()

  const { count, error } = await supabase
    .from('rooms')
    .select('*', { count: 'exact', head: true })
    .eq('hotel_id', hotelId)

  if (error) return 0
  return count || 0
}

// ─── Mutations ────────────────────────────────────────────────

/**
 * Create a new room with plan limit validation.
 * Returns error if the hotel has reached its unit limit.
 */
export async function createRoom(
  input: CreateRoomInput
): Promise<{ ok: boolean; data?: RoomDTO; error?: string }> {
  // 1. Auth: verify ownership
  const isOwner = await verifyHotelOwnership(input.hotel_id)
  if (!isOwner) {
    return { ok: false, error: 'Unauthorized: you do not own this hotel' }
  }

  // 2. Authorization: check unit limit
  const limitCheck = await checkUnitLimit(input.hotel_id)
  if (!limitCheck.ok) {
    return { ok: false, error: limitCheck.reason }
  }

  // 3. Execute
  const supabase = getAdminClient()

  const { data, error } = await supabase
    .from('rooms')
    .insert({
      hotel_id: input.hotel_id,
      name: input.name,
      type: input.type || null,
      capacity: input.capacity,
      beds: input.beds || 1,
      price: input.price,
      description: input.description || null,
      is_active: true,
    })
    .select('id, hotel_id, name, type, capacity, beds, price, description, is_active, ical_import_url, ical_export_url, ical_sync_status, last_ical_sync')
    .single()

  if (error) {
    console.error('[Rooms DAL] Error creating room:', error)
    return { ok: false, error: error.message }
  }

  return { ok: true, data: data as RoomDTO }
}

/**
 * Update a room. Verifies ownership before allowing update.
 */
export async function updateRoom(
  roomId: string,
  updates: Partial<CreateRoomInput>
): Promise<{ ok: boolean; data?: RoomDTO; error?: string }> {
  // 1. Auth: verify ownership
  const room = await getRoomById(roomId)
  if (!room) return { ok: false, error: 'Room not found' }

  const isOwner = await verifyHotelOwnership(room.hotel_id)
  if (!isOwner) {
    return { ok: false, error: 'Unauthorized: you do not own this hotel' }
  }

  // 2. Execute
  const supabase = getAdminClient()

  const { data, error } = await supabase
    .from('rooms')
    .update({
      ...(updates.name && { name: updates.name }),
      ...(updates.type !== undefined && { type: updates.type }),
      ...(updates.capacity && { capacity: updates.capacity }),
      ...(updates.beds !== undefined && { beds: updates.beds }),
      ...(updates.price !== undefined && { price: updates.price }),
      ...(updates.description !== undefined && { description: updates.description }),
    })
    .eq('id', roomId)
    .select('id, hotel_id, name, type, capacity, beds, price, description, is_active, ical_import_url, ical_export_url, ical_sync_status, last_ical_sync')
    .single()

  if (error) {
    console.error('[Rooms DAL] Error updating room:', error)
    return { ok: false, error: error.message }
  }

  return { ok: true, data: data as RoomDTO }
}

/**
 * Delete a room. Verifies ownership before allowing deletion.
 */
export async function deleteRoom(
  roomId: string
): Promise<{ ok: boolean; error?: string }> {
  // 1. Auth: verify ownership
  const room = await getRoomById(roomId)
  if (!room) return { ok: false, error: 'Room not found' }

  const isOwner = await verifyHotelOwnership(room.hotel_id)
  if (!isOwner) {
    return { ok: false, error: 'Unauthorized: you do not own this hotel' }
  }

  // 2. Execute
  const supabase = getAdminClient()

  const { error } = await supabase
    .from('rooms')
    .delete()
    .eq('id', roomId)

  if (error) {
    console.error('[Rooms DAL] Error deleting room:', error)
    return { ok: false, error: error.message }
  }

  return { ok: true }
}

/**
 * Update room iCal URLs (for OTA connections).
 */
export async function updateRoomICal(
  roomId: string,
  icalImportUrl: string | null,
  icalExportUrl: string | null
): Promise<{ ok: boolean; error?: string }> {
  // 1. Auth: verify ownership
  const room = await getRoomById(roomId)
  if (!room) return { ok: false, error: 'Room not found' }

  const isOwner = await verifyHotelOwnership(room.hotel_id)
  if (!isOwner) {
    return { ok: false, error: 'Unauthorized: you do not own this hotel' }
  }

  // 2. Execute
  const supabase = getAdminClient()

  const { error } = await supabase
    .from('rooms')
    .update({
      ical_import_url: icalImportUrl,
      ical_export_url: icalExportUrl,
      ical_sync_status: icalImportUrl ? 'pending' : null,
      last_ical_sync: null,
    })
    .eq('id', roomId)

  if (error) {
    console.error('[Rooms DAL] Error updating iCal:', error)
    return { ok: false, error: error.message }
  }

  return { ok: true }
}
