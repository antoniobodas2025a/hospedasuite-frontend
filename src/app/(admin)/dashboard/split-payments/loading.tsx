import React from 'react';

function KPISkeleton() {
  return (
    <div className="glass-card p-7 space-y-6">
      <div className="flex items-center justify-between">
        <div className="size-12 bg-zinc-800 rounded-[var(--radius-squircle-2xl)] animate-pulse" />
      </div>
      <div className="space-y-2">
        <div className="h-3 w-24 bg-zinc-800 rounded-[var(--radius-squircle-sm)] animate-pulse" />
        <div className="h-8 w-32 bg-zinc-800 rounded-[var(--radius-squircle-md)] animate-pulse" />
      </div>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="glass-card overflow-hidden border border-border">
      <div className="p-4 border-b border-border bg-muted/30">
        <div className="grid grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-3 bg-zinc-800 rounded-[var(--radius-squircle-sm)] animate-pulse" />
          ))}
        </div>
      </div>
      <div className="p-4 space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="grid grid-cols-6 gap-4">
            {[1, 2, 3, 4, 5, 6].map((j) => (
              <div key={j} className="h-4 bg-zinc-800 rounded-[var(--radius-squircle-sm)] animate-pulse" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SplitPaymentsLoading() {
  return (
    <div className="space-y-[var(--space-breath)] max-w-7xl mx-auto pb-20">
      {/* Header skeleton */}
      <div className="flex items-center gap-3">
        <div className="size-12 bg-zinc-800 rounded-[var(--radius-squircle-xl)] animate-pulse" />
        <div className="space-y-2">
          <div className="h-7 w-48 bg-zinc-800 rounded-[var(--radius-squircle-lg)] animate-pulse" />
          <div className="h-4 w-64 bg-zinc-800 rounded-[var(--radius-squircle-md)] animate-pulse" />
        </div>
      </div>

      {/* KPIs skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-[var(--space-focus)]">
        {[1, 2, 3].map((i) => (
          <KPISkeleton key={i} />
        ))}
      </div>

      {/* Table skeleton */}
      <TableSkeleton />
    </div>
  );
}
