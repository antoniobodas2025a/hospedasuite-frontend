'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { springSnappy } from '@/lib/mac2026/spring';
import { cn } from '@/lib/utils';

/**
 * Mac 2026 — Glass Tooltip
 * Progressive disclosure of contextual help.
 * Appears on hover/focus with glassmorphism styling.
 */

interface GlassTooltipProps {
  content: string;
  children: React.ReactNode;
  className?: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
}

export function GlassTooltip({
  content,
  children,
  className,
  side = 'top',
  delay = 0,
}: GlassTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setTimeout(() => setIsOpen(true), delay)}
      onMouseLeave={() => setIsOpen(false)}
      onFocus={() => setIsOpen(true)}
      onBlur={() => setIsOpen(false)}
    >
      {children}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: side === 'top' ? 4 : side === 'bottom' ? -4 : 0, x: side === 'left' ? 4 : side === 'right' ? -4 : 0 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: side === 'top' ? 4 : side === 'bottom' ? -4 : 0, x: side === 'left' ? 4 : side === 'right' ? -4 : 0 }}
            transition={springSnappy()}
            className={cn(
              'absolute z-50 max-w-xs pointer-events-none',
              positionClasses[side],
              className,
            )}
          >
            <div className="glass-card !rounded-[var(--radius-squircle-md)] px-3 py-2 text-xs text-zinc-300 shadow-lg shadow-black/30 ring-1 ring-inset ring-white/5">
              {content}
            </div>
            {/* Arrow */}
            <div
              className={cn(
                'absolute size-2 bg-zinc-900/80 border-white/10 rotate-45',
                side === 'top' && 'border-b border-r -bottom-1 left-1/2 -translate-x-1/2',
                side === 'bottom' && 'border-t border-l -top-1 left-1/2 -translate-x-1/2',
                side === 'left' && 'border-t border-r -right-1 top-1/2 -translate-y-1/2',
                side === 'right' && 'border-b border-l -left-1 top-1/2 -translate-y-1/2',
              )}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
