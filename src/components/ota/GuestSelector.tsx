'use client';

import React, { useCallback } from 'react';
import { User, Users, Plus, Minus } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { springSnappy, springLayout } from '@/lib/mac2026/spring';
import { useTranslations } from 'next-intl';

// ── Presets ──────────────────────────────────────────────────────────────────

interface Preset {
  key: string;
  labelKey: string;
  value: number;
  icon: React.ElementType;
}

const PRESETS: Preset[] = [
  { key: 'solo', labelKey: 'ota.guestSelector.solo', value: 1, icon: User },
  { key: 'couple', labelKey: 'ota.guestSelector.couple', value: 2, icon: Users },
  { key: 'family', labelKey: 'ota.guestSelector.family', value: 3, icon: Users },
  { key: 'group', labelKey: 'ota.guestSelector.group', value: 5, icon: Users },
];

// ── Props ─────────────────────────────────────────────────────────────────────

export interface GuestSelectorProps {
  /** Current guest count */
  value: number;
  /** Called when guest count changes */
  onChange: (value: number) => void;
  /** Minimum guests (default 1) */
  min?: number;
  /** Maximum guests (default 20) */
  max?: number;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function GuestSelector({
  value,
  onChange,
  min = 1,
  max = 20,
}: GuestSelectorProps) {
  const t = useTranslations();
  const matchedPreset = PRESETS.find((p) => p.value === value);

  const decrement = useCallback(() => {
    if (value > min) onChange(value - 1);
  }, [value, min, onChange]);

  const increment = useCallback(() => {
    if (value < max) onChange(value + 1);
  }, [value, max, onChange]);

  return (
    <div className="flex flex-col gap-5 p-1" role="group" aria-label={t('ota.guestSelector.label')}>
      {/* Presets row */}
      <div className="flex items-center gap-2">
        {PRESETS.map((preset) => {
          const isActive = preset.value === value;
          const Icon = preset.icon;
          return (
            <motion.button
              key={preset.key}
              onClick={() => onChange(preset.value)}
              whileTap={{ scale: 0.95 }}
              transition={springSnappy()}
              className={cn(
                'relative shrink-0 flex items-center gap-2 px-3.5 py-2.5 rounded-[var(--radius-squircle-lg)] text-sm font-semibold transition-colors duration-200',
                isActive
                  ? 'text-primary-foreground shadow-md'
                  : 'bg-muted/60 text-muted-foreground border border-border/40 hover:border-brand-300 hover:text-foreground'
              )}
              aria-pressed={isActive}
              aria-label={`${t(preset.labelKey)}: ${preset.value} ${t('ota.guestSelector.guest', { count: preset.value })}`}
            >
              {isActive && (
                <motion.div
                  layoutId="guest-preset-active-bg"
                  className="absolute inset-0 bg-primary rounded-[var(--radius-squircle-lg)]"
                  transition={springLayout()}
                />
              )}
              <Icon size={16} className="relative z-10" />
              <span className="relative z-10">{t(preset.labelKey)}</span>
            </motion.button>
          );
        })}
      </div>

      {/* Counter row */}
      <div className="flex items-center justify-center gap-4">
        <motion.button
          onClick={decrement}
          disabled={value <= min}
          whileTap={{ scale: 0.85 }}
          transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          className={cn(
            'size-10 rounded-[var(--radius-squircle-lg)] flex items-center justify-center transition-all',
            value <= min
              ? 'bg-muted/40 text-muted-foreground/40 cursor-not-allowed'
              : 'bg-muted text-foreground border border-border/40 hover:border-brand-300 hover:bg-brand-50'
          )}
          aria-label={t('ota.guestSelector.decrease')}
        >
          <Minus size={18} />
        </motion.button>

        <motion.span
          key={value}
          initial={{ scale: 1.3, opacity: 0.5 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={springSnappy()}
          className="min-w-[3ch] text-center text-2xl font-black tabular-nums select-none"
          aria-live="polite"
          aria-label={`${value} ${t('ota.guestSelector.guest', { count: value })}`}
        >
          {value}
        </motion.span>

        <motion.button
          onClick={increment}
          disabled={value >= max}
          whileTap={{ scale: 0.85 }}
          transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          className={cn(
            'size-10 rounded-[var(--radius-squircle-lg)] flex items-center justify-center transition-all',
            value >= max
              ? 'bg-muted/40 text-muted-foreground/40 cursor-not-allowed'
              : 'bg-muted text-foreground border border-border/40 hover:border-brand-300 hover:bg-brand-50'
          )}
          aria-label={t('ota.guestSelector.increase')}
        >
          <Plus size={18} />
        </motion.button>
      </div>
    </div>
  );
}
