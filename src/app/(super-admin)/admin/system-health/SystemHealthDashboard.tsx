'use client';

import {
  Database,
  Zap,
  Globe,
  Clock,
  HardDrive,
} from 'lucide-react';
import { type HealthReport, type CronJobStatus } from '@/lib/health-checks';
import HealthCard from '@/components/super-admin/HealthCard';
import HealthStatusBadge, { type HealthStatus } from '@/components/super-admin/HealthStatusBadge';

// ── Status helpers ───────────────────────────────────────────────────────────

function getDatabaseStatus(report: HealthReport): HealthStatus {
  if (!report.database.ok) return 'critical';
  return 'healthy';
}

function getEventStatus(report: HealthReport): HealthStatus {
  if (report.events.processed === 0 && report.events.failed === 0) return 'unknown';
  if (report.events.failed > report.events.processed * 0.1) return 'critical';
  if (report.events.failed > 0) return 'degraded';
  return 'healthy';
}

function getWebhookStatus(report: HealthReport): HealthStatus {
  if (report.webhooks.total === 0) return 'unknown';
  if (report.webhooks.failureRate > 10) return 'critical';
  if (report.webhooks.failureRate > 0) return 'degraded';
  return 'healthy';
}

function getCronJobStatus(job: CronJobStatus): HealthStatus {
  switch (job.lastStatus) {
    case 'failed':
    case 'timeout':
      return 'critical';
    case 'running':
      return 'degraded';
    case 'success':
      return 'healthy';
    default:
      return 'unknown';
  }
}

function getOverallCronStatus(jobs: CronJobStatus[]): HealthStatus {
  if (jobs.length === 0) return 'unknown';
  const hasFailed = jobs.some((j) => j.lastStatus === 'failed' || j.lastStatus === 'timeout');
  const hasRunning = jobs.some((j) => j.lastStatus === 'running');
  if (hasFailed) return 'critical';
  if (hasRunning) return 'degraded';
  return 'healthy';
}

function getStorageStatus(report: HealthReport): HealthStatus {
  if (!report.storage.ok) return 'critical';
  return 'healthy';
}

// ── Formatting helpers ──────────────────────────────────────────────────────

function formatDuration(ms: number | null): string {
  if (ms === null) return '\u2014';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatTimeAgo(iso: string | null): string {
  if (!iso) return 'never';
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// ── Section icons ───────────────────────────────────────────────────────────

const SectionIcon = ({ icon: Icon, className }: { icon: React.ElementType; className: string }) => (
  <div className={className}>
    <Icon size={18} />
  </div>
);

// ── Component ───────────────────────────────────────────────────────────────

export default function SystemHealthDashboard({ data }: { data: HealthReport }) {
  return (
    <div className="space-y-10 max-w-[1600px] mx-auto pb-20">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-white/10 pb-6">
        <div>
          <h2 className="text-3xl font-bold text-white mb-1">System Health</h2>
          <p className="text-white/50 text-sm">
            Infrastructure status snapshot &mdash;{' '}
            {new Date(data.timestamp).toLocaleString()}
          </p>
        </div>
      </header>

      {/* ── Database ── */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <SectionIcon
            icon={Database}
            className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-[var(--radius-squircle-md)]"
          />
          <h3 className="font-bold text-white text-lg">Database</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <HealthCard
            title="Connection"
            status={getDatabaseStatus(data)}
            metric={data.database.ok ? 'Connected' : 'Disconnected'}
            subtitle={
              data.database.ok
                ? `Latency: ${data.database.latency_ms}ms`
                : data.database.error ?? 'Unknown error'
            }
          />
          <HealthCard
            title="Connection Info"
            subtitle={
              data.database.ok
                ? 'PostgreSQL via Supabase — service role'
                : 'Database unreachable — check Supabase status'
            }
          />
        </div>
      </section>

      {/* ── Events ── */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <SectionIcon
            icon={Zap}
            className="p-1.5 bg-purple-500/10 text-purple-400 rounded-[var(--radius-squircle-md)]"
          />
          <h3 className="font-bold text-white text-lg">Event Processing</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <HealthCard
            title="Processed"
            status={getEventStatus(data)}
            metric={data.events.processed}
            subtitle="Last 24 hours"
          />
          <HealthCard
            title="Failed"
            metric={data.events.failed}
            subtitle={
              data.events.failed > 0
                ? `${data.events.failed} failures detected`
                : 'No failures'
            }
          />
          <HealthCard
            title="Pending"
            metric={data.events.pending}
            subtitle="Awaiting processing"
          />
        </div>
      </section>

      {/* ── Webhooks ── */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <SectionIcon
            icon={Globe}
            className="p-1.5 bg-blue-500/10 text-blue-400 rounded-[var(--radius-squircle-md)]"
          />
          <h3 className="font-bold text-white text-lg">Webhook Delivery</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <HealthCard
            title="Total Deliveries"
            metric={data.webhooks.total}
            subtitle="Last 24 hours"
          />
          <HealthCard
            title="Success Rate"
            status={getWebhookStatus(data)}
            metric={`${100 - data.webhooks.failureRate}%`}
            subtitle={
              data.webhooks.total > 0
                ? `${data.webhooks.failed} failed out of ${data.webhooks.total}`
                : 'No deliveries recorded'
            }
          />
          <HealthCard
            title="Failure Rate"
            metric={`${data.webhooks.failureRate}%`}
            subtitle={
              data.webhooks.failureRate > 10
                ? 'Above 10% threshold'
                : data.webhooks.total === 0
                  ? 'No data'
                  : 'Within acceptable limits'
            }
          />
        </div>

        {/* Recent webhook failures table */}
        {data.webhooks.recentFailures.length > 0 && (
          <HealthCard title="Recent Failures (last hour)">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-white/40 text-left text-xs uppercase tracking-wider">
                  <th className="pb-2 font-medium">Event Type</th>
                  <th className="pb-2 font-medium">Webhook</th>
                  <th className="pb-2 font-medium text-right">Time</th>
                </tr>
              </thead>
              <tbody className="text-white/70">
                {data.webhooks.recentFailures.map((f) => (
                  <tr key={f.id} className="border-t border-white/5">
                    <td className="py-2 font-mono text-xs">{f.event_type}</td>
                    <td className="py-2">
                      <span className="text-xs px-1.5 py-0.5 rounded bg-white/10 text-white/60">
                        {f.webhook_type}
                      </span>
                    </td>
                    <td className="py-2 text-right text-white/40 text-xs">
                      {formatTimeAgo(f.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </HealthCard>
        )}
      </section>

      {/* ── Cron Jobs ── */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <SectionIcon
            icon={Clock}
            className="p-1.5 bg-amber-500/10 text-amber-400 rounded-[var(--radius-squircle-md)]"
          />
          <h3 className="font-bold text-white text-lg">Cron Jobs</h3>
        </div>

        {data.cron.jobs.length === 0 ? (
          <HealthCard
            title="No cron jobs"
            subtitle="No cron job execution data available. Jobs will appear here after their first run."
          />
        ) : (
          <>
            {/* Summary card */}
            <div className="mb-4">
              <HealthCard
                title="Overall Status"
                status={getOverallCronStatus(data.cron.jobs)}
                metric={`${data.cron.jobs.length} job${data.cron.jobs.length > 1 ? 's' : ''}`}
                subtitle="Last 24 hours"
              />
            </div>

            {/* Per-job cards */}
            <div className="grid grid-cols-1 gap-4">
              {data.cron.jobs.map((job) => {
                const status = getCronJobStatus(job);
                return (
                  <HealthCard key={job.job_name} title={job.job_name} status={status}>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-white/40 text-xs uppercase tracking-wider mb-1">
                          Last Run
                        </p>
                        <p className="text-white font-medium tabular-nums">
                          {formatTimeAgo(job.lastRun)}
                        </p>
                      </div>
                      <div>
                        <p className="text-white/40 text-xs uppercase tracking-wider mb-1">
                          Status
                        </p>
                        <HealthStatusBadge
                          status={status}
                          label={
                            job.lastStatus === 'never_run'
                              ? 'Never Run'
                              : job.lastStatus.charAt(0).toUpperCase() + job.lastStatus.slice(1)
                          }
                        />
                      </div>
                      <div>
                        <p className="text-white/40 text-xs uppercase tracking-wider mb-1">
                          24h Runs
                        </p>
                        <p className="text-white font-medium tabular-nums">{job.totalRuns}</p>
                      </div>
                      <div>
                        <p className="text-white/40 text-xs uppercase tracking-wider mb-1">
                          Avg Duration
                        </p>
                        <p className="text-white font-medium tabular-nums">
                          {formatDuration(job.avgDuration)}
                        </p>
                      </div>
                    </div>
                    {/* Error message for failed jobs */}
                    {status === 'critical' && job.lastStatus !== 'never_run' && (
                      <p className="mt-3 text-xs text-red-400/80">
                        Last execution {job.lastStatus === 'timeout' ? 'timed out' : 'failed'}
                        {job.lastRun && ` at ${new Date(job.lastRun).toLocaleString()}`}
                      </p>
                    )}
                  </HealthCard>
                );
              })}
            </div>
          </>
        )}
      </section>

      {/* ── Storage ── */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <SectionIcon
            icon={HardDrive}
            className="p-1.5 bg-zinc-500/10 text-zinc-400 rounded-[var(--radius-squircle-md)]"
          />
          <h3 className="font-bold text-white text-lg">Storage</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <HealthCard
            title="R2 Connectivity"
            status={getStorageStatus(data)}
            metric={data.storage.ok ? 'Connected' : 'Disconnected'}
            subtitle={
              data.storage.error ?? 'Cloudflare R2 object storage'
            }
          />
          <HealthCard
            title="Storage Details"
            subtitle="Coming soon — bucket-level metrics and usage statistics"
          />
        </div>
      </section>
    </div>
  );
}
