'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { DayPicker, DateRange } from 'react-day-picker';
import { format, parseISO, isValid, startOfDay, addDays, addWeeks, addMonths, nextSaturday, nextSunday } from 'date-fns';
import { ChevronDown, ChevronUp, Calendar } from 'lucide-react';
import { getDateFnsLocale } from '@/lib/date-locale';
import type { QuickDatePreset } from '@/types';

import 'react-day-picker/dist/style.css';

interface InlineDatePickerProps {
  checkIn?: string | null;
  checkOut?: string | null;
  hotelId?: string;
  onChange?: (range: { from: Date; to: Date }) => void;
  availableDates?: string[];
  bookedDates?: string[];
  defaultExpanded?: boolean;
  className?: string;
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
        label: 'Este fin de semana',
        tooltip: 'Selecciona fechas predefinidas para reservar más rápido',
        getDates: () => {
          const from = nextSaturday(today);
          const to = nextSunday(from);
          return { from, to };
        },
      },
      {
        label: 'Próxima semana',
        tooltip: 'Selecciona fechas predefinidas para reservar más rápido',
        getDates: () => {
          const from = addWeeks(today, 1);
          const to = addDays(from, 1);
          return { from, to };
        },
      },
      {
        label: 'Próximo mes',
        tooltip: 'Selecciona fechas predefinidas para reservar más rápido',
        getDates: () => {
          const from = addMonths(today, 1);
          const to = addDays(from, 1);
          return { from, to };
        },
      },
    ],
    [today],
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

  const bookedSet = useMemo(() => new Set(bookedDates), [bookedDates]);
  const availableSet = useMemo(() => new Set(availableDates), [availableDates]);

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
          {t('ota.search.selectDates')}
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

      {isExpanded && (
        <div id="inline-date-picker-content" className="mt-3 space-y-3">
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

          {/* Calendar */}
          <div className="modal-calendar">
            <DayPicker
              mode="range"
              selected={range}
              onSelect={handleSelect}
              locale={dateLocale}
              numberOfMonths={1}
              disabled={{ before: today }}
              modifiers={{
                available: isDateAvailable,
                booked: isDateBooked,
              }}
              modifiersClassNames={{
                available: 'bg-success/20 text-success-foreground',
                booked: 'bg-destructive/20 text-destructive-foreground line-through',
                selected: 'bg-brand-600 text-primary-foreground font-bold rounded-[var(--radius-squircle-lg)]',
                range_middle: 'bg-brand-50 text-brand-900 rounded-none',
                range_start: 'rounded-l-xl rounded-r-none',
                range_end: 'rounded-r-xl rounded-l-none',
              }}
              className="text-foreground font-sans"
            />
          </div>

          {/* Availability legend */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-success" />
              <span>Disponible</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-destructive" />
              <span>Ocupado</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-muted" />
              <span>Pasado</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
