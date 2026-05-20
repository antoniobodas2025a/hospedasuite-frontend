/**
 * Billing — DAL Module
 *
 * Server-only data access layer for subscription management.
 * Handles subscription lifecycle: create, upgrade, cancel, renew.
 *
 * Pattern (Next.js best practice):
 *   - import 'server-only' prevents client-side usage
 *   - Uses Supabase admin client for server-side operations
 *   - All mutations verify hotel ownership before executing
 */

import 'server-only'

import { createClient } from '@supabase/supabase-js'
import { SAAS_PLANS, normalizePlan, PlanKey } from '@/config/saas-plans'
import { getHotelWithPlan, verifyHotelOwnership } from './hotels'

// ─── Types ────────────────────────────────────────────────────

export interface SubscriptionDTO {
  id: string
  hotel_id: string
  plan_key: PlanKey
  status: 'trialing' | 'active' | 'past_due' | 'cancelled' | 'paused'
  current_period_start: string
  current_period_end: string
  cancel_at_period_end: boolean
  wompi_customer_id: string | null
  wompi_payment_source_id: string | null
  wompi_subscription_id: string | null
  created_at: string
  updated_at: string
}

export interface CreateSubscriptionInput {
  hotelId: string
  planKey: PlanKey
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
 * Get active subscription for a hotel.
 */
export async function getActiveSubscription(hotelId: string): Promise<SubscriptionDTO | null> {
  const supabase = getAdminClient()

  const { data, error } = await supabase
    .from('saas_subscriptions')
    .select('*')
    .eq('hotel_id', hotelId)
    .single()

  if (error || !data) return null
  return data as SubscriptionDTO
}

/**
 * Get all subscriptions that are expiring within the next N hours.
 * Used by the renewal cron job.
 */
export async function getExpiringSubscriptions(hoursAhead: number = 24): Promise<SubscriptionDTO[]> {
  const supabase = getAdminClient()
  const cutoff = new Date(Date.now() + hoursAhead * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('saas_subscriptions')
    .select('*')
    .eq('status', 'active')
    .lte('current_period_end', cutoff)
    .eq('cancel_at_period_end', false)

  if (error) return []
  return (data || []) as SubscriptionDTO[]
}

/**
 * Get all subscriptions that are past due (period ended without payment).
 */
export async function getPastDueSubscriptions(): Promise<SubscriptionDTO[]> {
  const supabase = getAdminClient()
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('saas_subscriptions')
    .select('*')
    .eq('status', 'active')
    .lt('current_period_end', now)

  if (error) return []
  return (data || []) as SubscriptionDTO[]
}

// ─── Mutations ────────────────────────────────────────────────

/**
 * Create a new subscription for a hotel.
 * Called after onboarding or trial activation.
 */
export async function createSubscription(
  input: CreateSubscriptionInput
): Promise<{ ok: boolean; data?: SubscriptionDTO; error?: string }> {
  // 1. Auth: verify ownership
  const isOwner = await verifyHotelOwnership(input.hotelId)
  if (!isOwner) {
    return { ok: false, error: 'Unauthorized: you do not own this hotel' }
  }

  // 2. Check if subscription already exists
  const existing = await getActiveSubscription(input.hotelId)
  if (existing) {
    return { ok: false, error: 'Hotel already has an active subscription' }
  }

  // 3. Get hotel to determine trial status
  const hotel = await getHotelWithPlan(input.hotelId)
  if (!hotel) {
    return { ok: false, error: 'Hotel not found' }
  }

  const plan = SAAS_PLANS[input.planKey]
  const now = new Date()
  const isTrial = hotel.subscription_status === 'trialing' && hotel.trial_ends_at

  // If in trial, period starts when trial ends
  const periodStart = isTrial ? new Date(hotel.trial_ends_at!) : now
  const periodEnd = new Date(periodStart.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days

  // 4. Execute
  const supabase = getAdminClient()

  const { data, error } = await supabase
    .from('saas_subscriptions')
    .insert({
      hotel_id: input.hotelId,
      plan_key: input.planKey,
      status: isTrial ? 'trialing' : 'active',
      current_period_start: periodStart.toISOString(),
      current_period_end: periodEnd.toISOString(),
      cancel_at_period_end: false,
    })
    .select()
    .single()

  if (error) {
    console.error('[Billing DAL] Error creating subscription:', error)
    return { ok: false, error: error.message }
  }

  // Also update hotels table for consistency
  await supabase
    .from('hotels')
    .update({
      subscription_plan: input.planKey,
      subscription_status: isTrial ? 'trialing' : 'active',
    })
    .eq('id', input.hotelId)

  return { ok: true, data: data as SubscriptionDTO }
}

/**
 * Upgrade subscription to a higher plan.
 * Takes effect immediately.
 */
export async function upgradeSubscription(
  hotelId: string,
  newPlan: PlanKey
): Promise<{ ok: boolean; data?: SubscriptionDTO; error?: string }> {
  // 1. Auth: verify ownership
  const isOwner = await verifyHotelOwnership(hotelId)
  if (!isOwner) {
    return { ok: false, error: 'Unauthorized: you do not own this hotel' }
  }

  // 2. Get current subscription
  const sub = await getActiveSubscription(hotelId)
  if (!sub) {
    return { ok: false, error: 'No active subscription found' }
  }

  // 3. Execute upgrade
  const supabase = getAdminClient()

  const { data, error } = await supabase
    .from('saas_subscriptions')
    .update({
      plan_key: newPlan,
      updated_at: new Date().toISOString(),
    })
    .eq('hotel_id', hotelId)
    .select()
    .single()

  if (error) {
    console.error('[Billing DAL] Error upgrading subscription:', error)
    return { ok: false, error: error.message }
  }

  // Also update hotels table
  await supabase
    .from('hotels')
    .update({ subscription_plan: newPlan })
    .eq('id', hotelId)

  return { ok: true, data: data as SubscriptionDTO }
}

/**
 * Cancel subscription at end of current period.
 * User retains access until current_period_end.
 */
export async function cancelSubscription(
  hotelId: string
): Promise<{ ok: boolean; error?: string }> {
  // 1. Auth: verify ownership
  const isOwner = await verifyHotelOwnership(hotelId)
  if (!isOwner) {
    return { ok: false, error: 'Unauthorized: you do not own this hotel' }
  }

  // 2. Execute
  const supabase = getAdminClient()

  const { error } = await supabase
    .from('saas_subscriptions')
    .update({
      cancel_at_period_end: true,
      updated_at: new Date().toISOString(),
    })
    .eq('hotel_id', hotelId)

  if (error) {
    console.error('[Billing DAL] Error cancelling subscription:', error)
    return { ok: false, error: error.message }
  }

  return { ok: true }
}

/**
 * Reactivate a cancelled subscription.
 */
export async function reactivateSubscription(
  hotelId: string
): Promise<{ ok: boolean; error?: string }> {
  // 1. Auth: verify ownership
  const isOwner = await verifyHotelOwnership(hotelId)
  if (!isOwner) {
    return { ok: false, error: 'Unauthorized: you do not own this hotel' }
  }

  // 2. Execute
  const supabase = getAdminClient()

  const { error } = await supabase
    .from('saas_subscriptions')
    .update({
      cancel_at_period_end: false,
      status: 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('hotel_id', hotelId)

  if (error) {
    console.error('[Billing DAL] Error reactivating subscription:', error)
    return { ok: false, error: error.message }
  }

  return { ok: true }
}

/**
 * Mark subscription as active after successful payment.
 * Called by Wompi webhook handler.
 */
export async function activateSubscription(
  hotelId: string,
  wompiPaymentId: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = getAdminClient()
  const now = new Date()
  const nextPeriod = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  const { error } = await supabase
    .from('saas_subscriptions')
    .update({
      status: 'active',
      current_period_start: now.toISOString(),
      current_period_end: nextPeriod.toISOString(),
      cancel_at_period_end: false,
      last_wompi_payment_id: wompiPaymentId,
      last_wompi_payment_date: now.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq('hotel_id', hotelId)

  if (error) {
    console.error('[Billing DAL] Error activating subscription:', error)
    return { ok: false, error: error.message }
  }

  // Also update hotels table
  await supabase
    .from('hotels')
    .update({ subscription_status: 'active' })
    .eq('id', hotelId)

  return { ok: true }
}

/**
 * Mark subscription as past_due after failed payment.
 * Called by Wompi webhook handler.
 */
export async function markSubscriptionPastDue(
  hotelId: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = getAdminClient()

  const { error } = await supabase
    .from('saas_subscriptions')
    .update({
      status: 'past_due',
      updated_at: new Date().toISOString(),
    })
    .eq('hotel_id', hotelId)

  if (error) {
    console.error('[Billing DAL] Error marking past due:', error)
    return { ok: false, error: error.message }
  }

  // Also update hotels table
  await supabase
    .from('hotels')
    .update({ subscription_status: 'past_due' })
    .eq('id', hotelId)

  return { ok: true }
}

/**
 * Extend subscription period by N days.
 * Used for compensation or trial extensions.
 */
export async function extendSubscription(
  hotelId: string,
  days: number
): Promise<{ ok: boolean; error?: string }> {
  // 1. Auth: verify ownership
  const isOwner = await verifyHotelOwnership(hotelId)
  if (!isOwner) {
    return { ok: false, error: 'Unauthorized: you do not own this hotel' }
  }

  const sub = await getActiveSubscription(hotelId)
  if (!sub) {
    return { ok: false, error: 'No active subscription found' }
  }

  const currentEnd = new Date(sub.current_period_end)
  const newEnd = new Date(currentEnd.getTime() + days * 24 * 60 * 60 * 1000)

  const supabase = getAdminClient()

  const { error } = await supabase
    .from('saas_subscriptions')
    .update({
      current_period_end: newEnd.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('hotel_id', hotelId)

  if (error) {
    console.error('[Billing DAL] Error extending subscription:', error)
    return { ok: false, error: error.message }
  }

  return { ok: true }
}
