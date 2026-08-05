'use client';

import React, { useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ChevronRight, Calendar, Moon, Users, Bed } from 'lucide-react';
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
  const isActive = state === 'calendar_active';

  const checkIn = selectedCheckIn ?? output.initialCheckIn;
  const checkOut = selectedCheckOut ?? output.initialCheckOut;
  const checkInStr = toISODate(checkIn);
  const checkOutStr = toISODate(checkOut);

  const handleDateChange = React.useCallback(
    (range: { from: Date; to: Date }) => {
      dispatch({
        type: 'SELECT_DATES',
        checkIn: range.from,
        checkOut: range.to,
      });
    },
    [dispatch]
  );

  const handleConfirm = React.useCallback(() => {
    dispatch({ type: 'CONFIRM_DATES' });
  }, [dispatch]);

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

  const heroImage = output.gallery[0]?.url || output.coverImage || undefined;

  return (
    <div data-testid="room-detail-calendar" data-state={state} className="p-4 lg:p-6 space-y-6">
      {/* Hero image with overlaid breadcrumb + room name */}
      {heroImage ? (
        <>
          <motion.div
            data-testid="room-hero"
            initial={{ scale: 1.05, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              duration: MOTION_DURATION.slow / 1000,
              ease: MOTION_EASING.easeOut,
            }}
          >
            <div className="relative aspect-[16/9] lg:aspect-[21/9] overflow-hidden rounded-[var(--radius-squircle-2xl)]">
              <Image
                src={heroImage}
                alt={output.roomName}
                fill
                className="object-cover"
                priority
              />
              <div className="absolute inset-x-0 bottom-0 h-[40%] bg-gradient-to-t from-black/60 via-black/30 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4 lg:p-6 space-y-1">
                <nav aria-label="breadcrumb">
                  <ol className="flex items-center text-xs text-white/70">
                    <li>
                      <Link
                        href={output.breadcrumb.href}
                        className="text-white underline-offset-2 hover:underline transition-colors"
                      >
                        {output.hotelName}
                      </Link>
                    </li>
                    <li aria-hidden="true">
                      <ChevronRight size={12} className="mx-1.5" />
                    </li>
                    <li className="font-medium text-white">{output.roomName}</li>
                  </ol>
                </nav>
                <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight">
                  {output.roomName}
                </h1>
              </div>
            </div>
          </motion.div>
          <p className="text-sm text-muted-foreground">
            {t('ota.roomDetail.selectDatesToContinue')}
          </p>
        </>
      ) : (
        <div className="space-y-2">
          <nav aria-label="breadcrumb">
            <ol className="flex items-center text-xs text-muted-foreground">
              <li>
                <Link href={output.breadcrumb.href} className="hover:text-foreground transition-colors">
                  {output.hotelName}
                </Link>
              </li>
              <li aria-hidden="true">
                <ChevronRight size={12} className="mx-1.5" />
              </li>
              <li className="font-medium text-foreground">{output.roomName}</li>
            </ol>
          </nav>
          <h1 className="text-2xl lg:text-3xl font-black text-foreground tracking-tight">
            {output.roomName}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('ota.roomDetail.selectDatesToContinue')}
          </p>
        </div>
      )}

      {/* Compact info strip */}
      {output.capacity > 0 && (
        <div
          data-testid="room-info-strip"
          className="flex items-center gap-2 text-sm text-muted-foreground"
        >
          <Users size={16} />
          <span>
            {output.capacity} {t('ota.roomDetail.guests')}
          </span>
          <span>·</span>
          <Bed size={16} />
          <span>
            {output.beds} {output.bedType}
          </span>
        </div>
      )}

      {/* Calendar protagonist */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        <div
          className="order-2 lg:order-1"
          role="region"
          aria-label={t('ota.roomDetail.selectDates')}
        >
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

        <div className="order-1 lg:order-2">
          {/* Price teaser — shown when no dates selected */}
          {!isActive && (
            <div
              data-testid="price-teaser"
              className={cn(heroImage && '-mt-6 relative z-10')}
            >
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
                  <motion.button
                    type="button"
                    onClick={handleConfirm}
                    whileTap={{ scale: 0.96 }}
                    transition={{
                      duration: MOTION_DURATION.normal / 1000,
                      ease: MOTION_EASING.easeOut,
                    }}
                    className={cn(
                      'px-5 py-3 rounded-[var(--radius-squircle-md)]',
                      'bg-primary text-primary-foreground font-bold text-sm',
                      'hover:bg-primary/90 transition-colors'
                    )}
                  >
                    {t('ota.roomDetail.viewDetail')}
                  </motion.button>
                </div>
              </GlassCard>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

