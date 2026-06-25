# Tasks: Fix Superadmin Security Gaps

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~190 (80 added + 110 removed) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | single-pr |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

## Phase 1: Foundation

- [x] 1.1 Create `src/lib/auth-guards.ts` — export `requireSuperAdmin()`: SSR session via `createClient()`, query `user_roles` for `role = 'superadmin'`, throw `Error` on auth failure or unauthorized role
- [x] 1.2 Create `supabase/migrations/20260625_normalize_superadmin_role.sql` — idempotent `UPDATE user_roles SET role = 'superadmin' WHERE role = 'super_admin'` + down migration

## Phase 2: Guard Server Actions

- [x] 2.1 Add `await requireSuperAdmin()` as first line in all 5 actions of `src/app/actions/super-admin.ts`: `createHotelAction`, `godModeAccess`, `updateTenantAction`, `forceChangePasswordAction`, `deleteHotelAction`
- [x] 2.2 Refactor `src/app/actions/hq.ts` — remove `SUPER_ADMIN_EMAILS` (line 10) and local `verifySuperAdmin()` (lines 13-40); replace `await verifySuperAdmin()` with `await requireSuperAdmin()`; remove unused `createServerClient` import
- [x] 2.3 Refactor `src/app/actions/hotel-admin.ts` — replace 3 inline `role !== 'super_admin'` manual query blocks (lines 30-38, 92-100, 136-144) with `await requireSuperAdmin()`; remove now-unused `supabase` + `roleData` variables from each block
- [x] 2.4 Refactor `src/app/actions/manual-payments.ts` — replace 3 inline `role !== 'super_admin'` manual query blocks (lines 115-123, 221-228, 281-289) with `await requireSuperAdmin()`; remove now-unused `supabase` + `roleData` variables from each block

## Phase 3: Testing

- [x] 3.1 Write `src/lib/__tests__/auth-guards.test.ts` — test `requireSuperAdmin()`: happy path (returns void), non-superadmin role rejects (throw), unauthenticated rejects (throw), missing `user_roles` row rejects (throw). Use vitest, mock `createClient` return.

## Phase 4: Verification

- [x] 4.1 Run `grep -r "super_admin" src/` — confirm zero matches (acceptance criterion)
- [x] 4.2 Run `grep -r "SUPER_ADMIN_EMAILS" src/` — confirm zero matches (acceptance criterion)
