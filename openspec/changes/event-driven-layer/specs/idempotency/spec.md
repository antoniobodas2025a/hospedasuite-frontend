# Idempotency Specification

## Purpose

Ensure every event handler can safely process duplicate events without side effects. Uses correlationId + event type as idempotency key. QStash DLQ handles permanent failures.

## Requirements

### Requirement: Idempotency Key

Every event handler MUST use `{ correlationId, eventType }` as a unique idempotency key. Before processing, the handler checks if this key was already processed.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| First processing | New correlationId | Handler runs | Event processed, key recorded |
| Duplicate event | Same correlationId re-delivered | Handler runs | Duplicate detected, skipped, 200 returned |
| Different event | Same correlationId, different type | Handler runs | Processed normally (different key) |

### Requirement: Idempotency Storage

The system MUST store processed event keys in a persistent store (PostgreSQL table `processed_events` or Supabase cache) with a TTL of 24 hours.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Key stored | Event processed | Idempotency check | Key exists, TTL set |
| Key expired | TTL passed | Idempotency check | Key not found, event re-processed |
| Storage error | DB unavailable | Idempotency check | Falls through to process (safe duplicate) |

### Requirement: QStash DLQ Configuration

Failed events that exceed QStash retry limits MUST be routed to a Dead Letter Queue for manual inspection. Retry policy: 3 attempts with exponential backoff.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Transient failure | Handler throws | QStash retries | Retries up to 3 times |
| Permanent failure | All retries exhausted | Event routed | DLQ receives failed event |
| DLQ inspection | DLQ has events | Admin reviews | Event data available for debugging |

### Requirement: CorrelationId Tracing

Every event MUST carry a `correlationId` that propagates through the entire event chain. Logs, audit entries, and DLQ records MUST include this ID.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Event chain | booking.created emitted | All handlers run | Same correlationId in all logs |
| Cross-event | booking.created triggers ota.sync | Chain continues | correlationId propagated |
| DLQ record | Event fails permanently | DLQ stores | correlationId included for tracing |
