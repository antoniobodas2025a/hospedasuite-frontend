# Design: Superadmin System Health Dashboard

## Technical Approach

Server component dashboard (`/admin/system-health`) + REST health API (`/api/admin/health`) + fire-and-forget instrumentation in existing webhook/cron routes. Both dashboard and API share query logic via `src/lib/health-checks.ts`. Admin homepage widgets use React Suspense streaming for non-blocking render.

## Architecture Decisions

| Decision | Options | Choice | Rationale |
|----------|---------|--------|-----------|
| Fire-and-forget log inserts | a) `await`, b) `.then().catch()` without await, c) QStash-delayed | **b) `.then().catch()`** | Non-blocking per spec. `.catch()` swallows errors so log failures never break webhook responses. |
| Dashboard data fetching | a) HTTP call to health API, b) Shared lib functions imported directly, c) Server Actions | **b) Shared lib functions** | Server component eliminates HTTP overhead. Same `health-checks.ts` used by both page and API route. |
| Event failure tracking | a) Upsert to `processed_events`, b) Separate failure table, c) Only modify `isEventProcessed` filter | **a) Upsert with `status='failed'` then update on retry** | Change `isEventProcessed` to filter `status='processed'`. On failure, insert `status='failed'` (QStash retries re-execute). On success, upsert to `status='processed'`. |
| Migration numbering | a) 016/017 as proposal, b) Next available (027/028) | **b) 027/028** | 016–026 already exist in `supabase/migrations/`. Use next sequential. |

## Data Flow

### Webhook Delivery Logging (fire-and-forget)
```
Wompi Webhook ──→ Process payment ──→ Return 200 to Wompi
                       │
                       └──→ supabaseAdmin.from('webhook_delivery_log').insert({...})
                              .then(...).catch(...)   ← never awaited
```

### Cron Execution Logging (start/end)
```
Cron invoked ──→ INSERT cron_job_log (status='running') ──→ process subs
                    ├── success ──→ UPDATE status='success', duration, records
                    └── failure ──→ UPDATE status='failed', error_message
```

### Event Handler Failure Tracking
```
QStash event ──→ isEventProcessed? (status='processed' only)
  ├── Yes ──→ 200 "duplicate"
  └── No  ──→ Execute handlers
        ├── Success ──→ UPSERT status='processed' ──→ 200
        └── Failure ──→ INSERT status='failed' ──→ 500 (QStash retries)
              └── Retry ──→ isEventProcessed? finds 'failed' row → NO → re-execute
                    └── Success ──→ UPSERT status='processed' ──→ 200
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/027_webhook_delivery_log.sql` | Create | `webhook_delivery_log` table with indexes on `created_at`, `webhook_type` |
| `supabase/migrations/028_cron_job_log.sql` | Create | `cron_job_log` table with indexes on `created_at`, `job_name` |
| `src/lib/health-checks.ts` | Create | Shared query functions: `getEventStats()`, `getWebhookStats()`, `getCronStats()`, `checkDatabase()` |
| `src/app/api/admin/health/route.ts` | Create | GET endpoint, `requireSuperAdmin()` guard, aggregates subsystems |
| `src/app/(super-admin)/admin/system-health/page.tsx` | Create | Server component, 5 card sections, imports `health-checks.ts` |
| `src/app/(super-admin)/admin/page.tsx` | Modify | Add `<Suspense><HealthWidgets /></Suspense>` row below Row 2 |
| `src/components/super-admin/HealthWidgets.tsx` | Create | Client component, fetches `/api/admin/health`, renders metric cards |
| `src/components/super-admin/system-health/*.tsx` | Create | Presentational cards: EventsCard, WebhooksCard, CronJobsCard, DatabaseCard, StorageCard |
| `src/app/api/webhooks/platform/wompi/route.ts` | Modify | Add fire-and-forget insert to `webhook_delivery_log` after processing (line ~270) |
| `src/app/api/webhooks/tenant/wompi/route.ts` | Modify | Add fire-and-forget insert to `webhook_delivery_log` after processing (line ~144) |
| `src/app/api/cron/process-renewals/route.ts` | Modify | Wrap in try-catch with `cron_job_log` start/end inserts |
| `src/app/api/events/handler/route.ts` | Modify | On handler failure, insert `status='failed'`; filter `isEventProcessed` by `status='processed'`; use `upsert()` on success |

## Interfaces / Contracts

### Migration: 027_webhook_delivery_log.sql
```sql
CREATE TABLE IF NOT EXISTS webhook_delivery_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_type VARCHAR(20) NOT NULL CHECK (webhook_type IN ('platform', 'tenant')),
  event_type VARCHAR(50),
  payload_hash VARCHAR(64),
  delivery_status VARCHAR(20) NOT NULL DEFAULT 'success'
    CHECK (delivery_status IN ('success', 'failed', 'pending')),
  response_code SMALLINT,
  response_body TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  retry_count SMALLINT DEFAULT 0
);
CREATE INDEX idx_webhook_log_created ON webhook_delivery_log (created_at DESC);
CREATE INDEX idx_webhook_log_type ON webhook_delivery_log (webhook_type);
```

### Migration: 028_cron_job_log.sql
```sql
CREATE TABLE IF NOT EXISTS cron_job_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name VARCHAR(100) NOT NULL,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  duration_ms INTEGER,
  status VARCHAR(20) NOT NULL DEFAULT 'running'
    CHECK (status IN ('success', 'failed', 'timeout', 'running')),
  error_message TEXT,
  records_processed INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_cron_log_created ON cron_job_log (created_at DESC);
CREATE INDEX idx_cron_log_job ON cron_job_log (job_name);
```

### Health API Response (`GET /api/admin/health`)
```typescript
type HealthResponse = {
  timestamp: string;
  events: { processed: number; failed: number };
  webhooks: { total: number; failed: number; failureRate: number; recentFailures: RecentFailure[] };
  cron: { lastRun: string | null; lastStatus: string; totalRuns: number; avgDuration: number | null };
  database: { connected: boolean; error?: string };
};
```

Auth: 200 for superadmin, 401 unauthenticated, 403 non-superadmin. Target latency <500ms.

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Unit | `health-checks.ts` query functions | Mock `supabaseAdmin`, verify SQL shape and date ranges. `src/lib/__tests__/health-checks.test.ts` |
| Integration | Health API auth + response shape | Mock `requireSuperAdmin`, test 200/401/403. `src/__tests__/unit/health-api.test.ts` |
| Integration | Cron/webhook log instrumentation | Verify log inserts fire with correct values, verify fire-and-forget doesn't block. |
| E2E | Dashboard page loads 5 sections | Playwright: navigate as superadmin, assert card titles visible. |
| E2E | Admin homepage widgets render | Playwright: assert health metric row appears, skeleton resolves. |

## Rollback

1. Remove `027_webhook_delivery_log` and `028_cron_job_log` migrations (reverse DROP TABLE)
2. Revert instrumentation in webhook/cron/event routes
3. Remove `system-health/` page, API route, `health-checks.ts`, widgets
4. No data migration needed — log tables are append-only

## Open Questions

- [ ] Storage section: no spec requirements exist. Placeholder UI with "Coming soon" acceptable for MVP?
- [ ] `pending` event count: requires QStash API integration (out of scope). Omitted from MVP — shown as 0 with note.
- [ ] Cron timeout (30s) detection: Vercel Hobby plan has 10s limit; Pro 60s. Use 25s soft timeout in cron handler to log `status='timeout'` before Vercel kills it.
