/**
 * 🏥 System Health Checks — Shared library for dashboard + API
 *
 * Pure query functions that aggregate infrastructure health from
 * processed_events, webhook_delivery_log, cron_job_log, and database connectivity.
 * All functions use supabaseAdmin (service_role) to bypass RLS.
 *
 * Used by:
 * - src/app/api/admin/health/route.ts (REST API)
 * - src/app/(super-admin)/admin/system-health/page.tsx (Server Component)
 */

import { supabaseAdmin } from '@/lib/supabase-admin';

// ── Types ───────────────────────────────────────────────────────────────────

export type DatabaseHealth = {
  ok: boolean;
  latency_ms: number;
  error?: string;
};

export type EventHealth = {
  processed: number;
  failed: number;
  pending: number;
};

export type WebhookHealth = {
  total: number;
  failed: number;
  failureRate: number;
  recentFailures: RecentFailure[];
};

export type RecentFailure = {
  id: string;
  event_type: string;
  webhook_type: string;
  created_at: string;
};

export type CronJobStatus = {
  job_name: string;
  lastRun: string | null;
  lastStatus: string;
  totalRuns: number;
  avgDuration: number | null;
};

export type CronHealth = {
  jobs: CronJobStatus[];
};

export type StorageHealth = {
  ok: boolean;
  error?: string;
};

export type HealthReport = {
  timestamp: string;
  database: DatabaseHealth;
  events: EventHealth;
  webhooks: WebhookHealth;
  cron: CronHealth;
  storage: StorageHealth;
};

// ── Helpers ─────────────────────────────────────────────────────────────────

const HOURS_24_MS = 24 * 60 * 60 * 1000;
const HOURS_1_MS = 60 * 60 * 1000;

function sinceISO(hoursAgo: number): string {
  return new Date(Date.now() - hoursAgo).toISOString();
}

// ── Health Checks ───────────────────────────────────────────────────────────

/**
 * Verifies database connectivity with a lightweight SELECT 1.
 */
export async function checkDatabaseHealth(): Promise<DatabaseHealth> {
  const start = Date.now();
  try {
    const { error } = await supabaseAdmin.rpc('check_database_connectivity').maybeSingle();

    // Fallback: simple query if RPC doesn't exist
    if (error) {
      const { error: fallbackError } = await supabaseAdmin
        .from('hotels')
        .select('id')
        .limit(1)
        .maybeSingle();

      if (fallbackError) throw fallbackError;
    }

    return { ok: true, latency_ms: Date.now() - start };
  } catch (err: any) {
    return {
      ok: false,
      latency_ms: Date.now() - start,
      error: err?.message ?? 'Unknown database error',
    };
  }
}

/**
 * Aggregates event processing stats from the last 24 hours.
 * Queries processed_events filtered by processed_at and status.
 */
export async function checkEventHealth(): Promise<EventHealth> {
  const since = sinceISO(24); // last 24 hours
  try {
    const [
      { count: processed },
      { count: failed },
      { count: pending },
    ] = await Promise.all([
      supabaseAdmin
        .from('processed_events')
        .select('id', { count: 'exact', head: true })
        .gte('processed_at', since)
        .eq('status', 'processed'),
      supabaseAdmin
        .from('processed_events')
        .select('id', { count: 'exact', head: true })
        .gte('processed_at', since)
        .eq('status', 'failed'),
      supabaseAdmin
        .from('processed_events')
        .select('id', { count: 'exact', head: true })
        .gte('processed_at', since)
        .eq('status', 'pending'),
    ]);

    return {
      processed: processed ?? 0,
      failed: failed ?? 0,
      pending: pending ?? 0,
    };
  } catch {
    return { processed: 0, failed: 0, pending: 0 };
  }
}

/**
 * Aggregates webhook delivery stats from the last 24 hours.
 * Queries webhook_delivery_log.
 */
export async function checkWebhookHealth(): Promise<WebhookHealth> {
  const since = sinceISO(24);
  try {
    const [totalRes, failedRes, recentRes] = await Promise.all([
      supabaseAdmin
        .from('webhook_delivery_log')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', since),
      supabaseAdmin
        .from('webhook_delivery_log')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', since)
        .eq('status', 'failed'),
      supabaseAdmin
        .from('webhook_delivery_log')
        .select('id, event_type, webhook_type, created_at')
        .gte('created_at', sinceISO(1)) // last hour
        .eq('status', 'failed')
        .order('created_at', { ascending: false })
        .limit(5),
    ]);

    const total = totalRes.count ?? 0;
    const failed = failedRes.count ?? 0;

    return {
      total,
      failed,
      failureRate: total > 0 ? Math.round((failed / total) * 100) : 0,
      recentFailures: (recentRes.data ?? []).map((r: any) => ({
        id: r.id,
        event_type: r.event_type ?? 'unknown',
        webhook_type: r.webhook_type,
        created_at: r.created_at,
      })),
    };
  } catch {
    return { total: 0, failed: 0, failureRate: 0, recentFailures: [] };
  }
}

/**
 * Fetches last execution status for each cron job from cron_job_log.
 */
export async function checkCronHealth(): Promise<CronHealth> {
  try {
    const { data, error } = await supabaseAdmin.rpc('get_cron_job_stats');

    if (!error && data) {
      return { jobs: data as CronJobStatus[] };
    }

    // Fallback: manual aggregation
    const { data: jobs } = await supabaseAdmin
      .from('cron_job_log')
      .select('job_name');

    const uniqueJobs = [...new Set((jobs ?? []).map((j: any) => j.job_name))];

    const jobStats: CronJobStatus[] = [];

    for (const jobName of uniqueJobs) {
      const results: any[] = await Promise.all([
          supabaseAdmin
            .from('cron_job_log')
            .select('started_at, status')
            .eq('job_name', jobName)
            .order('started_at', { ascending: false })
            .limit(1),
          supabaseAdmin
            .from('cron_job_log')
            .select('id', { count: 'exact', head: true })
            .eq('job_name', jobName)
            .gte('started_at', sinceISO(24)),
          supabaseAdmin
            .from('cron_job_log')
            .select('duration_ms')
            .eq('job_name', jobName)
            .gte('started_at', sinceISO(24))
            .not('duration_ms', 'is', null),
        ]);

      const lastRun = results[0]?.data as any[] | null;
      const totalRuns = (results[1]?.count ?? 0) as number;
      const avgData = results[2]?.data as any[] | null;

      const last = lastRun?.[0] ?? null;
      const durations = (avgData ?? []).map((d: any) => d.duration_ms).filter((d: any) => d != null);
      const avgDuration =
        durations.length > 0
          ? Math.round(durations.reduce((a: number, b: number) => a + b, 0) / durations.length)
          : null;

      jobStats.push({
        job_name: jobName as string,
        lastRun: last?.started_at ?? null,
        lastStatus: last?.status ?? 'never_run',
        totalRuns: totalRuns ?? 0,
        avgDuration,
      });
    }

    return { jobs: jobStats };
  } catch {
    return { jobs: [] };
  }
}

/**
 * Verifies R2 storage connectivity using a HEAD request to the bucket endpoint.
 */
export async function checkStorageHealth(): Promise<StorageHealth> {
  try {
    const endpoint = process.env.R2_ENDPOINT;
    const bucket = process.env.R2_BUCKET_NAME || 'hospedasuite-media';

    if (!endpoint) {
      return { ok: false, error: 'R2_ENDPOINT not configured' };
    }

    const url = `${endpoint}/${bucket}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
    });
    clearTimeout(timeout);

    // R2 returns 200 or 403 (if bucket exists but no list permission)
    // Both indicate connectivity is OK — the bucket exists and is reachable
    if (response.ok || response.status === 403) {
      return { ok: true };
    }

    return { ok: false, error: `R2 responded with status ${response.status}` };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Storage connectivity check failed';
    return { ok: false, error: message };
  }
}

/**
 * Aggregates all health checks into a single report.
 * Each subsystem check runs independently — one failure does not block others.
 */
export async function getSystemHealth(): Promise<HealthReport> {
  const [database, events, webhooks, cron, storage] = await Promise.all([
    checkDatabaseHealth(),
    checkEventHealth(),
    checkWebhookHealth(),
    checkCronHealth(),
    checkStorageHealth(),
  ]);

  return {
    timestamp: new Date().toISOString(),
    database,
    events,
    webhooks,
    cron,
    storage,
  };
}
