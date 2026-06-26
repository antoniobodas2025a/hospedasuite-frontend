/**
 * Superadmin — DAL Module
 *
 * Server-only data access layer for superadmin read queries.
 * Centralizes all DB access that was previously inlined in page components.
 *
 * Pattern (matching src/data/billing.ts):
 *   - import 'server-only' prevents client-side usage
 *   - Own getAdminClient() — does NOT import supabaseAdmin singleton
 *   - Typed return interfaces for all queries
 *   - All queries are read-only, no ownership checks needed (guarded upstream)
 */

import 'server-only'

import { createClient } from '@supabase/supabase-js'

// ─── Re-exports from billing.ts ─────────────────────────────────

export {
  getAllSubscriptions as getSubscriptions,
  getSubscriptionMetrics as getMetrics,
  getAllUsersWithRoles as getUsers,
  getSuperadminCount,
} from './billing'

// ─── Re-export from superadmin-leads server action ──────────────

export { getLeadsAction as getLeads } from '@/app/actions/superadmin-leads'

// ─── Typed Interfaces ──────────────────────────────────────────

export interface HotelRow {
  id: string
  name: string
  status: string
  email: string
  owner_id: string | null
  subscription_plan: string | null
  subscription_status: string | null
}

export interface DuplicateHotelRow {
  id: string
  name: string
  slug: string
  city: string | null
  location: string | null
  created_at: string
  subscription_status: string
  fingerprint_hash: string | null
}

export interface PaymentRow {
  id: string
  hotel_id: string
  user_id: string
  amount: number
  method: 'nequi' | 'daviplata'
  status: 'pending' | 'approved' | 'rejected'
  receipt_url: string
  rejection_reason: string | null
  created_at: string
  approved_at: string | null
  approved_by: string | null
  hotels: {
    name: string
    city: string | null
    email: string | null
  } | null
}

export interface AuditLogRow {
  id: string
  actor_type: string
  actor_id: string | null
  actor_email: string | null
  action: string
  entity_type: string
  entity_id: string
  old_value: Record<string, unknown> | null
  new_value: Record<string, unknown> | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

export interface AuditLogFilters {
  actorEmail?: string
  action?: string
  entityType?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  pageSize?: number
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
}

// ─── Supabase Admin Client ────────────────────────────────────

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// ─── Hotels ───────────────────────────────────────────────────

/**
 * Get all hotels ordered by created_at descending.
 * Returns fields used by TenantManager: name, status, email, owner_id, subscription_plan.
 */
export async function getHotels(): Promise<HotelRow[]> {
  const supabase = getAdminClient()

  const { data, error } = await supabase
    .from('hotels')
    .select(
      'id, name, status, email, owner_id, subscription_plan, subscription_status'
    )
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[Superadmin DAL] Error fetching hotels:', error)
    return []
  }

  return (data || []) as HotelRow[]
}

/**
 * Count all hotels with status = 'active'.
 */
export async function getHotelCount(): Promise<number> {
  const supabase = getAdminClient()

  const { count, error } = await supabase
    .from('hotels')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')

  if (error) {
    console.error('[Superadmin DAL] Error counting hotels:', error)
    return 0
  }

  return count ?? 0
}

// ─── Duplicate Hotels ─────────────────────────────────────────

/**
 * Get duplicate-review hotels with fingerprint hash join.
 * Supports optional server-side pagination.
 */
export async function getDuplicateHotels(
  filters: { page?: number; pageSize?: number } = {}
): Promise<{ hotels: DuplicateHotelRow[]; total: number }> {
  const supabase = getAdminClient()
  const { page = 1, pageSize = 50 } = filters

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const { data, error, count } = await supabase
    .from('hotels')
    .select(
      `
      id,
      name,
      slug,
      city,
      location,
      created_at,
      subscription_status,
      hotel_fingerprints!inner(fingerprint_hash)
    `,
      { count: 'exact' }
    )
    .eq('subscription_status', 'duplicate_review')
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) {
    console.error('[Superadmin DAL] Error fetching duplicate hotels:', error)
    return { hotels: [], total: 0 }
  }

  const hotels: DuplicateHotelRow[] = ((data || []) as any[]).map((h: any) => ({
    id: h.id,
    name: h.name,
    slug: h.slug,
    city: h.city,
    location: h.location,
    created_at: h.created_at,
    subscription_status: h.subscription_status,
    fingerprint_hash: Array.isArray(h.hotel_fingerprints)
      ? h.hotel_fingerprints[0]?.fingerprint_hash ?? null
      : h.hotel_fingerprints?.fingerprint_hash ?? null,
  }))

  return { hotels, total: count ?? 0 }
}

// ─── Pending Payments ─────────────────────────────────────────

/**
 * Get manual payments with hotel join, optionally filtered by status.
 * Supports server-side pagination.
 */
export async function getPendingPayments(
  filters: { status?: string; page?: number; pageSize?: number } = {}
): Promise<{ payments: PaymentRow[]; total: number }> {
  const supabase = getAdminClient()
  const { status, page = 1, pageSize = 50 } = filters

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('manual_payments')
    .select(
      `
      id,
      hotel_id,
      user_id,
      amount,
      method,
      status,
      receipt_url,
      rejection_reason,
      created_at,
      approved_at,
      approved_by,
      hotels!inner(name, city, email)
    `,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  query = query.range(from, to)

  const { data, error, count } = await query

  if (error) {
    console.error('[Superadmin DAL] Error fetching pending payments:', error)
    return { payments: [], total: 0 }
  }

  const payments: PaymentRow[] = ((data || []) as any[]).map((p: any) => ({
    id: p.id,
    hotel_id: p.hotel_id,
    user_id: p.user_id,
    amount: p.amount,
    method: p.method as 'nequi' | 'daviplata',
    status: p.status as 'pending' | 'approved' | 'rejected',
    receipt_url: p.receipt_url ?? '',
    rejection_reason: p.rejection_reason ?? null,
    created_at: p.created_at,
    approved_at: p.approved_at ?? null,
    approved_by: p.approved_by ?? null,
    hotels: Array.isArray(p.hotels) ? p.hotels[0] ?? null : p.hotels,
  }))

  return { payments, total: count ?? 0 }
}

// ─── Audit Logs ───────────────────────────────────────────────

/**
 * Get paginated audit logs with filter support.
 * Matches the query pattern previously inlined in audit-logs/page.tsx.
 */
export async function getAuditLogs(
  filters: AuditLogFilters = {}
): Promise<{ logs: AuditLogRow[]; total: number }> {
  const supabase = getAdminClient()
  const {
    actorEmail,
    action,
    entityType,
    dateFrom,
    dateTo,
    page = 1,
    pageSize = 50,
  } = filters

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('audit_logs')
    .select('*', { count: 'exact' })

  if (actorEmail) {
    query = query.ilike('actor_email', `%${actorEmail}%`)
  }
  if (action) {
    query = query.eq('action', action)
  }
  if (entityType) {
    query = query.eq('entity_type', entityType)
  }
  if (dateFrom) {
    query = query.gte('created_at', dateFrom)
  }
  if (dateTo) {
    query = query.lte('created_at', dateTo + 'T23:59:59')
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) {
    console.error('[Superadmin DAL] Error fetching audit logs:', error)
    return { logs: [], total: 0 }
  }

  return { logs: (data || []) as AuditLogRow[], total: count ?? 0 }
}

/**
 * Get distinct action and entity_type values for audit log filter dropdowns.
 */
export async function getAuditLogFilterOptions(): Promise<{
  actions: string[]
  entityTypes: string[]
}> {
  const supabase = getAdminClient()

  const [{ data: actionsData }, { data: entityTypesData }] =
    await Promise.all([
      supabase.from('audit_logs').select('action').order('action'),
      supabase.from('audit_logs').select('entity_type').order('entity_type'),
    ])

  const actions: string[] = [
    ...new Set(
      ((actionsData ?? []) as { action: string }[]).map((r) => r.action)
    ),
  ]
  const entityTypes: string[] = [
    ...new Set(
      ((entityTypesData ?? []) as { entity_type: string }[]).map(
        (r) => r.entity_type
      )
    ),
  ]

  return { actions, entityTypes }
}
