'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const roundedMap = {
  none: 'rounded-none',
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
  full: 'rounded-full',
} as const;

export interface SkeletonLoaderProps {
  width?: string | number;
  height?: string | number;
  rounded?: keyof typeof roundedMap;
  className?: string;
}

/**
 * Reusable skeleton loader with a shimmer effect.
 *
 * The shimmer is implemented with a moving gradient overlay so it does not
 * require any external CSS animation files.
 */
export function SkeletonLoader({
  width = '100%',
  height = '1rem',
  rounded = 'md',
  className,
}: SkeletonLoaderProps) {
  const sizeStyle: React.CSSProperties = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  };

  return (
    <motion.div
      data-testid="skeleton-loader"
      aria-busy="true"
      aria-label="Loading"
      className={cn('relative overflow-hidden bg-muted', roundedMap[rounded], className)}
      style={sizeStyle}
    >
      <motion.div
        data-testid="skeleton-shimmer"
        className="pointer-events-none absolute inset-0 h-full w-full bg-gradient-to-r from-transparent via-white/40 to-transparent"
        style={{ transform: 'skewX(-20deg)' }}
        initial={{ translateX: '-100%' }}
        animate={{ translateX: '100%' }}
        transition={{
          duration: 1.2,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
    </motion.div>
  );
}
