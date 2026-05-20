/**
 * Hotels — DAL Module
 *
 * Server-only data access layer for hotel operations.
 * All hotel data access MUST pass through this module.
 *
 * Pattern (Next.js best practice):
 *   - import 'server-only' prevents client-side usage
 *   - Uses Supabase admin client for server-side operations
 *   - Returns minimal data (DTOs), not full DB rows
 */

import 'server-only'

import { createClient } from '@supabase/supabase-js'

// ─── Types ────────────────────────────────────────────────────

export interface HotelDTO {
  id: string
  name: string
  slug: string
  subscription_plan: string
  subscription_status: string
  trial_ends_at: string | null
  owner_id: string
  email: string | null
  created_at: string
}

export interface HotelWithSettingsDTO extends HotelDTO {
  wompi_public_key: string | null
  wompi_integrity_secret: string | null
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
 * Get hotel with plan info. Minimal DTO — only what's needed for plan checks.
 */
export async function getHotelWithPlan(hotelId: string): Promise<HotelDTO | null> {
  const supabase = getAdminClient()

  const { data, error } = await supabase
    .from('hotels')
    .select('id, name, slug, subscription_plan, subscription_status, trial_ends_at, owner_id, email, created_at')
    .eq('id', hotelId)
    .single()

  if (error || !data) return null
  return data as HotelDTO
}

/**
 * Get hotel with settings (Wompi keys, etc).
 */
export async function getHotelWithSettings(hotelId: string): Promise<HotelWithSettingsDTO | null> {
  const supabase = getAdminClient()

  const { data, error } = await supabase
    .from('hotels')
    .select('id, name, slug, subscription_plan, subscription_status, trial_ends_at, owner_id, email, created_at, wompi_public_key, wompi_integrity_secret')
    .eq('id', hotelId)
    .single()

  if (error || !data) return null
  return data as HotelWithSettingsDTO
}

/**
 * Get all hotels owned by a user.
 */
export async function getUserHotels(userId: string): Promise<HotelDTO[]> {
  const supabase = getAdminClient()

  const { data, error } = await supabase
    .from('hotels')
    .select('id, name, slug, subscription_plan, subscription_status, trial_ends_at, owner_id, email, created_at')
    .eq('owner_id', userId)

  if (error) return []
  return (data || []) as HotelDTO[]
}

/**
 * Get hotel by slug.
 */
export async function getHotelBySlug(slug: string): Promise<HotelDTO | null> {
  const supabase = getAdminClient()

  const { data, error } = await supabase
    .from('hotels')
    .select('id, name, slug, subscription_plan, subscription_status, trial_ends_at, owner_id, email, created_at')
    .eq('slug', slug)
    .single()

  if (error || !data) return null
  return data as HotelDTO
}

// ─── Auth Helpers ─────────────────────────────────────────────

/**
 * Verify that the current user owns the hotel.
 * Uses Supabase SSR to get the current session.
 */
export async function verifyHotelOwnership(hotelId: string): Promise<boolean> {
  try {
    const { createServerClient } = await import('@supabase/ssr')
    const { cookies } = await import('next/headers')

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            // We're in a server action, no need to set cookies
          },
        },
      }
    )

    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return false

    const hotel = await getHotelWithPlan(hotelId)
    return hotel?.owner_id === session.user.id
  } catch {
    return false
  }
}

/**
 * Get the current user's hotel ID from session.
 * Returns null if not authenticated or no hotel associated.
 */
export async function getCurrentUserHotelId(): Promise<string | null> {
  try {
    const { createServerClient } = await import('@supabase/ssr')
    const { cookies } = await import('next/headers')

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll() {
            // No-op
          },
        },
      }
    )

    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return null

    const hotels = await getUserHotels(session.user.id)
    return hotels.length > 0 ? hotels[0].id : null
  } catch {
    return null
  }
}

// ─── Mutations ────────────────────────────────────────────────

/**
 * Update hotel subscription plan.
 */
export async function updateHotelPlan(
  hotelId: string,
  newPlan: string,
  newStatus: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = getAdminClient()

  const { error } = await supabase
    .from('hotels')
    .update({
      subscription_plan: newPlan,
      subscription_status: newStatus,
    })
    .eq('id', hotelId)

  if (error) {
    console.error('[Hotels DAL] Error updating plan:', error)
    return { ok: false, error: error.message }
  }

  return { ok: true }
}

/**
 * Update hotel trial end date.
 */
export async function updateTrialEndsAt(
  hotelId: string,
  trialEndsAt: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = getAdminClient()

  const { error } = await supabase
    .from('hotels')
    .update({ trial_ends_at: trialEndsAt })
    .eq('id', hotelId)

  if (error) {
    console.error('[Hotels DAL] Error updating trial:', error)
    return { ok: false, error: error.message }
  }

  return { ok: true }
}
