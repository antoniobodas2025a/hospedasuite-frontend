'use client';

import { useState, useEffect } from 'react';
import { Activity, Database, Zap, Globe } from 'lucide-react';
import Link from 'next/link';
import type { HealthReport } from '@/lib/health-checks';
import HealthStatusBadge, { type HealthStatus } from '@/components/super-admin/HealthStatusBadge';

// ── Status helpers ───────────────────────────────────────────────────────────

function getQuickDbStatus(report: HealthReport): HealthStatus {
  return report.database.ok ? 'healthy' : 'critical';
}

function getQuickEventStatus(report: HealthReport): HealthStatus {
  if (report.events.processed === 0 && report.events.failed === 0) return 'unknown';
  if (report.events.failed > 0) return 'critical';
  return 'healthy';
}

function getQuickWebhookStatus(report: HealthReport): HealthStatus {
  if (report.webhooks.total === 0) return 'unknown';
  if (report.webhooks.failureRate > 5) return 'critical';
  if (report.webhooks.failureRate > 0) return 'degraded';
  return 'healthy';
}

// ── Skeleton ────────────────────────────────────────────────────────────────

function SkeletonWidget() {
  return (
    <div className="bg-white/5 border border-white/10 p-4 rounded-[var(--radius-squircle-lg)]">
      <div className="h-3 w-20 bg-white/10 rounded animate-pulse mb-3" />
      <div className="h-6 w-16 bg-white/5 rounded animate-pulse mb-1" />
      <div className="h-3 w-24 bg-white/5 rounded animate-pulse" />
    </div>
  );
}

// ── Component ───────────────────────────────────────────────────────────────

/**
 * HealthWidgets — superadmin homepage quick-glance health indicators.
 *
 * Client component: fetches GET /api/admin/health on mount.
 * Shows skeleton placeholders while loading; error state on failure.
 * Wrapped in <Suspense> by the parent page for non-blocking render.
 */
export default function HealthWidgets() {
  const [data, setData] = useState<HealthReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/admin/health')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((report: HealthReport) => {
        if (!cancelled) setData(report);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Error state
  if (error || (!data && error !== null)) {
    return (
      <div className="bg-white/5 border border-white/10 p-6 rounded-[var(--radius-squircle-2xl)]">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="text-amber-400" size={18} />
          <h3 className="font-bold text-white text-lg">System Health</h3>
        </div>
        <p className="text-amber-400/80 text-sm">
          Health data unavailable &mdash; {error || 'Unknown error'}
        </p>
        <Link
          href="/admin/system-health"
          className="text-xs text-blue-400 hover:text-blue-300 mt-2 inline-block transition-colors"
        >
          View full dashboard &rarr;
        </Link>
      </div>
    );
  }

  // Loading skeleton (data is null, no error yet)
  if (!data) {
    return (
      <div className="bg-white/5 border border-white/10 p-6 rounded-[var(--radius-squircle-2xl)]">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-5 w-32 bg-white/10 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SkeletonWidget />
          <SkeletonWidget />
          <SkeletonWidget />
        </div>
      </div>
    );
  }

  // Normal state
  return (
    <div className="bg-white/5 border border-white/10 p-6 rounded-[var(--radius-squircle-2xl)]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="text-blue-400" size={18} />
          <h3 className="font-bold text-white text-lg">System Health</h3>
        </div>
        <Link
          href="/admin/system-health"
          className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
        >
          Full dashboard &rarr;
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Database */}
        <div className="bg-white/5 border border-white/10 p-4 rounded-[var(--radius-squircle-lg)]">
          <div className="flex items-center justify-between mb-2">
            <div className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-[var(--radius-squircle-md)]">
              <Database size={14} />
            </div>
            <HealthStatusBadge status={getQuickDbStatus(data)} />
          </div>
          <p className="text-[11px] font-bold text-white/50 uppercase tracking-widest mb-1">
            Database
          </p>
          <p className="text-lg font-bold text-white tabular-nums">
            {data.database.ok ? `${data.database.latency_ms}ms` : 'Down'}
          </p>
        </div>

        {/* Events */}
        <div className="bg-white/5 border border-white/10 p-4 rounded-[var(--radius-squircle-lg)]">
          <div className="flex items-center justify-between mb-2">
            <div className="p-1.5 bg-purple-500/10 text-purple-400 rounded-[var(--radius-squircle-md)]">
              <Zap size={14} />
            </div>
            <HealthStatusBadge status={getQuickEventStatus(data)} />
          </div>
          <p className="text-[11px] font-bold text-white/50 uppercase tracking-widest mb-1">
            Events (24h)
          </p>
          <p className="text-lg font-bold text-white tabular-nums">
            {data.events.processed} processed{data.events.failed > 0 ? ` / ${data.events.failed} failed` : ''}
          </p>
        </div>

        {/* Webhooks */}
        <div className="bg-white/5 border border-white/10 p-4 rounded-[var(--radius-squircle-lg)]">
          <div className="flex items-center justify-between mb-2">
            <div className="p-1.5 bg-blue-500/10 text-blue-400 rounded-[var(--radius-squircle-md)]">
              <Globe size={14} />
            </div>
            <HealthStatusBadge status={getQuickWebhookStatus(data)} />
          </div>
          <p className="text-[11px] font-bold text-white/50 uppercase tracking-widest mb-1">
            Webhooks (24h)
          </p>
          <p className="text-lg font-bold text-white tabular-nums">
            {100 - data.webhooks.failureRate}% success
          </p>
        </div>
      </div>
    </div>
  );
}
