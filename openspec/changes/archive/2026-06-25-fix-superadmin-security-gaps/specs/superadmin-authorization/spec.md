# Superadmin Authorization Specification

## Purpose

Establish canonical role string `'superadmin'` and shared `requireSuperAdmin()` guard to protect all superadmin server actions. Eliminates: unguarded actions in `super-admin.ts`, email whitelist in `hq.ts`, role string drift.

## Requirements

### Requirement: Canonical Role String

The system MUST use `'superadmin'` as the sole canonical role value. All superadmin checks MUST compare against `'superadmin'`. The string `'super_admin'` MUST NOT appear in `src/`.

#### Scenario: All files use canonical role
- GIVEN middleware, hotel-context, hotel-admin, manual-payments check superadmin status
- WHEN role comparison is performed
- THEN all use `role === 'superadmin'`

#### Scenario: No legacy role string in source
- WHEN `grep -r "super_admin" src/` runs
- THEN zero matches return

### Requirement: Shared requireSuperAdmin() Guard

`src/lib/auth-guards.ts` MUST export `requireSuperAdmin()` that verifies the authenticated user has `role = 'superadmin'` in `user_roles`. Throws on failure, returns silently on success.

#### Scenario: Authorized superadmin passes
- GIVEN user has `role = 'superadmin'` in `user_roles`
- WHEN `await requireSuperAdmin()` is called
- THEN it returns without throwing

#### Scenario: Non-superadmin rejected
- GIVEN user has `role = 'owner'` or no `user_roles` entry
- WHEN `await requireSuperAdmin()` is called
- THEN it throws an authorization error

#### Scenario: Unauthenticated user rejected
- GIVEN no active session
- WHEN `await requireSuperAdmin()` is called
- THEN it throws an authentication error

### Requirement: Guard All Super-Admin Server Actions

Every action in `super-admin.ts` MUST call `await requireSuperAdmin()` before business logic: `createHotelAction`, `godModeAccess`, `updateTenantAction`, `forceChangePasswordAction`, `deleteHotelAction`.

#### Scenario: Non-superadmin cannot create hotel
- GIVEN non-superadmin calls `createHotelAction`
- THEN guard throws before any hotel or user is created

#### Scenario: Unauthenticated caller cannot access god mode
- GIVEN unauthenticated caller invokes `godModeAccess`
- THEN guard throws before generating any auth link

#### Scenario: Owner cannot delete hotel
- GIVEN user with `role = 'owner'` calls `deleteHotelAction`
- THEN guard throws before any data is deleted

### Requirement: HQ Financial Report Uses Role-Based Auth

`getHQFinancialReportAction` in `hq.ts` MUST use `requireSuperAdmin()`. The `SUPER_ADMIN_EMAILS` array and local `verifySuperAdmin()` MUST be removed.

#### Scenario: Superadmin accesses report via role check
- GIVEN user has `role = 'superadmin'` in `user_roles`
- WHEN calling `getHQFinancialReportAction`
- THEN financial report returns

#### Scenario: Email-matched non-role user denied
- GIVEN email matches old whitelist but no `superadmin` role exists
- WHEN calling `getHQFinancialReportAction`
- THEN authorization is denied

#### Scenario: Email constant removed
- WHEN searching `hq.ts` for `SUPER_ADMIN_EMAILS`
- THEN zero matches found

### Requirement: Unified Role Checks in hotel-admin.ts and manual-payments.ts

All superadmin checks in `hotel-admin.ts` (3 actions) and `manual-payments.ts` (2 actions) MUST use `'superadmin'` and call `requireSuperAdmin()`.

#### Scenario: approveDuplicateHotelAction uses canonical role
- WHEN action checks superadmin status
- THEN it compares against `'superadmin'` via shared guard

#### Scenario: approveManualPayment uses shared guard
- GIVEN non-superadmin calls `approveManualPayment`
- THEN guard throws before payment is approved

### Requirement: Database Migration for Role Normalization

If `user_roles` contains `role = 'super_admin'`, a migration MUST update to `'superadmin'`. MUST be idempotent with down migration.

#### Scenario: Migration normalizes existing rows
- GIVEN rows with `role = 'super_admin'` exist
- WHEN migration runs
- THEN all update to `'superadmin'`

#### Scenario: Migration is idempotent
- GIVEN all rows already use `'superadmin'`
- WHEN migration runs again
- THEN no error, no rows modified

#### Scenario: Down migration restores legacy value
- WHEN down migration executes
- THEN `'superadmin'` rows restore to `'super_admin'`

## Acceptance Criteria

| # | Criterion |
|---|-----------|
| 1 | `src/lib/auth-guards.ts` exports `requireSuperAdmin()` |
| 2 | All 5 `super-admin.ts` actions call `await requireSuperAdmin()` first |
| 3 | `hq.ts` has zero references to `SUPER_ADMIN_EMAILS` or local `verifySuperAdmin()` |
| 4 | `grep -r "super_admin" src/` returns zero matches |
| 5 | `grep -r "requireSuperAdmin" src/app/actions/` matches in `super-admin.ts`, `hq.ts`, `hotel-admin.ts`, `manual-payments.ts` |
| 6 | Migration normalizes `'super_admin'` → `'superadmin'` in `user_roles` |
| 7 | All existing tests pass |
