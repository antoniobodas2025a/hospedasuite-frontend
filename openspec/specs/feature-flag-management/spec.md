# Feature Flag Management Specification

## Purpose

Provide runtime CRUD, evaluation, and UI for feature flags with global and per-hotel scope. Replaces build-time `process.env` flag toggling with a database-backed system managed from the superadmin panel.

## Requirements

### Requirement: Feature Flags Schema

The system MUST provide a `feature_flags` table with columns: `id` (uuid, PK), `flag_key` (text, not null), `flag_name` (text, not null), `description` (text), `enabled` (boolean, not null, default false), `hotel_id` (uuid, nullable), `created_at` (timestamptz, not null), `updated_at` (timestamptz, not null). The table MUST have a composite unique index `UNIQUE NULLS NOT DISTINCT (flag_key, hotel_id)`. Row Level Security MUST be enabled — service-role has full access, anon/authenticated have no access.

#### Scenario: Table supports global flags

- GIVEN `hotel_id` is null
- WHEN a flag is inserted with `flag_key = 'wizard_wompi'`
- THEN the row is stored as a global flag

#### Scenario: Table supports per-hotel overrides

- GIVEN `hotel_id` is set to a valid hotel UUID
- WHEN a flag is inserted with the same `flag_key` as a global flag
- THEN the row is stored as a per-hotel override

#### Scenario: Duplicate global flag rejected

- GIVEN a global flag with `flag_key = 'wizard_wompi'` and `hotel_id = null` exists
- WHEN another insert attempts the same `flag_key` with `hotel_id = null`
- THEN the unique constraint rejects the insert

#### Scenario: Duplicate per-hotel override rejected

- GIVEN a per-hotel override exists for `flag_key = 'wizard_wompi'` and `hotel_id = 'abc-123'`
- WHEN another insert attempts the same combination
- THEN the unique constraint rejects the insert

#### Scenario: RLS blocks client writes

- GIVEN an authenticated non-superadmin user
- WHEN they attempt to INSERT into `feature_flags` via the Supabase client
- THEN RLS denies the operation

### Requirement: Feature Flag Evaluation

The system MUST export `isFeatureEnabled(flagKey: string, hotelId?: string): Promise<boolean>` from `src/lib/feature-flags.ts`. The evaluation chain MUST be: (1) per-hotel override if `hotelId` provided, (2) global flag if no per-hotel override found, (3) static `FEATURES` default as final fallback. The function MUST return `false` if no match is found at any level.

#### Scenario: Per-hotel override takes precedence

- GIVEN a global flag `wizard_wompi` is `enabled = true`
- AND a per-hotel override for hotel `abc-123` exists with `enabled = false`
- WHEN `isFeatureEnabled('wizard_wompi', 'abc-123')` is called
- THEN it returns `false`

#### Scenario: Global flag used when no per-hotel override

- GIVEN a global flag `wizard_wompi` is `enabled = true`
- AND no per-hotel override exists for hotel `xyz-789`
- WHEN `isFeatureEnabled('wizard_wompi', 'xyz-789')` is called
- THEN it returns `true`

#### Scenario: Static fallback when no DB flag exists

- GIVEN no global or per-hotel flag exists for key `new_feature`
- WHEN `isFeatureEnabled('new_feature')` is called
- THEN it returns the value from the static `FEATURES` object
- AND if `FEATURES` has no entry for that key, it returns `false`

#### Scenario: No hotelId skips per-hotel lookup

- GIVEN a global flag `wizard_wompi` is `enabled = true`
- AND a per-hotel override exists for hotel `abc-123` with `enabled = false`
- WHEN `isFeatureEnabled('wizard_wompi')` is called (no hotelId)
- THEN it returns `true` (global value, per-hotel not consulted)

#### Scenario: Unknown flag returns false

- GIVEN no flag exists in DB or static `FEATURES` for key `unknown_flag`
- WHEN `isFeatureEnabled('unknown_flag')` is called
- THEN it returns `false`

### Requirement: CRUD Server Actions

The system MUST provide server actions in `src/app/actions/superadmin-feature-flags.ts`: `getFeatureFlagsAction`, `createFeatureFlagAction`, `updateFeatureFlagAction`, `deleteFeatureFlagAction`, `toggleFeatureFlagAction`. Every action MUST call `await requireSuperAdmin()` before business logic. Every mutation action MUST call `logAuditEvent()` on success with `entity_type: 'feature_flag'`.

#### Scenario: List feature flags returns all records

- GIVEN feature flags exist in the database (global and per-hotel)
- WHEN a superadmin calls `getFeatureFlagsAction`
- THEN all flags are returned ordered by `created_at` descending

#### Scenario: Create feature flag persists and audits

- GIVEN a superadmin submits a new flag with `flag_key`, `flag_name`, `enabled`, and optional `hotel_id`
- WHEN `createFeatureFlagAction` executes
- THEN the flag is inserted into `feature_flags`
- AND `logAuditEvent()` is called with `action: 'feature_flag_created'`, `entity_type: 'feature_flag'`, `new_value` containing the created record, `old_value: null`

#### Scenario: Create rejects duplicate key

- GIVEN a global flag with `flag_key = 'wizard_wompi'` already exists
- WHEN a superadmin attempts to create another global flag with the same key
- THEN the action returns an error indicating the key already exists

#### Scenario: Update feature flag modifies and audits

- GIVEN a feature flag exists with `enabled = false`
- WHEN a superadmin updates it to `enabled = true` via `updateFeatureFlagAction`
- THEN the flag is updated in the database
- AND `logAuditEvent()` is called with `action: 'feature_flag_updated'`, `entity_type: 'feature_flag'`, `old_value` = previous state, `new_value` = updated state

#### Scenario: Delete feature flag removes and audits

- GIVEN a feature flag exists
- WHEN a superadmin calls `deleteFeatureFlagAction` with the flag ID
- THEN the flag is deleted from `feature_flags`
- AND `logAuditEvent()` is called with `action: 'feature_flag_deleted'`, `entity_type: 'feature_flag'`, `old_value` = full record snapshot, `new_value: null`

#### Scenario: Toggle flips enabled state

- GIVEN a feature flag exists with `enabled = true`
- WHEN a superadmin calls `toggleFeatureFlagAction` with the flag ID
- THEN the flag's `enabled` is set to `false`
- AND `logAuditEvent()` is called with `action: 'feature_flag_toggled'`, `entity_type: 'feature_flag'`, `old_value: { enabled: true }`, `new_value: { enabled: false }`

#### Scenario: Non-superadmin cannot call any action

- GIVEN a user with `role = 'owner'`
- WHEN they call any feature flag server action
- THEN `requireSuperAdmin()` throws
- AND no database operation occurs

### Requirement: Feature Flags Admin Page

The system MUST provide a page at `/admin/feature-flags` within the `(super-admin)` route group. The page MUST display a table of feature flags with inline toggle switches, a create/edit modal, and a scope filter (All / Global / Per-Hotel). The page MUST be a server component fetching data via `getFeatureFlags()` from the DAL, delegating mutations to a client component.

#### Scenario: Page displays all flags

- GIVEN feature flags exist in the database
- WHEN a superadmin navigates to `/admin/feature-flags`
- THEN a table displays all flags with columns: flag_name, flag_key, description, enabled, scope (Global/Per-Hotel), hotel_name (if per-hotel), created_at

#### Scenario: Inline toggle changes flag state

- GIVEN a flag is displayed with `enabled = false`
- WHEN a superadmin clicks the toggle switch
- THEN `toggleFeatureFlagAction` is called
- AND the table reflects the new state without a full page reload

#### Scenario: Create modal opens and submits

- GIVEN a superadmin clicks "Create Flag"
- WHEN they fill `flag_key`, `flag_name`, `description`, `enabled`, and optional `hotel_id` in the modal
- AND they submit
- THEN `createFeatureFlagAction` is called
- AND the new flag appears in the table
- AND the modal closes

#### Scenario: Edit modal pre-fills and updates

- GIVEN a superadmin clicks "Edit" on an existing flag
- WHEN the modal opens
- THEN all fields are pre-filled with current values
- AND saving calls `updateFeatureFlagAction` with the updated data

#### Scenario: Scope filter filters table rows

- GIVEN flags exist with both global and per-hotel scope
- WHEN the superadmin selects "Global" in the scope filter
- THEN only flags with `hotel_id = null` are displayed
- WHEN the superadmin selects "Per-Hotel"
- THEN only flags with `hotel_id IS NOT NULL` are displayed

#### Scenario: Delete confirmation required

- GIVEN a superadmin clicks "Delete" on a flag
- WHEN the confirmation dialog appears
- THEN it displays the flag's `flag_key` and `flag_name`
- AND deletion only proceeds on explicit confirmation

### Requirement: Sidebar Navigation

The system MUST add a "Feature Flags" link in the superadmin sidebar layout. The link MUST point to `/admin/feature-flags` and use an appropriate icon (e.g., `ToggleLeft` or `Flag`). The link MUST only be visible to authenticated superadmin users.

#### Scenario: Sidebar shows Feature Flags link

- GIVEN a superadmin views any page within the `(super-admin)` layout
- WHEN the sidebar renders
- THEN a "Feature Flags" link pointing to `/admin/feature-flags` is visible

#### Scenario: Link uses correct icon

- WHEN the sidebar renders the Feature Flags link
- THEN it displays a `ToggleLeft` or `Flag` icon alongside the text

### Requirement: Database Types

The system MUST include `feature_flags` in the `Database` type definition in `src/types/database.ts`. The type MUST match the table schema exactly, including nullable `hotel_id`.

#### Scenario: TypeScript types compile

- GIVEN the `feature_flags` type is added to `src/types/database.ts`
- WHEN TypeScript compilation runs
- THEN no type errors occur
- AND `isFeatureEnabled()` and server actions type-check against the definition

## Acceptance Criteria

| # | Criterion |
|---|-----------|
| 1 | `feature_flags` table exists with all specified columns and composite unique index |
| 2 | RLS enabled on `feature_flags`; service-role has full access, anon/authenticated blocked |
| 3 | `isFeatureEnabled(flagKey, hotelId?)` exported from `src/lib/feature-flags.ts` |
| 4 | Evaluation order: per-hotel → global → static `FEATURES` → `false` |
| 5 | All 5 server actions exist in `src/app/actions/superadmin-feature-flags.ts` |
| 6 | Every action calls `await requireSuperAdmin()` before business logic |
| 7 | Every mutation calls `logAuditEvent()` with `entity_type: 'feature_flag'` |
| 8 | `/admin/feature-flags` page renders with table, inline toggles, create/edit modal |
| 9 | Scope filter (All / Global / Per-Hotel) filters table rows correctly |
| 10 | "Feature Flags" link visible in superadmin sidebar |
| 11 | `feature_flags` type added to `src/types/database.ts` |
| 12 | Zero breaking changes to existing `FEATURES` usage in `onboarding.ts` |
| 13 | Unit tests pass for `isFeatureEnabled()` evaluation order and server action guards |
