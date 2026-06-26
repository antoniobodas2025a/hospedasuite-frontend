# Cron Execution Logging Specification

## Purpose

Persist cron job execution results for the `process-renewals` cron into a `cron_job_log` table, replacing current `console.log`-only behavior. Enables superadmin operators to inspect execution history, detect failures, and verify cron reliability via the health API and dashboard.

## Requirements

### Requirement: Cron Job Log Table

The system MUST create a `cron_job_log` table with columns for: id, job_name, started_at, finished_at, duration_ms, status (success|failed|timeout), error_message (nullable, truncated to 1000 chars), records_processed, and created_at. The table MUST have an index on `created_at` for time-range queries and on `job_name` for filtering by job.

#### Scenario: Table exists after migration

- GIVEN migration `017_cron_job_log.sql` has been applied
- WHEN querying the database schema
- THEN `cron_job_log` table exists with all required columns and indexes

#### Scenario: Duration is computed correctly

- GIVEN a cron job starts at T and finishes at T+5s
- WHEN the log row is inserted
- THEN `duration_ms` = 5000

### Requirement: Log Cron Execution

The system MUST insert a row into `cron_job_log` at the start and update it at the end of each `process-renewals` cron execution (`/api/cron/process-renewals`). The log MUST capture: start time, end time, status, error message (if failed), and count of records processed. If the cron crashes before completion, the row MUST still exist with `status = 'failed'` and the error captured.

#### Scenario: Successful execution is logged

- GIVEN the `process-renewals` cron runs and completes successfully
- WHEN execution finishes
- THEN a row exists in `cron_job_log` with `status = 'success'`, duration, and records_processed count

#### Scenario: Failed execution is logged

- GIVEN the `process-renewals` cron throws an error during execution
- WHEN execution ends
- THEN a row exists with `status = 'failed'` and `error_message` containing the error (truncated to 1000 chars)

#### Scenario: Timeout is detected

- GIVEN the cron exceeds its maximum allowed execution time (30s)
- WHEN execution is terminated
- THEN a row exists with `status = 'timeout'`

### Requirement: Cron Stats in Health API

The health API MUST include cron execution stats: last run timestamp, last run status (success|failed|timeout), total executions in the last 24 hours, failure count, and average duration. Stats MUST be computed from `cron_job_log`.

#### Scenario: Health API reports cron stats

- GIVEN 4 cron runs in the last 24 hours, last one succeeded at 14:30, average duration 3.2s
- WHEN the health API is called
- THEN `cron.lastRun` = "2024-...", `cron.lastStatus` = "success", `cron.totalRuns` = 4, `cron.avgDuration` = 3200

#### Scenario: No runs recorded

- GIVEN the `cron_job_log` table is empty
- WHEN the health API is called
- THEN `cron.lastRun` = null, `cron.lastStatus` = "never_run"

### Requirement: Cron Section on Dashboard

The system health dashboard MUST display cron execution metrics: last run status with color indicator (green=success, red=failed, yellow=timeout), last run timestamp, total runs in 24h, and a table of recent executions with duration and status.

#### Scenario: Dashboard shows cron metrics

- GIVEN cron execution logs exist
- WHEN the system health dashboard loads
- THEN the Cron Jobs section displays last run status, timestamp, total runs, and recent execution history

#### Scenario: Failed last run is visually prominent

- GIVEN the last cron run failed
- WHEN the dashboard loads
- THEN the last run status displays with a red indicator and error message is visible

## Acceptance Criteria

| # | Criterion |
|---|-----------|
| 1 | `cron_job_log` table exists with required columns and indexes |
| 2 | `process-renewals` cron logs start and end of each execution |
| 3 | Successful runs log `status = 'success'` with duration and records count |
| 4 | Failed runs log `status = 'failed'` with truncated error message |
| 5 | Health API includes cron stats (last run, status, total, avg duration) |
| 6 | Dashboard Cron Jobs section shows metrics with color-coded status |
| 7 | Empty log table returns "never_run" status, not an error |
