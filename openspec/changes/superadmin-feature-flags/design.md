# Design: Superadmin Feature Flags

## Technical Approach

Database-backed runtime feature flags with per-hotel override capability. Adds `feature_flags` table with nullable `hotel_id`, a library function for evaluation (per-hotel → global → static fallback → false), CRUD server actions guarded + audited, and `/admin/feature-flags` page mirroring the existing leads panel pattern. Zero breaking changes — new code coexists with legacy `FEATURES` static object.

## Architecture Decisions

| Decision | Option A | Option B (chosen) | Rationale |
|----------|----------|-------------------|-----------|
| **Per-hotel override** | Global-only (no `hotel_id`) | Nullable `hotel_id` with composite unique | Allows per-tenant A/B tests. Exploration confirmed approach 2. |
| **Unique constraint** | Partial unique index per-scope | `UNIQUE NULLS NOT DISTINCT (flag_key, hotel_id)` | Single index, cleaner. Requires PG15+, which Supabase ships. |
| **RLS policy** | Tenant-owned (per hotel) | Service-role only, client blocked (`WITH CHECK (false)`) | Flags are superadmin-managed, not user-editable. Matches `audit_logs` policy. |
| **Cache layer** | Redis/React Cache at launch | Direct DB query for v1, caching as follow-up | Proposal explicitly scopes cache out. Accepts latency tradeoff for simplicity. |
| **`entity_type` union** | Add `'feature_flag'` to `AuditEvent` in audit-logger.ts | Same | Required for spec compliance. Matches pattern: server actions snapshot old_value, logAuditEvent with entity_type. |
| **Hook pattern** | `useActionState` (React 19) | Optimistic `useState` + rollback (matches `useLeads.ts`) | Existing pattern proven with leads. `useActionState` can be adopted later. |

## Migration SQL Schema

```sql
CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  flag_key TEXT NOT NULL,
  flag_name TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN NOT NULL DEFAULT false,
  hotel_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_feature_flag_key_hotel UNIQUE NULLS NOT DISTINCT (flag_key, hotel_id)
);

CREATE INDEX idx_feature_flags_hotel ON feature_flags(hotel_id);

ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" ON feature_flags FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "no_client_access_feature_flags" ON feature_flags FOR ALL
  USING (false) WITH CHECK (false);

-- Trigger for updated_at
CREATE TRIGGER set_feature_flags_updated_at
  BEFORE UPDATE ON feature_flags
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

**RLS design**: Service-role bypasses RLS entirely — `service_role_full_access` is a documentation policy. `no_client_access_feature_flags` with `USING (false)`+`WITH CHECK (false)` blocks all client-side access. Server actions use `supabaseAdmin` (service key) which bypasses RLS.

## `isFeatureEnabled()` Evaluation Chain

```
isFeatureEnabled(flagKey, hotelId?) ──→ Promise<boolean>

  1. hotelId provided?
     ├─ YES → Query DB: hotel_id = hotelId AND flag_key = flagKey
     │        ├─ Found → return row.enabled
     │        └─ Not found → continue to step 2
     └─ NO  → skip to step 2

  2. Query DB: hotel_id IS NULL AND flag_key = flagKey
     ├─ Found → return row.enabled
     └─ Not found → continue to step 3

  3. Lookup FEATURES[flagKey] static object
     ├─ Found → return FEATURES[flagKey]
     └─ Not found → return false
```

Implementation: two sequential Supabase queries (single `.limit(1)` each). Exported from `src/lib/feature-flags.ts` alongside existing `FEATURES` object (unchanged).

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/XXX_feature_flags.sql` | Create | Table, indexes, RLS, trigger |
| `src/lib/feature-flags.ts` | Modify | Add `isFeatureEnabled(flagKey, hotelId?)` alongside `FEATURES` |
| `src/lib/audit-logger.ts` | Modify | Add `'feature_flag'` to `entity_type` union |
| `src/app/actions/superadmin-feature-flags.ts` | Create | 5 server actions: list, create, update, delete, toggle |
| `src/data/superadmin.ts` | Modify | Add `getFeatureFlags()`, typed `FeatureFlagRow` interface |
| `src/app/(super-admin)/admin/feature-flags/page.tsx` | Create | Server page — fetches flags via DAL, passes to client table |
| `src/app/(super-admin)/admin/feature-flags/FeatureFlagsTable.tsx` | Create | Client table + inline toggle + create/edit modal + scope filter |
| `src/hooks/useFeatureFlags.ts` | Create | Optimistic update hook (mirrors `useLeads.ts`) |
| `src/app/(super-admin)/layout.tsx` | Modify | Add "Feature Flags" nav link with `ToggleLeft` icon |
| `src/types/database.ts` | Modify | Add `feature_flags` Row/Insert/Update types |
| `src/__tests__/unit/feature-flags.test.ts` | Create | Tests for `isFeatureEnabled()` + server actions |

## Server Action Signatures

```typescript
// All async, all guarded by await requireSuperAdmin() as first line
listFeatureFlagsAction(): Promise<FeatureFlagRow[]>
createFeatureFlagAction(input: CreateFlagInput): Promise<{ success: boolean; data?: FeatureFlagRow; error?: string }>
updateFeatureFlagAction(id: string, input: UpdateFlagInput): Promise<{ success: boolean; error?: string }>
deleteFeatureFlagAction(id: string): Promise<{ success: boolean; error?: string }>
toggleFeatureFlagAction(id: string): Promise<{ success: boolean; error?: string }>
```

Mutations snapshot old value before change, call `logAuditEvent()` with `entity_type: 'feature_flag'`, and call `revalidatePath('/admin/feature-flags')`.

## Component Architecture

```
page.tsx (server)                     ← fetches flags via getFeatureFlags()
  └─→ FeatureFlagsTable.tsx (client)  ← receives initial data as props
        ├─ useFeatureFlags() hook     ← optimistic state management
        ├─ Inline Toggle (Switch)     ← calls toggleFeatureFlagAction
        ├─ Create/Edit Modal (Dialog) ← shadcn/ui form for flag CRUD
        ├─ Delete confirm dialog      ← AlertDialog with flag_key + flag_name
        └─ Scope filter (Select)      ← All | Global | Per-Hotel
```

Follows the exact pattern of `admin/leads/page.tsx` → `LeadsTable.tsx` → `useLeads.ts`.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit — `isFeatureEnabled()` | Evaluation order (per-hotel > global > static > false), hotelId optionality | Mock `supabaseAdmin.from().select().eq().limit().single()` chain via `vi.hoisted()` |
| Unit — Server actions | Guard check, audit logging, happy paths, duplicate rejection, error propagation | Mock `requireSuperAdmin`, `supabaseAdmin` chain, `logAuditEvent`. Pattern from `superadmin-leads.test.ts` |
| Unit — `useFeatureFlags` hook | Optimistic toggle, rollback on failure, scope filter state | `@testing-library/react` + `renderHook`, mock server actions. Pattern from `useLeads.test.ts` |

No E2E tests in v1 — page is internal superadmin tool.

## Rollback Plan

1. **Migration**: `supabase migration down` drops `feature_flags` table (no business data loss — only flag configuration).
2. **Code**: `git revert` the feature branch.
3. **Zero impact on existing**: `FEATURES` static object untouched. `isFeatureEnabled()` removed, but no callers exist yet. Rollback is clean.

## Open Questions

- [ ] Confirm exact Postgres version on production Supabase (needs ≥15 for `UNIQUE NULLS NOT DISTINCT`)
- [ ] Decide migration file number (next after `026_wompi_sandbox_toggle.sql`)
