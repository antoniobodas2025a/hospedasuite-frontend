# System Health Monitoring Specification

## Purpose

Provide superadmin visibility into async infrastructure: event processing, webhook delivery, cron execution, database health, and storage. Aggregates status via a health check API, renders on a dedicated dashboard page, and quick-glance widgets on the admin homepage.

## Requirements

### Requirement: Health Check API

The system MUST expose a GET endpoint at `/api/admin/health` that returns aggregated status for all monitored subsystems. The endpoint MUST be protected by `requireSuperAdmin()` and MUST respond in under 500ms.

#### Scenario: Superadmin receives full health status

- GIVEN an authenticated superadmin
- WHEN GET `/api/admin/health`
- THEN HTTP 200 with JSON containing status for events, webhooks, cron, database, and storage

#### Scenario: Non-superadmin is rejected

- GIVEN a user with role `owner` or no `user_roles` entry
- WHEN GET `/api/admin/health`
- THEN HTTP 403

#### Scenario: Unauthenticated request is rejected

- GIVEN no active session
- WHEN GET `/api/admin/health`
- THEN HTTP 401

#### Scenario: Response time under 500ms

- GIVEN all subsystems are operational
- WHEN `/api/admin/health` is called
- THEN response completes in under 500ms

### Requirement: Event Processing Stats

The system MUST query `processed_events` to compute: processed count, failure count, and pending count for the last 24 hours. The health API MUST include these under an `events` key.

#### Scenario: Stats reflect current data

- GIVEN 100 processed, 5 failed, 10 pending in last 24h
- WHEN the health API is called
- THEN `events.processed` = 100, `events.failed` = 5, `events.pending` = 10

#### Scenario: Zero counts when no events exist

- GIVEN `processed_events` is empty
- WHEN the health API is called
- THEN all event counts return 0

### Requirement: System Health Dashboard Page

The system MUST provide a page at `/admin/system-health` (superadmin-only) with 5 card sections: Events, Webhooks, Cron Jobs, Database, Storage. The page MUST be a server component.

#### Scenario: Superadmin views dashboard

- GIVEN an authenticated superadmin navigates to `/admin/system-health`
- WHEN the page loads
- THEN 5 cards render with data

#### Scenario: Non-superadmin denied

- GIVEN a user with role `owner`
- WHEN navigating to `/admin/system-health`
- THEN access is denied

#### Scenario: Recent failures prominent

- GIVEN webhook failures in the last hour
- WHEN the dashboard loads
- THEN Webhooks section shows failure count and timestamps

### Requirement: Admin Homepage Health Widgets

The system MUST display event failure rate (%) and cron last-run status on the `/admin` homepage. Widgets MUST be non-blocking — slow health API MUST NOT delay page render.

#### Scenario: Homepage shows critical metrics

- GIVEN an authenticated superadmin loads `/admin`
- THEN a row displays event failure rate and last cron run status with timestamp

#### Scenario: Widgets do not block page render

- GIVEN the health API takes >2s
- WHEN the admin homepage loads
- THEN the rest of the page renders; widgets show loading state

### Requirement: Database Health Check

The system MUST report database connection status, table sizes for key tables, and a lightweight slow-query indicator. Queries MUST be indexed, no heavy joins.

#### Scenario: Database health reports connection and sizes

- GIVEN the database is operational
- WHEN the health API is called
- THEN `database.connected` = true with table sizes

#### Scenario: Database connection failure is reported

- GIVEN the database connection is down
- WHEN the health API is called
- THEN `database.connected` = false with error message

## Acceptance Criteria

| # | Criterion |
|---|-----------|
| 1 | `/api/admin/health` returns 200 with structured JSON for superadmin |
| 2 | `/api/admin/health` returns 403 for non-superadmin, 401 for unauthenticated |
| 3 | Health API response time < 500ms |
| 4 | `/admin/system-health` renders 5 sections with live data |
| 5 | `/admin/system-health` is inaccessible to non-superadmin |
| 6 | Admin homepage shows event failure rate and cron last-run status |
| 7 | Health widgets are non-blocking |
| 8 | All health queries use indexed columns, no heavy joins |
