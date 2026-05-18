# Server Actions Migration Specification

## Purpose

Migrate server actions from inline side effects to event-driven emission. DB transactions remain inline; events emit AFTER commit succeeds. Backward compatibility maintained during migration.

## Requirements

### Requirement: Event Emission After DB Commit

Each server action MUST emit events ONLY after the database transaction succeeds. If the transaction fails, no events are emitted.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Success | DB commit succeeds | Action completes | Events emitted after commit |
| Failure | DB commit fails | Action completes | No events emitted, error returned |
| Multiple events | Booking created | Action completes | booking.created + cache.invalidate + audit.log emitted |

### Requirement: Inline Side Effect Replacement

Server actions MUST replace inline `revalidatePath()`, `logAuditEvent()`, `trackPostHogEvent()`, and direct email/QStash calls with `emitEvent()` calls.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Cache revalidate | Action had `revalidatePath` | Migrated | `emitEvent('cache.invalidate', { paths: [...] })` |
| Audit log | Action had `logAuditEvent` | Migrated | `emitEvent('audit.log', { ... })` |
| Analytics | Action had `trackPostHogEvent` | Migrated | `emitEvent('analytics.track', { ... })` |
| Email send | Action called Resend directly | Migrated | `emitEvent('email.send', { template, ... })` |

### Requirement: Dual-Run During Migration

During the migration period, both old inline calls AND new event emissions MUST run simultaneously. This ensures zero breaking changes while the event layer is verified.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Migration active | Feature flag ON | Action runs | Both inline calls AND events fire |
| Migration complete | Feature flag OFF | Action runs | Only events fire, inline calls removed |
| Rollback | Events failing | Feature flag toggled | Inline calls restore functionality |

### Requirement: Migration Priority Order

Server actions MUST be migrated in this order: (1) booking actions, (2) payment actions, (3) room actions, (4) guest actions, (5) trial/plan actions. At least 3 actions must be migrated for acceptance.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Booking migration | createBookingAction | Migrated first | booking.created event emitted |
| Payment migration | processPaymentAction | Migrated second | payment.received event emitted |
| Room migration | updateRoomStatusAction | Migrated third | room.status_changed event emitted |
