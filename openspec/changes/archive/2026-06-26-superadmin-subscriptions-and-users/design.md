# Design: Superadmin Subscriptions & Users Management

## Technical Approach

Extend the `(super-admin)` route group with two new pages (`/admin/subscriptions`, `/admin/users`) following the existing pattern established by `leads` and `audit-logs` pages: server component fetches initial data → passes to a `'use client'` table component with filter/pagination controls. All mutations go through `'use server'` actions in `super-admin.ts`, guarded by `requireSuperAdmin()` and audited via `logAuditEvent()`. Dashboard enhancement adds 3 new metric cards queried inline in the existing server component. The DAL in `billing.ts` gets superadmin-scoped query functions that bypass hotel-ownership checks (using `supabaseAdmin` with service role).

## Architecture Decisions

| Decision | Option A | Option B (chosen) | Tradeoff |
|----------|----------|--------------------|----------|
| Where to put DAL queries | New `src/data/super-admin.ts` | Add to existing `src/data/billing.ts` | Option B avoids fragmenting the DAL; `billing.ts` already imports `getAdminClient()`; no new `server-only` module needed |
| Subscription filter execution | Client-side after full fetch | Server-side query parameters | Server-side chosen — large subscription counts mandate server pagination (50/page); consistent with leads pattern |
| Confirmation dialog pattern | Custom `useState` toggle per action | Reuse existing `@/components/ui/dialog` (shadcn) | Option B follows existing `LeadsTable` pattern with `Dialog`, `DialogContent`, `DialogFooter` |

## Data Flow

```
Server Component (page.tsx)
  │
  ├─→ getSubscriptionsAction(filters) ──→ DAL: getAllSubscriptions(filters)
  │         │                                    │
  │         └── supabaseAdmin.from('saas_subscriptions') ← RLS bypass (service role)
  │
  ├─→ getSubscriptionMetricsAction() ──→ DAL: getTrialExpiringCount / getPastDueCount / getCancelledCount
  │
  └─→ Client Component (SubscriptionsTable.tsx)
            │
            ├── filter change → refetch via server action
            ├── pagination    → refetch via server action
            └── row action    → server action → mutate → revalidatePath → refetch

User mgmt (UsersTable) follows the same pattern:
  page.tsx → getUserRolesAction() → Client table → grant/revoke/create actions
```

**Subscription action flow** (cancel example):
```
User clicks Cancel → ConfirmDialog → cancelSubscriptionAction(hotelId)
  → requireSuperAdmin()
  → Snapshot current subscription (for audit old_value)
  → supabaseAdmin.from('saas_subscriptions').update({ cancel_at_period_end: true })
  → logAuditEvent({ action: 'subscription_cancelled', entity_type: 'subscription', ... })
  → revalidatePath('/admin/subscriptions')
  → return { success: true }
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/app/(super-admin)/admin/subscriptions/page.tsx` | **Create** | Server component: fetches subscriptions + hotels via `getSubscriptionsAction`, renders `SubscriptionsTable` |
| `src/components/super-admin/SubscriptionsTable.tsx` | **Create** | Client table: filter bar (status, plan, search), paginated rows, row actions (cancel/reactivate/extend trial/change plan), confirmation dialogs |
| `src/app/(super-admin)/admin/users/page.tsx` | **Create** | Server component: fetches `user_roles` joined with `auth.users` + `hotels`, renders `UsersTable` |
| `src/components/super-admin/UsersTable.tsx` | **Create** | Client table: user list with role badges, grant superadmin form, revoke button, create superadmin form, confirmation dialogs |
| `src/app/actions/super-admin.ts` | Modify | Add 7 new server actions: subscriptions (cancel, reactivate, extend trial, change plan, list) + users (grant role, revoke role, create superadmin, list roles) |
| `src/data/billing.ts` | Modify | Add `getAllSubscriptions()`, `getTrialExpiringCount()`, `getPastDueCount()`, `getCancelledCount()` — superadmin-scoped, no ownership checks |
| `src/app/(super-admin)/admin/page.tsx` | Modify | Add 3 new metric cards (trial expiring, past due, cancelled 30d) queried via new DAL functions |
| `src/app/(super-admin)/layout.tsx` | Modify | Add 2 sidebar `<Link>` entries: Subscriptions (`/admin/subscriptions`) with `Receipt` icon, Users (`/admin/users`) with `Users` icon |

## Server Action Signatures

All actions live in `src/app/actions/super-admin.ts`, are `'use server'`, called from client components.

```typescript
// Subscriptions
export async function cancelSubscriptionAction(hotelId: string): Promise<{ success: boolean; error?: string }>
export async function reactivateSubscriptionAction(hotelId: string): Promise<{ success: boolean; error?: string }>
export async function extendTrialAction(hotelId: string, days: number): Promise<{ success: boolean; error?: string }>
export async function changePlanAction(hotelId: string, newPlan: PlanKey): Promise<{ success: boolean; error?: string }>
export async function getSubscriptionsAction(filters: SubscriptionFilters): Promise<{ subscriptions: SubscriptionRow[]; total: number }>

// User roles
export async function grantSuperAdminAction(targetEmail: string): Promise<{ success: boolean; error?: string }>
export async function revokeSuperAdminAction(targetUserId: string): Promise<{ success: boolean; error?: string }>
export async function createSuperAdminAction(email: string, password: string): Promise<{ success: boolean; error?: string }>
export async function getUserRolesAction(): Promise<{ users: UserRoleRow[] }>

// Dashboard metrics (called server-side in page.tsx, not from client)
export async function getSubscriptionMetricsAction(): Promise<{ trialExpiring: number; pastDue: number; cancelled30d: number }>
```

## Component Architecture

```
src/
├── components/super-admin/
│   ├── SubscriptionsTable.tsx    ← 'use client', receives initial data, renders filter+pagination+actions
│   └── UsersTable.tsx            ← 'use client', receives initial data, renders grant/revoke/create forms
└── app/(super-admin)/
    ├── layout.tsx                ← +2 sidebar links
    └── admin/
        ├── page.tsx              ← +3 subscription metric cards
        ├── subscriptions/
        │   └── page.tsx          ← server component: fetch → SubscriptionsTable
        └── users/
            └── page.tsx          ← server component: fetch → UsersTable
```

**SubscriptionsTable** (client component props):
```typescript
interface Props {
  initialSubscriptions: SubscriptionRow[];  // joined with hotel name
  total: number;
  pageSize: number;                          // 50
}
```
Internal state: `filters` (status, plan, search), `page`, `loading`, per-row `actionLoading`. Uses `useRouter().refresh()` after mutations.

**UsersTable** (client component props):
```typescript
interface Props {
  initialUsers: UserRoleRow[];  // joined with hotel name for owners
}
```
Internal state: grant form (email input + submit), create form (email + password + submit), confirmation dialogs for revoke/create.

## Guard Logic

**Subscription mutations** (validated in each server action):

| Action | Pre-condition check | Error if violated |
|--------|-------------------|-------------------|
| cancel | `cancel_at_period_end === false` | "Already cancelled" |
| reactivate | `cancel_at_period_end === true` | "Not cancelled" |
| extend trial | `status === 'trialing'` | "Only trial subscriptions can be extended" |
| change plan | `planKey in ['starter','pro','enterprise']` | "Invalid plan key" |

**Role mutations** (validated in server action, BEFORE mutation):

| Guard | Implementation | Error |
|-------|---------------|-------|
| Self-revoke | `actorId === targetUserId` → throw | "Cannot revoke your own role" |
| Last superadmin | `getSuperAdminCount() <= 1` → throw | "Cannot revoke the last superadmin" |
| Duplicate grant | Check `user_roles` for target `user_id` + `role='superadmin'` | "User is already a superadmin" |
| User not found (grant) | Lookup by email in `auth.users` via `supabaseAdmin.auth.admin.listUsers()` | "User not found" |
| User exists (create) | Lookup by email → reject if found | "User already exists" |

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| **Unit (vitest)** | `getSuperAdminCount()`, `getTrialExpiringCount()`, state transition validation logic | Mock `supabaseAdmin`; test guard conditions (last-superadmin, self-revoke, invalid transitions) |
| **Unit (vitest)** | Server action error paths | Mock `requireSuperAdmin` + `supabaseAdmin`; assert correct error messages for blocked operations |
| **Integration (playwright)** | `/admin/subscriptions` page renders table, filter works, cancel+confirm flow | Navigate as superadmin, verify table columns, apply filters, execute cancel action, verify audit log row |
| **Integration (playwright)** | `/admin/users` page renders, grant flow, revoke flow, self-revoke blocked | Navigate, grant role to test user, verify table update, revoke role, verify disabled self-revoke button with tooltip |
| **Integration (playwright)** | Dashboard metric cards render correct counts | Seed test data (trial expiring in 3d, past_due, recent cancelled), verify card numbers |

## Rollback Plan

1. **Delete `/admin/subscriptions` and `/admin/users` route directories** — no data mutations needed, routes disappear
2. **Revert `super-admin.ts` additions** — remove subscription + role management actions; existing actions (`createHotelAction`, `deleteHotelAction`, etc.) unchanged
3. **Revert `billing.ts` additions** — remove `getAllSubscriptions` and 3 metric query functions; existing functions untouched
4. **Revert dashboard card additions** in `admin/page.tsx` — existing KPI cards untouched
5. **Revert sidebar link additions** in `layout.tsx` — existing nav entries untouched
6. **No DB migration required** — all operations use existing tables (`saas_subscriptions`, `user_roles`, `auth.users`)
7. **Audit events are additive** — no rollback needed for audit log rows; they do not break any readers

All changes are additive. Each modified file has a clean diff boundary — existing code is not refactored, only extended.
