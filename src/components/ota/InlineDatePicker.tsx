'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { DayPicker, DateRange } from 'react-day-picker';
import { format, parseISO, isValid, startOfDay, addDays, addWeeks, addMonths, nextSaturday, nextSunday } from 'date-fns';
import { ChevronDown, ChevronUp, Calendar, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getDateFnsLocale } from '@/lib/date-locale';
import { validatePrimaryColor } from '@/lib/calendar-theme';
import type { QuickDatePreset } from '@/types';

import 'react-day-picker/dist/style.css';

interface InlineDatePickerProps {
  checkIn?: string | null;
  checkOut?: string | null;
  hotelId?: string;
  onChange?: (range: { from: Date; to: Date } | undefined) => void;
  availableDates?: string[];
  bookedDates?: string[];
  defaultExpanded?: boolean;
  className?: string;
  primaryColor?: string;
}

function getStorageKey(hotelId: string | undefined): string | null {
  if (!hotelId) return null;
  return `booking_dates_${hotelId}`;
}

function loadSavedDates(hotelId: string | undefined): { from: string; to: string } | null {
  if (typeof window === 'undefined') return null;
  const key = getStorageKey(hotelId);
  if (!key) return null;

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { from?: string; to?: string };
    if (!parsed.from || !parsed.to) return null;

    const from = parseISO(parsed.from);
    const to = parseISO(parsed.to);
    const today = startOfDay(new Date());
    if (!isValid(from) || !isValid(to)) return null;
    if (from < today || to < today || to < from) return null;

    return { from: parsed.from, to: parsed.to };
  } catch {
    return null;
  }
}

function saveDates(hotelId: string | undefined, from: Date, to: Date): void {
  if (typeof window === 'undefined') return;
  const key = getStorageKey(hotelId);
  if (!key) return;

  try {
    window.localStorage.setItem(
      key,
      JSON.stringify({ from: format(from, 'yyyy-MM-dd'), to: format(to, 'yyyy-MM-dd') })
    );
  } catch {
    // Ignore storage errors (e.g. private mode quota)
  }
}

export default function InlineDatePicker({
  checkIn,
  checkOut,
  hotelId,
  onChange,
  availableDates = [],
  bookedDates = [],
  defaultExpanded = true,
  className,
  primaryColor,
}: InlineDatePickerProps) {
  const t = useTranslations();
  const locale = useLocale();
  const dateLocale = getDateFnsLocale(locale);
  const searchParams = useSearchParams();

  const today = startOfDay(new Date());

  const initialRange = useMemo(() => {
    const ci = checkIn ?? searchParams.get('checkin');
    const co = checkOut ?? searchParams.get('checkout');
    if (ci && co) {
      const from = parseISO(ci);
      const to = parseISO(co);
      if (isValid(from) && isValid(to)) return { from, to };
    }

    const saved = loadSavedDates(hotelId);
    if (saved) {
      const from = parseISO(saved.from);
      const to = parseISO(saved.to);
      if (isValid(from) && isValid(to)) return { from, to };
    }
    return undefined;
  }, [checkIn, checkOut, searchParams, hotelId]);

  const [range, setRange] = useState<DateRange | undefined>(initialRange);
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const handleSelect = useCallback(
    (newRange: DateRange | undefined) => {
      setRange(newRange);
      if (newRange?.from && newRange?.to) {
        saveDates(hotelId, newRange.from, newRange.to);
        if (onChange) {
          onChange({ from: newRange.from, to: newRange.to });
        }
      }
    },
    [onChange, hotelId],
  );

  const quickPresets: QuickDatePreset[] = useMemo(
    () => [
      {
        label: t('ota.datePreset.thisWeekend'),
        tooltip: t('ota.datePreset.tooltip'),
        getDates: () => {
          const from = nextSaturday(today);
          const to = nextSunday(from);
          return { from, to };
        },
      },
      {
        label: t('ota.datePreset.nextWeek'),
        tooltip: t('ota.datePreset.tooltip'),
        getDates: () => {
          const from = addWeeks(today, 1);
          const to = addDays(from, 1);
          return { from, to };
        },
      },
      {
        label: t('ota.datePreset.nextMonth'),
        tooltip: t('ota.datePreset.tooltip'),
        getDates: () => {
          const from = addMonths(today, 1);
          const to = addDays(from, 1);
          return { from, to };
        },
      },
    ],
    [today, t],
  );

  const handleQuickDate = useCallback(
    (preset: QuickDatePreset) => {
      const { from, to } = preset.getDates();
      const newRange = { from, to };
      setRange(newRange);
      saveDates(hotelId, from, to);
      if (onChange) onChange(newRange);
    },
    [onChange, hotelId],
  );

  const handleClear = useCallback(() => {
    setRange(undefined);
    if (onChange) onChange(undefined);
  }, [onChange]);

  const bookedSet = useMemo(() => new Set(bookedDates), [bookedDates]);
  const availableSet = useMemo(() => new Set(availableDates), [availableDates]);

  const displayRange = useMemo(() => {
    if (range?.from && range?.to) {
      return `${format(range.from, 'dd MMM', { locale: dateLocale })} — ${format(range.to, 'dd MMM', { locale: dateLocale })}`;
    }
    if (range?.from) {
      return `${format(range.from, 'dd MMM', { locale: dateLocale })} — ${t('ota.search.departure')}`;
    }
    return null;
  }, [range, dateLocale, t]);

  const isDateBooked = useCallback(
    (date: Date) => {
      const iso = format(date, 'yyyy-MM-dd');
      return bookedSet.has(iso);
    },
    [bookedSet],
  );

  const isDateAvailable = useCallback(
    (date: Date) => {
      const iso = format(date, 'yyyy-MM-dd');
      if (availableDates.length > 0) return availableSet.has(iso);
      return !isDateBooked(date) && date >= today;
    },
    [availableDates.length, availableSet, isDateBooked, today],
  );

  return (
    <div className={className} data-testid="inline-date-picker">
      {/* Header / toggle */}
      <button
        type="button"
        data-testid="inline-date-picker-toggle"
        onClick={() => setIsExpanded((prev) => !prev)}
        aria-expanded={isExpanded}
        aria-controls="inline-date-picker-content"
        className="w-full flex items-center justify-between p-3 text-sm font-bold text-foreground bg-muted/50 rounded-[var(--radius-squircle-lg)] hover:bg-muted transition-colors"
      >
        <span className="flex items-center gap-2">
          <Calendar size={16} className="text-brand-600" />
          {displayRange ?? t('ota.search.selectDates')}
          {range && (
            <span
              role="button"
              tabIndex={0}
              aria-label={t('ota.datePicker.clearDates')}
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  handleClear();
                }
              }}
              className="p-1 rounded-full hover:bg-muted transition-colors cursor-pointer"
            >
              <X size={14} className="text-muted-foreground" />
            </span>
          )}
        </span>
        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {/* Hidden inputs for SSR state hydration */}
      {range?.from && (
        <input data-testid="inline-date-picker-checkin" type="hidden" name="checkin" value={format(range.from, 'yyyy-MM-dd')} readOnly />
      )}
      {range?.to && (
        <input data-testid="inline-date-picker-checkout" type="hidden" name="checkout" value={format(range.to, 'yyyy-MM-dd')} readOnly />
      )}

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            id="inline-date-picker-content"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden"
          >
          {/* Quick dates */}
          <div className="flex flex-wrap gap-2">
            {quickPresets.map((preset) => (
              <button
                key={preset.label}
                type="button"
                title={preset.tooltip}
                onClick={() => handleQuickDate(preset)}
                className="px-3 py-1.5 text-xs font-semibold rounded-full border border-border bg-card hover:bg-muted transition-colors"
              >
                {preset.label}
              </button>
            ))}
          </div>

          {range?.from && !range?.to && (
            <p className="text-sm text-brand-600 font-medium">
              {t('ota.datePicker.selectCheckout')}
            </p>
          )}

          {/* Calendar */}
          <div
            className="modal-calendar"
            style={{
              '--rdp-accent-color': validatePrimaryColor(primaryColor) || 'var(--brand-600)',
            } as React.CSSProperties}
          >
            <DayPicker
              mode="range"
              selected={range}
              onSelect={handleSelect}
              locale={dateLocale}
              numberOfMonths={1}
              disabled={[
                { before: today },
                isDateBooked,
                ...(availableDates.length > 0 ? [(date: Date) => !isDateAvailable(date)] : []),
              ]}
              modifiers={{
                available: isDateAvailable,
                booked: isDateBooked,
              }}
              modifiersClassNames={{
                available: 'bg-background text-foreground border border-border hover:border-brand-400 hover:bg-brand-50',
                booked: 'bg-destructive/5 text-destructive border border-destructive/20 line-through opacity-60',
                disabled: 'bg-muted text-muted-foreground/40 border-transparent cursor-not-allowed',
                outside: 'text-muted-foreground/30',
                selected: 'text-primary-foreground font-bold shadow-md border-transparent',
                range_middle: 'text-brand-900 border-y border-transparent rounded-none',
                range_start: 'text-primary-foreground rounded-l-xl rounded-r-none border-transparent',
                range_end: 'text-primary-foreground rounded-r-xl rounded-l-none border-transparent',
              }}
              className="text-foreground font-sans"
            />
            <div aria-live="polite" role="status" className="sr-only">
              {!range?.from && t('ota.datePicker.noDatesSelected')}
              {range?.from && !range?.to && t('ota.datePicker.checkInSelected', { date: displayRange ?? '' })}
              {range?.from && range?.to && t('ota.datePicker.rangeSelected', { range: displayRange ?? '' })}
            </div>
          </div>

          {/* Availability legend */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-success" />
              <span>{t('ota.legend.available')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-destructive" />
              <span>{t('ota.legend.booked')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-muted" />
              <span>{t('ota.legend.past')}</span>
            </div>
          </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
