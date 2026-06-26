'use client';

import HealthStatusBadge, { type HealthStatus } from './HealthStatusBadge';

type HealthCardProps = {
  title: string;
  metric?: string | number;
  subtitle?: string;
  status?: HealthStatus;
  loading?: boolean;
  error?: string;
  children?: React.ReactNode;
};

/**
 * HealthCard — reusable metric card for system health dashboard sections.
 *
 * Displays a title, status badge, metric value, and optional subtitle.
 * Supports loading skeletons and error states.
 * Accepts children for custom content (tables, lists, additional details).
 */
export default function HealthCard({
  title,
  metric,
  subtitle,
  status,
  loading = false,
  error,
  children,
}: HealthCardProps) {
  return (
    <div className="bg-white/5 border border-white/10 p-6 rounded-[var(--radius-squircle-2xl)]">
      {/* Header: title + status badge */}
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-bold text-white text-sm uppercase tracking-widest">{title}</h4>
        {status && <HealthStatusBadge status={status} />}
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          <div className="h-8 bg-white/10 rounded animate-pulse w-24" />
          <div className="h-4 bg-white/5 rounded animate-pulse w-40" />
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="text-red-400 text-sm space-y-1">
          <p className="font-medium">Error</p>
          <p className="text-red-400/70 text-xs">{error}</p>
        </div>
      )}

      {/* Normal content */}
      {!loading && !error && (
        <>
          {metric !== undefined && (
            <p className="text-3xl font-display font-bold text-white tracking-tight tabular-nums mb-1">
              {metric}
            </p>
          )}
          {subtitle && <p className="text-xs text-white/40">{subtitle}</p>}
          {children && <div className="mt-4">{children}</div>}
        </>
      )}
    </div>
  );
}
