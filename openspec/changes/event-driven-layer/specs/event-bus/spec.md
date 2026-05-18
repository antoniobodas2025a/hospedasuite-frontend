# Event Bus Specification

## Purpose

Provide a typed, pluggable event bus for decoupling side effects from server actions, webhooks, and cron jobs. Wraps QStash in production, in-memory EventEmitter in dev/test.

## Requirements

### Requirement: Typed Event Emission

The system MUST provide `emitEvent(type, payload, metadata?)` that wraps QStash `publishJSON` with Zod-validated schemas. All events include `correlationId` (UUID v4), `timestamp` (ISO 8601), `source` (caller identifier), and optional `hotelId`.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Production emit | QStash configured | `emitEvent('booking.created', payload)` | QStash `publishJSON` called with typed event |
| Dev emit | `NODE_ENV=development` | `emitEvent('booking.created', payload)` | In-memory EventEmitter receives event |
| Invalid payload | Zod schema defined | `emitEvent` with bad payload | Zod error thrown, event NOT emitted |
| Missing correlationId | Caller omits metadata | `emitEvent` called | Auto-generates `correlationId` |

### Requirement: Event Schema Structure

Every event MUST conform to: `{ type: string, payload: T, metadata: { correlationId, timestamp, source, hotelId? } }`. Each event type has a dedicated Zod schema in `src/lib/events/schemas/`.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Schema validation | `bookingCreatedSchema` defined | Event parsed | Zod parses or rejects |
| Metadata required | Event emitted | Schema checked | `correlationId`, `timestamp`, `source` present |
| hotelId optional | Non-hotel event | Schema checked | `hotelId` may be undefined |

### Requirement: Pluggable Backend

The event bus MUST support swapping between QStash (production) and in-memory EventEmitter (dev/test) via environment detection. Interface is identical — only the transport changes.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Production | `UPSTASH_REDIS_REST_URL` set | `emitEvent` called | QStash transport used |
| Development | `NODE_ENV=development` | `emitEvent` called | EventEmitter transport used |
| Test | Jest/Vitest env | `emitEvent` called | EventEmitter transport used |

### Requirement: Core Domain Event Schemas

The system MUST define Zod schemas for all 21 event types across 6 domains: booking, payment, room, guest, ota, trial/plan.

| Event Type | Trigger | Key Payload Fields |
|------------|---------|-------------------|
| `booking.created` | createBookingAction | bookingId, hotelId, guestId, roomId, checkIn, checkOut, totalAmount, status |
| `booking.updated` | updateBookingDetailsAction | bookingId, hotelId, changes |
| `booking.cancelled` | cancelBookingAction | bookingId, hotelId, reason? |
| `booking.status_changed` | Any status update | bookingId, hotelId, oldStatus, newStatus |
| `booking.expired` | Cron release-inventory | bookingId, hotelId, roomId |
| `payment.received` | processPaymentAction, Wompi webhook | paymentId, bookingId?, hotelId, amount, currency, method |
| `payment.approved` | Wompi webhook | transactionId, bookingId, hotelId, amount, reference |
| `payment.declined` | Wompi webhook | transactionId, hotelId, reason |
| `room.status_changed` | updateRoomStatusAction | roomId, hotelId, oldStatus, newStatus |
| `room.created` | saveRoomAction | roomId, hotelId, name, type, price |
| `room.updated` | saveRoomAction | roomId, hotelId, changes |
| `room.deleted` | deleteRoomAction | roomId, hotelId |
| `guest.created` | createGuestAction | guestId, hotelId, name, email |
| `guest.updated` | updateGuestAction | guestId, hotelId, changes |
| `guest.deleted` | deleteGuestAction | guestId, hotelId |
| `ota.sync.requested` | Manual sync, cron | hotelId, roomId? |
| `ota.booking_created` | QStash sync-hotel worker | hotelId, bookingData, channel |
| `ota.booking_cancelled` | QStash sync-hotel worker | hotelId, bookingId, channel |
| `trial.expired` | Cron expired-trials | hotelId, trialEndsAt |
| `trial.expiring_soon` | Cron trial-reminders | hotelId, trialEndsAt, daysRemaining |
| `plan.downgrade_requested` | requestPlanDowngradeAction | hotelId, fromPlan, toPlan |

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Booking event | Booking created | Schema validated | All required fields present, types correct |
| Payment event | Wompi webhook | Schema validated | transactionId, amount, reference present |
| Room event | Room status changed | Schema validated | roomId, oldStatus, newStatus present |
| OTA event | Sync requested | Schema validated | hotelId present, roomId optional |
| Trial event | Trial expired | Schema validated | hotelId, trialEndsAt present |

### Requirement: Event Type Registry

The system MUST export a union type `EventType` and a discriminated union `AppEvent` from `src/lib/events/types.ts` for full TypeScript inference.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Type narrowing | Event received | `switch (event.type)` | TypeScript narrows payload type |
| Invalid type | Wrong event type string | TypeScript compile | Type error |
