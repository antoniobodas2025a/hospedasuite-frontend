# Tasks: Superadmin Architecture Refactor

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~470 (270 added, 200 deleted) |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | single-pr |
| Chain strategy | size-exception |

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | All 4 phases (DAL, component split, singleton, pagination) | Single PR | Pure refactoring, zero functional changes, each phase independently revertible. No data/API changes. |

## Phase 1: DAL Extraction

- [x] 1.1 Create `src/data/superadmin.ts` — `import 'server-only'`, `getAdminClient()`, typed interfaces for HotelRow, PaymentRow, DuplicateRow, AuditLogRow
- [x] 1.2 Add `getHotels()` (returns all hotels, order by created_at desc) and `getHotelCount()` (active count)
- [x] 1.3 Add `getDuplicateHotels()` — query hotels with subscription_status='duplicate_review' + hotel_fingerprints join
- [x] 1.4 Add `getPendingPayments()` — query manual_payments with hotels join, support optional status filter
- [x] 1.5 Add `getAuditLogs(filters)` and `getAuditLogFilterOptions()` — paginated audit_logs queries with filter params
- [x] 1.6 Add re-exports: `getSubscriptions`, `getUsers`, `getMetrics`, `getSuperadminCount` from billing.ts; `getLeads` from superadmin-leads

## Phase 2: TenantManager Split

- [x] 2.1 Create `src/components/super-admin/TenantTable.tsx` — `'use client'`, renders hotel rows (name, status, owner, plan, debt, action buttons). Accepts `hotels`, `hqData`, `isProcessing`, callbacks (`onGodMode`, `onDelete`, `onEdit`, `onSeed`). No server action imports.
- [x] 2.2 Create `src/components/super-admin/TenantEditModal.tsx` — `'use client'`, commercial form (name, status, plan) + security zone (password change for real users, mock warning for mock hotels)
- [x] 2.3 Reduce `TenantManager.tsx` to ~80 lines — orchestrator holds `editingHotel` state, `isProcessing` state, wires server actions to child callbacks. Renders `TenantTable` + `TenantEditModal`.
- [x] 2.4 Update `admin/page.tsx` props to match refactored TenantManager interface

## Phase 3: Singleton Injection

- [x] 3.1 Remove `createClient()` + inline query from `admin/page.tsx` — imports `getHotels()`, `getHotelCount()` from `@/data/superadmin`
- [x] 3.2 Remove `createClient()` + inline query from `duplicates/page.tsx` — imports `getDuplicateHotels()` from `@/data/superadmin`
- [x] 3.3 Remove `createClient()` + inline query from `pending/page.tsx` — imports `getPendingPayments()` from `@/data/superadmin`
- [x] 3.4 Replace audit-logs inline query (L48-80) in `audit-logs/page.tsx` with `getAuditLogs()` + `getAuditLogFilterOptions()` from DAL

## Phase 4: Server-side Pagination

- [x] 4.1 Add pagination params (`page?`, `pageSize?`) + `{ count: 'exact' }` to `getDuplicateHotels()` in DAL. Returns `{ hotels, total }`.
- [x] 4.2 Add pagination controls to `duplicates/page.tsx` — read `page` from searchParams, pass `totalPages`/`currentPage`/`totalCount` to DuplicatesTable
- [x] 4.3 Add pagination params (`status?`, `page?`, `pageSize?`) + `{ count: 'exact' }` to `getPendingPayments()` in DAL. Returns `{ payments, total }`.
- [x] 4.4 Add pagination controls to `pending/page.tsx` — read `page` from searchParams, pass pagination metadata to PendingPaymentsTable

## Verification

- [x] 5.1 Run `tsc --noEmit` — zero TypeScript errors across all 8 superadmin pages
- [x] 5.2 Manual smoke: edit tenant, god mode, delete, seeding, password change, duplicates pagination, pending pagination, audit-logs filters, leads page, subscriptions page
