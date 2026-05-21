'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { springGentle } from '@/lib/mac2026/spring';
import { cn } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';

// ─── Interface ──────────────────────────────────────────────────

interface ReadinessMiniWidgetProps {
  score: number;
  planLabel: string;
  hotelId: string;
}

// ─── SVG Constants ──────────────────────────────────────────────

const SIZE = 80;
const STROKE_WIDTH = 7;
const RADIUS = (SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// ─── Component ──────────────────────────────────────────────────

export default function ReadinessMiniWidget({
  score,
  planLabel,
  hotelId,
}: ReadinessMiniWidgetProps) {
  const offset = CIRCUMFERENCE - (score / 100) * CIRCUMFERENCE;

  // Color: green at 100%, amber at 50-99%, red below 50%
  const strokeColor =
    score >= 100
      ? '#10b981' // emerald-500
      : score >= 50
        ? '#f59e0b' // amber-500
        : '#ef4444'; // red-500

  return (
    <motion.div
      className={cn(
        'group relative flex flex-col items-center gap-3 p-4',
        'bg-muted/20 border border-border',
        'rounded-[var(--radius-squircle-2xl)]',
        'hover:border-foreground/10 hover:bg-muted/30',
        'transition-colors',
        'font-poppins',
      )}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springGentle()}
      whileHover={{ y: -2 }}
    >
      {/* Mini circular gauge */}
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="transform -rotate-90"
        >
          {/* Background track */}
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={STROKE_WIDTH}
          />
          {/* Animated progress arc */}
          <motion.circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={strokeColor}
            strokeWidth={STROKE_WIDTH}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            initial={{ strokeDashoffset: CIRCUMFERENCE }}
            animate={{ strokeDashoffset: offset }}
            transition={springGentle()}
          />
        </svg>

        {/* Center score */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.span
            className="text-xl font-bold tabular-nums text-foreground"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ ...springGentle(), delay: 0.15 }}
          >
            {score}
          </motion.span>
        </div>
      </div>

      {/* Plan label + link */}
      <div className="text-center">
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          {planLabel}
        </p>
        <Link
          href={`/dashboard/readiness`}
          className={cn(
            'inline-flex items-center gap-1 mt-1.5',
            'text-[11px] font-semibold text-foreground/70',
            'group-hover:text-foreground transition-colors',
          )}
        >
          Ver readiness
          <ArrowRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </motion.div>
  );
}
