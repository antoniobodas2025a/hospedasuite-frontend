## Exploration: superadmin-feature-flags

### Current State

Feature flags in HospedaSuite are currently **hardcoded at build time** via two mechanisms:

1. **`src/lib/feature-flags.ts`** — Static `FEATURES` object read from `process.env` at build time. Only one flag exists: `WIZARD_WOMPI_SUBSCRIPTION`. Changing it requires an env var + redeploy.
2. **`src/flags/pricing.ts`** — Vercel Edge Config flags (`@vercel/flags`) for pricing experiments. These are global, not per-hotel, and require Vercel Edge Config access.

There is **no database-backed, runtime-modifiable feature flag system**. There is **no per-tenant/hotel override capability**. The superadmin panel has sections for leads, hotels, payments, subscriptions, users, audit logs, and system health — but nothing for feature management.

The existing auth guard (`requireSuperAdmin()`), audit logger (`logAuditEvent()`), and Supabase admin client (`supabaseAdmin`) are mature and ready to reuse. The DAL pattern in `src/data/superadmin.ts` provides a clean reference for read queries.

### Affected Areas

- `src/lib/feature-flags.ts` — **Modify** to add `isFeatureEnabled(flagKey, hotelId?)` runtime function alongside the legacy static `FEATURES` object.
- `src/lib/audit-logger.ts` — **Reference only** — audit logger already supports `entity_type: 'hotel'`, but the `AuditEvent.entity_type` union may need `"feature_flag"` added for completeness.
- `src/app/actions/` — **New file** `superadmin-feature-flags.ts` with CRUD server actions following the exact pattern of `superadmin-leads.ts`.
- `src/data/superadmin.ts` — **Modify** to add `getFeatureFlags()` DAL function for the server page.
- `src/app/(super-admin)/admin/feature-flags/` — **New directory** with `page.tsx` (server) + `FeatureFlagsTable.tsx` (client) + modals.
- `src/app/(super-admin)/layout.tsx` — **Modify** to add "Feature Flags" nav link with an icon (`ToggleLeft` or `Flag`).
- `src/types/database.ts` — **Modify** to add `feature_flags` table type definition.
- `supabase/migrations/` — **New migration** for the `feature_flags` table + indexes + RLS policies.
- `src/hooks/` — **New file** `useFeatureFlags.ts` following the `useLeads.ts` optimistic-update pattern.
- `src/__tests__/unit/` — **New test file** for server actions + library function.

### Approaches

1. **Simple global flags only** — Single `feature_flags` table, no `hotel_id` column. All flags are global.
   - Pros: Simplest schema, single source of truth, trivial query logic.
   - Cons: Cannot do per-hotel A/B tests or gradual rollouts by tenant.
   - Effort: Low

2. **Per-hotel override with global fallback** — `feature_flags` table with nullable `hotel_id`. Query order: per-hotel override → global flag → default.
   - Pros: Supports both global toggles and tenant-specific experiments. Matches the user request exactly.
   - Cons: Slightly more complex UI (need to show global vs per-hotel scope, filter by scope). Need composite unique index on `(flag_key, hotel_id)`.
   - Effort: Medium

3. **Full feature flag service with segments/rules** — Separate `flag_definitions`, `flag_values`, and `flag_segments` tables. Support percentage rollouts, user segments, etc.
   - Pros: Enterprise-grade, supports complex targeting.
   - Cons: Massive overkill for current needs. Would require ~3x the code and UI complexity.
   - Effort: High

### Recommendation

**Approach 2 (per-hotel override with global fallback)** — it directly solves the stated problem ("toggle features per hotel or globally") without over-engineering. The schema is simple enough to implement in ~400 lines, and the UI pattern (table + inline toggle + modal + scope filter) is identical to the existing leads panel.

### Risks

- **RLS policy correctness**: The `feature_flags` table must allow service-role inserts (server actions) but block client inserts. Following the `audit_logs` pattern (`ENABLE ROW LEVEL SECURITY` + restrictive policies) is safe.
- **Unique constraint edge case**: Postgres unique index `UNIQUE(flag_key, hotel_id)` allows multiple NULLs by default (per SQL standard). We need `UNIQUE NULLS NOT DISTINCT` (Postgres 15+) or a partial unique index to prevent duplicate global flags. The project uses Supabase — Postgres version should support this, but we must verify.
- **Cache invalidation**: The `isFeatureEnabled()` function will query Supabase on every call. Without caching, this adds latency. For the first iteration, direct DB query is acceptable; a follow-up could add React Cache or Redis.
- **Migration ordering**: The migration must run before the server actions are deployed. In Coolify/self-hosted, migrations are manual — need to document the `supabase migration up` step.
- **Backward compatibility**: The existing `FEATURES` static object is used in `src/app/actions/onboarding.ts` line 335. The new `isFeatureEnabled()` should coexist, and existing env-based flags should continue working as defaults.

### Ready for Proposal

**Yes.** The codebase has clear patterns for every piece of this change:
- Auth guards: `requireSuperAdmin()` → reuse.
- Audit logging: `logAuditEvent()` with snapshot pattern → reuse.
- Server actions: `superadmin-leads.ts` pattern → replicate.
- DAL reads: `src/data/superadmin.ts` → extend.
- Client table: `LeadsTable.tsx` + `useLeads.ts` → replicate.
- UI modals: shadcn/ui `Dialog` + `Select` + `Input` → reuse.
- Testing: `superadmin-leads.test.ts` mock pattern → replicate.

The orchestrator should proceed to **sdd-propose** with the understanding that this is a medium-complexity, additive change (~400 lines) with zero breaking changes to existing functionality.
