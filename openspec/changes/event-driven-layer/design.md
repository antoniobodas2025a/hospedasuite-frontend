# Design: Event-Driven Architecture Layer

## Technical Approach

Wrap QStash behind a pluggable `emitEvent()` facade, run inline EventEmitter in dev/test, route via a generic HTTP consumer, and replace inline `revalidatePath`/`logAuditEvent`/`trackPostHogEvent` calls with domain events emitted AFTER DB commit. Dual-write during migration ensures zero breaking changes. 21 domain event types, 6 handler types, processed_events table for idempotency, and Realtime expansion on 3 tables.

## Architecture Decisions

| Decision | Option A | Option B | Chosen | Rationale |
|----------|----------|----------|--------|-----------|
| Event transport | QStash publishJSON | Custom queue (Redis/Rabbit) | **QStash** | Already in stack (`@upstash/qstash` v2.10.1), provides retry+DLQ natively, zero-infra cost |
| Dev/test transport | EventEmitter | Local QStash mock | **EventEmitter** | Zero HTTP overhead, synchronous tracing, matches existing vitest `node` environment |
| Idempotency key | `(event_type, correlationId)` | Content hash | **CorrelationId pair** | Works across retries where payload may differ slightly; UUID v4 from emitter guarantees uniqueness |
| Consumer routing | One route per topic | Single generic endpoint | **Single `[topic]/route.ts`** | QStash publishes to one callback URL; routing by `event.type` in body keeps file count low |
| Dual-write control | Feature flag via env var | Code comments toggle | **`EVENT_DRIVEN_MODE` env var** | Deployer toggles without code change; `dual` runs both, `event` removes inlines, `inline` restores |
| Realtime expansion | Single hook per table | One mega-subscription | **Per-table hooks** | `useRoomRealtime`, `usePaymentRealtime` follow existing `useCalendar` pattern; independent subscribe/unsubscribe |

## Data Flow

```
User Action
  │
  ▼
Server Action (e.g., createBookingAction)
  │
  ├─ DB insert/update/delete
  │   └─ commit succeeds? ─── no ──→ error returned, NO events emitted
  │
  └─ yes ──→ emitEvent('booking.created', payload)
                  │
                  ├── dev ──→ EventEmitter ──→ handler registry (synchronous)
                  │
                  └── prod ──→ QStash.publishJSON(topic, event)
                                    │
                                    ▼
                      GET /api/events/booking/created
                                    │
                            verifySignatureAppRouter
                                    │
                            Zod schema validation ─── fail ──→ 400
                                    │
                            check processed_events(idempotency)
                                    │
                                    ├── duplicate ──→ 200 (skip)
                                    └── new ──→ dispatch to handlers
                                                 │
                                     ┌───────────┼───────────────────┐
                                     ▼           ▼                   ▼
                              cache.invalidate  audit.log       analytics.track
                              (revalidatePath)  (insert row)    (PostHog capture)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/lib/events/index.ts` | Create | `emitEvent()` with pluggable backend, metadata auto-generation |
| `src/lib/events/types.ts` | Create | 21 Zod schemas + discriminated union `AppEvent` |
| `src/lib/events/handler-registry.ts` | Create | Subscriber map: event type → handler identifiers |
| `src/app/api/events/[topic]/route.ts` | Create | Generic QStash consumer: verify, validate, deduplicate, dispatch |
| `src/app/api/events/handlers/cache-invalidate.ts` | Create | Calls `revalidatePath()` / `revalidateTag()` from event payload |
| `src/app/api/events/handlers/audit-log.ts` | Create | Inserts row into `audit_logs` (reuses `logAuditEvent` internally) |
| `src/app/api/events/handlers/analytics-track.ts` | Create | Forwards to PostHog `capture()` (reuses `trackPostHogEvent`) |
| `src/app/api/events/handlers/email-send.ts` | Create | Calls Resend API |
| `src/app/api/events/handlers/ota-sync.ts` | Create | Publishes to existing `qstash/sync-hotel` worker |
| `src/app/actions/bookings.ts` | Modify | Replace `revalidatePath` with `emitEvent('booking.created', ...)` + dual-write gating |
| `src/app/actions/rooms.ts` | Modify | Replace inline cache invalidation with `emitEvent('room.status_changed', ...)` |
| `src/app/actions/payments.ts` | Modify | Replace inline side effects with domain + cache events |
| `src/app/actions/guests.ts` | Modify | Replace inline `revalidatePath` with cache events |
| `supabase/migrations/015_processed_events.sql` | Create | New table with unique constraint on `(event_type, correlation_id)`, TTL index |
| `src/hooks/useRoomRealtime.ts` | Create | Supabase channel on `rooms` table, triggers `router.refresh()` |
| `src/hooks/usePaymentRealtime.ts` | Create | Supabase channel on `payments` table |
| `src/hooks/useServiceItemRealtime.ts` | Create | Supabase channel on `service_items` table |

## Interfaces / Contracts

```typescript
// src/lib/events/types.ts — event envelope (all events conform to this)
interface EventEnvelope<T extends z.ZodTypeAny> {
  type: EventType;
  payload: z.infer<T>;
  metadata: { correlationId: string; timestamp: string; source: string; hotelId?: string };
}

// src/lib/events/index.ts — public API
function emitEvent<T extends z.ZodTypeAny>(
  type: EventType, payload: z.infer<T>, metadata?: Partial<EventMetadata>
): Promise<void>;

// handler signature (src/lib/events/handler-registry.ts)
type EventHandler = (event: EventEnvelope<any>) => Promise<void>;
```

## Migrations

```sql
-- supabase/migrations/015_processed_events.sql
CREATE TABLE processed_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  correlation_id UUID NOT NULL,
  payload_hash TEXT NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'processed',
  UNIQUE (event_type, correlation_id)
);
CREATE INDEX idx_processed_events_ttl ON processed_events (processed_at)
  WHERE processed_at < NOW() - INTERVAL '24 hours';
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit — event schemas | All 21 Zod schemas validate/reject correctly | Vitest, `src/__tests__/unit/event-schemas.test.ts` |
| Unit — idempotency | Duplicate events skipped, unique events processed | Mock `processed_events` table lookup |
| Unit — handler registry | Correct handlers dispatched per event type | `emitEvent` in dev mode → inspect EventEmitter |
| Integration — consumer route | QStash signature → validation → handler → 200 | `src/__tests__/integration/event-consumer.test.ts`, mock QStash headers |
| Integration — dual-write | Old + new both fire when `EVENT_DRIVEN_MODE=dual` | Verify `revalidatePath` still called + event emitted |

## Migration / Rollout

1. **Phase 1** — Create `events.ts`, consumer route, handlers, processed_events migration. Zero code changes to server actions.
2. **Phase 2** — Add `emitEvent()` calls AFTER existing inline calls in booking/room actions. Gate with `EVENT_DRIVEN_MODE=dual`.
3. **Phase 3** — Flip to `EVENT_DRIVEN_MODE=event`, remove inline calls after 48h verification.
4. **Phase 4** — Realtime hooks created and imported in page components.

Rollback: set `EVENT_DRIVEN_MODE=inline` — restores original inline behavior instantly.

## Open Questions

- [ ] Should `processed_events` use Supabase cache (Redis-backed) instead of PostgreSQL table for lower latency?
- [ ] Do we need a `realtime.broadcast` handler that emits to Supabase channels, or is DB-triggered Realtime sufficient?
