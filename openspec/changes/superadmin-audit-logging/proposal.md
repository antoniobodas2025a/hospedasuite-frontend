# Proposal: Superadmin Audit Logging

## Intent

Every destructive and sensitive superadmin operation currently leaves zero forensic trail in the `audit_logs` table. Hotel creation/deletion, god-mode access, password overrides, payment approvals, lead CRUD, and duplicate hotel reviews all execute without recording who did what, when, or what changed. This proposal injects audit logging into every superadmin action so every operation is traceable.

## Scope

### In Scope
- Extend `AuditEvent.entity_type` union to include `'lead'`, `'manual_payment'`, `'user'`
- Inject `logAuditEvent()` into all 13 superadmin actions across 4 files
- Capture `old_value` (fetch before mutation) and `new_value` (after mutation) where applicable
- Create `/admin/audit-logs` page with filterable table (by actor, action, entity_type, date range)
- Capture `actor_id`, `actor_email`, `ip_address`, `user_agent` from request context

### Out of Scope
- Modifying the `audit_logs` table schema (migration 012 already covers all needed columns)
- Audit logging for tenant-level (non-superadmin) actions
- Real-time audit log streaming or notifications
- Soft-delete or immutable append-only enforcement beyond existing RLS

## Capabilities

### New Capabilities
- `superadmin-audit-logging`: Audit trail for all superadmin actions and admin viewer page

### Modified Capabilities
- `superadmin-authorization`: No requirement changes; audit calls are additive to existing guards
- `superadmin-lead-crud`: No requirement changes; audit calls are additive
- `superadmin-leads-view`: No requirement changes; audit calls are additive

## Approach

1. **Extend `AuditEvent` types** in `src/lib/audit-logger.ts`: add `'lead'`, `'manual_payment'`, `'user'` to `entity_type` union. No new utility needed — `logAuditEvent()` already exists, is battle-tested, and is used by 10+ files.

2. **Inject audit calls into actions** — pattern per action type:
   - **Create actions** (`createHotelAction`, `createAdminLeadAction`): log after success with `new_value` = created record fields, `old_value` = null.
   - **Update actions** (`updateTenantAction`, `updateLeadStatusAction`, `assignLeadToHotelAction`): fetch current record before mutation → `old_value` = current state, `new_value` = update payload.
   - **Delete actions** (`deleteHotelAction`, `deleteLeadAction`): fetch record before deletion → `old_value` = full record snapshot, `new_value` = null.
   - **Approval/rejection** (`approveManualPayment`, `rejectManualPayment`, `approveDuplicateHotelAction`, `rejectDuplicateHotelAction`): log status transition with `old_value` = `{ status: 'pending' }`, `new_value` = `{ status: 'approved'|'rejected' }`.
   - **God mode** (`godModeAccess`): log link generation with `action: 'god_mode_access'`, `entity_type: 'user'`.
   - **Force password** (`forceChangePasswordAction`): log with `action: 'password_forced'`, `entity_type: 'user'`, `new_value` = `{ password_changed: true }`.

3. **Create `/admin/audit-logs` page**: server component that queries `audit_logs` with filters (actor_email, action, entity_type, date range), paginated table.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/lib/audit-logger.ts` | Modified | Extend `entity_type` union |
| `src/app/actions/super-admin.ts` | Modified | Add audit calls to 5 actions |
| `src/app/actions/manual-payments.ts` | Modified | Add audit calls to approve/reject |
| `src/app/actions/hotel-admin.ts` | Modified | Add audit calls to approve/reject duplicates |
| `src/app/actions/superadmin-leads.ts` | Modified | Add audit calls to status/update/delete/create/assign |
| `src/app/(super-admin)/admin/audit-logs/` | New | Page + server component for viewing logs |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Audit write fails silently (existing behavior) | Low | `logAuditEvent` already catches errors; audit failure won't break main flow |
| Extra DB writes add latency per action | Low | Single INSERT is ~5ms; Supabase admin client is already used |
| `entity_type` union expansion breaks existing callers | None | TypeScript union is additive; existing `'hotel'`/`'invoice'`/`'subscription'` remain valid |
| Audit-logs page exposes sensitive data | Medium | Page guarded by existing `(super-admin)` layout; RLS already restricts to superadmin email |

## Rollback Plan

1. Remove all `logAuditEvent()` calls from the 4 action files (pure deletions, no logic changes).
2. Revert `entity_type` union in `audit-logger.ts` if needed (or leave extended — harmless).
3. Delete `/admin/audit-logs/` directory.
4. Existing `audit_logs` rows remain in database (no migration rollback needed).

## Dependencies

- Existing `audit_logs` table (migration 012) — already deployed.
- Existing `logAuditEvent()` utility — already in use by 10+ files.
- `(super-admin)` route group auth guard — already protects admin routes.

## Success Criteria

- [ ] All 13 superadmin actions call `logAuditEvent()` on success path
- [ ] `entity_type` union includes `'lead'`, `'manual_payment'`, `'user'`
- [ ] `/admin/audit-logs` page renders with filterable, paginated table
- [ ] Audit writes never throw or break the main action flow
- [ ] `grep -r "logAuditEvent" src/app/actions/` matches in all 4 action files
- [ ] TypeScript compilation passes with no type errors
