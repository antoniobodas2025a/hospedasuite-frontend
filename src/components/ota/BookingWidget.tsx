'use client';

import React, { useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldCheck, CheckCircle2, Clock, ArrowRight, ChevronDown, ChevronUp, Info, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { calculateTotalWithTax, DEFAULT_TAX_RATE, formatPrice } from '@/lib/pricing';
import { springSnappy } from '@/lib/mac2026/spring';
import { GlassCard } from '@/components/ui/glass';
import { SkeletonLoader } from '@/components/ui/SkeletonLoader';
import InlineDatePicker from './InlineDatePicker';
import { useTranslations } from 'next-intl';
import { useBookingFlow } from '@/hooks/useBookingFlow';

// ============================================================================
// BOOKING WIDGET — Smart Summary Sidebar
//
// Progressive Disclosure:
// - Sin room seleccionada: muestra "Desde $X/noche" + CTA compacto
// - Con room seleccionada: muestra detalle de precio + CTA de reserva
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
  taxRate?: number;
  isLoading?: boolean;
  hotelId?: string;
  primaryColor?: string;
}

export default function BookingWidget({
  rooms,
  checkIn,
  checkOut,
  cancellationPolicy,
  totalRooms,
  taxRate,
  isLoading,
  hotelId,
  primaryColor,
}: BookingWidgetProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations();

  const [showPolicy, setShowPolicy] = useState(false);
  const [showDateError, setShowDateError] = useState(false);

  const activeRooms = useMemo(() => rooms.filter((r) => r.status === 'active'), [rooms]);
  const minPrice = useMemo(() => activeRooms.length > 0 ? Math.min(...activeRooms.map((r) => r.price_per_night || r.price)) : 0, [activeRooms]);
  const availableCount = activeRooms.length;

  // Guest count from guests filter
  const guestsParam = searchParams.get('guests');
  const guestCount = guestsParam ? Number(guestsParam) : null;

  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 0;
    const d1 = new Date(checkIn);
    const d2 = new Date(checkOut);
    return Math.max(1, Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 3600 * 24)));
  }, [checkIn, checkOut]);

  const roomPrice = useMemo(() => minPrice, [minPrice]);
  const subtotal = useMemo(() => (nights > 0 ? roomPrice * nights : roomPrice), [nights, roomPrice]);
  const effectiveRate = useMemo(() => taxRate ?? DEFAULT_TAX_RATE, [taxRate]);
  const { total: totalPrice, hasTax } = useMemo(() => calculateTotalWithTax(subtotal, effectiveRate), [subtotal, effectiveRate]);

  const { isProcessing, handleReserve } = useBookingFlow();

  const handleReserveClick = () => {
    if (!checkIn || !checkOut) {
      setShowDateError(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setShowDateError(false);
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

  const handleDateChange = (range: { from: Date; to: Date }) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('checkin', range.from.toISOString().split('T')[0]);
    params.set('checkout', range.to.toISOString().split('T')[0]);
    router.push(`?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="sticky top-8">
      <GlassCard className="overflow-hidden">
        {/* Header con precio — Smart Summary */}
        <div className={cn(
          "p-6 text-primary-foreground transition-colors duration-300",
          "bg-gradient-to-br from-primary to-primary/90"
        )}>
          <>
            <p className="text-primary-foreground/70 text-xs font-bold uppercase tracking-widest mb-1">
              {nights > 0 ? t('ota.booking.totalCOP') : t('ota.booking.copPerNight')}
            </p>
            <div className="flex items-baseline gap-2">
              <p className="text-4xl font-black tracking-tight">${nights > 0 ? formatPrice(totalPrice) : formatPrice(minPrice)}</p>
              <span className="text-primary-foreground/70 text-sm font-medium">
                {nights > 0 ? t('ota.booking.totalCOP') : t('ota.booking.copPerNight')}
              </span>
            </div>
            {nights > 0 && (
              <p className="text-xs text-primary-foreground/70 mt-1">
                ${formatPrice(minPrice)} x {nights} {t('ota.booking.nights')}{hasTax ? ' + IVA' : ''}
              </p>
            )}
          </>
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
