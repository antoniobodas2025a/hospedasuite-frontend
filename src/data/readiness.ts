/**
 * Readiness — DAL Module
 *
 * Server-only data access layer for hotel readiness evaluation.
 * Queries hotels, rooms, menu_items, and staff via admin client,
 * then delegates computation to the pure-function validation lib.
 *
 * Pattern (Next.js best practice):
 *   - import 'server-only' prevents client-side usage
 *   - Uses Supabase admin client for server-side operations
 *   - Pure-function computation via `computeReadiness()` from @/lib/readiness-validation
 */
import 'server-only'

import { createClient } from '@supabase/supabase-js'
import { normalizePlan, type PlanKey } from '@/config/saas-plans'
import {
  computeReadiness,
  resolveCheck,
  type ReadinessData,
  type ReadinessResult,
  type ResolveCheckResult,
} from '@/lib/readiness-validation'

// ─── Types ────────────────────────────────────────────────────

/** Raw hotel row shape returned by the admin query */
interface HotelRow {
  name: string | null
  city: string | null
  location: string | null
  check_in_time: string | null
  check_out_time: string | null
  whatsapp_number: string | null
  email: string | null
  cancellation_policy: string | null
  wompi_public_key: string | null
  wompi_integrity_secret: string | null
  subscription_plan: string | null
}

/** Raw room row — minimal shape for readiness evaluation */
interface RoomRow {
  id: string
  name: string
  price: number
  ical_import_url: string | null
}

/** Raw menu item row */
interface MenuItemRow {
  id: string
}

/** Raw staff row */
interface StaffRow {
  id: string
}

// ─── Supabase Admin Client ────────────────────────────────────

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// ─── Queries ──────────────────────────────────────────────────

/**
 * Fetch all data needed for readiness evaluation for a given hotel.
 *
 * Queries four tables in parallel via the admin client (bypasses RLS).
 * Returns null if the hotel does not exist.
 */
async function fetchRawData(hotelId: string): Promise<{
  hotel: HotelRow | null
  rooms: RoomRow[]
  menuItems: MenuItemRow[]
  staff: StaffRow[]
}> {
  const supabase = getAdminClient()

  const [hotelRes, roomsRes, menuRes, staffRes] = await Promise.all([
    supabase
      .from('hotels')
      .select(
        'name, city, location, check_in_time, check_out_time, whatsapp_number, email, cancellation_policy, wompi_public_key, wompi_integrity_secret, subscription_plan',
      )
      .eq('id', hotelId)
      .single(),
    supabase
      .from('rooms')
      .select('id, name, price, ical_import_url')
      .eq('hotel_id', hotelId),
    supabase
      .from('menu_items')
      .select('id')
      .eq('hotel_id', hotelId),
    supabase
      .from('staff')
      .select('id')
      .eq('hotel_id', hotelId),
  ])

  return {
    hotel: hotelRes.data as HotelRow | null,
    rooms: (roomsRes.data || []) as RoomRow[],
    menuItems: (menuRes.data || []) as MenuItemRow[],
    staff: (staffRes.data || []) as StaffRow[],
  }
}

/**
 * Build a ReadinessData object from raw DB queries.
 *
 * Maps DB column names to the ReadinessData interface shape
 * and enforces null-safe defaults.
 */
function buildReadinessData(raw: {
  hotel: HotelRow | null
  rooms: RoomRow[]
  menuItems: MenuItemRow[]
  staff: StaffRow[]
}): ReadinessData {
  const h = raw.hotel

  return {
    hotel: {
      name: h?.name ?? null,
      city: h?.city ?? null,
      location: h?.location ?? null,
      check_in_time: h?.check_in_time ?? null,
      check_out_time: h?.check_out_time ?? null,
      whatsapp: h?.whatsapp_number ?? null,
      email: h?.email ?? null,
      cancellation_policy: h?.cancellation_policy ?? null,
      wompi_public_key: h?.wompi_public_key ?? null,
      wompi_secret_key: h?.wompi_integrity_secret ?? null,
    },
    rooms: raw.rooms.map((r) => ({
      id: r.id,
      name: r.name,
      price: r.price ?? 0,
      ical_import_url: r.ical_import_url ?? null,
    })),
    menuItems: raw.menuItems.map((m) => ({ id: m.id })),
    staff: raw.staff.map((s) => ({ id: s.id })),
  }
}

// ─── Public API ───────────────────────────────────────────────

/**
 * Get readiness evaluation for a hotel.
 *
 * Queries hotel, rooms, menu_items, and staff data via admin client,
 * then delegates to computeReadiness() for pure-function scoring.
 *
 * @param hotelId - UUID of the hotel to evaluate
 * @returns ReadinessResult with score, per-item status, and go-live readiness.
 *          Returns a fallback result with empty data if the hotel is not found.
 */
export async function getReadinessData(hotelId: string): Promise<ReadinessResult> {
  const raw = await fetchRawData(hotelId)

  // If hotel not found, return a zero-score result with empty data
  if (!raw.hotel) {
    return {
      score: 0,
      items: [],
      completedCount: 0,
      totalCount: 0,
      isGoLiveReady: false,
      planTier: 'starter',
      planLabel: 'Starter',
    }
  }

  const plan: PlanKey = normalizePlan(raw.hotel.subscription_plan)
  const data = buildReadinessData(raw)

  return computeReadiness(data, plan)
}

/**
 * Resolve a single readiness check — returns detailed diagnostic info.
 *
 * @param hotelId - UUID of the hotel to evaluate
 * @param checkId - The readiness check ID (e.g., 'payment_gateway', 'room_with_price')
 * @returns ResolveCheckResult with status, details, and suggested action.
 *          Returns null if the hotel is not found or the check ID is invalid.
 */
export async function resolveCheckData(
  hotelId: string,
  checkId: string,
): Promise<ResolveCheckResult | null> {
  const raw = await fetchRawData(hotelId)

  if (!raw.hotel) return null

  const plan: PlanKey = normalizePlan(raw.hotel.subscription_plan)
  const data = buildReadinessData(raw)

  return resolveCheck(data, plan, checkId)
}

// ─── Go Live Gate ───────────────────────────────────────────────

/** Result of a go-live gate check */
export interface GoLiveGateResult {
  /** Whether the hotel is allowed to publish / receive Channel bookings */
  allowed: boolean
  /** Human-readable reason when blocked */
  reason?: string
  /** Whether Go Live has been explicitly activated by the hotelier */
  isLive: boolean
  /** When it was activated (ISO timestamp), if enabled */
  goLiveAt?: string
}

/**
 * Guard that checks whether a hotel has been explicitly activated for public sale.
 *
 * Used before Channel publish, public-booking creation, and other post-live features.
 * Admin-originated bookings (source='admin' or created by staff) bypass this gate.
 *
 * @param hotelId - UUID of the hotel to check
 * @returns GoLiveGateResult with allowed status and reason if blocked
 */
export async function checkGoLiveGate(hotelId: string): Promise<GoLiveGateResult> {
  const supabase = getAdminClient()

  const { data: hotel, error } = await supabase
    .from('hotels')
    .select('go_live, go_live_at')
    .eq('id', hotelId)
    .maybeSingle()

  if (error || !hotel) {
    return {
      allowed: false,
      reason: 'Hotel no encontrado o error al verificar estado de publicación.',
      isLive: false,
    }
  }

  if (!hotel.go_live) {
    return {
      allowed: false,
      reason:
        'El hotel aún no ha sido activado para venta pública. Completá todos los requisitos en "Listo para Vender" y hacé clic en "Publicar Hotel".',
      isLive: false,
    }
  }

  return {
    allowed: true,
    isLive: true,
    goLiveAt: hotel.go_live_at ?? undefined,
  }
}
