'use client';

import React, { useCallback } from 'react';
import { User, Users, Plus, Minus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { springSnappy, springLayout, springBounce } from '@/lib/mac2026/spring';
import { SectionHeader } from '@/components/ui/glass';
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
      {/* Chunk 1: Quick presets (Ley de Miller — 4 items max) */}
      <section>
        <SectionHeader
          title="Rápido"
          subtitle={matchedPreset ? t(matchedPreset.labelKey) : undefined}
        />
        <div className="flex items-center gap-2 px-1">
          {PRESETS.map((preset) => {
            const isActive = preset.value === value;
            const Icon = preset.icon;
            return (
              <motion.button
                key={preset.key}
                onClick={() => onChange(preset.value)}
                whileTap={{ scale: 0.92 }}
                transition={springSnappy()}
                className={cn(
                  'relative shrink-0 flex items-center gap-2 px-3.5 py-2.5 rounded-[var(--radius-squircle-lg)] text-sm font-semibold transition-all duration-200 ring-1',
                  isActive
                    ? 'text-primary-foreground shadow-md ring-primary/20'
                    : 'bg-muted/40 text-muted-foreground ring-foreground/5 hover:ring-foreground/12 hover:bg-muted/70'
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
                <Icon size={15} className="relative z-10" strokeWidth={2} />
                <span className="relative z-10">{t(preset.labelKey)}</span>
              </motion.button>
            );
          })}
        </div>
      </section>

      {/* Chunk 2: Precision counter */}
      <section>
        <SectionHeader
          title="Ajuste fino"
          subtitle={`${min}–${max} ${t('ota.guestSelector.guest', { count: max })}`}
        />
        <div className="flex items-center justify-center gap-4 px-1">
          <motion.button
            onClick={decrement}
            disabled={value <= min}
            whileTap={value > min ? { scale: 0.85 } : {}}
            transition={springSnappy()}
            className={cn(
              'size-12 rounded-[var(--radius-squircle-lg)] flex items-center justify-center transition-all ring-1',
              value <= min
                ? 'bg-muted/30 text-muted-foreground/30 cursor-not-allowed ring-transparent'
                : 'bg-muted/60 text-foreground ring-foreground/5 hover:ring-foreground/12 hover:bg-muted'
            )}
            aria-label={t('ota.guestSelector.decrease')}
          >
            <Minus size={18} strokeWidth={2.5} />
          </motion.button>

          <motion.div
            key={value}
            initial={{ scale: 1.25, opacity: 0.6 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={springBounce()}
            className="min-w-[4ch] text-center select-none"
            aria-live="polite"
            aria-label={`${value} ${t('ota.guestSelector.guest', { count: value })}`}
          >
            <span className="text-3xl font-black tabular-nums text-foreground">{value}</span>
          </motion.div>

          <motion.button
            onClick={increment}
            disabled={value >= max}
            whileTap={value < max ? { scale: 0.85 } : {}}
            transition={springSnappy()}
            className={cn(
              'size-12 rounded-[var(--radius-squircle-lg)] flex items-center justify-center transition-all ring-1',
              value >= max
                ? 'bg-muted/30 text-muted-foreground/30 cursor-not-allowed ring-transparent'
                : 'bg-muted/60 text-foreground ring-foreground/5 hover:ring-foreground/12 hover:bg-muted'
            )}
            aria-label={t('ota.guestSelector.increase')}
          >
            <Plus size={18} strokeWidth={2.5} />
          </motion.button>
        </div>
      </section>
    </div>
  );
}
