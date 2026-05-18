# Event Consumers Specification

## Purpose

Define the generic event consumer and all domain-specific handlers that process events emitted by the bus. Each consumer is idempotent, logs with correlationId, and replaces inline side effects.

## Requirements

### Requirement: Generic Event Router

The system MUST provide a QStash callback endpoint at `src/app/api/events/[topic]/route.ts` that receives events, validates the schema, and routes to registered handlers based on `event.type`.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Valid event | QStash delivers event | Route handler invoked | Event routed to matching handler |
| Unknown type | Unregistered event type | Route handler invoked | Logged as warning, 200 returned |
| Invalid schema | Malformed payload | Route handler invoked | 400 returned, logged with correlationId |
| Handler error | Handler throws | Route handler invoked | Error logged, DLQ triggered via QStash retry |

### Requirement: Subscriber Registry

The system MUST maintain a subscriber map: each event type maps to an array of handler identifiers. Handlers are registered at module load time.

| Event | Subscribers |
|-------|-------------|
| `booking.created` | cache.invalidate, audit.log, ota.sync.requested, analytics.track |
| `booking.updated` | cache.invalidate, audit.log, analytics.track |
| `booking.cancelled` | cache.invalidate, audit.log, ota.sync.requested, analytics.track |
| `booking.expired` | cache.invalidate, audit.log, room.availability_changed |
| `booking.status_changed` | cache.invalidate, audit.log, realtime.broadcast |
| `payment.received` | cache.invalidate, audit.log, analytics.track |
| `payment.approved` | booking.confirm, email.send, invoice.create, analytics.track |
| `payment.declined` | audit.log, analytics.track, notification.send |
| `room.status_changed` | cache.invalidate, audit.log, realtime.broadcast |
| `room.created/updated/deleted` | cache.invalidate, audit.log, ota.sync.requested |
| `ota.sync.requested` | QStash publish to sync-hotel worker |
| `trial.expired` | audit.log, analytics.track, hotel.suspend |
| `trial.expiring_soon` | email.send |
| `plan.downgrade_requested` | audit.log, analytics.track |

### Requirement: Cache Invalidation Consumer

The system MUST provide a `cache.invalidate` handler that receives `{ paths: string[], tags: string[] }` and calls `revalidatePath(path)` for each path and `revalidateTag(tag, 'max')` for each tag. This replaces all inline revalidate calls.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Path revalidation | Event with paths | Handler runs | Each path revalidated |
| Tag revalidation | Event with tags | Handler runs | Each tag revalidated with profile='max' |
| Both paths+tags | Event with both | Handler runs | All paths and tags revalidated |
| Empty arrays | Event with empty paths/tags | Handler runs | No-op, logged |

### Requirement: Audit Log Consumer

The system MUST provide an `audit.log` handler that receives audit event data and inserts a row into the `audit_log` table. This replaces all inline `logAuditEvent()` calls.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Audit insert | Audit event received | Handler runs | Row inserted in audit_log |
| Duplicate event | Same correlationId processed | Handler runs | Idempotency check skips duplicate |

### Requirement: Analytics Consumer

The system MUST provide an `analytics.track` handler that receives analytics event data and forwards to PostHog/tracking service. This replaces all inline `trackPostHogEvent()` calls.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Track event | Analytics event received | Handler runs | PostHog `capture()` called |
| Missing PostHog key | PostHog not configured | Handler runs | Logged as warning, no crash |

### Requirement: Email Consumer

The system MUST provide an `email.send` handler that receives `{ template, recipient, data }` and calls the Resend API. This replaces inline email sends in webhooks and cron jobs.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Email send | Email event received | Handler runs | Resend API called with template |
| Resend error | API returns error | Handler runs | Error logged, QStash retry triggered |

### Requirement: OTA Sync Consumer

The system MUST provide an `ota.sync.requested` handler that publishes to the existing QStash sync-hotel worker endpoint. This replaces direct QStash publishes from server actions.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Sync request | OTA sync event received | Handler runs | QStash publishes to sync-hotel worker |
| Room-specific | roomId provided | Handler runs | Sync targets specific room |
| Hotel-wide | roomId omitted | Handler runs | Sync targets all rooms |
