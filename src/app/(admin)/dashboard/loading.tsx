import React from 'react';

/**
 * Mac 2026 — Dashboard Skeleton
 * Uses glass primitives + squircle tokens for consistent loading state.
 * Next.js automatically shows this while server components load.
 */

function MetricCardSkeleton() {
  return (
    <div className="glass-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="h-4 w-24 bg-zinc-800 rounded-[var(--radius-squircle-md)] animate-pulse" />
        <div className="size-8 bg-zinc-800 rounded-[var(--radius-squircle-md)] animate-pulse" />
      </div>
      <div className="h-8 w-32 bg-zinc-800 rounded-[var(--radius-squircle-lg)] animate-pulse" />
      <div className="h-3 w-20 bg-zinc-800 rounded-[var(--radius-squircle-sm)] animate-pulse" />
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="glass-card overflow-hidden">
      <div className="p-6 border-b border-white/5">
        <div className="h-5 w-40 bg-zinc-800 rounded-[var(--radius-squircle-md)] animate-pulse" />
      </div>
      <div className="p-6 space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="size-10 bg-zinc-800 rounded-[var(--radius-squircle-lg)] animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-48 bg-zinc-800 rounded-[var(--radius-squircle-sm)] animate-pulse" />
              <div className="h-3 w-32 bg-zinc-800 rounded-[var(--radius-squircle-sm)] animate-pulse" />
            </div>
            <div className="h-6 w-20 bg-zinc-800 rounded-[var(--radius-squircle-md)] animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardLoading() {
  return (
    <div className="space-y-8 p-8">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-7 w-48 bg-zinc-800 rounded-[var(--radius-squircle-lg)] animate-pulse" />
        <div className="h-4 w-64 bg-zinc-800 rounded-[var(--radius-squircle-md)] animate-pulse" />
      </div>

      {/* Metric cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <MetricCardSkeleton key={i} />
        ))}
      </div>

      {/* Table skeleton */}
      <TableSkeleton />
    </div>
  );
}
