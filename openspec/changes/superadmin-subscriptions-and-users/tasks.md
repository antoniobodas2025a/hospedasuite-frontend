# Tasks: Superadmin Subscriptions & Users Management

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1,100 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1: Backend → PR 2: Frontend → PR 3: Dashboard + E2E |
| Delivery strategy | ask-on-risk |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | DAL + Server Actions + Unit Tests | PR 1 | Backbone — no UI, all mutations guarded & audited |
| 2 | SubscriptionsTable + UsersTable + Pages | PR 2 | Depends on PR 1; both client tables + server components |
| 3 | Dashboard cards + Nav links + E2E tests | PR 3 | Depends on PR 2; wires everything together |

## Phase 1: DAL Extension — `src/data/billing.ts`

- [x] 1.1 Add `getAllSubscriptions(filters)` — paginated, joins `hotels.name`, filters by status/plan/search, ordered by `created_at` desc
- [x] 1.2 Add `getTrialExpiringCount(days)` — count where `status='trialing'` and `current_period_end` within N days (→ `getSubscriptionMetrics()`)
- [x] 1.3 Add `getPastDueCount()` — count where `status='past_due'` (→ `getSubscriptionMetrics()`)
- [x] 1.4 Add `getCancelledCount(days)` — count where `status='cancelled'` and `updated_at` within N days (→ `getSubscriptionMetrics()`)
- [x] (1.x) Add `getAllUsersWithRoles()` — users with roles joined with auth.users email + hotels name
- [x] (1.x) Add `getSuperadminCount()` — count of users with role='superadmin'

## Phase 2: Server Actions — `src/app/actions/super-admin.ts`

- [x] 2.1 Add `getSubscriptionsAction(filters)` — calls DAL, returns paginated result
- [x] 2.2 Add `cancelSubscriptionAction(subscriptionId)` — guard, snapshot, update `cancel_at_period_end=true`, audit
- [x] 2.3 Add `reactivateSubscriptionAction(subscriptionId)` — guard, snapshot, update `cancel_at_period_end=false`, audit
- [x] 2.4 Add `extendTrialAction(subscriptionId, days)` — guard (status=trialing), extend `current_period_end`, audit
- [x] 2.5 Add `changePlanAction(subscriptionId, newPlan)` — guard (valid key), snapshot old/new, update `plan_key`, audit
- [x] 2.6 Add `getSubscriptionMetricsAction()` — calls `getSubscriptionMetrics()`, returns MRR + churn + counts
- [x] 2.7 Add `getUsersAction()` — calls `getAllUsersWithRoles()`, returns user list with roles
- [x] 2.8 Add `grantSuperadminRoleAction(targetEmail)` — lookup user by email, guard (not already superadmin), insert row, audit
- [x] 2.9 Add `revokeSuperadminRoleAction(targetUserId)` — guard (not self, not last superadmin), delete row, audit
- [x] 2.10 Add `createSuperadminAction(email, password)` — guard (user not exists), create auth user + insert role, audit

## Phase 3: Subscription Page — `/admin/subscriptions`

- [x] 3.1 Create `src/app/(super-admin)/admin/subscriptions/page.tsx` — server component: fetch via `getSubscriptionsAction`, render header info
- [x] 3.2 Create `src/app/(super-admin)/admin/subscriptions/SubscriptionsTable.tsx` — client table: filter bar (status/plan/search), pagination, status badges, row action buttons, confirmation dialogs for cancel/reactivate/extend/change-plan
- [x] 3.3 Wire row actions to server actions with loading states, `useRouter().refresh()` after mutation

## Phase 4: Users Page — `/admin/users`

- [x] 4.1 Create `src/app/(super-admin)/admin/users/page.tsx` — server component: fetch via `getUsersAction`, render header
- [x] 4.2 Create `src/app/(super-admin)/admin/users/UsersTable.tsx` — client table: role badges, grant form (email input), create form (email+password), revoke button, confirmation dialogs for revoke/create
- [x] 4.3 Implement guard logic: disable self-revoke with tooltip, block last-superadmin revoke with error, check duplicate grant

## Phase 5: Dashboard + Nav Links

- [ ] 5.1 Modify `src/app/(super-admin)/admin/page.tsx` — add 3 metric cards (Trial Expiring, Past Due, Cancelled 30d) using `getSubscriptionMetricsAction()`
- [ ] 5.2 Modify `src/app/(super-admin)/layout.tsx` — add sidebar `<Link>` for Subscriptions (`Receipt` icon) and Users (`Users` icon)

## Phase 6: Unit Tests

- [x] 6.1 Write unit tests for metrics / count functions — mock `supabaseAdmin`, test MRR, churn, trial expiring, past_due, cancelled
- [x] 6.2 Write unit tests for `getSuperAdminCount()` guard logic — last-superadmin blocks, self-revoke blocks, duplicate grant
- [x] 6.3 Write unit tests for server actions — mock `requireSuperAdmin` + `supabaseAdmin`, test cancel/reactivate/extend/change-plan/revoke/grant/create valid + error paths

## Phase 7: E2E Verification

- [ ] 7.1 Write Playwright test: `/admin/subscriptions` renders table, filters work, cancel+confirm flow works
- [ ] 7.2 Write Playwright test: `/admin/users` renders table, grant flow, revoke flow (including blocked self-revoke)
- [ ] 7.3 Write Playwright test: Dashboard metric cards render correct counts with seeded data
