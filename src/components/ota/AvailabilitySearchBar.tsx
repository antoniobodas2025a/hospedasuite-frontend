'use client';

import React, { useState, useRef, useEffect, useTransition, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Calendar as CalendarIcon, X, Loader2, CheckCircle2, SlidersHorizontal, Tag, DollarSign, Users as UsersIcon, Bed } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DayPicker, DateRange } from 'react-day-picker';
import { format, parseISO, isValid, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { mac2026Default as springPopover, springSnappy, springLayout } from '@/lib/mac2026/spring';
import { GlassPanel } from '@/components/ui/glass';
import { ROOM_AMENITY_REGISTRY } from '@/lib/amenity-registry';
import 'react-day-picker/dist/style.css'; 

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
  /** When true, renders in compact sticky mode (smaller padding, optimized popover) */
  sticky?: boolean;
  /** Room data to calculate dynamic filter ranges */
  rooms?: RoomItem[];
  /** Navigation sections for unified sticky bar */
  navSections?: NavSection[];
}

export default function AvailabilitySearchBar({ sticky = false, rooms = [], navSections = [] }: AvailabilitySearchBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  // Máquina de Estados Globales
  const [activePopover, setActivePopover] = useState<'dates' | 'filters' | null>(null);
  const [isPending, startTransition] = useTransition();
  const [popoverPosition, setPopoverPosition] = useState<'below' | 'above'>('below');
  
  // Nav section tracking
  const [activeSection, setActiveSection] = useState(navSections[0]?.id ?? '');
  const navIoRef = useRef<IntersectionObserver | null>(null);

  // IntersectionObserver for active section detection
  useEffect(() => {
    if (navSections.length === 0) return;
    const hasIO = typeof IntersectionObserver !== 'undefined';

    if (hasIO) {
      const observer = new IntersectionObserver(
        (entries) => {
          for (let i = entries.length - 1; i >= 0; i--) {
            if (entries[i].isIntersecting) {
              setActiveSection(entries[i].target.id);
              break;
            }
          }
        },
        { rootMargin: '-160px 0px -60% 0px', threshold: 0 }
      );

      navSections.forEach((section) => {
        const el = document.getElementById(section.id);
        if (el) observer.observe(el);
      });

      navIoRef.current = observer;
      return () => { observer.disconnect(); navIoRef.current = null; };
    }
  }, [navSections]);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const y = el.offsetTop - 120;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };
  
  // Hidratación Segura: Fechas
  const [date, setDate] = useState<DateRange | undefined>(() => {
    const checkinParam = searchParams.get('checkin');
    const checkoutParam = searchParams.get('checkout');
    if (checkinParam && checkoutParam) {
      const parsedFrom = parseISO(checkinParam);
      const parsedTo = parseISO(checkoutParam);
      if (isValid(parsedFrom) && isValid(parsedTo)) return { from: parsedFrom, to: parsedTo };
    }
    return undefined;
  });

  // Hidratación Segura: Filtros de Habitación
  const prices = rooms.map((r) => r.price_per_night || r.price || 0);
  const maxPossiblePrice = prices.length > 0 ? Math.max(...prices) : 0;
  const maxPossibleCapacity = rooms.length > 0 ? Math.max(...rooms.map((r) => r.capacity || 0)) : 0;
  const maxPossibleBeds = rooms.length > 0 ? Math.max(...rooms.map((r) => r.beds || 0)) : 0;
  const bedsRangeCount = Math.max(4, Math.min(maxPossibleBeds, 6));

  const [maxPrice, setMaxPrice] = useState<number | null>(() => {
    const p = searchParams.get('max_price');
    return p ? Number(p) : null;
  });
  const [minCapacity, setMinCapacity] = useState<number | null>(() => {
    const c = searchParams.get('min_capacity');
    return c ? Number(c) : null;
  });
  const [minBeds, setMinBeds] = useState<number | null>(() => {
    const b = searchParams.get('min_beds');
    return b ? Number(b) : null;
  });
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(() => {
    const a = searchParams.get('amenities');
    return a ? a.split(',').filter(Boolean) : [];
  });

  const today = startOfDay(new Date());

  // Listener para cerrar cualquier Popover orgánicamente
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (!document.contains(target)) return;
      if (popoverRef.current && !popoverRef.current.contains(target)) {
        setActivePopover(null);
      }
    }
    if (activePopover) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activePopover]);

  // Detectar posición del viewport para posicionar popover arriba o abajo
  useEffect(() => {
    if (!activePopover || !triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const popoverHeight = activePopover === 'dates' ? 360 : 450;

    if (spaceBelow < popoverHeight && spaceAbove > spaceBelow) {
      setPopoverPosition('above');
    } else {
      setPopoverPosition('below');
    }
  }, [activePopover]);

  // 🚀 MOTOR DE INYECCIÓN ASÍNCRONA (A LA URL)
  const triggerSearch = (from: Date | undefined, to: Date | undefined) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (from && to) {
      params.set('checkin', format(from, 'yyyy-MM-dd'));
      params.set('checkout', format(to, 'yyyy-MM-dd'));
    } else {
      params.delete('checkin');
      params.delete('checkout');
    }

    // Filtros
    if (maxPrice !== null) params.set('max_price', maxPrice.toString());
    else params.delete('max_price');

    if (minCapacity !== null) params.set('min_capacity', minCapacity.toString());
    else params.delete('min_capacity');

    if (minBeds !== null) params.set('min_beds', minBeds.toString());
    else params.delete('min_beds');

    if (selectedAmenities.length > 0) params.set('amenities', selectedAmenities.join(','));
    else params.delete('amenities');

    params.delete('showRoom');

    startTransition(() => {
      router.push(`?${params.toString()}`, { scroll: false });
    });
  };

  // 🎯 MANEJADORES DE ESTADO
  const handleSelectDates = (newDate: DateRange | undefined) => {
    if (newDate?.from && newDate?.to) {
      if (newDate.from.getTime() === newDate.to.getTime()) {
        setDate({ from: newDate.from, to: undefined });
        return;
      }
      setDate(newDate);
      setActivePopover(null);
      triggerSearch(newDate.from, newDate.to);
    } else {
      setDate(newDate);
    }
  };

  const handleApplyFilters = () => {
    setActivePopover(null);
    triggerSearch(date?.from, date?.to);
  };

  const toggleAmenity = (id: string) => {
    const updated = selectedAmenities.includes(id)
      ? selectedAmenities.filter((a) => a !== id)
      : [...selectedAmenities, id];
    setSelectedAmenities(updated);
  };

  const hasActiveFilters = maxPrice !== null || minCapacity !== null || minBeds !== null || selectedAmenities.length > 0;
  const filterCount = [maxPrice, minCapacity, minBeds, ...selectedAmenities].filter(Boolean).length;

  // Live results counter (same logic as RoomsListWithFilters)
  const matchingCount = useMemo(() => {
    if (!hasActiveFilters) return rooms.length;
    return rooms.filter((room) => {
      const price = room.price_per_night || room.price || 0;
      const capacity = room.capacity || 0;
      const beds = room.beds || 0;
      if (maxPrice !== null && price > maxPrice) return false;
      if (minCapacity !== null && capacity < minCapacity) return false;
      if (minBeds !== null && beds < minBeds) return false;
      if (selectedAmenities.length > 0) {
        const roomAmenities = room.amenities || [];
        if (!selectedAmenities.every((a) => roomAmenities.includes(a))) return false;
      }
      return true;
    }).length;
  }, [rooms, maxPrice, minCapacity, minBeds, selectedAmenities, hasActiveFilters]);

  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDate(undefined);
    setMaxPrice(null);
    setMinCapacity(null);
    setMinBeds(null);
    setSelectedAmenities([]);
    setActivePopover(null);
    
    const params = new URLSearchParams(searchParams.toString());
    params.delete('checkin');
    params.delete('checkout');
    params.delete('max_price');
    params.delete('min_capacity');
    params.delete('min_beds');
    params.delete('amenities');
    params.delete('showRoom');
    
    startTransition(() => {
      router.push(`?${params.toString()}`, { scroll: false });
    });
  };

  // Lexical Formaters
  const displayRange = () => {
    if (date?.from) {
      if (!date.to) return format(date.from, "dd 'de' MMM", { locale: es }) + " — Salida";
      return `${format(date.from, "dd MMM", { locale: es })} — ${format(date.to, "dd MMM", { locale: es })}`;
    }
    return "Llegada — Salida";
  };

  return (
    <div className="relative w-full z-[var(--z-dropdown)]" ref={popoverRef}>
      
      {/* 🔮 UNIFIED STICKY BAR: 2/3 Search + 1/3 Nav */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-3">
        
        {/* SEARCH PILL — 2/3 width on desktop */}
        <div 
          ref={triggerRef}
          className={cn(
            "flex flex-col sm:flex-row items-stretch sm:items-center bg-card rounded-[var(--radius-squircle-2xl)] sm:rounded-full transition-all duration-300 w-full lg:w-2/3",
            sticky ? "p-1.5 sm:p-1" : "p-2",
            activePopover ? "ring-2 ring-ring shadow-xl" : "hover:border-border hover:shadow-md",
            isPending && "opacity-70 pointer-events-none grayscale-[0.2]"
          )}
        >
        
        {/* ZONA 1: FECHAS */}
        <div 
          onClick={() => !isPending && setActivePopover(activePopover === 'dates' ? null : 'dates')}
          className={cn(
            "flex-1 flex items-center gap-4 cursor-pointer hover:bg-muted transition-colors",
            sticky
              ? "px-3 py-2 sm:py-1.5 rounded-t-[var(--radius-squircle-xl)] sm:rounded-l-full sm:rounded-r-none"
              : "px-4 py-3 sm:py-2 rounded-t-[var(--radius-squircle-xl)] sm:rounded-l-full sm:rounded-r-none"
          )}
        >
          <div className={cn(
            "rounded-full bg-brand-50 flex items-center justify-center shrink-0",
            sticky ? "size-8" : "size-10"
          )}>
            {isPending ? <Loader2 size={sticky ? 14 : 18} className="text-brand-600 animate-spin" /> : 
             (date?.from && date?.to ? <CheckCircle2 size={sticky ? 14 : 18} className="text-secondary" /> : <CalendarIcon size={sticky ? 14 : 18} className="text-brand-600" />)}
          </div>
          <div className="flex flex-col">
            <span className={cn(
              "font-bold text-muted-foreground uppercase tracking-widest",
              sticky ? "text-[10px]" : "text-xs"
            )}>Estadía</span>
            <span className={cn(
              "tracking-tight",
              sticky ? "text-sm" : "text-base",
              date?.from ? "text-foreground font-bold" : "text-muted-foreground font-medium"
            )}>
              {displayRange()}
            </span>
          </div>
        </div>

        {/* DIVISOR */}
        <div className={cn(
          "bg-border mx-0 sm:mx-2 hidden sm:block",
          sticky ? "h-px w-full sm:w-px sm:h-8" : "h-px w-full sm:w-px sm:h-10"
        )}></div>
        <div className={cn(
          "bg-muted mx-0 sm:mx-2 block sm:hidden my-1",
          sticky ? "h-px w-full sm:h-6" : "h-px w-full sm:h-8"
        )}></div>

        {/* ZONA 2: FILTROS (Solo visible si hay habitaciones) */}
        {rooms.length >= 3 && (
          <>
            <div className={cn(
              "bg-border mx-0 sm:mx-2 hidden sm:block",
              sticky ? "h-px w-full sm:w-px sm:h-8" : "h-px w-full sm:w-px sm:h-10"
            )}></div>
            <div 
              onClick={() => !isPending && setActivePopover(activePopover === 'filters' ? null : 'filters')}
              className={cn(
                "flex items-center gap-2 cursor-pointer hover:bg-muted transition-colors",
                sticky
                  ? "px-3 py-2 sm:py-1.5 rounded-b-[var(--radius-squircle-xl)] sm:rounded-r-full sm:rounded-l-none"
                  : "px-4 py-3 sm:py-2 rounded-b-[var(--radius-squircle-xl)] sm:rounded-r-full sm:rounded-l-none",
                hasActiveFilters && "bg-brand-50/50"
              )}
            >
              <div className={cn(
                "rounded-full flex items-center justify-center shrink-0",
                hasActiveFilters ? "bg-brand-500" : "bg-brand-50",
                sticky ? "size-8" : "size-10"
              )}>
                <SlidersHorizontal size={sticky ? 14 : 18} className={hasActiveFilters ? "text-white" : "text-brand-600"} />
              </div>
              <div className="flex flex-col">
                <span className={cn(
                  "font-bold uppercase tracking-widest",
                  sticky ? "text-[10px]" : "text-xs",
                  hasActiveFilters ? "text-brand-600" : "text-muted-foreground"
                )}>Filtros</span>
                <span className={cn(
                  "tracking-tight font-bold",
                  sticky ? "text-sm" : "text-base",
                  hasActiveFilters ? "text-brand-600" : "text-foreground"
                )}>
                  {filterCount > 0 ? `${filterCount} activo${filterCount > 1 ? 's' : ''}` : 'Refinar'}
                </span>
              </div>
              <AnimatePresence>
              {hasActiveFilters && (
                <motion.span 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                  className="size-5 rounded-full bg-brand-500 text-white flex items-center justify-center text-[10px] font-black ml-1"
                >
                  {filterCount}
                </motion.span>
              )}
              </AnimatePresence>
            </div>
          </>
        )}
        </div>

        {/* FILTER PILLS — Individual close buttons below search bar */}
        <AnimatePresence>
        {hasActiveFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="flex flex-wrap items-center gap-2 mt-2 overflow-hidden"
          >
            {/* Precio pill */}
            {maxPrice !== null && (
              <motion.span
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={springSnappy()}
                className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full bg-muted/80 border border-border text-xs font-medium text-foreground"
              >
                <DollarSign size={12} className="text-muted-foreground" />
                <span>Hasta ${maxPrice.toLocaleString()}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); setMaxPrice(null); triggerSearch(date?.from, date?.to); }}
                  className="size-4 rounded-full flex items-center justify-center hover:bg-destructive/20 hover:text-destructive transition-colors"
                  title="Quitar filtro de precio"
                >
                  <X size={10} strokeWidth={3} />
                </button>
              </motion.span>
            )}

            {/* Capacidad pill */}
            {minCapacity !== null && (
              <motion.span
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={springSnappy()}
                className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full bg-muted/80 border border-border text-xs font-medium text-foreground"
              >
                <UsersIcon size={12} className="text-muted-foreground" />
                <span>Cap. mín. {minCapacity}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); setMinCapacity(null); triggerSearch(date?.from, date?.to); }}
                  className="size-4 rounded-full flex items-center justify-center hover:bg-destructive/20 hover:text-destructive transition-colors"
                  title="Quitar filtro de capacidad"
                >
                  <X size={10} strokeWidth={3} />
                </button>
              </motion.span>
            )}

            {/* Camas pill */}
            {minBeds !== null && (
              <motion.span
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={springSnappy()}
                className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full bg-muted/80 border border-border text-xs font-medium text-foreground"
              >
                <Bed size={12} className="text-muted-foreground" />
                <span>Mín. {minBeds} cama{minBeds > 1 ? 's' : ''}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); setMinBeds(null); triggerSearch(date?.from, date?.to); }}
                  className="size-4 rounded-full flex items-center justify-center hover:bg-destructive/20 hover:text-destructive transition-colors"
                  title="Quitar filtro de camas"
                >
                  <X size={10} strokeWidth={3} />
                </button>
              </motion.span>
            )}

            {/* Amenidades pills */}
            {selectedAmenities.map((amenityId) => {
              const amenity = Object.values(ROOM_AMENITY_REGISTRY).find(a => a.id === amenityId);
              if (!amenity) return null;
              return (
                <motion.span
                  key={amenityId}
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={springSnappy()}
                  className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full bg-muted/80 border border-border text-xs font-medium text-foreground"
                >
                  <Tag size={12} className="text-muted-foreground" />
                  <span>{amenity.label}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleAmenity(amenityId); triggerSearch(date?.from, date?.to); }}
                    className="size-4 rounded-full flex items-center justify-center hover:bg-destructive/20 hover:text-destructive transition-colors"
                    title={`Quitar filtro ${amenity.label}`}
                  >
                    <X size={10} strokeWidth={3} />
                  </button>
                </motion.span>
              );
            })}

            {/* Clear all */}
            <motion.button
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={springSnappy()}
              onClick={clearAll}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
            >
              <X size={10} strokeWidth={2.5} />
              Limpiar todo
            </motion.button>
          </motion.div>
        )}
        </AnimatePresence>

        {/* NAV TABS PILL — 1/3 width on desktop, full width on mobile */}
        {navSections.length > 0 && (
          <nav className="hidden lg:flex items-center gap-1 bg-card rounded-full px-1.5 py-1 border border-border/30 shadow-sm w-1/3 justify-center">
            {navSections.map((section) => {
              const isActive = section.id === activeSection;
              return (
                <motion.button
                  key={section.id}
                  onClick={() => scrollToSection(section.id)}
                  whileTap={{ scale: 0.95 }}
                  transition={springSnappy()}
                  className={cn(
                    "relative shrink-0 px-4 py-2 text-sm font-medium rounded-[var(--radius-squircle-lg)] transition-colors duration-200",
                    isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                  aria-current={isActive ? 'true' : undefined}
                >
                  {isActive && (
                    <motion.div
                      layoutId="subnav-active-bg"
                      className="absolute inset-0 bg-foreground/8"
                      transition={springLayout()}
                      style={{ borderRadius: 12 }}
                    />
                  )}
                  <span className="relative z-10">{section.label}</span>
                </motion.button>
              );
            })}
          </nav>
        )}
      </div>

      {/* 📅 & 👥 & ⚙️ POPOVERS (Vistas Flotantes) */}
      <AnimatePresence>
        
        {/* POPOVER DE FECHAS */}
        {activePopover === 'dates' && (
          <motion.div 
            initial={{ opacity: 0, y: popoverPosition === 'above' ? 10 : -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: popoverPosition === 'above' ? 10 : -10, scale: 0.95 }}
            transition={springPopover}
            className={cn(
              "absolute z-[var(--z-popover)] date-picker-b2c",
              popoverPosition === 'above'
                ? "bottom-full mb-2 left-0 w-full md:w-auto md:left-1/2 md:-translate-x-1/2"
                : "top-full mt-2 left-0 w-full md:w-auto md:left-1/2 md:-translate-x-1/2"
            )}
          >
            <GlassPanel className="p-4 sm:p-6 ring-1 ring-foreground/5 bg-background/95 backdrop-blur-xl">
              <DayPicker
                mode="range"
                selected={date}
                onSelect={handleSelectDates}
                locale={es}
                numberOfMonths={typeof window !== 'undefined' && window.innerWidth > 768 ? 2 : 1}
                disabled={{ before: today }}
                className="text-foreground font-sans"
                modifiersClassNames={{
                  selected: 'bg-brand-600 text-primary-foreground font-bold shadow-md rounded-[var(--radius-squircle-lg)]',
                  range_middle: 'bg-brand-50 text-brand-900 rounded-none',
                  range_start: 'rounded-l-xl rounded-r-none',
                  range_end: 'rounded-r-xl rounded-l-none'
                }}
              />
            </GlassPanel>
          </motion.div>
        )}

        {/* POPOVER DE FILTROS */}
        {activePopover === 'filters' && (
          <motion.div 
            initial={{ opacity: 0, y: popoverPosition === 'above' ? 10 : -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: popoverPosition === 'above' ? 10 : -10, scale: 0.95 }}
            transition={springPopover}
            className={cn(
              "absolute z-[var(--z-popover)]",
              popoverPosition === 'above'
                ? "bottom-full mb-2 left-0 w-full md:w-auto md:left-1/2 md:-translate-x-1/2"
                : "top-full mt-2 left-0 w-full md:w-auto md:left-1/2 md:-translate-x-1/2"
            )}
          >
            <GlassPanel className="p-6 ring-1 ring-foreground/5 bg-background/95 backdrop-blur-xl">
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-foreground tracking-tight text-lg">Refinar búsqueda</h3>
                  {hasActiveFilters && (
                    <button 
                      onClick={() => { setMaxPrice(null); setMinCapacity(null); setMinBeds(null); setSelectedAmenities([]); triggerSearch(date?.from, date?.to); }}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X size={12} /> Limpiar
                    </button>
                  )}
                </div>

                {/* Precio */}
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 block">
                    Precio máximo: {maxPrice !== null ? `$${maxPrice.toLocaleString()}` : 'Sin límite'}
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={maxPossiblePrice}
                    step={10000}
                    value={maxPrice ?? maxPossiblePrice}
                    onChange={(e) => setMaxPrice(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground/60 mt-1">
                    <span>$0</span>
                    <span>${maxPossiblePrice.toLocaleString()}</span>
                  </div>
                </div>

                {/* Capacidad */}
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 block">
                    Capacidad mínima: {minCapacity || 'Cualquiera'}
                  </label>
                  <div className="flex gap-2">
                    {Array.from({ length: Math.min(maxPossibleCapacity, 8) }, (_, i) => i + 1).map((cap) => (
                      <motion.button
                        key={cap}
                        onClick={() => setMinCapacity(minCapacity === cap ? null : cap)}
                        whileTap={{ scale: 0.9 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                        className={cn(
                          'size-10 rounded-[var(--radius-squircle-lg)] text-sm font-bold transition-all',
                          minCapacity === cap
                            ? 'bg-primary text-primary-foreground shadow-md'
                            : 'bg-muted text-muted-foreground border border-border hover:border-brand-300',
                        )}
                      >
                        {cap}
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Camas */}
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 block">
                    Camas mínimas: {minBeds || 'Cualquiera'}
                  </label>
                  <div className="flex gap-2">
                    {Array.from({ length: bedsRangeCount }, (_, i) => i + 1).map((bed) => (
                      <motion.button
                        key={bed}
                        onClick={() => setMinBeds(minBeds === bed ? null : bed)}
                        whileTap={{ scale: 0.9 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                        className={cn(
                          'size-10 rounded-[var(--radius-squircle-lg)] text-sm font-bold transition-all',
                          minBeds === bed
                            ? 'bg-primary text-primary-foreground shadow-md'
                            : 'bg-muted text-muted-foreground border border-border hover:border-brand-300',
                        )}
                      >
                        {bed}
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Amenidades */}
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 block">
                    Amenidades
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {Object.values(ROOM_AMENITY_REGISTRY).map((amenity) => (
                      <motion.button
                        key={amenity.id}
                        onClick={() => toggleAmenity(amenity.id)}
                        whileTap={{ scale: 0.95 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                        className={cn(
                          'px-3 py-1.5 rounded-[var(--radius-squircle-md)] text-xs font-medium transition-all',
                          selectedAmenities.includes(amenity.id)
                            ? 'bg-brand-50 text-brand-700 border border-brand-200'
                            : 'bg-muted text-muted-foreground border border-border hover:border-border/80',
                        )}
                      >
                        {amenity.label}
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Live counter */}
                <div className="flex items-center justify-between pt-2 border-t border-border/50">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "size-2 rounded-full transition-colors",
                      matchingCount > 0 ? "bg-secondary" : "bg-muted-foreground/30"
                    )} />
                    <span className="text-xs font-medium text-muted-foreground">
                      {matchingCount} {matchingCount === 1 ? 'habitación disponible' : 'habitaciones disponibles'}
                    </span>
                  </div>
                  {hasActiveFilters && (
                    <span className="text-[10px] text-muted-foreground/50">
                      de {rooms.length}
                    </span>
                  )}
                </div>

                {/* Botón de Aplicar */}
                <div className="pt-4 border-t border-border mt-2">
                  <motion.button 
                    onClick={handleApplyFilters}
                    whileTap={{ scale: 0.96 }}
                    transition={springSnappy()}
                    className="w-full bg-foreground hover:bg-primary/90 text-primary-foreground font-bold py-4 rounded-[var(--radius-squircle-2xl)] transition-all shadow-md"
                  >
                    Aplicar filtros
                  </motion.button>
                </div>
              </div>
            </GlassPanel>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
