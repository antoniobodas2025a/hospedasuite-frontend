# Tasks: Event-Driven Layer

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1,065 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1: Infrastructure → PR 2: Consumers + Migration → PR 3: Realtime |
| Delivery strategy | ask-on-risk |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Event types, emitter, registry, migration SQL | PR 1 | Foundation — no functional changes, base for all consumers |
| 2 | Consumer route, 5 handlers, server-actions emitEvent migration | PR 2 | Depends on PR 1; replaces inline side effects |
| 3 | 3 Realtime hooks + dual-write gating | PR 3 | Depends on PR 2; adds live refresh + mode toggle |

## Phase 1: Foundation — Types, Emitter, Registry, Migration

- [x] 1.1 Create `src/lib/event-types.ts` — 21 Zod schemas (booking/payment/room/guest/ota/trial) + `EventType` union + `AppEvent` discriminated union
- [x] 1.2 Create `src/lib/events.ts` — `emitEvent()` with QStash (prod) / EventEmitter (dev) backend, auto-generates `correlationId`/`timestamp`/`source` metadata
- [x] 1.3 Create `supabase/migrations/015_processed_events.sql` — `processed_events` table with `UNIQUE(event_type, correlation_id)`, TTL index on `processed_at`
- [x] 1.4 Create `src/lib/event-handlers.ts` — subscriber map `Record<EventType, EventHandler[]>` registered at module load

## Phase 2: Consumers & Server Actions

- [ ] 2.1 Create `src/app/api/events/[topic]/route.ts` — generic QStash consumer: `verifySignatureAppRouter`, Zod validate, idempotency check (`processed_events`), dispatch to handlers via registry
- [ ] 2.2 Create `src/app/api/events/handlers/cache-invalidate.ts` — calls `revalidatePath()` / `revalidateTag()` from event payload paths/tags
- [ ] 2.3 Create `src/app/api/events/handlers/audit-log.ts` — inserts row into `audit_logs` table, reuses `logAuditEvent` internally
- [ ] 2.4 Create `src/app/api/events/handlers/analytics-track.ts` — forwards to PostHog `capture()` via `trackPostHogEvent`
- [ ] 2.5 Create `src/app/api/events/handlers/email-send.ts` — calls Resend API with template/recipient/data
- [ ] 2.6 Create `src/app/api/events/handlers/ota-sync.ts` — publishes to existing QStash sync-hotel worker endpoint
- [ ] 2.7 Modify `src/app/actions/bookings.ts` — add `emitEvent('booking.created', ...)`, `emitEvent('booking.cancelled', ...)`, `emitEvent('booking.updated', ...)` after DB commit, gated by `EVENT_DRIVEN_MODE`
- [ ] 2.8 Modify `src/app/actions/rooms.ts` — add `emitEvent('room.status_changed', ...)` after `updateRoomStatusAction` DB commit
- [ ] 2.9 Modify `src/app/actions/payments.ts` — add `emitEvent('payment.received', ...)` / `emitEvent('payment.approved', ...)` after DB commit

## Phase 3: Realtime & Dual-Write Gating

- [ ] 3.1 Create `src/hooks/useRoomRealtime.ts` — Supabase channel on `rooms` table (INSERT/UPDATE/DELETE), triggers `router.refresh()`
- [ ] 3.2 Create `src/hooks/usePaymentRealtime.ts` — Supabase channel on `payments` table, triggers `router.refresh()`
- [ ] 3.3 Create `src/hooks/useServiceItemRealtime.ts` — Supabase channel on `service_items` table, triggers `router.refresh()`
- [ ] 3.4 Add `EVENT_DRIVEN_MODE` env var (values: `inline|dual|event`) and dual-write helper — runs old inlines AND/OR `emitEvent()` based on mode

## Phase 4: Testing

- [ ] 4.1 Write unit tests for 21 Zod schemas — validate + reject per type
- [ ] 4.2 Write unit tests for idempotency — duplicate vs unique correlationId in `processed_events`
- [ ] 4.3 Write integration test for consumer route — mock QStash headers, verify 200/400 routing
- [ ] 4.4 Write integration test for dual-write — verify both old inlines + events fire with `EVENT_DRIVEN_MODE=dual`

---

### Implementation Order

Phase 1 first (types → emitter → migration → registry). Then Phase 2 (route → handlers → server actions). Then Phase 3 (hooks → env var gating). Tests last.

### Next Step

This change exceeds the 400-line budget. Ask user whether to use chained PRs (stacked-to-main) before sdd-apply.
