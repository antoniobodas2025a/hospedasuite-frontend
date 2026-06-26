# Tasks: Superadmin Feature Flags

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~900+ |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Medium

## Phase 1: Foundation

- [x] 1.1 Add `feature_flags` Row/Insert/Update types to `src/types/database.ts` matching table schema
- [x] 1.2 Create migration `supabase/migrations/029_feature_flags.sql` — table, unique index, RLS, trigger
- [x] 1.3 Add `'feature_flag'` to `entity_type` union in `src/lib/audit-logger.ts`

## Phase 2: Core Logic

- [x] 2.1 Add `isFeatureEnabled(flagKey, hotelId?)` to `src/lib/feature-flags.ts` — eval chain: per-hotel → global → static FEATURES → false
- [x] 2.2 Add `getFeatureFlags()` + `FeatureFlagRow` interface to `src/data/superadmin.ts`
- [x] 2.3 Create `src/app/actions/superadmin-feature-flags.ts` — 5 server actions (list, create, update, delete, toggle), all guarded by `requireSuperAdmin()` + audited via `logAuditEvent()` with `entity_type: 'feature_flag'`
- [x] 2.4 Create `src/hooks/useFeatureFlags.ts` — optimistic state management matching `useLeads.ts` pattern (snapshot → server action → rollback on failure → `revalidatePath`)

## Phase 3: UI

- [x] 3.1 Create `src/app/(super-admin)/admin/feature-flags/page.tsx` — server component fetching via `getFeatureFlags()`, delegates to client table
- [x] 3.2 Create `FeatureFlagsTable.tsx` — table with inline toggles, create/edit modal, delete confirmation dialog, scope filter (All/Global/Per-Hotel)
- [x] 3.3 Add "Feature Flags" nav link with `ToggleLeft` icon to `src/app/(super-admin)/layout.tsx`

## Phase 4: Tests & Verify

- [x] 4.1 Write unit tests for `isFeatureEnabled()` — per-hotel precedence, global fallback, static fallback, unknown flag returns false, hotelId optionality
- [x] 4.2 Write unit tests for server actions — `requireSuperAdmin()` guard, `logAuditEvent()` call, duplicate rejection, toggle flips state
- [x] 4.3 Verify TypeScript compilation (`npx tsc --noEmit`), confirm `FEATURES` import in `onboarding.ts` unchanged via grep
