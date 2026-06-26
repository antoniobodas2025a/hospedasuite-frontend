# Proposal: Superadmin System Health Dashboard

## Intent

The HospedaSuite superadmin has zero visibility into async infrastructure: event processing (QStash/EventEmitter), webhook delivery (Wompi platform/tenant), cron execution (process-renewals), and database health. When something fails, there's no dashboard — only `console.log` in Vercel logs. This proposal adds a system health monitoring page so platform operators can detect failures before tenants report them.

## Scope

### In Scope
- New page `/admin/system-health` with 5 sections: Events, Webhooks, Cron Jobs, Database, Storage
- Health check API `/api/admin/health` aggregating subsystem status
- Dashboard widgets on `/admin` showing critical health metrics (event failure rate, cron last-run)
- Event processing stats from `processed_events` table (processed count, failures, pending)
- Webhook delivery tracking via new `webhook_delivery_log` table
- Cron job execution log via new `cron_job_log` table
- Database health: connection info, table sizes, slow query detection

### Out of Scope
- Real-time alerting (Slack/email notifications)
- Sentry dashboard integration (Sentry has its own UI)
- Supabase Realtime connection monitoring
- Performance profiling or APM integration
- Historical trend charts (future iteration)

## Capabilities

### New Capabilities
- `system-health-monitoring`: Health check API, dashboard page, subsystem status widgets
- `webhook-delivery-tracking`: Webhook delivery logging and stats
- `cron-execution-logging`: Cron job run history and success/failure tracking

### Modified Capabilities
- None

## Approach

1. **Database tables**: Create `webhook_delivery_log` and `cron_job_log` migration tables to persist delivery/execution records (currently only `console.log` exists)
2. **Health check API**: `/api/admin/health` (GET) — queries `processed_events` for event stats, checks webhook/cron logs for recent failures, runs lightweight DB health query. Protected by superadmin role.
3. **Dashboard page**: `/admin/system-health` — server component with 5 card sections. Each section fetches its own data via the health API or direct Supabase queries.
4. **Admin homepage widgets**: Add 2-3 critical metrics to existing `/admin` page (event failure rate, cron last-run status) as a quick-glance row.
5. **Instrumentation**: Wrap existing webhook routes and cron handler to write to the new log tables (non-blocking inserts).

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/app/(super-admin)/admin/system-health/page.tsx` | New | System health dashboard page |
| `src/app/api/admin/health/route.ts` | New | Health check aggregation endpoint |
| `src/app/(super-admin)/admin/page.tsx` | Modified | Add health metrics row |
| `src/app/api/webhooks/platform/wompi/route.ts` | Modified | Log webhook delivery |
| `src/app/api/webhooks/tenant/wompi/route.ts` | Modified | Log webhook delivery |
| `src/app/api/cron/process-renewals/route.ts` | Modified | Log cron execution |
| `src/app/api/events/handler/route.ts` | Modified | Log handler failures to DB |
| `supabase/migrations/016_webhook_delivery_log.sql` | New | Webhook log table |
| `supabase/migrations/017_cron_job_log.sql` | New | Cron execution log table |
| `src/lib/health-checks.ts` | New | Health check utility functions |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Health check queries add DB load | Low | Use indexed queries, cache results (60s revalidate), no heavy joins |
| Log inserts slow down webhook/cron responses | Medium | Use non-blocking fire-and-forget inserts; don't await log writes in critical path |
| Sensitive data exposure in health endpoint | Low | Endpoint protected by superadmin auth check; no PII returned |
| Migration adds tables to production | Low | Standard Supabase migration, reversible with DROP TABLE |

## Rollback Plan

1. Remove `/admin/system-health` page and `/api/admin/health` route
2. Revert instrumentation changes in webhook/cron/event handler routes (remove log table inserts)
3. Drop `webhook_delivery_log` and `cron_job_log` tables via reverse migration
4. Remove health widget row from `/admin` page

## Dependencies

- Supabase service role key (already available via `supabaseAdmin`)
- Superadmin authorization (existing pattern from `superadmin-authorization` spec)

## Success Criteria

- [ ] `/admin/system-health` page loads with data from all 5 sections
- [ ] `/api/admin/health` returns structured status for events, webhooks, cron, DB
- [ ] Event processing stats show processed/failed counts from `processed_events` table
- [ ] Webhook delivery log captures Wompi platform/tenant webhook results
- [ ] Cron job log captures `process-renewals` execution with success/failure status
- [ ] Admin homepage shows at least 2 critical health metrics
- [ ] Health check endpoint responds in <500ms
- [ ] All new tables have appropriate indexes for time-range queries
