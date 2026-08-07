'use client';

import React, { useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Calendar, Moon } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { format } from 'date-fns';
import InlineDatePicker from '@/components/ota/InlineDatePicker';
import { GlassCard } from '@/components/ui/glass';
import { cn } from '@/lib/utils';
import { formatPrice } from '@/lib/pricing';
import { getDateFnsLocale } from '@/lib/date-locale';
import { springSnappy } from '@/lib/mac2026/spring';
import { MOTION_DURATION, MOTION_EASING } from '@/lib/motion-tokens';
import type { RoomDetailViewModelOutput } from '@/view-models/room-detail-view-model';
import type { RoomDetailClientAction, RoomDetailState } from './room-detail-client';

interface RoomDetailCalendarProps {
  output: RoomDetailViewModelOutput;
  state: RoomDetailState;
  dispatch: React.Dispatch<RoomDetailClientAction>;
  selectedCheckIn?: Date | null;
  selectedCheckOut?: Date | null;
}

function toISODate(date: Date | null | undefined): string | undefined {
  if (!date) return undefined;
  return date.toISOString().split('T')[0];
}

function calculateNights(checkIn: Date, checkOut: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.max(1, Math.round((checkOut.getTime() - checkIn.getTime()) / msPerDay));
}

export function RoomDetailCalendar({
  output,
  state,
  dispatch,
  selectedCheckIn,
  selectedCheckOut,
}: RoomDetailCalendarProps) {
  const t = useTranslations();
  const router = useRouter();
  const locale = useLocale();
  const dateLocale = getDateFnsLocale(locale);
  const isActive = state === 'dates_selected';

  const checkIn = selectedCheckIn ?? output.initialCheckIn;
  const checkOut = selectedCheckOut ?? output.initialCheckOut;
  const checkInStr = toISODate(checkIn);
  const checkOutStr = toISODate(checkOut);
  const hasDates = Boolean(checkIn && checkOut);

  const handleReserve = useCallback(() => {
    if (!output.canBook || !checkInStr || !checkOutStr) return;
    const url = `/book/${output.hotelSlug}/checkout?room=${output.roomId}&checkin=${checkInStr}&checkout=${checkOutStr}`;
    router.push(url);
  }, [output.canBook, output.hotelSlug, output.roomId, checkInStr, checkOutStr, router]);

  const handleDateChange = useCallback(
    (range: { from: Date; to: Date }) => {
      dispatch({
        type: 'SELECT_DATES',
        checkIn: range.from,
        checkOut: range.to,
      });
    },
    [dispatch]
  );

  const summary = useMemo(() => {
    if (!checkIn || !checkOut || !output.pricing) return null;

    const nights = calculateNights(checkIn, checkOut);
    const averagePrice = nights > 0 ? Math.round(output.pricing.subtotal / nights) : 0;

    return {
      nights,
      averagePrice,
      total: output.pricing.total,
      tax: output.pricing.tax,
      taxRate: output.pricing.taxRate,
      weekdayNights: output.pricing.weekdayNights,
      weekendNights: output.pricing.weekendNights,
      weekdayPrice: output.pricing.weekdayPrice,
      weekendPrice: output.pricing.weekendPrice,
      fromLabel: format(checkIn, 'dd MMM', { locale: dateLocale }),
      toLabel: format(checkOut, 'dd MMM', { locale: dateLocale }),
    };
  }, [checkIn, checkOut, output.pricing, dateLocale]);

  const calendarContent = (
    <div className="space-y-4">
      <div role="region" aria-label={t('ota.roomDetail.selectDates')}>
        <InlineDatePicker
          checkIn={checkInStr}
          checkOut={checkOutStr}
          onChange={handleDateChange}
          primaryColor={
            output.primaryColor &&
            output.primaryColor !== '#ffffff' &&
            output.primaryColor !== '#fff'
              ? output.primaryColor
              : undefined
          }
          bookedDates={output.bookedDates}
          defaultExpanded={true}
          className="w-full"
        />
      </div>

      {/* Price teaser — shown when no dates are selected */}
      {!hasDates && (
        <div data-testid="price-teaser">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              {t('ota.booking.from')}
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-foreground">
                ${formatPrice(output.pricePerNight)}
              </span>
              <span className="text-sm text-muted-foreground truncate">{t('ota.roomDetail.perNight')}</span>
            </div>
            {output.weekendPrice > 0 && output.weekendPrice !== output.pricePerNight && (
              <p className="text-xs text-muted-foreground">
                {t('ota.roomDetail.weekendPrice', {
                  price: formatPrice(output.weekendPrice),
                })}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Animated summary bar — shown when dates are selected */}
      {isActive && summary && (
        <motion.div
          data-testid="summary-bar"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={springSnappy()}
        >
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-foreground">
              <Calendar size={16} className="text-brand-600" />
              <span>
                {summary.fromLabel} — {summary.toLabel}
              </span>
              <span className="ml-auto inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-brand-50 text-brand-700 text-xs">
                <Moon size={12} />
                {summary.nights} {t('ota.showcase.nights', { count: summary.nights })}
              </span>
            </div>

            {/* Weekday / weekend breakdown */}
            <div className="space-y-2 text-sm">
              {summary.weekdayNights > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {summary.weekdayNights} {t('ota.roomDetail.weekdayNights', { count: summary.weekdayNights })}
                  </span>
                  <span className="font-medium text-foreground">
                    ${formatPrice(summary.weekdayPrice)}
                  </span>
                </div>
              )}
              {summary.weekendNights > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {summary.weekendNights} {t('ota.roomDetail.weekendNights', { count: summary.weekendNights })}
                  </span>
                  <span className="font-medium text-foreground">
                    ${formatPrice(summary.weekendPrice)}
                  </span>
                </div>
              )}
              {summary.tax > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t('ota.roomDetail.tax', { rate: Math.round(summary.taxRate * 100) })}
                  </span>
                  <span className="font-medium text-foreground">${formatPrice(summary.tax)}</span>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-border flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  {t('ota.showcase.total')}
                </p>
                <p className="text-2xl font-black text-brand-600">
                  <motion.span
                    key={summary.total}
                    animate={{ scale: [1.05, 1] }}
                    transition={springSnappy()}
                    className="inline-block origin-left"
                  >
                    ${formatPrice(summary.total)}
                  </motion.span>
                </p>
              </div>
            </div>

            {hasDates && output.canBook && (
              <motion.button
                type="button"
                onClick={handleReserve}
                data-testid="calendar-reserve-button"
                whileTap={{ scale: 0.96 }}
                transition={{
                  duration: MOTION_DURATION.normal / 1000,
                  ease: MOTION_EASING.easeOut,
                }}
                className={cn(
                  'w-full px-6 py-3 rounded-[var(--radius-squircle-md)]',
                  'bg-primary text-primary-foreground font-bold text-sm',
                  'hover:bg-primary/90 transition-colors'
                )}
              >
                {t('ota.booking.reserve')}
              </motion.button>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );

  const cardClasses = cn(
    'p-5 transition-all duration-300',
    !hasDates && 'bg-background/60',
    hasDates && 'ring-1 ring-brand-500/30 shadow-lg'
  );

  return (
    <div data-testid="room-detail-calendar" data-state={state}>
      {/* Desktop sticky sidebar + mobile inline card */}
      <div
        data-testid="room-detail-calendar-sidebar"
        className="lg:sticky lg:top-6 lg:self-start max-w-full overflow-x-hidden"
      >
        <GlassCard className={cardClasses}>{calendarContent}</GlassCard>
      </div>
    </div>
  );
}
