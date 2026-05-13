import React from 'react';

/**
 * Mac 2026 — Hotel Detail Skeleton
 * Glass primitives + squircle tokens for consistent loading state.
 * Uses semantic theme colors (bg-muted) instead of hardcoded grays.
 */

export default function HotelLoading() {
  return (
    <main className="min-h-screen bg-background">
      {/* Hero skeleton — matches gallery container */}
      <div className="w-full h-[45vh] min-h-[300px] md:h-[500px] lg:h-[550px] bg-muted animate-pulse rounded-b-[var(--radius-squircle-3xl)]" />

      <div className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Logo + Title */}
          <div className="flex items-start gap-4">
            <div className="size-16 md:size-20 rounded-[var(--radius-squircle-2xl)] bg-muted animate-pulse shrink-0" />
            <div className="space-y-3 flex-1">
              <div className="h-8 w-3/4 bg-muted rounded-[var(--radius-squircle-lg)] animate-pulse" />
              <div className="h-4 w-1/3 bg-muted rounded-[var(--radius-squircle-sm)] animate-pulse" />
            </div>
          </div>

          {/* Description */}
          <div className="glass-card p-8 space-y-2">
            <div className="h-4 w-full bg-muted rounded-[var(--radius-squircle-sm)] animate-pulse" />
            <div className="h-4 w-5/6 bg-muted rounded-[var(--radius-squircle-sm)] animate-pulse" />
            <div className="h-4 w-2/3 bg-muted rounded-[var(--radius-squircle-sm)] animate-pulse" />
          </div>

          {/* Amenities */}
          <div className="glass-card p-6 md:p-8">
            <div className="h-5 w-1/3 bg-muted rounded-[var(--radius-squircle-md)] animate-pulse mb-4" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-12 bg-muted rounded-[var(--radius-squircle-lg)] animate-pulse" />
              ))}
            </div>
          </div>

          {/* Rooms section header */}
          <div className="h-8 w-1/2 bg-muted rounded-[var(--radius-squircle-md)] animate-pulse" />

          {/* Room cards */}
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="glass-card p-6 space-y-3">
                <div className="h-5 w-1/2 bg-muted rounded-[var(--radius-squircle-md)] animate-pulse" />
                <div className="h-4 w-3/4 bg-muted rounded-[var(--radius-squircle-sm)] animate-pulse" />
                <div className="h-10 w-full bg-muted rounded-[var(--radius-squircle-lg)] animate-pulse" />
              </div>
            ))}
          </div>
        </div>

        {/* Booking widget skeleton */}
        <div className="glass-card p-6 space-y-4">
          <div className="h-6 w-20 bg-muted rounded-[var(--radius-squircle-md)] animate-pulse" />
          <div className="h-10 w-full bg-muted rounded-[var(--radius-squircle-lg)] animate-pulse" />
          <div className="h-10 w-full bg-muted rounded-[var(--radius-squircle-lg)] animate-pulse" />
          <div className="h-12 w-full bg-muted rounded-[var(--radius-squircle-xl)] animate-pulse" />
          <div className="h-4 w-3/4 bg-muted rounded-[var(--radius-squircle-sm)] animate-pulse" />
        </div>
      </div>
    </main>
  );
}
