import React from 'react';

/**
 * Mac 2026 — Channel Ecosistema Skeleton
 * Glass primitives + squircle tokens for consistent loading state.
 * Uses semantic theme colors (bg-muted) instead of hardcoded grays.
 */

function HotelCardSkeleton() {
  return (
    <div className="glass-card overflow-hidden">
      {/* Image placeholder */}
      <div className="w-full h-48 bg-muted animate-pulse" />
      {/* Content */}
      <div className="p-5 space-y-3">
        <div className="h-5 w-3/4 bg-muted rounded-[var(--radius-squircle-md)] animate-pulse" />
        <div className="h-4 w-1/2 bg-muted rounded-[var(--radius-squircle-sm)] animate-pulse" />
        <div className="h-3 w-full bg-muted rounded-[var(--radius-squircle-sm)] animate-pulse" />
        <div className="flex items-center justify-between pt-3 border-t border-border/50">
          <div className="h-6 w-24 bg-muted rounded-[var(--radius-squircle-md)] animate-pulse" />
          <div className="h-9 w-28 bg-muted rounded-[var(--radius-squircle-lg)] animate-pulse" />
        </div>
      </div>
    </div>
  );
}

function SearchBarSkeleton() {
  return (
    <div className="glass-pill p-3 flex items-center gap-4">
      <div className="flex-1 h-10 bg-muted rounded-full animate-pulse" />
      <div className="h-10 w-32 bg-muted rounded-full animate-pulse" />
    </div>
  );
}

export default function ChannelLoading() {
  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Search bar */}
        <SearchBarSkeleton />

        {/* Hotel cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <HotelCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </main>
  );
}
