'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { springGentle } from '@/lib/mac2026/spring';
import { cn } from '@/lib/utils';
import { getTaxLabel, getEffectiveTaxRate } from '@/lib/pricing';

export interface PriceBreakdownProps {
  pricePerNight: number;
  nights: number;
  taxRate?: number;
  taxRegime?: 'simplified' | 'responsible';
  showDetails?: boolean;
  className?: string;
  /** Dark variant for rendering on dark backgrounds (e.g. checkout sidebar) */
  dark?: boolean;
}

const formatCOP = (amount: number) => amount.toLocaleString('es-CO');

export default function PriceBreakdown({
  pricePerNight,
  nights,
  taxRate,
  taxRegime,
  showDetails = true,
  className,
  dark = false,
}: PriceBreakdownProps) {
  const effectiveRate = React.useMemo(() => {
    return getEffectiveTaxRate(taxRate, taxRegime);
  }, [taxRate, taxRegime]);

  const taxLabel = getTaxLabel(effectiveRate);
  const subtotal = pricePerNight * nights;
  const iva = Math.round(subtotal * effectiveRate);
  const total = subtotal + iva;
  const nightLabel = nights === 1 ? 'noche' : 'noches';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springGentle()}
      className={cn(
        'rounded-[var(--radius-squircle-xl)] p-5 border border-border',
        dark ? 'bg-background/10 border-background/20 text-background' : 'bg-card',
        className
      )}
      role="region"
      aria-label="Desglose de precios"
    >
      <h3 className={cn('text-sm font-bold mb-4', dark ? 'text-background/90' : 'text-foreground')}>
        Desglose de precios
      </h3>

      <div className="space-y-3">
        <div className="flex justify-between items-baseline gap-3">
          <p className={cn('text-sm', dark ? 'text-background/80' : 'text-foreground')}>
            <span className="font-medium">${formatCOP(pricePerNight)}</span>
            <span className={dark ? 'text-background/60' : 'text-muted-foreground'}> × {nights} {nightLabel}</span>
          </p>
          <p className={cn('text-sm font-medium tabular-nums', dark ? 'text-background/80' : 'text-foreground')}>
            ${formatCOP(subtotal)}
          </p>
        </div>

        {iva > 0 && (
          <div className="flex justify-between items-baseline gap-3">
            <p className={cn('text-sm', dark ? 'text-background/60' : 'text-muted-foreground')}>{taxLabel}</p>
            <p className={cn('text-sm font-medium tabular-nums', dark ? 'text-background/70' : 'text-foreground')}>
              ${formatCOP(iva)}
            </p>
          </div>
        )}

        <div className={cn('flex justify-between items-baseline gap-3 pt-3 border-t', dark ? 'border-border/20' : 'border-border')}>
          <p className={cn('text-base font-bold', dark ? 'text-background' : 'text-foreground')}>Total</p>
          <p
            className={cn('text-xl font-black tabular-nums', dark ? 'text-background' : 'text-brand-600')}
            aria-label={`Total ${formatCOP(total)} pesos`}
          >
            ${formatCOP(total)}
          </p>
        </div>
      </div>

      {showDetails && (
        <div className={cn('mt-4 p-3 rounded-lg border', dark ? 'bg-background/5 border-background/20' : 'bg-blue-500/5 border-blue-500/10')}>
          <p className={cn('text-xs', dark ? 'text-background/60' : 'text-blue-300')}>
            ✓ Precio final sin cargos ocultos
          </p>
        </div>
      )}
    </motion.div>
  );
}
