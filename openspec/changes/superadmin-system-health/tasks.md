# Tasks: Superadmin System Health

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~720 (new) + ~40 (modifications) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (Foundation) → PR 2 (UI) → PR 3 (Instrumentation) |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Migrations + health-checks lib + Health API + tests | PR 1 | ~320 lines. Foundation — everything depends on this. Base = feature/tracker branch. |
| 2 | Dashboard page + card components + homepage widgets + E2E | PR 2 | ~385 lines. Depends on PR 1 for API endpoint and lib. Base = feature/tracker branch. |
| 3 | Webhook/cron/event instrumentation + integration tests | PR 3 | ~100 lines. Depends on PR 1 for migrations. Base = feature/tracker branch. |

## Phase 1: Foundation (PR 1)

- [x] 1.1 Create `supabase/migrations/027_webhook_delivery_log.sql` with columns, CHECK constraints, and indexes per design
- [x] 1.2 Create `supabase/migrations/028_cron_job_log.sql` with columns, CHECK constraints, and indexes per design
- [x] 1.3 Create `src/lib/health-checks.ts` — `getEventStats()`, `getWebhookStats()`, `getCronStats()`, `checkDatabase()` + `HealthResponse` type
- [x] 1.4 Create `src/app/api/admin/health/route.ts` — GET handler with `requireSuperAdmin()`, aggregates all subsystems, responds <500ms
- [x] 1.5 Write `src/lib/__tests__/health-checks.test.ts` — unit tests for all 4 query functions with mocked supabaseAdmin
- [x] 1.6 Write `src/__tests__/unit/health-api.test.ts` — integration tests for auth (200/401/403) and response shape

## Phase 2: Dashboard UI (PR 2)

- [x] 2.1 Create reusable UI components: `HealthStatusBadge.tsx` (healthy/degraded/critical with pulse animation), `HealthCard.tsx` (metric card with loading/error states), `SystemHealthDashboard.tsx` (5-section client component) under `src/components/super-admin/` and `src/app/(super-admin)/admin/system-health/`
- [x] 2.2 Create `src/app/(super-admin)/admin/system-health/page.tsx` — server component, imports `health-checks.ts`, renders 5 card sections via `SystemHealthDashboard`
- [x] 2.3 Create `src/components/super-admin/HealthWidgets.tsx` — client component, fetches `/api/admin/health`, renders database/events/webhooks mini-cards with skeleton loading
- [x] 2.4 Modify `src/app/(super-admin)/admin/page.tsx` — add `<Suspense><HealthWidgets /></Suspense>` row below Row 2
- [x] 2.5 Write Playwright E2E: dashboard page loads 5 sections with data (`e2e/superadmin-system-health.spec.ts`)
- [x] 2.6 Write Playwright E2E: admin homepage shows health widgets, skeleton during loading (`e2e/superadmin-system-health.spec.ts`)
- [x] 2.7 Add "System Health" nav link to `src/app/(super-admin)/layout.tsx` with Activity icon

## Phase 3: Instrumentation (PR 3)

- [x] 3.1 Modify `src/app/api/webhooks/platform/wompi/route.ts` — add fire-and-forget `.then().catch()` insert to `webhook_delivery_log` after processing
- [x] 3.2 Modify `src/app/api/webhooks/tenant/wompi/route.ts` — add fire-and-forget `.then().catch()` insert to `webhook_delivery_log` after processing
- [x] 3.3 Modify `src/app/api/cron/process-renewals/route.ts` — wrap in try-catch: insert `status='running'` at start, update to `success`/`failed` with duration at end
- [x] 3.4 Modify `src/app/api/events/handler/route.ts` — filter `isEventProcessed` by `status='processed'`; insert `status='failed'` on handler error; upsert `status='processed'` on success
- [x] 3.5 Write integration tests: verify log inserts fire with correct values, fire-and-forget doesn't block webhook/cron response
