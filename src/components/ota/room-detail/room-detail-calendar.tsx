'use client';

import React, { useMemo, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, Calendar, Moon } from 'lucide-react';
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
  const locale = useLocale();
  const dateLocale = getDateFnsLocale(locale);
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const isActive = state === 'dates_selected';

  const checkIn = selectedCheckIn ?? output.initialCheckIn;
  const checkOut = selectedCheckOut ?? output.initialCheckOut;
  const checkInStr = toISODate(checkIn);
  const checkOutStr = toISODate(checkOut);
  const hasDates = Boolean(checkIn && checkOut);

  const handleDateChange = useCallback(
    (range: { from: Date; to: Date }) => {
      dispatch({
        type: 'SELECT_DATES',
        checkIn: range.from,
        checkOut: range.to,
      });
      setMobileExpanded(false);
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
          primaryColor={output.primaryColor}
          bookedDates={output.bookedDates}
          defaultExpanded={true}
          className="w-full"
        />
      </div>

      {/* Price teaser — shown when no dates are selected */}
      {!hasDates && (
        <div data-testid="price-teaser">
          <GlassCard className="p-5">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                {t('ota.booking.from')}
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-foreground">
                  ${formatPrice(output.pricePerNight)}
                </span>
                <span className="text-sm text-muted-foreground">{t('ota.roomDetail.perNight')}</span>
              </div>
              {output.weekendPrice > 0 && output.weekendPrice !== output.pricePerNight && (
                <p className="text-xs text-muted-foreground">
                  {t('ota.roomDetail.weekendPrice', {
                    price: formatPrice(output.weekendPrice),
                  })}
                </p>
              )}
            </div>
          </GlassCard>
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
          <GlassCard className="p-5 space-y-4">
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
                <p className="text-2xl font-black text-brand-600">${formatPrice(summary.total)}</p>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      )}
    </div>
  );

  return (
    <div data-testid="room-detail-calendar" data-state={state}>
      {/* Desktop sticky sidebar */}
      <div
        data-testid="room-detail-calendar-sidebar"
        className="hidden lg:block sticky top-6 self-start"
      >
        <GlassCard className="p-5">{calendarContent}</GlassCard>
      </div>

      {/* Mobile floating bottom bar */}
      <div
        data-testid="room-detail-calendar-mobile-bar"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-30 p-4 bg-background/95 backdrop-blur-xl border-t border-border/40"
      >
        {!mobileExpanded ? (
          <button
            type="button"
            onClick={() => setMobileExpanded(true)}
            className="w-full text-left"
            aria-expanded="false"
            aria-controls="mobile-calendar-panel"
          >
            <GlassCard className="flex items-center justify-between p-3">
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-brand-600" />
                <span className="font-bold text-sm">{t('ota.roomDetail.chooseDates')}</span>
                <span className="text-sm text-muted-foreground">
                  · {t('ota.booking.from')} ${formatPrice(output.pricePerNight)}
                  {t('ota.roomDetail.perNight')}
                </span>
              </div>
              <ChevronDown size={18} className="text-muted-foreground" />
            </GlassCard>
          </button>
        ) : (
          <GlassCard id="mobile-calendar-panel" className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm">{t('ota.roomDetail.chooseDates')}</span>
              <button
                type="button"
                onClick={() => setMobileExpanded(false)}
                aria-expanded="true"
                aria-controls="mobile-calendar-panel"
              >
                <ChevronDown size={18} className="text-muted-foreground rotate-180" />
              </button>
            </div>
            {calendarContent}
          </GlassCard>
        )}
      </div>
    </div>
  );
}
