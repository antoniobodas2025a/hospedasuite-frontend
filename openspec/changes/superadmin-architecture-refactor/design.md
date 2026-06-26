# Design: Superadmin Architecture Refactor

## Technical Approach

Pure refactoring in 4 phases: DAL extraction (`src/data/superadmin.ts`), TenantManager split (271→3 files), inline client cleanup, server-side pagination for duplicates/pending. Zero behavioral changes. Follows existing patterns from `billing.ts`, `subscriptions/page.tsx`, `leads/page.tsx`.

## Architecture Decisions

| # | Decision | Choice | Rationale |
|---|----------|--------|-----------|
| 1 | DAL overlap with billing.ts | **Re-export** from billing.ts | `billing.ts` (L393-644) already has `getAllSubscriptions`, `getSubscriptionMetrics`, `getAllUsersWithRoles`, `getSuperadminCount`. Spec requires "same query logic" — re-export avoids drift and duplication. |
| 2 | getAdminClient vs singleton | **Own getAdminClient()** | Spec prohibits `import { supabaseAdmin }` in DAL. Matches `billing.ts` L43 pattern. Each DAL module manages its own admin client. |
| 3 | getLeads in superadmin.ts | **Re-export getLeadsAction** | `getLeadsAction` is a `'use server'` action with `requireSuperAdmin()` guard + audit logging. DAL re-export preserves this; no benefit in reimplementing. |
| 4 | TenantManager split | **Extract Table + Modal** | 271 lines → TenantTable (~80L, render-only), TenantEditModal (~110L, forms + security), TenantManager (~80L, orchestrator). Matches spec. |

## Data Flow

```
Server Components (pages)          DAL (server-only)          Data Sources
──────────────────────────         ──────────────────         ────────────
admin/page.tsx ──────────→ getHotlets(), getHotelCount() ──→ supabaseAdmin (own)
duplicates/page.tsx ──────→ getDuplicateHotels(filters) ────→ supabaseAdmin
pending/page.tsx ─────────→ getPendingPayments(filters) ────→ supabaseAdmin
audit-logs/page.tsx ──────→ getAuditLogs(filters)    ───────→ supabaseAdmin
                            getAuditLogFilterOptions()
                            getMetrics() ────────────────────→ billing.ts (re-export)
                            getSubscriptions() ──────────────→ billing.ts
                            getUsers() ──────────────────────→ billing.ts
         │ props                    getLeads() ──────────────→ superadmin-leads action
         ▼
Client Tables (display only, no DB calls)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/data/superadmin.ts` | **Create** | DAL: `getHotels`, `getHotelCount`, `getDuplicateHotels`, `getPendingPayments`, `getAuditLogs`, `getAuditLogFilterOptions` (own `getAdminClient`). Re-exports: `getSubscriptions`, `getUsers`, `getMetrics`, `getSuperadminCount` from billing; `getLeads` from superadmin-leads |
| `src/components/super-admin/TenantTable.tsx` | **Create** | `'use client'`. Renders table rows, debt, action buttons. Props: `hotels`, `hqData`, `isProcessing`, callbacks |
| `src/components/super-admin/TenantEditModal.tsx` | **Create** | `'use client'`. Edit form (name,status,plan) + SecurityZone (password,mock warning). Props: `hotel`, `onClose`, callbacks |
| `src/components/super-admin/TenantManager.tsx` | **Modify** | 271→~80 lines. Orchestrator holding state, wiring server actions to child callbacks |
| `src/app/(super-admin)/admin/page.tsx` | **Modify** | Replace inline `createClient`+query with DAL `getHotels()` |
| `src/app/(super-admin)/admin/hotels/duplicates/page.tsx` | **Modify** | Replace inline query with `getDuplicateHotels()`, add `searchParams` pagination |
| `src/app/(super-admin)/admin/payments/pending/page.tsx` | **Modify** | Replace inline query with `getPendingPayments()`, add `searchParams` pagination |
| `src/app/(super-admin)/admin/audit-logs/page.tsx` | **Modify** | Replace inline query (L48-80) with `getAuditLogs()` + `getAuditLogFilterOptions()` |

## DAL Function Signatures

```typescript
// New implementations (own getAdminClient)
getHotels(): Promise<HotelRow[]>
getHotelCount(): Promise<number>
getDuplicateHotels(f?: { page?; pageSize? }): Promise<{ hotels; total }>
getPendingPayments(f?: { status?; page?; pageSize? }): Promise<{ payments; total }>
getAuditLogs(f: AuditLogFilters): Promise<{ logs; total }>
getAuditLogFilterOptions(): Promise<{ actions: string[]; entityTypes: string[] }>

// Re-exports from billing.ts (use billing's own getAdminClient)
export { getAllSubscriptions as getSubscriptions }
export { getAllUsersWithRoles as getUsers }
export { getSubscriptionMetrics as getMetrics }
export { getSuperadminCount }

// Re-export from server action
export { getLeadsAction as getLeads }
```

## Component Split

```
TenantManager.tsx (271L) ──→  TenantManager.tsx (~80L, orchestrator)
                              ├─ TenantTable.tsx (~80L, 'use client')
                              └─ TenantEditModal.tsx (~110L, 'use client')
                                  └─ Security zone (password form, mock warning)
```

Same CSS classes, same server action arguments, same user feedback. Pure extraction.

## Migration / Rollback

- **Migration**: None. File-level only, no DB/API/env changes.
- **Rollback**: `git revert` the merge commit(s). Each phase independently revertible.
- **Deployment**: Standard deploy, no feature flags needed.
- **Smoke test**: Dashboard KPIs, edit tenant modal, God Mode, delete hotel, seeding, password change, duplicates pagination, pending pagination, audit-logs filters, leads page, subscriptions page.

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| TypeScript | All files compile | `tsc --noEmit` gates all phases |
| Smoke (manual) | 11-item checklist | Deploy to staging, manual walkthrough |
| Regression | Visual diff | Screenshots before/after refactor |

Pure refactoring with no existing test infra for affected components. TypeScript + manual smoke is the pragmatic regression strategy.

## Open Questions

None.
