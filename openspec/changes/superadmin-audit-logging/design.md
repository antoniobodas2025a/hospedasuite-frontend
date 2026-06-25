# Design: Superadmin Audit Logging

## Technical Approach

Inject `logAuditEvent()` into 13 superadmin server actions across 4 files — additive only, no logic changes. Extend the `entity_type` union in `audit-logger.ts`, then wrap each action's success path with an audit call capturing actor identity, request context, and before/after state. Create a read-only `/admin/audit-logs` page guarded by the existing `(super-admin)` route group.

The `logAuditEvent()` function already catches all errors internally — audit writes NEVER break the main flow (proposal requirement, spec §A2 scenario 5).

## Architecture Decisions

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Reuse `requireSuperAdmin()` return value vs. call `createClient()` again | `requireSuperAdmin()` doesn't return user; refactoring it would touch 15+ callers | Call `createClient()` + `getUser()` in each action after the guard (same pattern already used in `approveManualPayment`) |
| Extract `headers()` inline vs. create a helper | Helper adds a new file for 13 calls; proposal avoids new utilities | Inline `headers()` from `next/headers` in each file — 4 imports total |
| Client-side filtering vs. server-side with URL search params | Client-side scales poorly for large audit tables; server-side follows existing admin page patterns | Server component reads `searchParams`, queries `audit_logs` via `supabaseAdmin`; client component renders filter form + pagination |

## Data Flow

```
Browser ──→ Server Action ──→ requireSuperAdmin() ──→ supabaseAdmin (mutation)
                              ↓
                         createClient().getUser()  ← actor_id, actor_email
                         headers()                  ← ip_address, user_agent
                              ↓
                         logAuditEvent({...}) ──→ audit_logs (INSERT, service key)
                              ↓
                         return success to caller  (audit failure caught internally)
```

## Request Context Capture Pattern

Each action adds after the guard:

```ts
import { createClient } from '@/utils/supabase/server'
import { headers } from 'next/headers'

// inside try block, on success path:
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
const headersList = headers()
const ip = headersList.get('x-forwarded-for') || 'unknown'
const ua = headersList.get('user-agent') || 'unknown'
```

(`approveManualPayment` already has `user`; only needs `headers` import.)

## Action-by-Action Audit Details

### `src/app/actions/super-admin.ts` (5 actions)

| Action | entity_type | action | old_value | new_value | Notes |
|--------|------------|--------|-----------|-----------|-------|
| `createHotelAction` | `'hotel'` | `'hotel_created'` | `null` | `{ name, email, plan, slug }` | After insert, before `catch`; uses `createdHotelId` |
| `deleteHotelAction` | `'hotel'` | `'hotel_deleted'` | full hotel snapshot | `null` | Fetch hotel BEFORE cascade; audit on success |
| `updateTenantAction` | `'hotel'` | `'tenant_updated'` | current `{ name, status, subscription_plan }` | `updateData` | Fetch before mutation |
| `godModeAccess` | `'user'` | `'god_mode_access'` | `null` | `{ email, link_generated: true }` | After `generateLink` success; `entity_id` = email |
| `forceChangePasswordAction` | `'user'` | `'password_forced'` | `null` | `{ password_changed: true }` | After `updateUserById` success; `entity_id` = `ownerId` |

### `src/app/actions/manual-payments.ts` (2 actions)

| Action | entity_type | action | old_value | new_value |
|--------|------------|--------|-----------|-----------|
| `approveManualPayment` | `'manual_payment'` | `'payment_approved'` | `{ status: 'pending' }` | `{ status: 'approved' }` |
| `rejectManualPayment` | `'manual_payment'` | `'payment_rejected'` | `{ status: 'pending' }` | `{ status: 'rejected', reason }` |

### `src/app/actions/hotel-admin.ts` (2 actions)

| Action | entity_type | action | old_value | new_value |
|--------|------------|--------|-----------|-----------|
| `approveDuplicateHotelAction` | `'hotel'` | `'duplicate_hotel_approved'` | `{ subscription_status: 'duplicate_review' }` | `{ subscription_status: 'trialing', status: 'active' }` |
| `rejectDuplicateHotelAction` | `'hotel'` | `'duplicate_hotel_rejected'` | `{ subscription_status: 'duplicate_review' }` | `{ subscription_status: 'cancelled', status: 'suspended' }` |

### `src/app/actions/superadmin-leads.ts` (5 actions)

| Action | entity_type | action | old_value | new_value | Notes |
|--------|------------|--------|-----------|-----------|-------|
| `updateLeadStatusAction` | `'lead'` | `'lead_status_updated'` | `{ status: prev }` | `{ status: new }` | Fetch lead before mutation |
| `updateLeadNotesAction` | `'lead'` | `'lead_notes_updated'` | `{ notes: prev }` | `{ notes: new }` | Fetch lead before mutation |
| `deleteLeadAction` | `'lead'` | `'lead_deleted'` | full lead snapshot | `null` | Fetch lead before deletion |
| `createAdminLeadAction` | `'lead'` | `'lead_created'` | `null` | `{ business_name, phone, status: 'new' }` | After insert; uses `created.id` |
| `assignLeadToHotelAction` | `'lead'` | `'lead_assigned'` | `{ hotel_id: prev }` | `{ hotel_id: new }` | Fetch lead before mutation |

## Component Architecture — `/admin/audit-logs`

```
src/app/(super-admin)/admin/audit-logs/
├── page.tsx              # Server component: reads searchParams, queries audit_logs
└── AuditLogsTable.tsx    # Client component: filter form + paginated table
```

- **`page.tsx`**: `force-dynamic`. Reads `searchParams.actor_email`, `searchParams.action`, `searchParams.entity_type`, `searchParams.date_from`, `searchParams.date_to`, `searchParams.page`. Builds a `supabaseAdmin.from('audit_logs').select('*')` query with `.ilike()`, `.eq()`, `.gte()`, `.lte()` filters. Passes results + pagination to `AuditLogsTable`.
- **`AuditLogsTable.tsx`** (`'use client'`): Renders filter inputs (text for email, `<Select>` for action/entity_type, `<input type="date">` for range) wired to `useRouter()` + `useSearchParams()` for URL-based filtering. Paginated table with columns: timestamp, actor, action, entity, old/new values (collapsed JSON). Uses existing shadcn/ui components (`Button`, `Input`, `Select`). Follows styling conventions from `PendingPaymentsTable`.
- **Auth guard**: No explicit guard needed — the `(super-admin)` layout already enforces superadmin-only access via RLS + middleware. Page is inside the route group.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/lib/audit-logger.ts` | Modify | Extend `entity_type` union: add `'lead'`, `'manual_payment'`, `'user'` |
| `src/app/actions/super-admin.ts` | Modify | Add `logAuditEvent()` calls to 5 actions + imports |
| `src/app/actions/manual-payments.ts` | Modify | Add `logAuditEvent()` calls to `approveManualPayment` + `rejectManualPayment` + imports |
| `src/app/actions/hotel-admin.ts` | Modify | Add `logAuditEvent()` calls to 2 actions + imports |
| `src/app/actions/superadmin-leads.ts` | Modify | Add `logAuditEvent()` calls to 5 actions + imports |
| `src/app/(super-admin)/admin/audit-logs/page.tsx` | Create | Server component: query audit_logs with filter/searchParams |
| `src/app/(super-admin)/admin/audit-logs/AuditLogsTable.tsx` | Create | Client component: filter form + paginated table |
| `src/app/(super-admin)/layout.tsx` | Modify | Add sidebar nav link to `/admin/audit-logs` |

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Compile | TypeScript types | `tsc --noEmit` — union extension must not break existing callers |
| Acceptance | grep checks | `grep -r "logAuditEvent" src/app/actions/{super-admin,manual-payments,hotel-admin,superadmin-leads}.ts` — verify 13 matches |
| Manual | Audit trail | Perform each action via UI → verify row appears in `audit_logs` table |
| Manual | Error resilience | Tamper with `audit_logs` table (drop index) → verify actions still return success |
| Manual | Audit page | Navigate `/admin/audit-logs`, apply each filter combination, verify pagination |
| Integration | Auth guard | Attempt `/admin/audit-logs` as non-superadmin → confirm blocked |

## Rollback

1. Remove all `logAuditEvent()` calls and related imports from 4 action files.
2. Revert `entity_type` union in `audit-logger.ts` (optional — extended union is backward-compatible).
3. Delete `src/app/(super-admin)/admin/audit-logs/` directory.
4. Remove nav link from `layout.tsx`.
5. `audit_logs` rows remain in DB (no migration rollback needed — they're append-only).
