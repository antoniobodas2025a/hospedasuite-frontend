'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Building2,
  BedDouble,
  ScrollText,
  Wallet,
  MessageCircle,
  Globe,
  Sparkles,
  Users,
  CheckCircle2,
  XCircle,
  MinusCircle,
} from 'lucide-react';
import { springGentle } from '@/lib/mac2026/spring';
import { cn } from '@/lib/utils';
import type { ReadinessItem, ReadinessCategory } from '@/lib/readiness-validation';

// ─── Interface ──────────────────────────────────────────────────

interface ReadinessChecklistProps {
  items: ReadinessItem[];
  className?: string;
}

// ─── Category Metadata ──────────────────────────────────────────

const CATEGORY_META: Record<
  ReadinessCategory,
  { label: string; icon: React.ElementType; order: number }
> = {
  hotel: { label: 'Hotel', icon: Building2, order: 0 },
  rooms: { label: 'Habitaciones', icon: BedDouble, order: 1 },
  policies: { label: 'Políticas', icon: ScrollText, order: 2 },
  payment: { label: 'Pagos', icon: Wallet, order: 3 },
  communication: { label: 'Comunicación', icon: MessageCircle, order: 4 },
  ota: { label: 'OTA', icon: Globe, order: 5 },
  pro_features: { label: 'Funciones Pro', icon: Sparkles, order: 6 },
  team: { label: 'Equipo', icon: Users, order: 7 },
};

// ─── Status Visuals ─────────────────────────────────────────────

const STATUS_ICON: Record<string, React.ElementType> = {
  complete: CheckCircle2,
  incomplete: XCircle,
  na: MinusCircle,
};

const STATUS_COLOR: Record<string, string> = {
  complete: 'text-emerald-400',
  incomplete: 'text-rose-400',
  na: 'text-muted-foreground/50',
};

const STATUS_BG: Record<string, string> = {
  complete: 'bg-emerald-500/5 border-emerald-500/10',
  incomplete: 'bg-rose-500/5 border-rose-500/10',
  na: 'bg-muted/20 border-border/50',
};

const STATUS_BADGE: Record<string, string> = {
  complete: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  incomplete: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
  na: 'text-muted-foreground/60 bg-muted/20 border-border',
};

// ─── Animation Variants ─────────────────────────────────────────

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -12 },
  visible: {
    opacity: 1,
    x: 0,
    transition: springGentle(),
  },
};

// ─── Component ──────────────────────────────────────────────────

export default function ReadinessChecklist({
  items,
  className,
}: ReadinessChecklistProps) {
  const grouped = useMemo(() => {
    const groups: Record<string, ReadinessItem[]> = {};
    for (const item of items) {
      // Skip N/A items — they don't apply to this plan and should not be visible
      if (item.status === 'na') continue;
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    }
    return Object.entries(groups).sort(
      ([a], [b]) =>
        (CATEGORY_META[a as ReadinessCategory]?.order ?? 99) -
        (CATEGORY_META[b as ReadinessCategory]?.order ?? 99),
    );
  }, [items]);

  if (grouped.length === 0) {
    return (
      <div className={cn('text-center py-12', className)}>
        <p className="text-sm text-muted-foreground">
          No hay verificaciones disponibles para este plan.
        </p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-8 font-poppins', className)}>
      {grouped.map(([category, catItems]) => {
        const meta = CATEGORY_META[category as ReadinessCategory];
        const Icon = meta?.icon ?? Building2;
        const completedInCat = catItems.filter(
          (i) => i.status === 'complete',
        ).length;

        return (
          <div key={category}>
            {/* ── Category Section Header ── */}
            <div className="flex items-center gap-2.5 mb-3 px-1">
              <div className="p-1.5 bg-muted/30 border border-border rounded-lg">
                <Icon size={14} className="text-muted-foreground" />
              </div>
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                {meta?.label ?? category}
              </h3>
              <span className="text-[10px] font-medium text-muted-foreground/60 ml-auto tabular-nums">
                {completedInCat}/{catItems.length}
              </span>
            </div>

            {/* ── Items List (staggered spring reveal) ── */}
            <motion.ul
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-2"
            >
              {catItems.map((item) => {
                const StatusIcon = STATUS_ICON[item.status] ?? MinusCircle;
                const isRequired = item.requiredForPlans.length > 0;
                const badgeLabel = item.status === 'na'
                  ? 'N/A'
                  : isRequired
                    ? 'Requerido'
                    : 'Opcional';

                return (
                  <motion.li
                    key={item.id}
                    variants={itemVariants}
                    className={cn(
                      'group flex items-start gap-3 p-3.5 rounded-[var(--radius-squircle-lg)] border transition-colors',
                      STATUS_BG[item.status] ?? 'bg-muted/20 border-border/50',
                    )}
                  >
                    {/* Status Icon */}
                    <StatusIcon
                      size={18}
                      className={cn(
                        'mt-0.5 shrink-0',
                        STATUS_COLOR[item.status],
                      )}
                    />

                    {/* Label + Description */}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {item.label}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                        {item.description}
                      </p>
                      {/* Suggested action for incomplete items */}
                      {item.status === 'incomplete' && item.suggestedAction && (
                        <p className="text-[11px] text-amber-400/70 mt-1.5 leading-relaxed">
                          {item.suggestedAction}
                        </p>
                      )}
                    </div>

                    {/* Required / Optional / N/A Badge */}
                    <span
                      className={cn(
                        'shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border',
                        STATUS_BADGE[item.status] ??
                          'text-muted-foreground bg-muted/20 border-border',
                      )}
                    >
                      {badgeLabel}
                    </span>
                  </motion.li>
                );
              })}
            </motion.ul>
          </div>
        );
      })}
    </div>
  );
}
