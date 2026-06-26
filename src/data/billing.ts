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
import { SAAS_PLANS, normalizePlan, PlanKey, TRIAL_DAYS } from '@/config/saas-plans'
import { getHotelWithPlan, verifyHotelOwnership } from './hotels'

// ─── Types ────────────────────────────────────────────────────

export interface SubscriptionDTO {
  id: string
  hotel_id: string
  plan_key: PlanKey
  status: 'trialing' | 'active' | 'past_due' | 'cancelled' | 'paused' | 'pending_approval'
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
  const periodEnd = new Date(periodStart.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000) // 30 days

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
  const nextPeriod = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000)

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

// ─── Superadmin Queries ─────────────────────────────────────
// These bypass hotel-ownership checks and are only called from
// server actions guarded by requireSuperAdmin().

export interface SubscriptionFilters {
  status?: string
  planKey?: PlanKey
  search?: string
  page?: number
  pageSize?: number
}

export interface SubscriptionRow {
  id: string
  hotel_id: string
  hotel_name: string | null
  plan_key: PlanKey
  status: string
  current_period_start: string
  current_period_end: string
  cancel_at_period_end: boolean
  wompi_subscription_id: string | null
  created_at: string
  updated_at: string
}

/**
 * Get all subscriptions with hotel name join, paginated and filterable.
 * Superadmin-only — no ownership check.
 */
export async function getAllSubscriptions(
  filters: SubscriptionFilters = {}
): Promise<{ subscriptions: SubscriptionRow[]; total: number }> {
  const supabase = getAdminClient()
  const { status, planKey, search, page = 1, pageSize = 50 } = filters

  let query = supabase
    .from('saas_subscriptions')
    .select('*, hotels!inner(name)', { count: 'exact' })
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)
  if (planKey) query = query.eq('plan_key', planKey)
  if (search) query = query.ilike('hotels.name', `%${search}%`)

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  query = query.range(from, to)

  const { data, error, count } = await query

  if (error) {
    console.error('[Billing DAL] Error getting subscriptions:', error)
    return { subscriptions: [], total: 0 }
  }

  const subscriptions: SubscriptionRow[] = (data || []).map((row: any) => ({
    id: row.id,
    hotel_id: row.hotel_id,
    hotel_name: row.hotels?.name ?? null,
    plan_key: row.plan_key,
    status: row.status,
    current_period_start: row.current_period_start,
    current_period_end: row.current_period_end,
    cancel_at_period_end: row.cancel_at_period_end,
    wompi_subscription_id: row.wompi_subscription_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }))

  return { subscriptions, total: count ?? 0 }
}

export interface SubscriptionMetrics {
  mrr: number
  churnRate: number
  trialExpiringCount: number
  activeCount: number
  cancelledCount: number
  pastDueCount: number
  totalCount: number
}

/**
 * Get aggregate subscription metrics for the superadmin dashboard.
 * Returns MRR, churn rate, trial expiring count, and status breakdowns.
 */
export async function getSubscriptionMetrics(): Promise<SubscriptionMetrics> {
  const supabase = getAdminClient()

  const { data, error } = await supabase
    .from('saas_subscriptions')
    .select('status, plan_key, current_period_end, updated_at')

  if (error) {
    console.error('[Billing DAL] Error getting metrics:', error)
    return {
      mrr: 0,
      churnRate: 0,
      trialExpiringCount: 0,
      activeCount: 0,
      cancelledCount: 0,
      pastDueCount: 0,
      totalCount: 0,
    }
  }

  const subs = (data || []) as any[]
  const now = new Date()
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const active = subs.filter(
    (s) => s.status === 'active' || s.status === 'trialing'
  )
  const cancelled = subs.filter((s) => s.status === 'cancelled')
  const trialExpiring = subs.filter(
    (s) =>
      s.status === 'trialing' &&
      s.current_period_end &&
      new Date(s.current_period_end) <= sevenDaysFromNow &&
      new Date(s.current_period_end) >= now
  )
  const recentlyCancelled = cancelled.filter(
    (s) => s.updated_at && new Date(s.updated_at) >= thirtyDaysAgo
  )

  // MRR: sum of active subscriptions' plan prices (COP)
  const mrr = active.reduce((sum, s) => {
    const plan = SAAS_PLANS[s.plan_key as PlanKey]
    return sum + (plan?.priceCOP ?? 0)
  }, 0)

  // Churn rate: cancelled in last 30 days / (active + cancelled in last 30 days)
  const atRiskDenominator = active.length + recentlyCancelled.length
  const churnRate =
    atRiskDenominator > 0
      ? Math.round((recentlyCancelled.length / atRiskDenominator) * 100) / 100
      : 0

  return {
    mrr,
    churnRate,
    trialExpiringCount: trialExpiring.length,
    activeCount: active.length,
    cancelledCount: recentlyCancelled.length,
    pastDueCount: subs.filter((s) => s.status === 'past_due').length,
    totalCount: subs.length,
  }
}

export interface UserRoleRow {
  id: string
  user_id: string
  email: string | null
  role: string
  hotel_id: string | null
  hotel_name: string | null
  created_at: string
}

/**
 * Get all users with their roles from user_roles, joined with auth.users
 * for email and hotels for owner hotel name.
 * Superadmin-only — no ownership check.
 */
export async function getAllUsersWithRoles(): Promise<UserRoleRow[]> {
  const supabase = getAdminClient()

  const { data: roles, error } = await supabase
    .from('user_roles')
    .select('*')
    .order('created_at', { ascending: false })

  if (error || !roles) {
    console.error('[Billing DAL] Error getting user roles:', error)
    return []
  }

  const rolesArray = roles as any[]

  // Build email map from auth.users (service role allows schema access)
  const userIds = [...new Set(rolesArray.map((r) => r.user_id))]
  const emailMap = new Map<string, string>()

  if (userIds.length > 0) {
    try {
      const { data: authUsers } = await supabase
        .schema('auth')
        .from('users')
        .select('id, email')
        .in('id', userIds)

      for (const u of (authUsers || []) as any[]) {
        if (u.email) emailMap.set(u.id, u.email)
      }
    } catch (err) {
      // Emails will be null in result — auth schema may not be directly accessible
      console.warn(
        '[Billing DAL] Could not fetch auth.users emails:',
        (err as Error).message
      )
    }
  }

  // Build hotel map for owners
  const ownerIds = rolesArray
    .filter((r) => r.role === 'owner')
    .map((r) => r.user_id)
  const hotelMap = new Map<string, string>()

  if (ownerIds.length > 0) {
    const { data: hotels } = await supabase
      .from('hotels')
      .select('owner_id, name')
      .in('owner_id', ownerIds)

    for (const h of (hotels || []) as any[]) {
      if (h.owner_id) hotelMap.set(h.owner_id, h.name)
    }
  }

  return rolesArray.map((r) => ({
    id: r.id,
    user_id: r.user_id,
    email: emailMap.get(r.user_id) ?? null,
    role: r.role,
    hotel_id: r.role === 'owner' ? r.user_id : null,
    hotel_name: r.role === 'owner' ? (hotelMap.get(r.user_id) ?? null) : null,
    created_at: r.created_at,
  }))
}

/**
 * Count users with role='superadmin'.
 * Used by the last-superadmin guard in revokeSuperadminRoleAction.
 */
export async function getSuperadminCount(): Promise<number> {
  const supabase = getAdminClient()

  const { count, error } = await supabase
    .from('user_roles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'superadmin')

  if (error) {
    console.error('[Billing DAL] Error counting superadmins:', error)
    return 0
  }

  return count ?? 0
}
