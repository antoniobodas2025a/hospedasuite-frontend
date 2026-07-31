'use client';

import { motion } from 'framer-motion';
import { springGentle } from '@/lib/mac2026/spring';
import { DollarSign, TrendingUp, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SplitPaymentsKPIsProps {
  totalReceived: number;
  totalCommissions: number;
  pendingCount: number;
}

const formatCOP = (amount: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(amount);

const kpiConfig = [
  {
    key: 'totalReceived' as const,
    label: 'Total Recibido',
    icon: DollarSign,
    accent: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    glow: 'bg-emerald-500/20',
  },
  {
    key: 'totalCommissions' as const,
    label: 'Comisiones Pagadas',
    icon: TrendingUp,
    accent: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    glow: 'bg-amber-500/20',
  },
  {
    key: 'pendingCount' as const,
    label: 'Pagos Pendientes',
    icon: Clock,
    accent: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    glow: 'bg-sky-500/20',
  },
];

export default function SplitPaymentsKPIs({
  totalReceived,
  totalCommissions,
  pendingCount,
}: SplitPaymentsKPIsProps) {
  const values = { totalReceived, totalCommissions, pendingCount };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-[var(--space-focus)]">
      {kpiConfig.map((kpi, index) => {
        const Icon = kpi.icon;
        const rawValue = values[kpi.key];
        const displayValue =
          kpi.key === 'pendingCount'
            ? rawValue.toString()
            : formatCOP(rawValue as number);

        return (
          <motion.div
            key={kpi.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springGentle(), delay: index * 0.1 }}
            className="relative group cursor-default"
          >
            {/* Glass background */}
            <div className="absolute inset-0 glass-card border border-border shadow-2xl rounded-[var(--radius-squircle-3xl)] ring-1 ring-inset ring-border z-0 transition-all group-hover:bg-accent" />

            {/* Glow */}
            <div
              className={cn(
                'absolute -right-10 -top-10 size-32 blur-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-700 rounded-full z-0',
                kpi.glow,
              )}
            />

            {/* Content */}
            <div className="relative z-10 p-7">
              <div className="flex items-center justify-between mb-6">
                <div
                  className={cn(
                    'p-3 rounded-[var(--radius-squircle-2xl)] border transition-all duration-500 shadow-inner',
                    kpi.accent,
                  )}
                >
                  <Icon size={20} strokeWidth={2.5} />
                </div>
              </div>

              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-ultra ml-1 mb-1">
                {kpi.label}
              </p>
              <h3 className="text-3xl font-bold text-foreground tracking-tighter tabular-nums">
                {displayValue}
              </h3>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
