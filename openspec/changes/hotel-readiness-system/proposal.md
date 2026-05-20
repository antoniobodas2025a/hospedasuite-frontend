# Proposal: Hotel Readiness System

## Intent

Hotels complete onboarding without being ready to sell — no validation ensures rooms have prices, policies are set, or communication channels work. We need a persistent, plan-aware readiness system that validates and guides hotels before selling.

## Scope

### In Scope
- `/dashboard/readiness` page with checklist and score (0–100%)
- Server-side `getReadinessStatus()`: hotel info, rooms with prices, check-in/out times, payment config, OTA connections, booking policies, communication channels
- Plan-specific requirement tiers (Starter / Pro / Enterprise)
- "Go Live" button when all requirements met
- Dashboard home widget
- Playwright E2E suite + bootstrap

### Out of Scope
- Onboarding, booking CRUD, native OTA APIs, SMS

## Capabilities

### New Capabilities
- `readiness-dashboard`: Checklist page + score widget, per-plan requirements
- `readiness-validation-api`: Server-side validation from existing data
- `go-live-gate`: Enables "Go Live" based on readiness per plan
- `e2e-testing`: Playwright setup + readiness flow tests

### Modified Capabilities
- `dashboard-navigation`: Sidebar link + home widget

## Approach

**Computed, not stored** — no new DB columns needed.

1. **Validation** (`src/lib/readiness-validation.ts`): Pure functions, plan-aware.
2. **DAL** (`src/data/readiness.ts`): Server-only, Auth → Authorization → Execute.
3. **UI** (`/dashboard/readiness`): Checklist, per-item status, circular score, "Go Live" CTA.
4. **Dashboard**: Score widget on home.
5. **E2E**: Playwright tests for incomplete/complete flows + plan requirements.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/lib/readiness-validation.ts` | New | Pure validation logic, plan-aware |
| `src/data/readiness.ts` | New | Server-only DAL |
| `src/app/actions/readiness.ts` | New | Server actions |
| `src/app/(admin)/dashboard/readiness/page.tsx` | New | Readiness page |
| `src/components/dashboard/ReadinessChecklist.tsx` | New | Checklist component |
| `src/components/dashboard/ReadinessScore.tsx` | New | Score component |
| `src/app/(admin)/dashboard/page.tsx` | Modified | Add widget |
| `src/app/(admin)/dashboard/layout.tsx` | Modified | Add nav item |
| `e2e/` + `playwright.config.ts` | New | Playwright setup + tests |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Over-strict readiness blocks hotels | Medium | Lenient thresholds + bypass flag |
| Plan guard drift from `plan-guard.ts` | Medium | Share `PLAN_LIMITS` config |
| Playwright CI needs infra | Low | Run locally first |

## Rollback Plan

Revert commits. No migration needed — readiness is computed. Remove nav link and widget if issues arise; validation library remains harmless.

## Dependencies

- Existing hotel/room schema (all fields present)
- `src/config/saas-plans.ts` (shared plan config)
- Playwright (`npm install -D @playwright/test`)

## Success Criteria

- [ ] Readiness page shows accurate checklist per plan tier
- [ ] "Go Live" disabled until all requirements met
- [ ] E2E tests pass against hospedasuite.com
- [ ] TypeScript compiles with zero errors
- [ ] Existing hotels see correct readiness state (backward compatible)
