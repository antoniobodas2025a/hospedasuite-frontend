# ADR-0002: Atomic PostgreSQL RPCs vs Client-Side Transaction Logic

- **Date**: 2026-05-08
- **Status**: accepted
- **Deciders**: anto (owner), opencode (architect)

## Context

HospedaSuite's check-in and check-out flows were originally implemented as multi-step client-side operations in Next.js Server Actions. Each flow involved:

1. Read current state from DB
2. Validate state on server
3. Write update (e.g., `booking.status = 'checked_in'`)
4. Write secondary entity (e.g., create `Payment` record)
5. Write audit log

If step 4 or 5 failed, step 3 still persisted — leaving the booking in an inconsistent state (checked in but no payment record). The error handling relied on TypeScript try/catch with manual rollback queries, which was fragile and had race condition windows between read and write.

We identified 62 TypeScript errors in total across the project during stabilization. The check-in/check-out flows had the highest runtime risk because they involved money (payment reconciliation).

## Options Considered

| Option | Pros | Cons |
|--------|------|------|
| **Atomic PostgreSQL RPCs** | Single round-trip; transaction isolation (SERIALIZABLE); no race conditions; DB enforces consistency; 0 application-level rollback code; testable in SQL directly | Logic lives in DB (not familiar to all devs); harder to debug than TypeScript; requires migration to update; functions need permissions management |
| **Client-side multi-step with retry** | All logic in TypeScript; easier to debug with console.log; no DB function knowledge needed | Race condition window between read and write; manual rollback is fragile; retry logic adds complexity; partial failures still possible |
| **Client-side with Supabase stored procedures** | Still uses Supabase abstraction layer; slightly less raw SQL | Same transaction isolation issues if not carefully written; Supabase procedures still go through PostgREST |
| **Optimistic locking + application-level compensation** | No DB functions; all logic in app; works without stored procedures | Very complex to implement correctly; compensation logic (reverse transaction) is error-prone with money |

## Decision

We chose **atomic PostgreSQL RPCs** using `SERIALIZABLE` transaction isolation for all financial state transitions.

Two RPCs were created:
- `atomic_check_in(booking_id, guest_id, amount_paid, payment_method)` → transitions booking to `checked_in`, creates payment record, inserts audit log, all in one transaction
- `atomic_check_out(booking_id, total_charged)` → transitions booking to `checked_out`, updates totals, closes audit entry

## Consequences

- **Positive**: Eliminated race conditions entirely — no read-modify-write window exists anymore. The DB guarantees consistency at the transaction level.
- **Positive**: Reduced TypeScript error surface. The Server Actions are now thin wrappers that validate input and call RPCs.
- **Positive**: Testable independently via SQL editor — we verified both RPCs against the real database before deploying.
- **Positive**: 62 → 0 TS errors across the project, including these flows.
- **Negative**: Business logic now lives in PostgreSQL functions. Requires SQL knowledge to modify checkout/checkin behavior.
- **Negative**: Adding a new state transition (e.g., `no_show`) requires a new RPC or modification.
- **Negative**: RPCs are harder to version control and review compared to TypeScript (they're in `.sql` files, not part of the app build).

## Y-Statement

> In the context of stabilizing financial state transitions with 62 TypeScript errors across the project, facing race condition windows and fragile manual rollback in check-in/check-out flows, we decided for atomic PostgreSQL RPCs over client-side multi-step logic to achieve database-enforced transaction isolation, accepting that business logic now lives in SQL functions.

## Links

- File: `supabase/rpc-atomic-checkin-checkout.sql`
- Related: PR #1 (stabilization)
