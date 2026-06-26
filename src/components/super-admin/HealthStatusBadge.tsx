'use client';

import { cn } from '@/lib/utils';

export type HealthStatus = 'healthy' | 'degraded' | 'critical' | 'unknown';

const STATUS_CONFIG: Record<HealthStatus, { label: string; dotClass: string; textClass: string }> = {
  healthy: { label: 'Healthy', dotClass: 'bg-emerald-500', textClass: 'text-emerald-400' },
  degraded: { label: 'Degraded', dotClass: 'bg-amber-500', textClass: 'text-amber-400' },
  critical: { label: 'Critical', dotClass: 'bg-red-500', textClass: 'text-red-400' },
  unknown: { label: 'Unknown', dotClass: 'bg-zinc-500', textClass: 'text-zinc-400' },
};

/**
 * HealthStatusBadge — inline status indicator with colored dot + label.
 *
 * healthy  → green dot
 * degraded → amber dot
 * critical → red dot with animated pulse
 * unknown  → gray dot
 */
export default function HealthStatusBadge({
  status,
  label,
}: {
  status: HealthStatus;
  label?: string;
}) {
  const config = STATUS_CONFIG[status];
  const displayLabel = label ?? config.label;

  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium', config.textClass)}>
      {status === 'critical' ? (
        <span className="relative flex h-2.5 w-2.5">
          <span
            className={cn(
              'absolute inline-flex h-full w-full rounded-full opacity-75 bg-red-500',
              'animate-ping',
            )}
          />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
        </span>
      ) : (
        <span className={cn('inline-block h-2.5 w-2.5 rounded-full', config.dotClass)} />
      )}
      {displayLabel}
    </span>
  );
}
