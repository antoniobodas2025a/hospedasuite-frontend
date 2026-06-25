# Superadmin Audit Logging Specification

## Purpose

Provide a complete forensic trail for all superadmin actions by injecting `logAuditEvent()` into every destructive and sensitive operation, and expose an admin viewer page at `/admin/audit-logs` with filtering and pagination.

## Requirements

### Requirement: Extended Entity Types

The `AuditEvent.entity_type` union in `src/lib/audit-logger.ts` MUST include `'lead'`, `'manual_payment'`, and `'user'` alongside existing types (`'hotel'`, `'invoice'`, `'subscription'`). The union extension MUST be additive — existing callers MUST NOT break.

#### Scenario: New entity types compile without errors

- GIVEN the `entity_type` union is extended
- WHEN TypeScript compilation runs
- THEN no type errors occur
- AND existing callers using `'hotel'`, `'invoice'`, `'subscription'` remain valid

#### Scenario: New entity types are usable in audit calls

- GIVEN the union includes `'lead'`
- WHEN `logAuditEvent()` is called with `entity_type: 'lead'`
- THEN the call compiles and executes without type errors

### Requirement: Audit Logging for Super-Admin Actions

Every action in `src/app/actions/super-admin.ts` MUST call `logAuditEvent()` on its success path. The following actions MUST be covered: `createHotelAction`, `deleteHotelAction`, `updateTenantAction`, `godModeAccess`, `forceChangePasswordAction`. Audit writes MUST NOT throw or break the main action flow.

#### Scenario: Create hotel logs audit event

- GIVEN a superadmin creates a hotel successfully
- WHEN `createHotelAction` completes
- THEN `logAuditEvent()` is called with `action: 'hotel_created'`, `entity_type: 'hotel'`, `new_value` containing created hotel fields, `old_value: null`

#### Scenario: Delete hotel logs audit event with snapshot

- GIVEN a superadmin deletes a hotel
- WHEN `deleteHotelAction` executes
- THEN the hotel record is fetched before deletion
- AND `logAuditEvent()` is called with `action: 'hotel_deleted'`, `entity_type: 'hotel'`, `old_value` containing the full record snapshot, `new_value: null`

#### Scenario: Update tenant logs old and new values

- GIVEN a superadmin updates a tenant
- WHEN `updateTenantAction` executes
- THEN the current tenant state is fetched before mutation
- AND `logAuditEvent()` is called with `action: 'tenant_updated'`, `entity_type: 'hotel'`, `old_value` = current state, `new_value` = update payload

#### Scenario: God mode access logs link generation

- GIVEN a superadmin requests god mode access
- WHEN `godModeAccess` executes
- THEN `logAuditEvent()` is called with `action: 'god_mode_access'`, `entity_type: 'user'`, and relevant context

#### Scenario: Force password change logs action

- GIVEN a superadmin forces a password change
- WHEN `forceChangePasswordAction` executes
- THEN `logAuditEvent()` is called with `action: 'password_forced'`, `entity_type: 'user'`, `new_value: { password_changed: true }`

#### Scenario: Audit failure does not break main flow

- GIVEN `logAuditEvent()` encounters a database error
- WHEN any superadmin action executes
- THEN the error is caught internally
- AND the main action still returns success to the caller

### Requirement: Audit Logging for Manual Payment Actions

`src/app/actions/manual-payments.ts` MUST call `logAuditEvent()` on success for `approveManualPayment` and `rejectManualPayment`. Each call MUST capture the status transition.

#### Scenario: Approve payment logs status change

- GIVEN a superadmin approves a manual payment
- WHEN `approveManualPayment` succeeds
- THEN `logAuditEvent()` is called with `action: 'payment_approved'`, `entity_type: 'manual_payment'`, `old_value: { status: 'pending' }`, `new_value: { status: 'approved' }`

#### Scenario: Reject payment logs status change

- GIVEN a superadmin rejects a manual payment
- WHEN `rejectManualPayment` succeeds
- THEN `logAuditEvent()` is called with `action: 'payment_rejected'`, `entity_type: 'manual_payment'`, `old_value: { status: 'pending' }`, `new_value: { status: 'rejected' }`

### Requirement: Audit Logging for Hotel Admin Actions

`src/app/actions/hotel-admin.ts` MUST call `logAuditEvent()` on success for `approveDuplicateHotelAction` and `rejectDuplicateHotelAction`. Each call MUST capture the approval/rejection decision.

#### Scenario: Approve duplicate hotel logs decision

- GIVEN a superadmin approves a duplicate hotel
- WHEN `approveDuplicateHotelAction` succeeds
- THEN `logAuditEvent()` is called with `action: 'duplicate_hotel_approved'`, `entity_type: 'hotel'`, `old_value: { status: 'pending' }`, `new_value: { status: 'approved' }`

#### Scenario: Reject duplicate hotel logs decision

- GIVEN a superadmin rejects a duplicate hotel
- WHEN `rejectDuplicateHotelAction` succeeds
- THEN `logAuditEvent()` is called with `action: 'duplicate_hotel_rejected'`, `entity_type: 'hotel'`, `old_value: { status: 'pending' }`, `new_value: { status: 'rejected' }`

### Requirement: Audit Logging for Lead Actions

`src/app/actions/superadmin-leads.ts` MUST call `logAuditEvent()` on success for all 5 lead actions: `updateLeadStatusAction`, `updateLeadNotesAction`, `deleteLeadAction`, `createAdminLeadAction`, `assignLeadToHotelAction`.

#### Scenario: Update lead status logs transition

- GIVEN a superadmin updates a lead's status
- WHEN `updateLeadStatusAction` succeeds
- THEN `logAuditEvent()` is called with `action: 'lead_status_updated'`, `entity_type: 'lead'`, `old_value` = previous status, `new_value` = new status

#### Scenario: Update lead notes logs change

- GIVEN a superadmin updates a lead's notes
- WHEN `updateLeadNotesAction` succeeds
- THEN `logAuditEvent()` is called with `action: 'lead_notes_updated'`, `entity_type: 'lead'`, `old_value` = previous notes, `new_value` = new notes

#### Scenario: Delete lead logs full snapshot

- GIVEN a superadmin deletes a lead
- WHEN `deleteLeadAction` succeeds
- THEN the lead is fetched before deletion
- AND `logAuditEvent()` is called with `action: 'lead_deleted'`, `entity_type: 'lead'`, `old_value` = full record, `new_value: null`

#### Scenario: Create lead logs new record

- GIVEN a superadmin creates a lead
- WHEN `createAdminLeadAction` succeeds
- THEN `logAuditEvent()` is called with `action: 'lead_created'`, `entity_type: 'lead'`, `new_value` = created record fields, `old_value: null`

#### Scenario: Assign lead to hotel logs assignment

- GIVEN a superadmin assigns a lead to a hotel
- WHEN `assignLeadToHotelAction` succeeds
- THEN `logAuditEvent()` is called with `action: 'lead_assigned'`, `entity_type: 'lead'`, `old_value` = previous hotel_id, `new_value` = new hotel_id

### Requirement: Audit Event Metadata

Every `logAuditEvent()` call from superadmin actions MUST capture: `actor_id` (user UUID), `actor_email` (user email), `ip_address` (from request headers), `user_agent` (from request headers), and `timestamp` (auto-generated).

#### Scenario: Actor identity is captured

- GIVEN any superadmin action executes
- WHEN `logAuditEvent()` is called
- THEN `actor_id` matches the authenticated user's UUID
- AND `actor_email` matches the authenticated user's email

#### Scenario: Request context is captured

- GIVEN a superadmin action is called from a browser
- WHEN `logAuditEvent()` is called
- THEN `ip_address` is extracted from request headers
- AND `user_agent` is extracted from request headers

### Requirement: Audit Logs Viewer Page

The system MUST provide a page at `/admin/audit-logs` within the `(super-admin)` route group. The page MUST display a filterable, paginated table of `audit_logs` records. The page MUST be accessible only to authenticated superadmin users.

#### Scenario: Page renders with audit data

- GIVEN a superadmin navigates to `/admin/audit-logs`
- WHEN the page loads
- THEN a table displays audit log entries ordered by `created_at` descending
- AND filter controls are visible

#### Scenario: Filter by actor email

- GIVEN audit logs exist from multiple actors
- WHEN the superadmin enters an email in the actor filter
- THEN only logs matching that `actor_email` are displayed

#### Scenario: Filter by action

- GIVEN audit logs exist with various actions
- WHEN the superadmin selects an action from the filter
- THEN only logs matching that `action` are displayed

#### Scenario: Filter by entity type

- GIVEN audit logs exist with various entity types
- WHEN the superadmin selects an entity type from the filter
- THEN only logs matching that `entity_type` are displayed

#### Scenario: Filter by date range

- GIVEN audit logs exist across multiple dates
- WHEN the superadmin sets a start and end date
- THEN only logs within that `created_at` range are displayed

#### Scenario: Combined filters

- GIVEN audit logs exist with varied actors, actions, types, and dates
- WHEN the superadmin applies multiple filters simultaneously
- THEN only logs matching ALL criteria are displayed

#### Scenario: Pagination works

- GIVEN more than 50 audit log entries exist
- WHEN the superadmin views the page
- THEN only the first page of results is displayed
- AND pagination controls allow navigating to subsequent pages

#### Scenario: Unauthorized access blocked

- GIVEN a non-superadmin user navigates to `/admin/audit-logs`
- WHEN the page loads
- THEN the `(super-admin)` route guard blocks access

## Acceptance Criteria

| # | Criterion |
|---|-----------|
| 1 | `entity_type` union includes `'lead'`, `'manual_payment'`, `'user'` |
| 2 | `grep -r "logAuditEvent" src/app/actions/super-admin.ts` matches in all 5 actions |
| 3 | `grep -r "logAuditEvent" src/app/actions/manual-payments.ts` matches in approve and reject |
| 4 | `grep -r "logAuditEvent" src/app/actions/hotel-admin.ts` matches in approve and reject duplicates |
| 5 | `grep -r "logAuditEvent" src/app/actions/superadmin-leads.ts` matches in all 5 lead actions |
| 6 | All 13 actions call `logAuditEvent()` on success path only |
| 7 | Audit writes never throw or break the main action flow |
| 8 | `/admin/audit-logs` page renders with filterable, paginated table |
| 9 | Filters work: actor_email, action, entity_type, date range (individually and combined) |
| 10 | Page is guarded by `(super-admin)` route group |
| 11 | TypeScript compilation passes with no type errors |
| 12 | `actor_id`, `actor_email`, `ip_address`, `user_agent` captured in every audit event |
