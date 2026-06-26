# DAL Extraction Specification

## Purpose

Centralize all superadmin database queries into a single Data Access Layer module at `src/data/superadmin.ts`. Eliminates inline queries scattered across page components, following the established pattern from `src/data/billing.ts`.

## Requirements

### Requirement: Centralized Superadmin DAL Module

The system MUST provide a module at `src/data/superadmin.ts` that exports all superadmin read queries. The module MUST include `import 'server-only'` at the top to prevent client-side usage. All queries MUST use typed return interfaces.

#### Scenario: Module exists with server-only guard
- GIVEN the superadmin architecture refactor is complete
- WHEN `src/data/superadmin.ts` is read
- THEN the first import statement is `import 'server-only'`
- AND the file exports typed query functions

#### Scenario: Queries use typed interfaces
- GIVEN a consumer imports from `src/data/superadmin.ts`
- WHEN TypeScript compilation runs
- THEN all exported functions have explicit return type annotations
- AND no `any` types appear in function signatures

### Requirement: DAL Exports All Superadmin Queries

The module MUST export the following query functions: `getHotels()`, `getLeads()`, `getSubscriptions()`, `getUsers()`, `getAuditLogs()`, `getPendingPayments()`, `getDuplicateHotels()`, `getMetrics()`. Each function MUST encapsulate its Supabase query logic.

#### Scenario: getHotels returns all hotels
- GIVEN `getHotels()` is called
- WHEN the query completes
- THEN it returns all hotels ordered by `created_at` descending
- AND includes hotel fields needed by TenantManager (name, status, email, owner_id, subscription_plan, id)

#### Scenario: getDuplicateHotels returns duplicate candidates
- GIVEN `getDuplicateHotels()` is called
- WHEN the query completes
- THEN it returns hotels with `subscription_status = 'duplicate_review'`
- AND includes `fingerprint_hash` from the `hotel_fingerprints` join

#### Scenario: getPendingPayments returns manual payment requests
- GIVEN `getPendingPayments()` is called
- WHEN the query completes
- THEN it returns `manual_payments` records joined with hotel name and city
- AND supports optional status filtering

#### Scenario: getAuditLogs returns paginated audit events
- GIVEN `getAuditLogs(filters)` is called with pagination params
- WHEN the query completes
- THEN it returns `audit_logs` records with `count: 'exact'`
- AND respects filter parameters (actor_email, action, entity_type, date range)

#### Scenario: getMetrics returns dashboard metrics
- GIVEN `getMetrics()` is called
- WHEN the query completes
- THEN it returns subscription-derived metrics (trial expiring, past due, cancelled, churn rate)

#### Scenario: getLeads, getSubscriptions, getUsers delegate appropriately
- GIVEN these functions are called
- WHEN the queries complete
- THEN they return data matching the existing behavior of `getLeadsAction`, `getAllSubscriptions`, and `getAllUsersWithRoles`
- AND use the same query logic previously inlined or in server actions

### Requirement: DAL Uses Admin Client Pattern

The DAL MUST use `getAdminClient()` (a local function creating a Supabase client with service role key) for all queries, matching the pattern in `src/data/billing.ts`. The DAL MUST NOT import `supabaseAdmin` from `@/lib/supabase-admin`.

#### Scenario: DAL creates its own admin client
- GIVEN `src/data/superadmin.ts` source is inspected
- WHEN searching for client creation
- THEN a `getAdminClient()` function exists that calls `createClient()` with env vars
- AND no `import { supabaseAdmin }` statement exists in the file

## Acceptance Criteria

| # | Criterion |
|---|-----------|
| 1 | `src/data/superadmin.ts` exists with `import 'server-only'` as first import |
| 2 | `grep "export.*function get" src/data/superadmin.ts` returns at least 8 functions |
| 3 | `grep "supabaseAdmin" src/data/superadmin.ts` returns zero matches |
| 4 | `grep "getAdminClient" src/data/superadmin.ts` returns at least 1 match |
| 5 | All exported functions have explicit return type interfaces |
| 6 | TypeScript compilation passes with no errors |
