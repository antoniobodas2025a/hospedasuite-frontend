# Superadmin Subscription Management Specification

## Purpose

Provide superadmins with full visibility and control over all `saas_subscriptions` — view, filter, cancel, reactivate, extend trials, and change plans — from the admin panel.

## Requirements

### Requirement: Subscription List Page

The system MUST provide a page at `/admin/subscriptions` within the `(super-admin)` route group. The page MUST display a table of all `saas_subscriptions` joined with hotel names. The page MUST be accessible only to authenticated superadmin users.

#### Scenario: Page renders subscription table

- GIVEN a superadmin navigates to `/admin/subscriptions`
- WHEN the page loads
- THEN a table displays all subscriptions with columns: hotel name, plan_key, status badge, current_period_start, current_period_end, cancel_at_period_end, wompi_subscription_id
- AND rows are ordered by `created_at` descending

#### Scenario: Unauthorized access blocked

- GIVEN a non-superadmin user navigates to `/admin/subscriptions`
- WHEN the page loads
- THEN the `(super-admin)` route guard blocks access

#### Scenario: Empty state displays

- GIVEN zero subscriptions exist in the database
- WHEN the superadmin views the page
- THEN an empty state message is displayed indicating no subscriptions found

### Requirement: Subscription Filters

The system MUST provide filter controls on `/admin/subscriptions` for: status (dropdown), plan_key (dropdown), and text search by hotel name. Filters MUST combine with AND logic.

#### Scenario: Filter by status

- GIVEN subscriptions exist with varied statuses (active, trial, past_due, cancelled)
- WHEN the superadmin selects "active" in the status filter
- THEN only subscriptions with `status = 'active'` are displayed

#### Scenario: Filter by plan

- GIVEN subscriptions exist with varied plan_keys
- WHEN the superadmin selects a plan_key from the dropdown
- THEN only subscriptions matching that plan_key are displayed

#### Scenario: Search by hotel name

- GIVEN subscriptions exist for multiple hotels
- WHEN the superadmin types a hotel name fragment in the search field
- THEN only subscriptions whose hotel name contains the fragment are displayed

#### Scenario: Combined filters

- GIVEN subscriptions exist with varied statuses, plans, and hotels
- WHEN the superadmin applies status + plan + search simultaneously
- THEN only subscriptions matching ALL three criteria are displayed

### Requirement: Cancel Subscription

The system MUST allow superadmins to cancel a subscription by setting `cancel_at_period_end = true`. The action MUST be guarded by `requireSuperAdmin()` and MUST call `logAuditEvent()` on success.

#### Scenario: Cancel active subscription

- GIVEN a subscription with `status = 'active'` and `cancel_at_period_end = false`
- WHEN a superadmin clicks "Cancel" and confirms
- THEN `cancel_at_period_end` is set to `true`
- AND the status badge updates to reflect pending cancellation
- AND an audit event is logged with `action: 'subscription_cancelled'`

#### Scenario: Cancel already-cancelled subscription blocked

- GIVEN a subscription with `cancel_at_period_end = true`
- WHEN a superadmin attempts to cancel
- THEN the action is disabled or shows "Already cancelled"

### Requirement: Reactivate Subscription

The system MUST allow superadmins to reactivate a cancelled subscription by setting `cancel_at_period_end = false`. The action MUST be guarded by `requireSuperAdmin()` and MUST call `logAuditEvent()` on success.

#### Scenario: Reactivate cancelled subscription

- GIVEN a subscription with `cancel_at_period_end = true`
- WHEN a superadmin clicks "Reactivate" and confirms
- THEN `cancel_at_period_end` is set to `false`
- AND the status badge updates to active
- AND an audit event is logged with `action: 'subscription_reactivated'`

#### Scenario: Reactivate active subscription blocked

- GIVEN a subscription with `cancel_at_period_end = false`
- WHEN a superadmin attempts to reactivate
- THEN the action is disabled or hidden

### Requirement: Extend Trial

The system MUST allow superadmins to extend a trial subscription by N days. The action MUST add N days to `current_period_end`. The action MUST be guarded by `requireSuperAdmin()` and MUST call `logAuditEvent()` on success.

#### Scenario: Extend trial by 7 days

- GIVEN a subscription with `status = 'trial'`
- WHEN a superadmin selects "Extend Trial" and enters 7 days
- THEN `current_period_end` is incremented by 7 days
- AND an audit event is logged with `action: 'trial_extended'` and `new_value` containing the added days

#### Scenario: Extend trial on non-trial subscription blocked

- GIVEN a subscription with `status = 'active'` or `status = 'cancelled'`
- WHEN a superadmin attempts to extend trial
- THEN the action is disabled or hidden

### Requirement: Change Plan

The system MUST allow superadmins to change a subscription's plan_key (upgrade or downgrade). The action MUST update `plan_key` and MUST call `logAuditEvent()` on success.

#### Scenario: Upgrade plan

- GIVEN a subscription with `plan_key = 'basic'`
- WHEN a superadmin selects "Change Plan" and chooses 'premium'
- THEN `plan_key` is updated to 'premium'
- AND an audit event is logged with `action: 'plan_changed'`, `old_value` = previous plan, `new_value` = new plan

#### Scenario: Downgrade plan

- GIVEN a subscription with `plan_key = 'premium'`
- WHEN a superadmin selects "Change Plan" and chooses 'basic'
- THEN `plan_key` is updated to 'basic'
- AND an audit event is logged with `action: 'plan_changed'`

### Requirement: Server-Side Pagination

The subscription list MUST use server-side pagination with a default of 50 rows per page. The page MUST display pagination controls.

#### Scenario: First page loads 50 rows

- GIVEN more than 50 subscriptions exist
- WHEN the superadmin loads `/admin/subscriptions`
- THEN exactly 50 rows are displayed
- AND pagination controls show total page count

#### Scenario: Navigate to next page

- GIVEN more than 50 subscriptions exist
- WHEN the superadmin clicks "Next Page"
- THEN the next 50 rows are displayed
- AND the URL or state reflects the current page

## Acceptance Criteria

| # | Criterion |
|---|-----------|
| 1 | `/admin/subscriptions` page exists within `(super-admin)` route group |
| 2 | Table columns: hotel name, plan_key, status, period dates, cancel_at_period_end, wompi_id |
| 3 | Filters: status dropdown, plan dropdown, hotel name search — combine with AND |
| 4 | Actions: cancel, reactivate, extend trial, change plan — all call `requireSuperAdmin()` |
| 5 | All mutations call `logAuditEvent()` on success |
| 6 | Server-side pagination at 50 rows/page |
| 7 | TypeScript compilation passes with no errors |
