'use client';

import React, { useState, useRef, useEffect, useTransition, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Calendar as CalendarIcon, Loader2, CheckCircle2, SlidersHorizontal, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DayPicker, DateRange } from 'react-day-picker';
import { format, parseISO, isValid, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { mac2026Default as springPopover, springSnappy, springLayout, springGentle } from '@/lib/mac2026/spring';
import { GlassPanel } from '@/components/ui/glass';
import GuestSelector from '@/components/ota/GuestSelector';
import RefinementPanel from '@/components/ota/RefinementPanel';
import 'react-day-picker/dist/style.css';

// ── Types ─────────────────────────────────────────────────────────────────────

interface RoomItem {
  id: string;
  name: string;
  price: number;
  price_per_night?: number;
  capacity?: number;
  beds?: number;
  amenities?: string[];
}

interface NavSection {
  id: string;
  label: string;
}

interface AvailabilitySearchBarProps {
  sticky?: boolean;
  rooms?: RoomItem[];
  navSections?: NavSection[];
}

// ── URL builder ───────────────────────────────────────────────────────────────

function buildUrl(
  currentParams: URLSearchParams,
  overrides: {
    checkin?: Date;
    checkout?: Date;
    guests?: number;
    maxPrice?: number | null;
    minBeds?: number | null;
    selectedAmenities?: string[];
  }
): string {
  const p = new URLSearchParams(currentParams.toString());
  const { checkin, checkout, guests, maxPrice, minBeds, selectedAmenities } = overrides;

  if (checkin && checkout) { p.set('checkin', format(checkin, 'yyyy-MM-dd')); p.set('checkout', format(checkout, 'yyyy-MM-dd')); }
  else { p.delete('checkin'); p.delete('checkout'); }

  if (guests !== undefined && guests > 0) { p.set('guests', guests.toString()); p.set('min_capacity', guests.toString()); }
  else { p.delete('guests'); p.delete('min_capacity'); }

  if (maxPrice !== null && maxPrice !== undefined) p.set('max_price', maxPrice.toString());
  else p.delete('max_price');
  if (minBeds !== null && minBeds !== undefined) p.set('min_beds', minBeds.toString());
  else p.delete('min_beds');
  if (selectedAmenities && selectedAmenities.length > 0) p.set('amenities', selectedAmenities.join(','));
  else p.delete('amenities');

  p.delete('showRoom');
  return `?${p.toString()}`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AvailabilitySearchBar({
  sticky = false,
  rooms = [],
  navSections = [],
}: AvailabilitySearchBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const navIoRef = useRef<IntersectionObserver | null>(null);

  // Active popover
  const [activePopover, setActivePopover] = useState<'dates' | 'guests' | null>(null);
  const [isPending, startTransition] = useTransition();
  const [popoverPosition, setPopoverPosition] = useState<'below' | 'above'>('below');

  // Nav sections
  const [activeSection, setActiveSection] = useState(navSections[0]?.id ?? '');
  useEffect(() => {
    if (navSections.length === 0) return;
    if (typeof IntersectionObserver !== 'undefined') {
      const observer = new IntersectionObserver(
        (entries) => { for (let i = entries.length - 1; i >= 0; i--) { if (entries[i].isIntersecting) { setActiveSection(entries[i].target.id); break; } } },
        { rootMargin: '-160px 0px -60% 0px', threshold: 0 }
      );
      navSections.forEach((s) => { const el = document.getElementById(s.id); if (el) observer.observe(el); });
      navIoRef.current = observer;
      return () => { observer.disconnect(); navIoRef.current = null; };
    }
  }, [navSections]);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) window.scrollTo({ top: el.offsetTop - 120, behavior: 'smooth' });
  };

  // State: dates
  const [date, setDate] = useState<DateRange | undefined>(() => {
    const ci = searchParams.get('checkin'), co = searchParams.get('checkout');
    if (ci && co) { const f = parseISO(ci), t = parseISO(co); if (isValid(f) && isValid(t)) return { from: f, to: t }; }
    return undefined;
  });

  // State: guests
  const [guests, setGuests] = useState<number>(() => { const g = searchParams.get('guests'); return g ? Number(g) : 1; });

  // State: refinement
  const [maxPrice, setMaxPrice] = useState<number | null>(() => { const p = searchParams.get('max_price'); return p ? Number(p) : null; });
  const [minBeds, setMinBeds] = useState<number | null>(() => { const b = searchParams.get('min_beds'); return b ? Number(b) : null; });
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(() => { const a = searchParams.get('amenities'); return a ? a.split(',').filter(Boolean) : []; });
  const [showRefinement, setShowRefinement] = useState(false);

  const today = startOfDay(new Date());

  // Click outside -> close popover
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (!document.contains(target)) return;
      if (popoverRef.current && !popoverRef.current.contains(target)) setActivePopover(null);
    }
    if (activePopover) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activePopover]);

  // Above/below positioning
  useEffect(() => {
    if (!activePopover || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const popoverHeight = activePopover === 'dates' ? 360 : 280;
    setPopoverPosition(spaceBelow < popoverHeight && rect.top > spaceBelow ? 'above' : 'below');
  }, [activePopover]);

  // URL sync
  const pushUrl = useCallback(
    (overrides?: { checkin?: Date; checkout?: Date; guests?: number; maxPrice?: number | null; minBeds?: number | null; selectedAmenities?: string[] }) => {
      const url = buildUrl(searchParams, {
        checkin: overrides?.checkin ?? date?.from ?? undefined,
        checkout: overrides?.checkout ?? date?.to ?? undefined,
        guests: overrides?.guests ?? guests,
        maxPrice: overrides?.maxPrice ?? maxPrice,
        minBeds: overrides?.minBeds ?? minBeds,
        selectedAmenities: overrides?.selectedAmenities ?? selectedAmenities,
      });
      startTransition(() => router.push(url, { scroll: false }));
    },
     
    [searchParams, date, guests, maxPrice, minBeds, selectedAmenities, router]
  );

  // Handlers
  const handleSelectDates = (newDate: DateRange | undefined) => {
    if (newDate?.from && newDate?.to) {
      if (newDate.from.getTime() === newDate.to.getTime()) { setDate({ from: newDate.from, to: undefined }); return; }
      setDate(newDate);
      setActivePopover(null);
      if (guests > 0) pushUrl({ checkin: newDate.from, checkout: newDate.to, guests });
    } else setDate(newDate);
  };

  const handleGuestsChange = (value: number) => {
    setGuests(value);
    if (date?.from && date?.to) pushUrl({ checkin: date.from, checkout: date.to, guests: value });
    else pushUrl({ guests: value });
  };

  const handleMaxPriceChange = (v: number | null) => { setMaxPrice(v); pushUrl({ maxPrice: v }); };
  const handleMinBedsChange = (v: number | null) => { setMinBeds(v); pushUrl({ minBeds: v }); };
  const handleAmenitiesChange = (v: string[]) => { setSelectedAmenities(v); pushUrl({ selectedAmenities: v }); };
  const handleClearAllRefinement = () => { setMaxPrice(null); setMinBeds(null); setSelectedAmenities([]); pushUrl({ maxPrice: null, minBeds: null, selectedAmenities: [] }); };

  const handleClearAll = () => {
    setDate(undefined); setGuests(1);
    setMaxPrice(null); setMinBeds(null); setSelectedAmenities([]);
    setShowRefinement(false); setActivePopover(null);
    const p = new URLSearchParams(searchParams.toString());
    ['checkin', 'checkout', 'guests', 'min_capacity', 'max_price', 'min_beds', 'amenities', 'showRoom'].forEach(k => p.delete(k));
    startTransition(() => router.push(`?${p.toString()}`, { scroll: false }));
  };

  // Derived
  const hasActiveFilters = maxPrice !== null || minBeds !== null || selectedAmenities.length > 0;
  const filterCount = [maxPrice, minBeds, ...selectedAmenities].filter(Boolean).length;
  const showRefineButton = rooms.length > 0;

  const matchingCount = useMemo(() => {
    if (!hasActiveFilters) return rooms.length;
    return rooms.filter((room) => {
      const price = room.price_per_night || room.price || 0;
      const beds = room.beds || 0;
      if (maxPrice !== null && price > maxPrice) return false;
      if (minBeds !== null && beds < minBeds) return false;
      if (selectedAmenities.length > 0) {
        const roomAmenities = room.amenities || [];
        if (!selectedAmenities.every((a) => roomAmenities.includes(a))) return false;
      }
      return true;
    }).length;
  }, [rooms, maxPrice, minBeds, selectedAmenities, hasActiveFilters]);

  const displayRange = () => {
    if (date?.from) {
      if (!date.to) return format(date.from, "dd 'de' MMM", { locale: es }) + ' — Salida';
      return `${format(date.from, 'dd MMM', { locale: es })} — ${format(date.to, 'dd MMM', { locale: es })}`;
    }
    return 'Llegada — Salida';
  };
  const guestLabel = `${guests} huésped${guests > 1 ? 'es' : ''}`;

  // Shared style helpers
  const pillBase = (rounded: string) => cn(
    'flex-1 flex items-center gap-4 cursor-pointer hover:bg-muted transition-colors',
    sticky
      ? `px-3 py-2 sm:py-1.5 ${rounded}`
      : `px-4 py-3 sm:py-2 ${rounded}`
  );
  const iconCircle = cn('rounded-full bg-brand-50 flex items-center justify-center shrink-0', sticky ? 'size-8' : 'size-10');
  const labelClass = cn('font-bold text-muted-foreground uppercase tracking-widest', sticky ? 'text-[10px]' : 'text-xs');
  const valueClass = (active: boolean) => cn('tracking-tight', sticky ? 'text-sm' : 'text-base', active ? 'text-foreground font-bold' : 'text-muted-foreground font-medium');
  const ios = sticky ? 14 : 18;

  return (
    <div className="relative w-full z-[var(--z-dropdown)]" ref={popoverRef}>
      {/* UNIFIED STICKY BAR */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-3">
        {/* SEARCH PILL — 2/3 width */}
        <div
          ref={triggerRef}
          className={cn(
            'flex flex-col sm:flex-row items-stretch sm:items-center bg-card rounded-[var(--radius-squircle-2xl)] sm:rounded-full transition-all duration-300 w-full lg:w-2/3',
            sticky ? 'p-1.5 sm:p-1' : 'p-2',
            activePopover ? 'ring-2 ring-ring shadow-xl' : 'hover:border-border hover:shadow-md',
            isPending && 'opacity-70 pointer-events-none grayscale-[0.2]'
          )}
        >
          {/* ZONE 1: DATES */}
          <div
            onClick={() => !isPending && setActivePopover(activePopover === 'dates' ? null : 'dates')}
            role="button" aria-expanded={activePopover === 'dates'} aria-label="Seleccionar fechas de estadía"
            className={pillBase('rounded-t-[var(--radius-squircle-xl)] sm:rounded-l-full sm:rounded-r-none')}
          >
            <div className={iconCircle}>
              {isPending ? <Loader2 size={ios} className="text-brand-600 animate-spin" />
                : date?.from && date?.to ? <CheckCircle2 size={ios} className="text-secondary" />
                : <CalendarIcon size={ios} className="text-brand-600" />}
            </div>
            <div className="flex flex-col">
              <span className={labelClass}>Estadía</span>
              <span className={valueClass(!!date?.from)}>{displayRange()}</span>
            </div>
          </div>

          {/* DIVIDER */}
          <div className={cn('bg-border mx-0 sm:mx-2 hidden sm:block', sticky ? 'h-px w-full sm:w-px sm:h-8' : 'h-px w-full sm:w-px sm:h-10')} />
          <div className={cn('bg-muted mx-0 sm:mx-2 block sm:hidden my-1', sticky ? 'h-px w-full sm:h-6' : 'h-px w-full sm:h-8')} />

          {/* ZONE 2: GUESTS */}
          <div
            onClick={() => !isPending && setActivePopover(activePopover === 'guests' ? null : 'guests')}
            role="button" aria-expanded={activePopover === 'guests'} aria-label="Seleccionar número de huéspedes"
            className={pillBase('rounded-b-[var(--radius-squircle-xl)] sm:rounded-r-full sm:rounded-l-none')}
          >
            <div className={iconCircle}>
              <User size={ios} className="text-brand-600" />
            </div>
            <div className="flex flex-col">
              <span className={labelClass}>Huéspedes</span>
              <span className={valueClass(true)}>{guestLabel}</span>
            </div>
          </div>
        </div>

        {/* NAV TABS — 1/3 width */}
        {navSections.length > 0 && (
          <nav className="hidden lg:flex items-center gap-1 bg-card rounded-full px-1.5 py-1 border border-border/30 shadow-sm w-1/3 justify-center">
            {navSections.map((section) => {
              const isActive = section.id === activeSection;
              return (
                <motion.button
                  key={section.id} onClick={() => scrollToSection(section.id)}
                  whileTap={{ scale: 0.95 }} transition={springSnappy()}
                  className={cn('relative shrink-0 px-4 py-2 text-sm font-medium rounded-[var(--radius-squircle-lg)] transition-colors duration-200', isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground')}
                  aria-current={isActive ? 'true' : undefined}
                >
                  {isActive && <motion.div layoutId="subnav-active-bg" className="absolute inset-0 bg-foreground/8" transition={springLayout()} style={{ borderRadius: 12 }} />}
                  <span className="relative z-10">{section.label}</span>
                </motion.button>
              );
            })}
          </nav>
        )}
      </div>

      {/* REFINE BUTTON */}
      {showRefineButton && (
        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={springGentle()} className="mt-2">
          <button
            onClick={() => setShowRefinement((p) => !p)}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-squircle-xl)] text-sm font-semibold transition-all',
              showRefinement || hasActiveFilters ? 'bg-brand-50 text-brand-700 border border-brand-200' : 'bg-card/80 text-muted-foreground border border-border/30 hover:border-brand-300 hover:text-foreground'
            )}
            aria-expanded={showRefinement}
            aria-label={hasActiveFilters ? `Refinar búsqueda (${filterCount} filtro${filterCount > 1 ? 's' : ''} activo${filterCount > 1 ? 's' : ''})` : 'Refinar búsqueda'}
          >
            <SlidersHorizontal size={14} />
            <span>Refinar búsqueda</span>
            <AnimatePresence>
              {hasActiveFilters && (
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                  className="size-5 rounded-full bg-brand-500 text-white flex items-center justify-center text-[10px] font-black">{filterCount}</motion.span>
              )}
            </AnimatePresence>
          </button>
        </motion.div>
      )}

      {/* REFINEMENT PANEL */}
      <div className="mt-2">
        <RefinementPanel
          rooms={rooms} maxPrice={maxPrice} onMaxPriceChange={handleMaxPriceChange}
          minBeds={minBeds} onMinBedsChange={handleMinBedsChange}
          selectedAmenities={selectedAmenities} onAmenitiesChange={handleAmenitiesChange}
          onClearAll={handleClearAllRefinement} matchingCount={matchingCount} isOpen={showRefinement}
        />
      </div>

      {/* POPOVERS */}
      <AnimatePresence>
        {/* DATES POPOVER */}
        {activePopover === 'dates' && (
          <motion.div
            initial={{ opacity: 0, y: popoverPosition === 'above' ? 10 : -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: popoverPosition === 'above' ? 10 : -10, scale: 0.95 }}
            transition={springPopover}
            className={cn('absolute z-[var(--z-popover)] date-picker-b2c', popoverPosition === 'above' ? 'bottom-full mb-2 left-0 w-full md:w-auto md:left-1/2 md:-translate-x-1/2' : 'top-full mt-2 left-0 w-full md:w-auto md:left-1/2 md:-translate-x-1/2')}
          >
            <GlassPanel className="p-4 sm:p-6 ring-1 ring-foreground/5 bg-background/95 backdrop-blur-xl">
              <DayPicker
                mode="range" selected={date} onSelect={handleSelectDates}
                locale={es} numberOfMonths={typeof window !== 'undefined' && window.innerWidth > 768 ? 2 : 1}
                disabled={{ before: today }} className="text-foreground font-sans"
                modifiersClassNames={{
                  selected: 'bg-brand-600 text-primary-foreground font-bold shadow-md rounded-[var(--radius-squircle-lg)]',
                  range_middle: 'bg-brand-50 text-brand-900 rounded-none',
                  range_start: 'rounded-l-xl rounded-r-none', range_end: 'rounded-r-xl rounded-l-none',
                }}
              />
            </GlassPanel>
          </motion.div>
        )}

        {/* GUESTS POPOVER */}
        {activePopover === 'guests' && (
          <motion.div
            initial={{ opacity: 0, y: popoverPosition === 'above' ? 10 : -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: popoverPosition === 'above' ? 10 : -10, scale: 0.95 }}
            transition={springGentle()}
            className={cn('absolute z-[var(--z-popover)] w-full sm:w-80', popoverPosition === 'above' ? 'bottom-full mb-2 left-0 sm:left-auto sm:right-0' : 'top-full mt-2 left-0 sm:left-auto sm:right-0')}
          >
            <GlassPanel className="p-4 ring-1 ring-foreground/5 bg-background/95 backdrop-blur-xl">
              <GuestSelector value={guests} onChange={handleGuestsChange} min={1} max={20} />
            </GlassPanel>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
