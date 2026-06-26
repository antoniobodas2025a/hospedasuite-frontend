# Design: Superadmin Lead Management Panel

## Technical Approach

Server/client split: the page stays a server component that fetches paginated leads via `supabaseAdmin` and passes initial data as props to a client `LeadsTable` component. All CRUD goes through new guarded server actions in a dedicated file (`superadmin-leads.ts`) — the existing `marketing.ts` actions remain untouched, preserving tenant CRM compatibility. Search and status filter are client-side for instant UX; pagination is server-side via `range()` + `order()`. CSV export is pure client-side (Blob).

## Architecture Decisions

| Decision | Option A | Option B | Choice | Rationale |
|----------|----------|----------|--------|-----------|
| Guard existing `marketing.ts` actions | Add `requireSuperAdmin()` to `updateLeadStatusAction` | New guarded actions in separate file | New file (`superadmin-leads.ts`) | Existing actions are called by tenant CRM (`useCRM.ts`). Adding a guard would break tenant-level operations. No-regression constraint wins. |
| Search/filter location | Server-side (query params) | Client-side on loaded page | Client-side | Instant UX. Spec requires combined search + filter + pagination: re-fetch from server when filters change to get correct page count, then client-filter displayed rows. |
| Modal implementation | shadcn/ui `Dialog` | Custom framer-motion modal | shadcn/ui `Dialog` | Already in project. Handles accessibility, focus trapping, ESC key. Style with existing glass-card classes for visual consistency. |
| Hotel dropdown data | Fetch all hotels on page load | Searchable server fetch per keystroke | Pre-fetch 200 most recent on page load, client-side filter | Avoids waterfall. 200 hotels is lightweight (~40KB). `supabaseAdmin.from('hotels').select('id,name').order('created_at',{ascending:false}).limit(200)`. |
| Delete strategy | Hard delete from `hunted_leads` | Soft delete (`deleted_at` column) | Hard delete | Spec says "removed from hunted_leads". No schema migration needed. Confirmation dialog mitigates accidents. |

## Data Flow

```
┌──────────┐   initial data    ┌──────────────┐   action call   ┌─────────────────────┐
│  page.tsx │ ────────────────→ │  LeadsTable   │ ──────────────→ │ superadmin-leads.ts  │
│ (server)  │                   │  (client)     │                 │ (server actions)     │
└──────────┘                   │               │                 └──────────┬──────────┘
                               │ ┌───────────┐ │                            │
                               │ │useLeads() │ │                    requireSuperAdmin()
                               │ │ useState  │ │                            │
                               │ └───────────┘ │                   supabaseAdmin
                               │  ↑ optimistic │                            │
                               │  └─ rollback ─┤                   revalidatePath
                               └──────────────┘                            
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/app/(super-admin)/admin/leads/page.tsx` | Modify | Server: fetch leads with server-side pagination (supabaseAdmin singleton), fetch hotels for dropdown, pass to client `LeadsTable`. Remove inline `createClient`. Remove "solo lectura" label. |
| `src/app/actions/superadmin-leads.ts` | Create | 5 guarded server actions: `updateLeadStatusAction`, `updateLeadNotesAction`, `assignLeadToHotelAction`, `deleteLeadAction`, `createAdminLeadAction`. All call `await requireSuperAdmin()` first. Return `{success, error}`. Revalidate `/admin/leads`. |
| `src/components/superadmin/LeadsTable.tsx` | Create | Client component. Receives `initialLeads: Lead[]`, `totalCount: number`, `initialHotels: HotelOption[]`. Renders: toolbar (search input, status select, date range, CSV export, create button), table with expanded columns, pagination controls. Uses `useLeads` hook for optimistic state. |
| `src/components/superadmin/LeadEditModal.tsx` | Create | shadcn/ui `Dialog` pre-filled with lead data. Fields: notes (textarea), status (select: new/contacted/converted/lost), hotel assignment (searchable select from `hotels`). Calls `updateLeadNotesAction`, `updateLeadStatusAction`, `assignLeadToHotelAction`. |
| `src/components/superadmin/LeadCreateModal.tsx` | Create | shadcn/ui `Dialog` with all `hunted_leads` fields. Required: `business_name`, `phone`, `city_search`, `status`. Optional: `address`, `website`, `rating`, `ai_pitch`, `hotel_id`, `google_place_id`, `source`. Calls `createAdminLeadAction`. |
| `src/lib/export-leads-csv.ts` | Create | Pure function `exportLeadsToCSV(leads: Lead[]): void`. Generates RFC 4180 CSV, creates `Blob`, triggers download via `URL.createObjectURL`. Filename: `leads-export-{status}-{YYYY-MM-DD}.csv`. |
| `src/lib/hunted-leads.ts` | Create | Shared `Lead` type (extends current inline interface with all columns: `id`, `business_name`, `phone`, `city_search`, `status`, `notes`, `address`, `website`, `rating`, `ai_pitch`, `hotel_id`, `google_place_id`, `source`, `created_at`), `HotelOption` type, and `VALID_LEAD_STATUSES` constant `['new','contacted','converted','lost']`. |
| `src/hooks/useLeads.ts` | Create | Hook managing leads state, search/filter logic, optimistic updates pattern (mirrors `useCRM.ts`). Exposes: `filteredLeads`, `search`, `statusFilter`, `dateRange`, `updateStatus`, `updateNotes`, `assignHotel`, `deleteLead`, `createLead`. |

## Server Action Signatures

```typescript
// src/app/actions/superadmin-leads.ts

updateLeadStatusAction(leadId: number, newStatus: string): Promise<{success: boolean, error?: string}>
updateLeadNotesAction(leadId: number, notes: string): Promise<{success: boolean, error?: string}>
assignLeadToHotelAction(leadId: number, hotelId: number | null): Promise<{success: boolean, error?: string}>
deleteLeadAction(leadId: number): Promise<{success: boolean, error?: string}>
createAdminLeadAction(input: AdminLeadInput): Promise<{success: boolean, data?: any, error?: string}>

// Server page fetch signature (in page.tsx, NOT exported)
// fetchLeads(page: number, pageSize: number, filters?:{status?:string, search?:string, dateFrom?:string, dateTo?:string})
//   → {leads: Lead[], totalCount: number}
```

## Testing Strategy

| Layer | What | How |
|-------|------|-----|
| Unit | `exportLeadsToCSV` (RFC 4180 escaping, empty input, filtered input) | vitest, `src/lib/__tests__/export-leads-csv.test.ts` |
| Unit | `useLeads` hook (optimistic update + rollback, filter logic) | vitest + `@testing-library/react-hooks` |
| Integration | Server actions guarded + DB operations | vitest with mocked `requireSuperAdmin` and `supabaseAdmin` |
| E2E | Full flow: login → `/admin/leads` → search → edit status → edit notes → assign hotel → delete confirm → create → export CSV | Playwright, `e2e/superadmin-leads.spec.ts` |

## Rollback Plan

All changes are additive (new files + page modification). Revert the git commit. No database migrations to undo. The server component fetch pattern means if the client component fails to hydrate, the page gracefully degrades (server-rendered table with no interactivity). Fallback: restore original `page.tsx` from git — zero dependency on new files.

## Open Questions

- [ ] **Deletion strategy**: Spec says "removed from hunted_leads" (hard delete). Do we want cascading side effects? `hunted_leads` has no FK references to other tables, so hard delete is safe. Confirm this is acceptable.
- [ ] **Duplicate phone warning on create**: Spec requires an async check before create. This should be implemented as a second server action `checkDuplicatePhoneAction(phone: string)` called on form blur, returning `{duplicate: boolean, leadName?: string}`. The design assumes this is included in `createAdminLeadAction` validation.
