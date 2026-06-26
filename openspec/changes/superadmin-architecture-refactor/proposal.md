# Proposal: Superadmin Architecture Refactor

## Intent

Eliminate architectural debt in the superadmin panel: centralized DAL extraction, God Component split (TenantManager, 271 lines), inline supabaseAdmin deduplication, and consistent server/client boundaries. Zero functional changes — pure refactoring.

## Scope

### In Scope
- Create `src/data/superadmin.ts` DAL with all superadmin queries (hotels, duplicates, pending payments, audit logs)
- Split `TenantManager` into: `TenantTable`, `TenantEditModal`, `SecurityZoneForm`
- Replace 3 inline `createClient()` calls with `import { supabaseAdmin } from '@/lib/supabase-admin'`
- Add server-side pagination to `/admin/hotels/duplicates` and `/admin/payments/pending`
- Move audit-logs query logic from page component into DAL
- Standardize all pages: server component fetches → client table receives props

### Out of Scope
- No UI/visual changes
- No new features or business logic
- No changes to server actions (they already follow good patterns)
- No changes to tenant-level CRM operations

## Capabilities

### New Capabilities
None — pure internal refactoring.

### Modified Capabilities
None — no spec-level behavior changes. All existing specs remain valid.

## Approach

**Phase 1: DAL Extraction** — Create `src/data/superadmin.ts` following `src/data/billing.ts` pattern (`import 'server-only'`, typed interfaces, `getAdminClient()`). Move queries from:
- `admin/page.tsx` → `getAllHotels()`, `getActiveHotelCount()`
- `duplicates/page.tsx` → `getDuplicateHotels()`
- `pending/page.tsx` → `getPendingPayments(filters)`, `getPendingPaymentsCount()`
- `audit-logs/page.tsx` → `getAuditLogs(filters)`, `getAuditLogFilterOptions()`

**Phase 2: TenantManager Split** — Extract from 271-line monolith:
- `TenantTable` — table rendering, debt display, action buttons (read-only display)
- `TenantEditModal` — edit form + password change (commercial + security zones)
- `SecurityZoneForm` — password change sub-component
- Page component (`admin/page.tsx`) retains orchestration: fetches data, passes to children

**Phase 3: Inline Client Cleanup** — Replace `createClient(process.env...)` in `admin/page.tsx`, `pending/page.tsx`, `duplicates/page.tsx` with singleton import.

**Phase 4: Pagination** — Add server-side pagination to duplicates and pending payments tables, matching the pattern used in leads/subscriptions/audit-logs.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/data/superadmin.ts` | New | Centralized DAL for superadmin queries |
| `src/components/super-admin/TenantManager.tsx` | Modified | Split into smaller components |
| `src/components/super-admin/TenantTable.tsx` | New | Extracted table display |
| `src/components/super-admin/TenantEditModal.tsx` | New | Extracted edit + security modal |
| `src/app/(super-admin)/admin/page.tsx` | Modified | Uses DAL, imports singleton, orchestrates split components |
| `src/app/(super-admin)/admin/hotels/duplicates/page.tsx` | Modified | Uses DAL, server-side pagination |
| `src/app/(super-admin)/admin/payments/pending/page.tsx` | Modified | Uses DAL, server-side pagination |
| `src/app/(super-admin)/admin/audit-logs/page.tsx` | Modified | Uses DAL instead of inline queries |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Regression in TenantManager modal behavior | Medium | Manual smoke test of edit, god mode, delete, seeding, password change |
| Pagination breaks duplicates/pending tables | Low | Follow existing pagination pattern from leads/subscriptions |
| Type mismatches in DAL extraction | Low | TypeScript compilation as gate |
| `billing.ts` `getAdminClient()` also creates inline client | Low | Note: `billing.ts` uses its own `getAdminClient()` — acceptable, not in scope to unify |

## Rollback Plan

All changes are file-level refactoring with no database or API changes. Revert via `git revert` of the merge commit. No data migration needed.

## Dependencies

- None — self-contained refactoring

## Success Criteria

- [ ] `src/data/superadmin.ts` exists with `import 'server-only'` and typed interfaces
- [ ] Zero `createClient(process.env` calls in superadmin page components
- [ ] `TenantManager.tsx` under 100 lines (split into ≥2 components)
- [ ] All 8 superadmin pages compile with no TypeScript errors
- [ ] Duplicates and pending payments tables have pagination controls
- [ ] Manual verification: edit tenant, god mode, delete, seeding, password change all work
- [ ] No visual or behavioral changes to any superadmin page
