'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays, CheckCircle2, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { springGentle, springSnappy, progressiveReveal } from '@/lib/mac2026/spring';
import { DayPicker, DateRange } from 'react-day-picker';
import { format, parseISO, isValid, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import 'react-day-picker/dist/style.css';

// ============================================================================
// DIRECT BOOKING WIDGET — Mac 2026 Design System
//
// Pilares aplicados:
// - Squircle radii via CSS custom properties (--radius-squircle-2xl)
// - Spring physics: springGentle() para progressive reveal, springSnappy() para taps
// - progressiveReveal variants para accordion sections
// - whileTap spring feedback en elementos interactivos
// ============================================================================

interface DirectBookingWidgetProps {
  hotelName: string;
  rooms: Array<{
    id: string;
    name: string;
    price: number;
    capacity?: number;
    status: string;
  }>;
  checkIn?: string | null;
  checkOut?: string | null;
  cancellationPolicy?: string | null;
}

export default function DirectBookingWidget({
  hotelName,
  rooms,
  checkIn,
  checkOut,
  cancellationPolicy,
}: DirectBookingWidgetProps) {
  const router = useRouter();
  const [showPolicy, setShowPolicy] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Safe hydration for dates
  const [date, setDate] = useState<DateRange | undefined>(() => {
    if (checkIn && checkOut) {
      const parsedFrom = parseISO(checkIn);
      const parsedTo = parseISO(checkOut);
      if (isValid(parsedFrom) && isValid(parsedTo)) return { from: parsedFrom, to: parsedTo };
    }
    return undefined;
  });

  const today = startOfDay(new Date());

  // Close popover on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (!document.contains(target)) return;
      if (popoverRef.current && !popoverRef.current.contains(target)) {
        setShowPicker(false);
      }
    }
    if (showPicker) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPicker]);

  // Derived values
  const activeRooms = rooms.filter((r) => r.status === 'active');
  const minPrice = activeRooms.length > 0 ? Math.min(...activeRooms.map((r) => r.price)) : 0;
  const availableCount = activeRooms.length;

  let nights = 0;
  if (checkIn && checkOut) {
    const d1 = new Date(checkIn);
    const d2 = new Date(checkOut);
    nights = Math.max(1, Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 3600 * 24)));
  }
  const totalPrice = nights > 0 ? minPrice * nights : minPrice;

  const handleSelectDates = (newDate: DateRange | undefined) => {
    if (newDate?.from && newDate?.to) {
      // Prevent zero nights
      if (newDate.from.getTime() === newDate.to.getTime()) {
        setDate({ from: newDate.from, to: undefined });
        return;
      }
      setDate(newDate);
      setShowPicker(false);
      
      // Navigate with dates in URL
      const params = new URLSearchParams();
      params.set('checkin', format(newDate.from, 'yyyy-MM-dd'));
      params.set('checkout', format(newDate.to, 'yyyy-MM-dd'));
      router.push(`?${params.toString()}`);
    } else {
      setDate(newDate);
    }
  };

  const displayRange = () => {
    if (date?.from) {
      if (!date.to) return format(date.from, "dd 'de' MMM", { locale: es }) + ' — Salida';
      return `${format(date.from, 'dd MMM', { locale: es })} — ${format(date.to, 'dd MMM', { locale: es })}`;
    }
    return 'Llegada — Salida';
  };

  return (
    <div className="sticky top-10" ref={popoverRef}>
      <div className="bg-card rounded-[var(--radius-squircle-2xl)] shadow-lg shadow-muted/50 border border-border overflow-hidden">
        {/* Header */}
        <div className="p-6 pb-4">
          <div className="flex items-center gap-3 mb-4">
            <CalendarDays size={22} className="text-brand-500" />
            <h3 className="text-lg font-bold text-foreground">Selecciona tus Fechas</h3>
          </div>

          {/* Date selector button con spring press feedback */}
          <motion.button
            onClick={() => setShowPicker(!showPicker)}
            whileTap={{ scale: 0.97 }}
            transition={springSnappy()}
            className={cn(
              'w-full flex items-center gap-3 p-4 rounded-[var(--radius-squircle-2xl)] border transition-all text-left',
              checkIn && checkOut
                ? 'bg-secondary/10 border-secondary/30'
                : 'bg-muted/50 border-border hover:border-brand-300',
            )}
          >
            {checkIn && checkOut ? (
              <CheckCircle2 size={18} className="text-secondary shrink-0" />
            ) : (
              <Clock size={18} className="text-muted-foreground shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className={cn(
                'text-sm font-bold truncate',
                checkIn && checkOut ? 'text-foreground' : 'text-muted-foreground',
              )}>
                {displayRange()}
              </p>
              {nights > 0 && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {nights} noche{nights > 1 ? 's' : ''}
                </p>
              )}
            </div>
            {showPicker ? (
              <ChevronUp size={16} className="text-muted-foreground shrink-0" />
            ) : (
              <ChevronDown size={16} className="text-muted-foreground shrink-0" />
            )}
          </motion.button>
        </div>

        {/* DayPicker popover con progressiveReveal + springGentle */}
        <AnimatePresence>
          {showPicker && (
            <motion.div
              variants={progressiveReveal}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={springGentle()}
              className="overflow-hidden"
            >
              <div className="px-6 pb-4">
                <DayPicker
                  mode="range"
                  selected={date}
                  onSelect={handleSelectDates}
                  locale={es}
                  numberOfMonths={1}
                  disabled={{ before: today }}
                  className="text-foreground font-sans"
                  modifiersClassNames={{
                    selected: 'bg-brand-600 text-primary-foreground font-bold shadow-md rounded-[var(--radius-squircle-lg)]',
                    range_middle: 'bg-brand-50 text-brand-900 rounded-none',
                    range_start: 'rounded-l-xl rounded-r-none',
                    range_end: 'rounded-r-xl rounded-l-none',
                  }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Price summary */}
        {minPrice > 0 && (
          <div className="px-6 pb-4">
            <div className="bg-gradient-to-br from-brand-500 to-warm-600 rounded-[var(--radius-squircle-2xl)] p-4 text-primary-foreground">
              <p className="text-primary-foreground/70 text-[10px] font-bold uppercase tracking-widest mb-1">Desde</p>
              <div className="flex items-baseline gap-1">
                <p className="text-2xl font-black tracking-tight">${minPrice.toLocaleString('es-CO')}</p>
                <span className="text-primary-foreground/70 text-xs font-medium">COP/noche</span>
              </div>
              {nights > 0 && (
                <div className="mt-2 pt-2 border-t border-primary-foreground/20">
                  <p className="text-xs text-primary-foreground/70">
                    Total {nights} noche{nights > 1 ? 's' : ''}:{' '}
                    <span className="font-bold text-primary-foreground">${totalPrice.toLocaleString('es-CO')} COP</span>
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Availability */}
        {availableCount > 0 && (
          <div className="px-6 pb-4">
            <div className="flex items-center gap-2 text-sm">
              <div className="size-2 rounded-full bg-secondary animate-pulse" />
              <span className="text-muted-foreground">
                <span className="font-bold text-foreground">{availableCount}</span> disponible{availableCount > 1 ? 's' : ''}
              </span>
            </div>
          </div>
        )}

        {/* Cancellation policy — accordion con progressiveReveal + springGentle */}
        {cancellationPolicy && (
          <div className="px-6 pb-4 border-t border-border/40 pt-4">
            <motion.button
              onClick={() => setShowPolicy(!showPolicy)}
              whileTap={{ scale: 0.97 }}
              transition={springSnappy()}
              className="flex items-center justify-between w-full text-left"
            >
              <p className="text-xs font-bold text-foreground">Politica de cancelacion</p>
              {showPolicy ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
            </motion.button>
            <AnimatePresence>
              {showPolicy && (
                <motion.p
                  variants={progressiveReveal}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  transition={springGentle()}
                  className="text-[11px] text-muted-foreground mt-2 leading-relaxed"
                >
                  {cancellationPolicy}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Benefits */}
        <div className="px-6 pb-6 pt-2 space-y-2">
          <div className="flex items-start gap-2">
            <CheckCircle2 size={14} className="text-secondary shrink-0 mt-0.5" />
            <p className="text-[11px] text-muted-foreground">Mejor precio garantizado — sin comisiones</p>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 size={14} className="text-secondary shrink-0 mt-0.5" />
            <p className="text-[11px] text-muted-foreground">Confirmacion inmediata</p>
          </div>
        </div>
      </div>
    </div>
  );
}
