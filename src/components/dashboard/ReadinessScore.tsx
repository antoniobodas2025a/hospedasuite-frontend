'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { springBounce } from '@/lib/mac2026/spring';
import { cn } from '@/lib/utils';

// ─── Interface ──────────────────────────────────────────────────

interface ReadinessScoreProps {
  score: number;
  completedCount: number;
  totalCount: number;
  isGoLiveReady: boolean;
  planLabel: string;
}

// ─── SVG Constants ──────────────────────────────────────────────

const SIZE = 200;
const STROKE_WIDTH = 12;
const RADIUS = (SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// ─── Component ──────────────────────────────────────────────────

export default function ReadinessScore({
  score,
  completedCount,
  totalCount,
  isGoLiveReady,
  planLabel,
}: ReadinessScoreProps) {
  const offset = CIRCUMFERENCE - (score / 100) * CIRCUMFERENCE;

  // Color: green at 100%, amber at 50-99%, red below 50%
  const strokeColor = isGoLiveReady
    ? '#10b981' // emerald-500
    : score >= 50
      ? '#f59e0b' // amber-500
      : '#ef4444'; // red-500

  const glowColor = isGoLiveReady
    ? 'rgba(16, 185, 129, 0.3)'
    : score >= 50
      ? 'rgba(245, 158, 11, 0.3)'
      : 'rgba(239, 68, 68, 0.3)';

  return (
    <div className="flex flex-col items-center gap-5 font-poppins">
      {/* SVG Circular Gauge */}
      <motion.div
        className="relative"
        style={{ width: SIZE, height: SIZE }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={springBounce()}
        whileHover={{ scale: 1.03 }}
      >
        {/* Glow effect behind the gauge */}
        <div
          className="absolute inset-0 rounded-full blur-2xl opacity-20"
          style={{ background: `radial-gradient(circle, ${glowColor}, transparent 70%)` }}
        />

        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="transform -rotate-90 relative z-10"
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
            transition={springBounce()}
          />
        </svg>

        {/* Center: Score + Plan Label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className="text-5xl font-bold tabular-nums text-foreground tracking-tighter"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ ...springBounce(), delay: 0.2 }}
          >
            {score}
            <span className="text-2xl text-muted-foreground">%</span>
          </motion.span>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
            {planLabel}
          </span>
        </div>
      </motion.div>

      {/* Completed / Total Counter */}
      <motion.div
        className="text-center"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springBounce(), delay: 0.4 }}
      >
        <div className="flex items-center gap-2 px-4 py-2 bg-muted/30 border border-border rounded-full">
          <span className="text-sm text-muted-foreground">
            <span className="font-bold text-foreground text-lg">{completedCount}</span>
            <span className="mx-1">de</span>
            <span className="font-bold text-foreground text-lg">{totalCount}</span>
          </span>
          <span className="text-xs text-muted-foreground">completados</span>
        </div>

        {isGoLiveReady && (
          <motion.p
            className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest mt-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            ¡Listo para publicar!
          </motion.p>
        )}
      </motion.div>
    </div>
  );
}
