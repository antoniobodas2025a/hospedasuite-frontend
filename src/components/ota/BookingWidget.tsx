'use client';

import React, { useState, useMemo } from 'react';
import { ShieldCheck, CheckCircle2, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { springSnappy } from '@/lib/mac2026/spring';
import { GlassCard } from '@/components/ui/glass';
import { SkeletonLoader } from '@/components/ui/SkeletonLoader';
import { useTranslations } from 'next-intl';
import { useBookingFlow } from '@/hooks/useBookingFlow';

// ============================================================================
// BOOKING WIDGET — Trust & Availability Sidebar
//
// Shows availability, trust signals, and CTA. Prices live in RoomCards.
// ============================================================================

interface BookingWidgetProps {
  rooms: Array<{
    id: string;
    name: string;
    price: number;
    price_per_night?: number;
    capacity?: number;
    status: string;
  }>;
  checkIn?: string | null;
  checkOut?: string | null;
  cancellationPolicy?: string | null;
  totalRooms?: number;
  isLoading?: boolean;
  hotelId?: string;
  primaryColor?: string;
}

export default function BookingWidget({
  rooms,
  cancellationPolicy,
  totalRooms,
  isLoading,
}: BookingWidgetProps) {
  const t = useTranslations();

  const [showPolicy, setShowPolicy] = useState(false);

  const activeRooms = useMemo(() => rooms.filter((r) => r.status === 'active'), [rooms]);
  const availableCount = activeRooms.length;

  const { isProcessing, handleReserve } = useBookingFlow();

  const handleReserveClick = () => {
    handleReserve(() => {
      document.querySelector('[id="rooms-section"]')?.scrollIntoView({ behavior: 'smooth' });
    });
  };

  // Loading skeleton — keep the same card shape so layout doesn't jump
  if (isLoading) {
    return (
      <div className="sticky top-8">
        <GlassCard className="overflow-hidden">
          <div className="p-6 space-y-4 bg-gradient-to-br from-primary to-primary/90">
            <SkeletonLoader width="40%" height={14} rounded="md" className="bg-white/20" />
            <SkeletonLoader width="70%" height={40} rounded="lg" className="bg-white/20" />
          </div>
          <div className="p-6 space-y-5">
            <SkeletonLoader width="100%" height={120} rounded="lg" />
            <SkeletonLoader width="100%" height={72} rounded="xl" />
            <SkeletonLoader width="100%" height={48} rounded="md" />
          </div>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="sticky top-8">
      <GlassCard className="overflow-hidden">
        {/* Header — disponibilidad */}
        <div className="p-6 text-primary-foreground bg-gradient-to-br from-primary to-primary/90">
          <p className="text-primary-foreground/70 text-xs font-bold uppercase tracking-widest mb-1">
            {t('ota.booking.availability')}
          </p>
          <div className="flex items-baseline gap-2">
            <p className="text-4xl font-black tracking-tight">{availableCount}</p>
            <span className="text-primary-foreground/70 text-sm font-medium">
              {t('ota.booking.unitsAvailable', { count: availableCount })}
            </span>
          </div>
        </div>

        {/* Cuerpo del widget — simplificado: sin calendario duplicado */}
        <div className="p-6 space-y-5">

          {/* Disponibilidad */}
          {availableCount > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <div className="size-2 rounded-full bg-secondary animate-pulse" />
                <span className="text-muted-foreground">
                  <span className="font-bold text-foreground">{availableCount}</span> {t('ota.booking.of')} {totalRooms || availableCount} {t('ota.booking.unitsAvailable', { count: availableCount })}
                </span>
              </div>
              {totalRooms && totalRooms > availableCount && (
                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      availableCount <= 2 ? 'bg-destructive' : 'bg-secondary',
                    )}
                    style={{ width: `${Math.round((availableCount / totalRooms) * 100)}%` }}
                  />
                </div>
              )}
              {availableCount <= 2 && (
                <p
                  className="text-xs font-bold text-destructive flex items-center gap-1"
                  title="Esta habitación se reserva rápido"
                >
                  <span className="inline-block size-2 rounded-full bg-destructive animate-pulse" />
                  {availableCount === 1 ? t('ota.booking.onlyOneLeft') : t('ota.booking.onlyXLeft', { count: availableCount })}
                </p>
              )}
            </div>
          )}
          {availableCount === 0 && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <div className="size-2 rounded-full bg-destructive" />
              <span className="font-bold">{t('ota.booking.noAvailability')}</span>
            </div>
          )}

          {/* CTA principal — "Reservar" */}
          <motion.button
            onClick={handleReserveClick}
            disabled={availableCount === 0 || isProcessing}
            whileTap={availableCount > 0 && !isProcessing ? { scale: 0.96 } : undefined}
            transition={springSnappy()}
            className={cn(
              'w-full py-4 rounded-[var(--radius-squircle-2xl)] font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-colors duration-300',
              availableCount === 0 || isProcessing
                ? 'bg-muted text-muted-foreground/40 cursor-not-allowed shadow-none'
                : 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-cta',
            )}
          >
            {isProcessing ? 'Procesando...' : t('ota.booking.reserve')}
            <ArrowRight size={16} strokeWidth={2.5} />
          </motion.button>

          {/* Divider */}
          <div className="h-px bg-border/40" />

          {/* Mejor precio garantizado */}
          <div className="relative overflow-hidden rounded-[var(--radius-squircle-2xl)] bg-gradient-to-br from-brand-50 to-warm-50 border border-brand-200/60 p-4">
            <div className="absolute top-0 right-0 size-16 bg-brand-500/5 rounded-full -translate-y-8 translate-x-8" />
            <div className="relative flex items-start gap-3">
              <div className="size-9 rounded-[var(--radius-squircle-lg)] bg-brand-500/10 border border-brand-500/15 flex items-center justify-center shrink-0 mt-0.5">
                <ShieldCheck size={16} className="text-brand-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">{t('ota.booking.bestPriceGuaranteed')}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t('ota.booking.bestPriceDesc')}</p>
              </div>
            </div>
          </div>

          {/* Beneficios adicionales */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle2 size={16} className="text-secondary shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-foreground">{t('ota.booking.instantConfirmation')}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t('ota.booking.instantConfirmationDesc')}</p>
              </div>
            </div>
          </div>

          {/* Politica de cancelacion */}
          <AnimatePresence>
            {cancellationPolicy && (
              <motion.div
                initial={false}
                animate={{ height: showPolicy ? 'auto' : 0, opacity: showPolicy ? 1 : 0 }}
                className="border-t border-border/40 overflow-hidden"
              >
                <div className="pt-4">
                  <button
                    onClick={() => setShowPolicy(!showPolicy)}
                    className="flex items-center justify-between w-full text-left mb-2 hover:text-foreground hover:bg-muted/50 transition-colors rounded-sm px-2 py-1"
                  >
                    <p className="text-xs font-bold text-foreground">{t('ota.booking.cancellationPolicy')}</p>
                    {showPolicy ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
                  </button>
                  {showPolicy && (
                    <p className="text-xs text-muted-foreground leading-relaxed">{cancellationPolicy}</p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </GlassCard>
    </div>
  );
}
