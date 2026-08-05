'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { CalendarX2, ChevronRight, ArrowRight } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { format } from 'date-fns';
import InlineDatePicker from '@/components/ota/InlineDatePicker';
import RoomCard from '@/components/ota/RoomCard';
import { GlassCard } from '@/components/ui/glass';
import { cn } from '@/lib/utils';
import { getDateFnsLocale } from '@/lib/date-locale';
import { MOTION_DURATION, MOTION_EASING } from '@/lib/motion-tokens';
import type { RoomDetailViewModelOutput, Suggestion } from '@/view-models/room-detail-view-model';
import type { RoomDetailClientAction, RoomDetailState } from './room-detail-client';

interface RoomDetailSoldOutProps {
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

function mapSuggestionToRoomCardProps(suggestion: Suggestion) {
  return {
    id: suggestion.id,
    name: suggestion.name,
    description: '',
    capacity: 2,
    beds: 1,
    bed_type: 'Queen',
    gallery: [],
    amenities: [],
    price_per_night: suggestion.price,
    price: suggestion.price,
  };
}

export function RoomDetailSoldOut({
  output,
  state,
  dispatch,
  selectedCheckIn,
  selectedCheckOut,
}: RoomDetailSoldOutProps) {
  const t = useTranslations();
  const locale = useLocale();
  const dateLocale = getDateFnsLocale(locale);

  const checkIn = selectedCheckIn ?? output.initialCheckIn;
  const checkOut = selectedCheckOut ?? output.initialCheckOut;
  const checkInStr = toISODate(checkIn);
  const checkOutStr = toISODate(checkOut);

  const handleDateChange = React.useCallback(
    (range: { from: Date; to: Date }) => {
      dispatch({
        type: 'SELECT_SUGGESTION',
        checkIn: range.from,
        checkOut: range.to,
      });
    },
    [dispatch]
  );

  const handleChangeDates = React.useCallback(() => {
    dispatch({ type: 'CLEAR_DATES' });
  }, [dispatch]);

  const dateLabel = useMemo(() => {
    if (!checkIn || !checkOut) return '';
    return `${format(checkIn, 'dd MMM', { locale: dateLocale })} — ${format(checkOut, 'dd MMM', { locale: dateLocale })}`;
  }, [checkIn, checkOut, dateLocale]);

  const visibleSuggestions = output.suggestions.slice(0, 3);

  return (
    <div data-testid="room-detail-sold-out" data-state={state} className="p-4 lg:p-6 space-y-6">
      {/* Header */}
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
        <h1 className="text-2xl lg:text-3xl font-black text-foreground tracking-tight">{output.roomName}</h1>
      </div>

      {/* Sold-out message */}
      <GlassCard data-testid="sold-out-message" className="p-5 border-destructive/20 bg-destructive/5">
        <div className="flex items-start gap-4">
          <div className="shrink-0 size-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <CalendarX2 size={24} className="text-destructive" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground mb-1">
              {t('ota.roomDetail.notAvailableForDates', {
                checkIn: checkIn ? format(checkIn, 'dd MMM', { locale: dateLocale }) : '',
                checkOut: checkOut ? format(checkOut, 'dd MMM', { locale: dateLocale }) : '',
              })}
            </h2>
            <p className="text-sm text-muted-foreground">{t('ota.roomDetail.tryOtherDates')}</p>
          </div>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Alternative date picker */}
        <div>
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

        {/* Suggestions + actions */}
        <div className="space-y-6">
          {/* Cambiar fechas CTA */}
          <motion.button
            type="button"
            onClick={handleChangeDates}
            whileTap={{ scale: 0.96 }}
            transition={{
              duration: MOTION_DURATION.normal / 1000,
              ease: MOTION_EASING.easeOut,
            }}
            className={cn(
              'w-full px-5 py-3 rounded-[var(--radius-squircle-md)]',
              'bg-primary text-primary-foreground font-bold text-sm',
              'hover:bg-primary/90 transition-colors'
            )}
          >
            {t('ota.roomDetail.changeDates')}
          </motion.button>

          {/* Suggestion cards */}
          {visibleSuggestions.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-foreground">
                {t('ota.roomDetail.alternativeOptions')}
              </h3>
              {visibleSuggestions.map((suggestion, index) => (
                <motion.div
                  key={suggestion.id}
                  data-testid="suggestion-card"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: MOTION_DURATION.normal / 1000,
                    ease: MOTION_EASING.easeOut,
                    delay: index * 0.05,
                  }}
                >
                  <RoomCard
                    room={mapSuggestionToRoomCardProps(suggestion)}
                    hotelSlug={output.hotelSlug}
                    checkIn={suggestion.checkIn ? toISODate(suggestion.checkIn) : checkInStr}
                    checkOut={suggestion.checkOut ? toISODate(suggestion.checkOut) : checkOutStr}
                    isSearchingDates={true}
                    hotel={{ tax_rate: output.pricing?.taxRate }}
                    totalRooms={output.totalHotelRooms}
                    availableCount={visibleSuggestions.length}
                  />
                </motion.div>
              ))}
            </div>
          )}

          {/* Ver otras habitaciones */}
          {output.showOtherRooms && (
            <Link
              href={output.breadcrumb.href}
              className="inline-flex items-center gap-1 text-sm font-bold text-brand-600 hover:text-brand-500 transition-colors"
            >
              {t('ota.showcase.seeOtherRooms')} <ArrowRight size={14} />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

