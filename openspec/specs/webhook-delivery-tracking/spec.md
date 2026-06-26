# Webhook Delivery Tracking Specification

## Purpose

Persist webhook delivery results for Wompi platform and tenant webhooks into a `webhook_delivery_log` table, replacing current `console.log`-only behavior. Enables superadmin operators to inspect delivery history, detect failures, and compute delivery success rates via the health API.

## Requirements

### Requirement: Webhook Delivery Log Table

The system MUST create a `webhook_delivery_log` table with columns for: id, webhook_type (platform|tenant), event_type, payload_hash, delivery_status (success|failed|pending), response_code, response_body (truncated), created_at, and retry_count. The table MUST have an index on `created_at` for time-range queries and on `webhook_type` for filtering.

#### Scenario: Table exists after migration

- GIVEN migration `016_webhook_delivery_log.sql` has been applied
- WHEN querying the database schema
- THEN `webhook_delivery_log` table exists with all required columns and indexes

#### Scenario: Time-range query uses index

- GIVEN 10,000 log rows exist spanning 30 days
- WHEN querying for logs in the last 24 hours
- THEN the query plan uses the `created_at` index

### Requirement: Log Webhook Delivery (Fire-and-Forget)

The system MUST insert a row into `webhook_delivery_log` after each Wompi webhook is processed — for both the platform route (`/api/webhooks/platform/wompi`) and the tenant route (`/api/webhooks/tenant/wompi`). The insert MUST be non-blocking: the webhook response MUST NOT await the log write. If the log insert fails, the webhook response MUST still succeed.

#### Scenario: Platform webhook logs delivery

- GIVEN a Wompi platform webhook is received and processed
- WHEN the response is sent to Wompi
- THEN a row is inserted into `webhook_delivery_log` with `webhook_type = 'platform'`

#### Scenario: Tenant webhook logs delivery

- GIVEN a Wompi tenant webhook is received and processed
- WHEN the response is sent to the tenant
- THEN a row is inserted into `webhook_delivery_log` with `webhook_type = 'tenant'`

#### Scenario: Log failure does not break webhook response

- GIVEN the log insert fails (e.g., DB timeout)
- WHEN a webhook is processed
- THEN the webhook response still returns HTTP 200 to the caller

#### Scenario: Log insert is non-blocking

- GIVEN a webhook response is being prepared
- WHEN the log insert is triggered
- THEN the response is NOT delayed waiting for the insert to complete

### Requirement: Webhook Stats in Health API

The health API MUST include webhook delivery stats: total deliveries in the last 24 hours, failure count, failure rate percentage, and the 5 most recent failed deliveries with timestamps. Stats MUST be computed from `webhook_delivery_log`.

#### Scenario: Health API reports webhook stats

- GIVEN 50 deliveries in the last 24 hours, 3 failed
- WHEN the health API is called
- THEN `webhooks.total` = 50, `webhooks.failed` = 3, `webhooks.failureRate` = 6%

#### Scenario: Recent failures included

- GIVEN 2 webhook failures occurred in the last hour
- WHEN the health API is called
- THEN `webhooks.recentFailures` contains 2 entries with timestamps and event types

### Requirement: Webhook Section on Dashboard

The system health dashboard MUST display webhook delivery metrics: total deliveries, success rate, failure count, and a table of recent deliveries with status badges. The section MUST allow filtering by webhook type (platform vs tenant).

#### Scenario: Dashboard shows webhook metrics

- GIVEN webhook delivery logs exist
- WHEN the system health dashboard loads
- THEN the Webhooks section displays total, success rate, failure count, and recent deliveries

#### Scenario: Filter by webhook type

- GIVEN both platform and tenant webhook logs exist
- WHEN the user filters by "platform"
- THEN only platform webhook deliveries are shown

## Acceptance Criteria

| # | Criterion |
|---|-----------|
| 1 | `webhook_delivery_log` table exists with required columns and indexes |
| 2 | Platform webhook route inserts a log row after processing |
| 3 | Tenant webhook route inserts a log row after processing |
| 4 | Log insert is fire-and-forget — does not block or delay webhook response |
| 5 | Log insert failure does not cause webhook response to fail |
| 6 | Health API includes webhook stats (total, failed, rate, recent failures) |
| 7 | Dashboard Webhooks section shows metrics and recent deliveries |
