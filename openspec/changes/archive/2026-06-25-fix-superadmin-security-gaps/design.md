# Design: Fix Superadmin Security Gaps

## Technical Approach

Three layered fixes: (1) create a shared `requireSuperAdmin()` guard in `src/lib/auth-guards.ts` using `createClient()` (SSR) for session verification + `user_roles` lookup; (2) add `await requireSuperAdmin()` as first line in all unguarded destructive actions and replace inline role checks; (3) normalize role strings: `'super_admin'` → `'superadmin'` in 3 files + an idempotent DB migration. The canonical role `'superadmin'` already matches middleware (`src/utils/supabase/middleware.ts:107`) and `hotel-context.ts:58`.

## Architecture Decisions

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Use `createClient()` (SSR) for auth + role query | Respects RLS, no service_role dependency. Slightly more tokens. | **Chosen** — defense in depth, self-contained. |
| Use `supabaseAdmin` for role query | Bypasses RLS, faster, already used in existing inline checks. | Rejected — guard should be usable without admin privileges. |
| Throw vs return error object | Throwing stops execution flow immediately, consistent with `redirect()`. | **Chosen** — throw `Error` (spec says "throws on failure"). |
| Separate function per role vs generic `requireRole()` | Generic is reusable but overkill for this change. | **KISS** — single `requireSuperAdmin()` now, extract later if needed. |

## Data Flow

```
Client calls server action (e.g., createHotelAction)
    │
    ▼
await requireSuperAdmin()
    │
    ├─ createClient() → auth.getUser()
    │   ├─ no user → throw "No autenticado"
    │   └─ user found → query user_roles WHERE user_id = user.id
    │       ├─ role ≠ 'superadmin' → throw "No autorizado"
    │       └─ role = 'superadmin' → return silently
    │
    ▼
Business logic (hotel creation, deletion, etc.)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/lib/auth-guards.ts` | **Create** | Exports `requireSuperAdmin()`: gets user via `createClient()` (SSR), queries `user_roles` for `role = 'superadmin'`, throws on failure |
| `src/app/actions/super-admin.ts` | Modify | Add `await requireSuperAdmin()` as first line in `createHotelAction`, `godModeAccess`, `updateTenantAction`, `forceChangePasswordAction`, `deleteHotelAction` |
| `src/app/actions/hq.ts` | Modify | Remove `SUPER_ADMIN_EMAILS` array (lines 9-10) and `verifySuperAdmin()` function (lines 13-40); replace `await verifySuperAdmin()` call with `await requireSuperAdmin()`. Remove unused `createServerClient` import |
| `src/app/actions/hotel-admin.ts` | Modify | Replace 3 inline `role !== 'super_admin'` checks + manual query blocks with `await requireSuperAdmin()`. Remove now-unused `supabase` + `roleData` variables |
| `src/app/actions/manual-payments.ts` | Modify | Replace 3 inline `role !== 'super_admin'` checks + manual query blocks with `await requireSuperAdmin()`. Remove unused `supabase` + `roleData` variables |
| `supabase/migrations/20260625_normalize_superadmin_role.sql` | **Create** | Idempotent: `UPDATE user_roles SET role = 'superadmin' WHERE role = 'super_admin'` + down migration |
| `src/lib/__tests__/auth-guards.test.ts` | **Create** | Vitest unit tests for `requireSuperAdmin()`: happy path, non-superadmin reject, unauthenticated reject |

## Interfaces / Contracts

```typescript
// src/lib/auth-guards.ts
import { createClient } from '@/utils/supabase/server';

/**
 * Verifies the current user has role='superadmin' in user_roles.
 * Throws on auth failure or unauthorized role. Silently returns on success.
 */
export async function requireSuperAdmin(): Promise<void> {
  const supabase = await createClient();

  // 1. Verify session
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('No autenticado.');
  }

  // 2. Verify superadmin role
  const { data: roleData, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (roleError || !roleData || roleData.role !== 'superadmin') {
    throw new Error('No autorizado. Se requiere rol superadmin.');
  }
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `requireSuperAdmin()` happy path | Mock `createClient` → return valid user + `role = 'superadmin'` |
| Unit | `requireSuperAdmin()` rejects non-superadmin | Mock user with `role = 'owner'`, expect throw |
| Unit | `requireSuperAdmin()` rejects unauthenticated | Mock `auth.getUser()` returning null/error, expect throw |
| Unit | `requireSuperAdmin()` rejects missing `user_roles` row | Mock `single()` returning null, expect throw |
| Integration | `grep -r "super_admin" src/` | Zero matches after change (acceptance criterion) |
| Integration | `grep -r "SUPER_ADMIN_EMAILS" src/` | Zero matches after change (acceptance criterion) |
| E2E | Not in scope | Middleware already guards `/admin` routes; this change hardens server actions only |

## Migration / Rollout

### Migration

```sql
-- up: 20260625_normalize_superadmin_role.sql
UPDATE user_roles SET role = 'superadmin' WHERE role = 'super_admin';

-- down
UPDATE user_roles SET role = 'super_admin' WHERE role = 'superadmin';
```

This migration is **idempotent** — running it multiple times produces the same result. No data loss, no new tables. The migration is safe to run in production before or after the code deploy because:
- The old code with `'super_admin'` checks will fail AFTER migration but BEFORE deploy (users with migrated role `'superadmin'` won't match `'super_admin'`).
- **Recommended order**: deploy code first (with `requireSuperAdmin()` using `'superadmin'`), then run migration. This avoids any window where superadmins lose access.

### Rollback Plan

1. **Code**: `git revert` the commit — all changes are additive (new guard) or string replacements
2. **DB**: Run the down migration to restore `'superadmin'` → `'super_admin'` if needed
3. No data is modified by code changes alone; the migration is the only data-mutating piece

## Open Questions

- [ ] Confirm no `'super_admin'` values exist in seed data or external integrations (CRON jobs, webhooks) before merging
- [ ] Confirm `user_roles` table has RLS policy allowing users to read their own row (needed for SSR-based guard). If not, the guard must use `supabaseAdmin` instead of `createClient()` for the role query
