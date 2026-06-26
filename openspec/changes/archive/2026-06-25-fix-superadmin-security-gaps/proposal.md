# Proposal: Fix Superadmin Security Gaps

## Intent

Eliminate critical authorization vulnerabilities in the superadmin panel: role name inconsistency between middleware and server actions, missing auth guards on destructive server actions, and a hardcoded email whitelist that bypasses the `user_roles` table. These gaps allow any authenticated user to execute privileged operations if they discover the endpoints.

## Scope

### In Scope
- Unify role string to a single canonical value across all files
- Add `verifySuperAdmin()` guard to all 5 actions in `super-admin.ts`
- Replace hardcoded email check in `hq.ts` with `user_roles` table query
- Create a shared `requireSuperAdmin()` utility to prevent future drift

### Out of Scope
- Changes to RLS policies (separate change)
- Audit logging infrastructure (separate change)
- Frontend route guards (middleware already handles this)

## Capabilities

### New Capabilities
- `superadmin-authorization`: Centralized role verification utility and consistent guard pattern for all superadmin server actions

### Modified Capabilities
- None (no existing spec-level behavior changes — this is a security hardening of existing capabilities)

## Approach

1. **Create shared guard** in `src/lib/auth-guards.ts`:
   - `requireSuperAdmin()`: verifies authenticated user has `role = 'superadmin'` in `user_roles` table; throws on failure
   - Uses `createClient()` (SSR) for cookie-based session, queries `user_roles` table

2. **Unify role string**: canonical value is `'superadmin'` (matches middleware and `hotel-context.ts`). Update `hotel-admin.ts` and `manual-payments.ts` to use `'superadmin'` instead of `'super_admin'`.

3. **Guard `super-admin.ts`**: add `await requireSuperAdmin()` at the top of `createHotelAction`, `godModeAccess`, `updateTenantAction`, `forceChangePasswordAction`, `deleteHotelAction`.

4. **Replace email check in `hq.ts`**: remove `SUPER_ADMIN_EMAILS` array and `verifySuperAdmin()`, replace with `requireSuperAdmin()` from the shared guard.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/lib/auth-guards.ts` | New | Shared `requireSuperAdmin()` guard utility |
| `src/app/actions/super-admin.ts` | Modified | Add auth guard to all 5 actions |
| `src/app/actions/hotel-admin.ts` | Modified | Fix role string `'super_admin'` -> `'superadmin'` (3 occurrences) |
| `src/app/actions/manual-payments.ts` | Modified | Fix role string `'super_admin'` -> `'superadmin'` (3 occurrences) |
| `src/app/actions/hq.ts` | Modified | Replace email whitelist with `requireSuperAdmin()` |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Existing superadmin user has `role = 'super_admin'` in DB | Medium | Add a migration to normalize existing rows to `'superadmin'` |
| Breaking change if external systems depend on `'super_admin'` string | Low | Audit DB seeds, seeds, and any external integrations before merge |
| `requireSuperAdmin()` duplicates middleware logic | Low | Middleware protects routes; guards protect server actions (defense in depth). Both are needed. |

## Rollback Plan

1. Revert the commit — all changes are additive (new guard) or string replacements
2. If a DB migration normalizing roles is included, provide a down migration that restores `'super_admin'`
3. No data is modified by the code changes themselves

## Dependencies

- None — uses existing `user_roles` table and Supabase client patterns already in the codebase

## Success Criteria

- [ ] All 6 files use the single canonical role string `'superadmin'`
- [ ] Zero server actions in `super-admin.ts` are callable without superadmin role verification
- [ ] `hq.ts` queries `user_roles` instead of hardcoded emails
- [ ] `grep -r "super_admin" src/` returns zero matches
- [ ] `grep -r "SUPER_ADMIN_EMAILS" src/` returns zero matches
