# Tasks: Superadmin Lead Management Panel

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~900 (11 new files, 1 modified) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Data layer: types + server actions + export utility | PR 1 | ~165 lines — standalone, under budget |
| 2 | UI layer: hook + 3 components + page wiring | PR 2 | ~475 lines — slightly over budget, candidate for further split |
| 3 | Tests: unit + E2E | PR 3 | ~200 lines — standalone |

---

## Phase 1: Foundation — Types + Shared Constants

- [x] **1.1** Create `src/types/leads.ts` — export `LeadDTO` (all columns), `HotelOption` (`id`, `name`), `LeadFilter`, `LeadListResult`, `LeadStatus` type, and `VALID_LEAD_STATUSES` constant. **[XS]**

## Phase 2: Server Actions

- [x] **2.1** Create `src/app/actions/superadmin-leads.ts` with `getLeadsAction`, `updateLeadStatusAction`, `updateLeadNotesAction`, `assignLeadToHotelAction`, `deleteLeadAction` — all call `requireSuperAdmin()` first, return `{success, data?, error?}`, revalidate `/admin/leads`. **[M]**
- [x] **2.2** Add `createAdminLeadAction` with required field validation and duplicate phone check. Guarded by `requireSuperAdmin()`. **[S]**

## Phase 3: CSV Export Utility

- [x] **3.1** Create `src/lib/lead-export.ts` — `exportLeadsToCSV(leads: LeadDTO[], filename?: string): void`. RFC 4180 via Blob + `URL.createObjectURL`. Default filename: `leads-export-{YYYY-MM-DD}.csv`. **[XS]**

## Phase 4: Client State — useLeads Hook

- [x] **4.1** Create `src/hooks/useLeads.ts` — manages `filteredLeads`, `search`, `statusFilter`, `dateRange`, `page`. Exposes optmistic update wrappers for all 5 server actions (mirrors `useCRM.ts` pattern: snapshot → call → rollback on failure → `router.refresh()`). **[M]**

## Phase 5: UI Components

- [x] **5.1** Create `src/app/(super-admin)/admin/leads/LeadsTable.tsx` — receives `initialLeads`, `totalCount`, `initialHotels`. Renders: toolbar (search input, status `<Select>`, date range pickers, export button, create button), paginated table with expanded columns (address, website, rating, ai_pitch, hotel_name), action buttons (Edit, Delete) per row. **[L]**
- [x] **5.2** Create `src/app/(super-admin)/admin/leads/LeadEditModal.tsx` — shadcn `Dialog` with status `<Select>`, notes `<textarea>`, hotel searchable dropdown (client-filter from pre-fetched 200 hotels). Calls `updateLeadStatusAction` / `updateLeadNotesAction` / `assignLeadToHotelAction` on save. **[M]**
- [x] **5.3** Create `src/app/(super-admin)/admin/leads/LeadCreateModal.tsx` — shadcn `Dialog` with form for all `hunted_leads` fields. Required: business_name, phone, city_search, status. Validates required fields client-side + duplicate phone via server check. Calls `createAdminLeadAction` on submit. **[M]**

## Phase 6: Page Wiring

- [x] **6.1** Modify `src/app/(super-admin)/admin/leads/page.tsx` — fetch paginated leads + 200 hotels server-side, pass as props to `<LeadsTable>`. Remove inline table, remove "solo lectura" label, add `dynamic = 'force-dynamic'` (already present). **[M]**

## Phase 7: Testing

- [x] **7.1** Add tests in `src/__tests__/unit/superadmin-leads.test.ts` — mock `requireSuperAdmin()` and `supabaseAdmin`, test all 5 actions: happy path, invalid data, unauthorized caller, lead-not-found edge case. **[M]**
- [x] **7.2** Add tests in `src/lib/__tests__/lead-export.test.ts` — RFC 4180 escaping (commas, quotes, newlines), empty leads array, filtered export. **[S]**
- [ ] **7.3** Add E2E in `e2e/superadmin-leads.spec.ts` — Playwright: login → `/admin/leads` → search → filter → edit status → edit notes → assign hotel → delete (confirm + cancel) → create lead → export CSV. **[L]**

---

## Dependency Map

```
Phase 1 ─┬─→ Phase 2 (Server Actions) ──→ Phase 4 (Hook)
          ├─→ Phase 3 (Export) ──────────→ Phase 5 (UI toolbar)
          └─→ Phase 5 (types for components)
Phase 4 ─→ Phase 5 (Hook consumed by LeadsTable)
Phase 5 ─→ Phase 6 (Page wiring)
Phase 2+3+4+5+6 ─→ Phase 7 (Tests)
```

Execution order: **1 → 2+3 (parallel) → 4 → 5 → 6 → 7**. Phases 2 and 3 are independent after Phase 1.
