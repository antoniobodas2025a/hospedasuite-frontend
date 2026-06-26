# Proposal: Superadmin Subscriptions & Users Management

## Intent

The superadmin panel has zero visibility into `saas_subscriptions` (migration 016) and no UI to manage `user_roles`. The team must query the database directly to check subscription status, handle trial expirations, or grant/revoke superadmin access. This change adds subscription management and user/role management pages to the superadmin panel.

## Scope

### In Scope
- `/admin/subscriptions` — table of all `saas_subscriptions` with filters (status, plan, hotel), actions (cancel, reactivate, extend trial, change plan)
- `/admin/users` — table of `user_roles` joined with `auth.users`, ability to grant/revoke `superadmin` role, create new superadmins
- Enhanced dashboard cards on `/admin` — trial expiring soon count, past_due accounts, churn indicators
- New server actions in `src/app/actions/super-admin.ts` (subscription CRUD, role management)
- New DAL functions in `src/data/billing.ts` for superadmin-scoped queries (list all, filter by status)
- Sidebar navigation links for both new pages

### Out of Scope
- Wompi payment integration or webhook handling (already exists)
- Automated cron jobs for trial expiration emails
- MRR calculation changes (existing HQ financial report handles this)
- Hotel-level subscription self-management (hotel-owner facing, not superadmin)

## Capabilities

### New Capabilities
- `superadmin-subscription-management`: View, filter, and mutate all hotel subscriptions from the superadmin panel
- `superadmin-user-management`: View and manage `user_roles`, grant/revoke superadmin role

### Modified Capabilities
- `superadmin-authorization`: Dashboard enhanced with subscription-derived metrics (trial expiring, past_due, churn)

## Approach

**Subscriptions page** (`/admin/subscriptions`):
- Server component fetches all subscriptions via new DAL function `getAllSubscriptions(filters)` in `src/data/billing.ts`
- Table columns: hotel name, plan_key, status badge, period dates, cancel_at_period_end flag, wompi IDs
- Filters: status dropdown, plan dropdown, text search by hotel name
- Row actions: cancel (sets `cancel_at_period_end=true`), reactivate, extend trial (+N days), change plan (upgrade/downgrade)
- All actions call new server actions guarded by `requireSuperAdmin()`

**Users page** (`/admin/users`):
- Server component joins `user_roles` with `auth.users` (email, created_at) and `hotels` (if owner)
- Table columns: email, role, created_at, associated hotel (if owner)
- Actions: grant superadmin (insert into `user_roles`), revoke superadmin (delete from `user_roles`), with confirmation dialog
- Guard: must always have at least one superadmin; cannot revoke own role

**Enhanced dashboard** (`/admin`):
- New cards: "Trial Expiring (7d)", "Past Due", "Cancelled (30d)"
- Queries run server-side on page load, cached with `revalidatePath`

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/app/(super-admin)/admin/subscriptions/page.tsx` | New | Subscriptions management page |
| `src/app/(super-admin)/admin/users/page.tsx` | New | User/role management page |
| `src/app/actions/super-admin.ts` | Modified | Add subscription and role management actions |
| `src/data/billing.ts` | Modified | Add `getAllSubscriptions()`, `getAllSubscriptionsByStatus()` |
| `src/app/(super-admin)/admin/page.tsx` | Modified | Add trial/past_due/churn metric cards |
| `src/app/(super-admin)/layout.tsx` | Modified | Add sidebar links for Subscriptions and Users |
| `src/lib/audit-logger.ts` | Modified | Add audit events for role grant/revoke, subscription mutations |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Revoking last superadmin locks team out | Low | Guard: count superadmins before revoke, block if count === 1 |
| Cannot revoke own role mid-session | Medium | Block self-revoke; require another superadmin to revoke |
| Subscription state transition breaks billing | Medium | Only allow valid transitions per schema CHECK; audit all changes |
| `user_roles` table may have RLS policies blocking admin reads | Low | Server actions use `supabaseAdmin` (service role key), bypasses RLS |
| Large subscription table causes slow page loads | Medium | Server-side pagination (50/page), indexed queries on `status` and `plan_key` |

## Rollback Plan

1. Remove new pages (`/admin/subscriptions`, `/admin/users`) — no data mutation, safe to delete
2. Revert additions to `super-admin.ts` and `billing.ts` — existing actions unchanged
3. Revert dashboard card additions on `/admin` — existing KPIs untouched
4. No database migration required; all operations use existing tables
5. If audit events were added, they are additive and do not break existing readers

## Dependencies

- Existing `saas_subscriptions` table (migration 016)
- Existing `user_roles` table (Supabase managed)
- Existing `requireSuperAdmin()` guard in `src/lib/auth-guards.ts`
- Existing `logAuditEvent()` in `src/lib/audit-logger.ts`

## Success Criteria

- [ ] `/admin/subscriptions` displays all subscriptions with filters and actions
- [ ] `/admin/users` displays all user_roles with grant/revoke capability
- [ ] Dashboard shows trial expiring, past_due, and cancelled counts
- [ ] All new server actions call `requireSuperAdmin()` first
- [ ] All mutations call `logAuditEvent()` on success
- [ ] Cannot revoke last superadmin or own role
- [ ] Sidebar has navigation links to both new pages
- [ ] TypeScript compilation passes with no errors
