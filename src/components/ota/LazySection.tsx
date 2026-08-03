'use client';

import React from 'react';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';

interface LazySectionProps {
  children: React.ReactNode;
  /** Content shown while the section is outside the viewport. */
  placeholder?: React.ReactNode;
  /** Margin around the viewport to start loading early. */
  rootMargin?: string;
  /** Optional className for the wrapper element. */
  className?: string;
  /** Minimum height for the wrapper to prevent layout shift while placeholder is visible. */
  minHeight?: string | number;
}

/**
 * LazySection — renders heavy below-the-fold components only when they approach the viewport.
 *
 * Uses an IntersectionObserver hook so reviews, comparison tables, and other
 * non-critical sections do not block initial render or inflate the initial bundle.
 */
export default function LazySection({
  children,
  placeholder,
  rootMargin = '200px',
  className,
  minHeight,
}: LazySectionProps) {
  const { ref, hasIntersected } = useIntersectionObserver<HTMLDivElement>({ rootMargin, once: true });

  return (
    <div ref={ref} className={className} style={{ minHeight }}>
      {hasIntersected ? children : placeholder}
    </div>
  );
}
