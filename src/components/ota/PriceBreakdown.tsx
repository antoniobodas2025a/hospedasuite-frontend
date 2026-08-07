'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { springGentle } from '@/lib/mac2026/spring';
import { cn } from '@/lib/utils';
import { getTaxLabel, getEffectiveTaxRate, extractTaxFromGross } from '@/lib/pricing';

export interface PriceBreakdownProps {
  pricePerNight: number;
  nights: number;
  taxRate?: number;
  taxRegime?: 'simplified' | 'responsible';
  showDetails?: boolean;
  className?: string;
}

const formatCOP = (amount: number) => amount.toLocaleString('es-CO');

export default function PriceBreakdown({
  pricePerNight,
  nights,
  taxRate,
  taxRegime,
  showDetails = true,
  className,
}: PriceBreakdownProps) {
  const effectiveRate = React.useMemo(() => {
    return getEffectiveTaxRate(taxRate, taxRegime);
  }, [taxRate, taxRegime]);

  const taxLabel = getTaxLabel(effectiveRate);
  const subtotal = pricePerNight * nights;
  const { net, tax: iva, gross: total } = extractTaxFromGross(subtotal, effectiveRate);
  const nightLabel = nights === 1 ? 'noche' : 'noches';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springGentle()}
      className={cn(
        'bg-card rounded-[var(--radius-squircle-xl)] p-5 border border-border',
        className
      )}
      role="region"
      aria-label="Desglose de precios"
    >
      <h3 className="text-sm font-bold text-foreground mb-4">
        Desglose de precios
      </h3>

      <div className="space-y-3">
        <div className="flex justify-between items-baseline gap-3">
          <p className="text-sm text-foreground">
            <span className="font-medium">${formatCOP(pricePerNight)}</span>
            <span className="text-muted-foreground"> × {nights} {nightLabel}</span>
          </p>
          <p className="text-sm font-medium text-foreground tabular-nums">
            ${formatCOP(subtotal)}
          </p>
        </div>

        {iva > 0 && (
          <div className="flex justify-between items-baseline gap-3">
            <p className="text-sm text-muted-foreground">{taxLabel}</p>
            <p className="text-sm font-medium text-foreground tabular-nums">
              ${formatCOP(iva)}
            </p>
          </div>
        )}

        <div className="flex justify-between items-baseline gap-3 pt-3 border-t border-border">
          <p className="text-base font-bold text-foreground">Total</p>
          <p
            className="text-xl font-black text-brand-600 tabular-nums"
            aria-label={`Total ${formatCOP(total)} pesos`}
          >
            ${formatCOP(total)}
          </p>
        </div>
      </div>

      {showDetails && (
        <div className="mt-4 p-3 bg-blue-500/5 border border-blue-500/10 rounded-lg">
          <p className="text-xs text-blue-300">
            ✓ Precio final sin cargos ocultos
          </p>
        </div>
      )}
    </motion.div>
  );
}
