# Proposal: Superadmin Lead Management Panel

## Intent

Transform the read-only `/admin/leads` page into a full CRUD management panel so superadmins can actively manage the sales pipeline — change lead status, edit notes, assign leads to hotels, delete leads, create leads manually, export to CSV, and filter/search leads. Currently the page only displays data with no interactivity.

## Scope

### In Scope
- Server actions for lead CRUD: `updateLeadStatusAction` (extend), `updateLeadNotesAction`, `deleteLeadAction`, `assignLeadToHotelAction`, `createLeadAction` (admin version with full fields)
- LeadsTable component with search, status filter, date range filter, pagination
- Edit modal (notes, status, assign to hotel)
- Create lead modal (all `hunted_leads` fields)
- CSV export utility (`exportLeadsToCSV`)
- Expand table columns to show: `address`, `website`, `rating`, `ai_pitch`, `hotel_id`
- All actions guarded by `requireSuperAdmin()`

### Out of Scope
- Kanban board view (tenant-level CRMBoard already covers this pattern)
- Klaviyo sync from superadmin actions
- Bulk operations (multi-select) — deferred
- Lead scoring or automation rules — deferred

## Capabilities

### New Capabilities
- `superadmin-lead-crud`: Full create/update/delete/assign operations on `hunted_leads` from superadmin panel, with `requireSuperAdmin()` guards.
- `lead-export-csv`: CSV export of filtered leads with configurable columns.

### Modified Capabilities
- `superadmin-leads-view`: Transforms from read-only to interactive management panel. Requirements for edit, delete, create, filter, search, and export replace the read-only constraint.

## Approach

**Server layer**: Extend `src/app/actions/marketing.ts` with new actions (`updateLeadNotesAction`, `deleteLeadAction`, `assignLeadToHotelAction`, `createAdminLeadAction`). Each calls `await requireSuperAdmin()` first. Reuse existing `updateLeadStatusAction` (already exists, add superadmin guard).

**UI layer**: Replace current inline table in `page.tsx` with a client component (`LeadsTable`) that receives initial data via props and handles optimistic updates. Use shadcn/ui Dialog for edit/create modals. Add search input, status dropdown filter, and export button in the header.

**CSV export**: Client-side utility using `Blob` + `URL.createObjectURL` — no server round-trip needed since data is already loaded.

**Schema**: `hunted_leads` already has all needed columns (`address`, `website`, `rating`, `ai_pitch`, `hotel_id`, `google_place_id`). No migration required.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/app/(super-admin)/admin/leads/page.tsx` | Modified | Convert from server-only read to server fetch + client table wrapper |
| `src/app/actions/marketing.ts` | Modified | Add 4 new server actions, add `requireSuperAdmin()` guards |
| `src/components/superadmin/LeadsTable.tsx` | New | Client table with search, filters, pagination, action buttons |
| `src/components/superadmin/LeadEditModal.tsx` | New | Edit notes, status, assign hotel dialog |
| `src/components/superadmin/LeadCreateModal.tsx` | New | Create lead with full field form |
| `src/lib/export-leads-csv.ts` | New | CSV export utility |
| `src/hooks/useCRM.ts` | Reference | Existing optimistic update pattern to reuse |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Accidental lead deletion | Medium | Soft-delete pattern or confirmation dialog with lead name display |
| Race condition on status updates | Low | Optimistic update with rollback on failure (existing useCRM pattern) |
| Large dataset performance | Medium | Pagination + server-side filtering if leads exceed 500 rows |
| `requireSuperAdmin()` missing on new actions | Low | Code review checklist + lint rule if available |

## Rollback Plan

1. Revert git commit — all changes are additive (new files + modifications to existing page/actions)
2. The existing read-only page behavior is preserved if new client components fail to mount (server component fallback)
3. No database schema changes — zero migration rollback needed

## Dependencies

- `requireSuperAdmin()` from `src/lib/auth-guards.ts` (already exists per `superadmin-authorization` spec)
- `supabaseAdmin` client from `src/lib/supabase-admin.ts` (already exists)
- shadcn/ui Dialog, Select, Input components (already in project)

## Success Criteria

- [ ] Superadmin can change lead status from the table (new → contacted → converted → lost)
- [ ] Superadmin can edit notes via modal
- [ ] Superadmin can assign a lead to an existing hotel (dropdown search)
- [ ] Superadmin can delete leads with confirmation
- [ ] Superadmin can create leads manually with full fields
- [ ] CSV export downloads filtered leads correctly
- [ ] Search and status filter work client-side
- [ ] All server actions are guarded by `requireSuperAdmin()`
- [ ] No regression on existing tenant-level CRM board
