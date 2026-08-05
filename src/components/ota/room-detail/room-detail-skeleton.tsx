'use client';

import React from 'react';
import { SkeletonLoader } from '@/components/ui/SkeletonLoader';

// ============================================================================
// ROOM DETAIL SKELETON — LOADING state
// Mirrors the DETAIL layout proportions so the transition feels seamless.
// ============================================================================

export function RoomDetailSkeleton() {
  return (
    <div data-testid="room-detail-skeleton" className="space-y-6 p-4 lg:p-6">
      {/* Header */}
      <div className="space-y-2">
        <SkeletonLoader width="40%" height={14} rounded="md" />
        <SkeletonLoader width="70%" height={32} rounded="lg" />
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Left column — gallery grid skeleton matching DETAIL proportions */}
        <div data-testid="skeleton-gallery" className="space-y-2">
          <div className="grid grid-cols-2 gap-2 rounded-[var(--radius-squircle-2xl)] overflow-hidden">
            <SkeletonLoader className="col-span-2 aspect-[4/3]" rounded="none" />
            <SkeletonLoader className="aspect-[4/3]" rounded="none" />
            <SkeletonLoader className="aspect-[4/3]" rounded="none" />
          </div>
        </div>

        {/* Right column — info skeleton */}
        <div className="space-y-5">
          {/* Calendar skeleton */}
          <div data-testid="skeleton-calendar" className="space-y-3">
            <SkeletonLoader width="100%" height={48} rounded="lg" />
            <SkeletonLoader width="100%" height={280} rounded="xl" />
            <div className="flex gap-2">
              <SkeletonLoader width={80} height={16} rounded="md" />
              <SkeletonLoader width={80} height={16} rounded="md" />
              <SkeletonLoader width={80} height={16} rounded="md" />
            </div>
          </div>

          {/* Price skeleton */}
          <div data-testid="skeleton-price" className="space-y-3">
            <SkeletonLoader width="60%" height={20} rounded="md" />
            <SkeletonLoader width="40%" height={36} rounded="lg" />
            <SkeletonLoader width="100%" height={56} rounded="xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
