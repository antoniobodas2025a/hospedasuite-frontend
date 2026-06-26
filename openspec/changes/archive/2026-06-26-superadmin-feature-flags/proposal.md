# Proposal: Superadmin Feature Flags

## Intent

Feature flags are currently hardcoded at build time via `process.env` and `@vercel/flags`. Changing a flag requires an env var update + redeploy. There is no runtime modification and no per-hotel override capability. This change introduces a database-backed, runtime-togglable feature flag system with global and per-hotel scope, managed from the superadmin panel.

## Scope

### In Scope
- `feature_flags` table with nullable `hotel_id` (null = global, non-null = per-hotel override)
- `isFeatureEnabled(flagKey, hotelId?)` library function — checks per-hotel → global → default
- CRUD server actions (list, create, update, delete, toggle) guarded by `requireSuperAdmin()` and audited via `logAuditEvent()`
- `/admin/feature-flags` page with table, inline toggles, create/edit modal, scope filter
- Sidebar nav link in superadmin layout
- Unit tests for `isFeatureEnabled()` and server actions

### Out of Scope
- Percentage rollouts, user segments, or complex targeting rules
- Redis/React Cache layer (direct DB query for v1; caching as follow-up)
- Migration of existing `@vercel/flags` usage in `src/flags/pricing.ts`
- Client-side feature flag provider/context (flags are evaluated server-side)

## Capabilities

### New Capabilities
- `feature-flag-management`: Runtime CRUD, evaluation, and UI for feature flags with global and per-hotel scope

### Modified Capabilities
- None — this is a purely additive change. Existing `FEATURES` static object continues to work as fallback defaults.

## Approach

1. **Migration**: Create `feature_flags` table with columns `id`, `flag_key`, `description`, `enabled`, `hotel_id` (nullable), `created_at`, `updated_at`. Composite unique index `UNIQUE NULLS NOT DISTINCT (flag_key, hotel_id)`. RLS policies: service-role full access, no client access.
2. **Library**: Add `isFeatureEnabled(flagKey, hotelId?)` to `src/lib/feature-flags.ts` — queries Supabase for per-hotel override first, then global flag, then falls back to `FEATURES` static defaults.
3. **Server actions**: New file `src/app/actions/superadmin-feature-flags.ts` following the `superadmin-leads.ts` pattern — `requireSuperAdmin()` guard + `logAuditEvent()` on every mutation.
4. **DAL**: Extend `src/data/superadmin.ts` with `getFeatureFlags()` for the server page.
5. **UI**: `src/app/(super-admin)/admin/feature-flags/page.tsx` (server) + `FeatureFlagsTable.tsx` (client) with inline toggle, create/edit modal, and scope filter (All / Global / Per-Hotel).
6. **Nav**: Add "Feature Flags" link to superadmin sidebar layout.
7. **Types**: Add `feature_flags` to `src/types/database.ts`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `supabase/migrations/` | New | Migration for `feature_flags` table, indexes, RLS |
| `src/lib/feature-flags.ts` | Modified | Add `isFeatureEnabled()` alongside existing `FEATURES` |
| `src/app/actions/superadmin-feature-flags.ts` | New | CRUD + toggle server actions |
| `src/data/superadmin.ts` | Modified | Add `getFeatureFlags()` DAL function |
| `src/app/(super-admin)/admin/feature-flags/` | New | Page + client table + modals |
| `src/app/(super-admin)/layout.tsx` | Modified | Add "Feature Flags" nav link |
| `src/types/database.ts` | Modified | Add `feature_flags` type |
| `src/hooks/useFeatureFlags.ts` | New | Optimistic-update hook (follows `useLeads.ts` pattern) |
| `src/__tests__/unit/feature-flags.test.ts` | New | Tests for library function + server actions |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `UNIQUE NULLS NOT DISTINCT` requires Postgres 15+ | Low | Supabase ships Postgres 15+; verify version before migration |
| RLS misconfiguration allows client writes | Low | Follow `audit_logs` policy pattern; test with anon key |
| `isFeatureEnabled()` adds latency without cache | Medium | Acceptable for v1; document caching as follow-up |
| Existing `FEATURES` usage in `onboarding.ts` breaks | Low | New function coexists; static object remains as fallback |

## Rollback Plan

1. Revert the migration: `supabase migration down` (down migration drops `feature_flags` table).
2. Revert code changes via git: `git revert` the feature branch.
3. No data loss — the table contains only flag configuration, not business data.
4. Existing `FEATURES` static object continues to work independently, so rollback does not break current functionality.

## Dependencies

- Supabase Postgres 15+ (for `UNIQUE NULLS NOT DISTINCT`)
- Existing `requireSuperAdmin()` guard in `src/lib/auth-guards.ts`
- Existing `logAuditEvent()` in `src/lib/audit-logger.ts`

## Success Criteria

- [ ] Superadmin can create, edit, toggle, and delete feature flags via `/admin/feature-flags`
- [ ] Per-hotel override takes precedence over global flag in `isFeatureEnabled()`
- [ ] Global flag takes precedence over static `FEATURES` defaults
- [ ] All mutations are guarded by `requireSuperAdmin()` and logged via `logAuditEvent()`
- [ ] Sidebar nav link visible to superadmin users
- [ ] Unit tests pass for `isFeatureEnabled()` evaluation order and server action guards
- [ ] Zero breaking changes to existing `FEATURES` usage in `onboarding.ts`
