'use server'

/**
 * Readiness — Server Actions
 *
 * Server actions for hotel readiness evaluation.
 * Follows the Auth → Authorization → Execute → Revalidate pattern.
 * Returns { success, data, error } per existing action conventions.
 *
 * Depends on:
 *   - src/lib/readiness-validation.ts (pure functions)
 *   - src/data/readiness.ts (DAL — server-only queries)
 *   - src/lib/hotel-context.ts (getCurrentHotel — auth guard)
 */

import { revalidateTag } from 'next/cache'
import { getCurrentHotel } from '@/lib/hotel-context'
import {
  getReadinessData,
  resolveCheckData,
} from '@/data/readiness'
import type {
  ReadinessResult,
  ResolveCheckResult,
} from '@/lib/readiness-validation'

// ─── Response Types ───────────────────────────────────────────

interface ActionResponse<T> {
  success: boolean
  data?: T
  error?: string
}

// ─── Helpers ──────────────────────────────────────────────────

/**
 * Extract a human-readable error message from any thrown value.
 */
function getErrorMessage(error: unknown): string {
  if (!error) return 'Error desconocido'
  if (typeof error === 'string') return error
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error !== null) {
    const obj = error as Record<string, unknown>
    if (typeof obj.message === 'string') return obj.message
  }
  return 'Error desconocido'
}

// ─── Actions ──────────────────────────────────────────────────

/**
 * Get readiness status for a hotel.
 *
 * 1. Auth       — Verify the current user is authenticated and has a hotel
 * 2. Authorization — Ensure the caller's hotel matches the requested hotelId
 * 3. Execute    — Query hotel, rooms, menu_items, staff and compute readiness
 * 4. Revalidate — Tag-based cache invalidation for freshness
 *
 * @param hotelId - UUID of the hotel to evaluate
 * @returns {success, data: ReadinessResult, error} action response
 */
export async function getReadinessAction(
  hotelId: string,
): Promise<ActionResponse<ReadinessResult>> {
  try {
    // 1. Auth
    const currentHotel = await getCurrentHotel()
    if (!currentHotel) {
      return { success: false, error: 'No autorizado' }
    }

    // 2. Authorization: caller must own the requested hotel
    if (currentHotel.id !== hotelId) {
      return { success: false, error: 'Acceso denegado: el hotel no te pertenece' }
    }

    // 3. Execute
    const result = await getReadinessData(hotelId)

    return { success: true, data: result }
  } catch (error: unknown) {
    const message = getErrorMessage(error)
    console.error('[Readiness Action] Error en getReadinessAction:', message)
    return { success: false, error: message }
  }
}

/**
 * Set the Go Live flag for a hotel — marks it as ready for public sale.
 *
 * 1. Auth       — Verify the current user is authenticated and has a hotel
 * 2. Authorization — Ensure the caller's hotel matches the requested hotelId
 * 3. Execute    — Update hotels SET go_live=true, go_live_at=now()
 * 4. Revalidate — Invalidate cached readiness data
 *
 * @param hotelId - UUID of the hotel to activate
 * @returns {success, data: { goLive: boolean, goLiveAt: string }, error} action response
 */
export async function setGoLiveAction(
  hotelId: string,
): Promise<ActionResponse<{ goLive: boolean; goLiveAt: string }>> {
  try {
    // 1. Auth
    const currentHotel = await getCurrentHotel()
    if (!currentHotel) {
      return { success: false, error: 'No autorizado' }
    }

    // 2. Authorization: caller must own the requested hotel
    if (currentHotel.id !== hotelId) {
      return { success: false, error: 'Acceso denegado: el hotel no te pertenece' }
    }

    // 3. Execute — use admin client to set the flag (bypass RLS)
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    const goLiveAt = new Date().toISOString()

    const { error: dbError } = await supabase
      .from('hotels')
      .update({ go_live: true, go_live_at: goLiveAt })
      .eq('id', hotelId)

    if (dbError) {
      console.error('[Readiness Action] Error en setGoLiveAction:', dbError.message)
      return { success: false, error: `Error al activar: ${dbError.message}` }
    }

    // 4. Revalidate
    revalidateTag(`readiness-${hotelId}`, 'max')

    return { success: true, data: { goLive: true, goLiveAt } }
  } catch (error: unknown) {
    const message = getErrorMessage(error)
    console.error('[Readiness Action] Error en setGoLiveAction:', message)
    return { success: false, error: message }
  }
}

/**
 * Get detailed diagnostic info for a single readiness check.
 *
 * 1. Auth       — Verify the current user is authenticated and has a hotel
 * 2. Authorization — Ensure the caller's hotel matches the requested hotelId
 * 3. Execute    — Query hotel data and resolve the specific check
 * 4. Revalidate — Tag-based cache invalidation
 *
 * @param hotelId - UUID of the hotel to evaluate
 * @param checkId - The check ID (e.g., 'payment_gateway', 'room_with_price')
 * @returns {success, data: ResolveCheckResult, error} action response
 */
export async function resolveCheckAction(
  hotelId: string,
  checkId: string,
): Promise<ActionResponse<ResolveCheckResult>> {
  try {
    // 1. Auth
    const currentHotel = await getCurrentHotel()
    if (!currentHotel) {
      return { success: false, error: 'No autorizado' }
    }

    // 2. Authorization: caller must own the requested hotel
    if (currentHotel.id !== hotelId) {
      return { success: false, error: 'Acceso denegado: el hotel no te pertenece' }
    }

    // 3. Execute
    const result = await resolveCheckData(hotelId, checkId)

    if (!result) {
      return { success: false, error: `Check "${checkId}" no encontrado o no aplica para este hotel` }
    }

    return { success: true, data: result }
  } catch (error: unknown) {
    const message = getErrorMessage(error)
    console.error('[Readiness Action] Error en resolveCheckAction:', message)
    return { success: false, error: message }
  }
}
