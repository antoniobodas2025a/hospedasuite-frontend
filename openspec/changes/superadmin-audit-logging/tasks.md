# Tasks: Superadmin Audit Logging

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~415 |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Medium

## Phase 1: Foundation (1 task)

- [x] 1.1 Extend `AuditEvent.entity_type` union in `src/lib/audit-logger.ts`: add `'lead' | 'manual_payment' | 'user'`

## Phase 2: Core — Audit Injection (4 tasks)

- [x] 2.1 Inject `logAuditEvent()` calls into `src/app/actions/super-admin.ts` — 5 actions: `createHotelAction`, `deleteHotelAction` (pre-fetch snapshot), `updateTenantAction` (pre-fetch), `godModeAccess`, `forceChangePasswordAction`. Add `createClient` + `headers` imports.
- [x] 2.2 Inject `logAuditEvent()` calls into `src/app/actions/manual-payments.ts` — 2 actions: `approveManualPayment`, `rejectManualPayment`. Add `headers` import only (`user` already exists).
- [x] 2.3 Inject `logAuditEvent()` calls into `src/app/actions/hotel-admin.ts` — 2 actions: `approveDuplicateHotelAction`, `rejectDuplicateHotelAction`. Add `createClient` + `headers` imports.
- [x] 2.4 Inject `logAuditEvent()` calls into `src/app/actions/superadmin-leads.ts` — 5 actions: `updateLeadStatusAction` (pre-fetch), `updateLeadNotesAction` (pre-fetch), `deleteLeadAction` (pre-fetch), `createAdminLeadAction`, `assignLeadToHotelAction` (pre-fetch). Add `createClient` + `headers` imports.

## Phase 3: Viewer Page (3 tasks)

- [x] 3.1 Create `src/app/(super-admin)/admin/audit-logs/page.tsx` — server component with `force-dynamic`, reads `searchParams` (actor_email, action, entity_type, date_from, date_to, page), queries `audit_logs` via `supabaseAdmin`, passes to `AuditLogsTable`.
- [x] 3.2 Create `src/app/(super-admin)/admin/audit-logs/AuditLogsTable.tsx` — `'use client'` component with filter form (text for email, `<Select>` for action/entity_type, date range inputs), paginated table (timestamp, actor, action, entity, collapsed JSON), wired via `useRouter` + `useSearchParams` for URL-based filtering.
- [x] 3.3 Add nav link to `src/app/(super-admin)/layout.tsx` — import `ScrollText` (or equivalent lucide icon), add `<Link href="/admin/audit-logs">` with "Auditoría" label after the Leads link.

## Phase 4: Testing & Verification (3 tasks)

- [x] 4.1 Write test at `src/__tests__/unit/audit-logging.test.ts`: verify union extension compiles, verify `logAuditEvent` error resilience (DB error doesn't throw), verify old/new value patterns.
- [x] 4.2 Run `tsc --noEmit` — confirm no type errors after union extension.
- [x] 4.3 Verify acceptance criteria: `grep -r "logAuditEvent"` matches all 4 action files with 14 total occurrences (5+2+2+5).

## Implementation Order

Phase 1 first (type dependency). Then any order in Phase 2 (action files are independent of each other). Phase 3 after Phase 2 (viewer needs data). Phase 4 last.

### Next Step

Ready for implementation (sdd-apply).
