'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldCheck, CheckCircle2, Clock, ArrowRight, ChevronDown, ChevronUp, Info, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { springSnappy } from '@/lib/mac2026/spring';
import { GlassCard } from '@/components/ui/glass';
import { useTranslations } from 'next-intl';

// ============================================================================
// BOOKING WIDGET — Smart Summary Sidebar
//
// Progressive Disclosure:
// - Sin room seleccionada: muestra "Desde $X/noche" + CTA compacto
// - Con room seleccionada: muestra detalle de precio + CTA de reserva
// ============================================================================

interface BookingWidgetProps {
  hotelName: string;
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
}

export default function BookingWidget({
  hotelName,
  rooms,
  checkIn,
  checkOut,
  cancellationPolicy,
  totalRooms,
}: BookingWidgetProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations();

  const [showPolicy, setShowPolicy] = useState(false);
  const [showDateError, setShowDateError] = useState(false);

  const activeRooms = rooms.filter((r) => r.status === 'active');
  const minPrice = activeRooms.length > 0 ? Math.min(...activeRooms.map((r) => r.price_per_night || r.price)) : 0;
  const availableCount = activeRooms.length;

  // Detect selected room from URL
  const selectedRoomId = searchParams.get('showRoom');
  const selectedRoom = selectedRoomId ? activeRooms.find(r => r.id === selectedRoomId) : null;

  // Guest count from guests filter
  const guestsParam = searchParams.get('guests');
  const guestCount = guestsParam ? Number(guestsParam) : null;

  let nights = 0;
  if (checkIn && checkOut) {
    const d1 = new Date(checkIn);
    const d2 = new Date(checkOut);
    nights = Math.max(1, Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 3600 * 24)));
  }

  const roomPrice = selectedRoom ? (selectedRoom.price_per_night || selectedRoom.price) : minPrice;
  // Mac 2026: Price coherence — IVA included to match RoomCard, Showcase, and Checkout
  const subtotal = nights > 0 ? roomPrice * nights : roomPrice;
  const taxes = Math.round(subtotal * 0.19);
  const totalPrice = subtotal + taxes;

  const handleReserve = () => {
    if (!checkIn || !checkOut) {
      setShowDateError(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setShowDateError(false);

    const params = new URLSearchParams();
    params.set('showRoom', selectedRoom?.id || activeRooms[0]?.id || '');
    params.set('checkin', checkIn);
    params.set('checkout', checkOut);
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const handleViewRooms = () => {
    const el = document.getElementById('rooms-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="sticky top-8">
      <GlassCard className="overflow-hidden">
        {/* Header con precio — Smart Summary */}
        <div className={cn(
          "p-6 text-primary-foreground transition-colors duration-300",
          selectedRoom ? "bg-gradient-to-br from-brand-500 to-brand-600" : "bg-gradient-to-br from-primary to-primary/90"
        )}>
          {selectedRoom ? (
            <>
              <p className="text-primary-foreground/70 text-xs font-bold uppercase tracking-widest mb-1">{selectedRoom.name}</p>
              <div className="flex items-baseline gap-2">
                <p className="text-4xl font-black tracking-tight">${totalPrice.toLocaleString()}</p>
                <span className="text-primary-foreground/70 text-sm font-medium">{t('ota.booking.totalCOP')}</span>
              </div>
              {nights > 1 && (
                <p className="text-xs text-primary-foreground/70 mt-1">
                  ${roomPrice.toLocaleString()} x {nights} {t('ota.booking.nights')} + IVA
                </p>
              )}
            </>
          ) : (
            <>
              <p className="text-primary-foreground/70 text-xs font-bold uppercase tracking-widest mb-1">{t('ota.booking.from')}</p>
              <div className="flex items-baseline gap-2">
                <p className="text-4xl font-black tracking-tight">${minPrice.toLocaleString()}</p>
                <span className="text-primary-foreground/70 text-sm font-medium">{t('ota.booking.copPerNight')}</span>
              </div>
            </>
          )}
        </div>

        {/* Cuerpo del widget */}
        <div className="p-6 space-y-5">
          {/* Fechas seleccionadas */}
          {checkIn && checkOut ? (
            <div className="flex items-start gap-3 p-4 bg-secondary/10 rounded-[var(--radius-squircle-2xl)] border border-secondary/30">
              <CheckCircle2 size={18} className="text-secondary shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-foreground">{t('ota.booking.datesConfirmed')}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date(checkIn).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} — {new Date(checkOut).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                </p>
                {guestCount && (
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <Users size={12} /> {guestCount} {t('ota.booking.guest', { count: guestCount })}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 p-4 bg-warm-100/50 rounded-[var(--radius-squircle-2xl)] border border-warm-200/60">
              <Clock size={18} className="text-warm-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-foreground">{t('ota.booking.selectDates')}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t('ota.booking.selectDatesHint')}</p>
              </div>
            </div>
          )}

          {/* Error feedback — CTA clicked without dates */}
          <AnimatePresence>
            {showDateError && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-start gap-3 p-4 bg-destructive/10 rounded-[var(--radius-squircle-2xl)] border border-destructive/20"
              >
                <Info size={18} className="text-destructive shrink-0 mt-0.5" />
                <div>
                <p className="text-sm font-bold text-destructive">{t('ota.booking.selectDatesFirst')}</p>
                <p className="text-xs text-destructive/80 mt-0.5">{t('ota.booking.selectDatesFirstHint')}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

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
                <p className="text-xs font-bold text-destructive flex items-center gap-1">
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

          {/* CTA principal — Smart: Ver habitaciones o Reservar */}
          <motion.button
            onClick={selectedRoom ? handleReserve : handleViewRooms}
            disabled={availableCount === 0}
            whileTap={availableCount > 0 ? { scale: 0.96 } : undefined}
            transition={springSnappy()}
            className={cn(
              'w-full py-4 rounded-[var(--radius-squircle-2xl)] font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-colors duration-300',
              availableCount === 0
                ? 'bg-muted text-muted-foreground/40 cursor-not-allowed shadow-none'
                : selectedRoom
                  ? 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-cta'
                  : 'bg-foreground hover:bg-primary text-background shadow-foreground/20',
            )}
          >
            {selectedRoom ? (checkIn && checkOut ? t('ota.booking.reserveNow') : t('ota.booking.checkAvailability')) : t('ota.booking.viewRooms')}
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
                    className="flex items-center justify-between w-full text-left mb-2"
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

          {/* Toggle politica (siempre visible si hay politica) */}
          {cancellationPolicy && (
            <button
              onClick={() => setShowPolicy(!showPolicy)}
              className="flex items-center justify-between w-full text-left text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <span className="font-bold">{t('ota.booking.cancellationPolicy')}</span>
              {showPolicy ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          )}
        </div>
      </GlassCard>
    </div>
  );
}
