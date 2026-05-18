'use client';

import React, { useState, useRef, useEffect, useTransition, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Calendar as CalendarIcon, X, Loader2, CheckCircle2, Users, Plus, Minus, SlidersHorizontal } from 'lucide-react';
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
  const [activePopover, setActivePopover] = useState<'dates' | 'guests' | 'filters' | null>(null);
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

  // Hidratación Segura: Ocupación
  const [adults, setAdults] = useState(Number(searchParams.get('adults')) || 2);
  const [children, setChildren] = useState(Number(searchParams.get('children')) || 0);

  // Hidratación Segura: Filtros de Habitación
  const prices = rooms.map((r) => r.price_per_night || r.price || 0);
  const maxPossiblePrice = prices.length > 0 ? Math.max(...prices) : 0;
  const maxPossibleCapacity = rooms.length > 0 ? Math.max(...rooms.map((r) => r.capacity || 0)) : 0;

  const [maxPrice, setMaxPrice] = useState<number | null>(() => {
    const p = searchParams.get('max_price');
    return p ? Number(p) : null;
  });
  const [minCapacity, setMinCapacity] = useState<number | null>(() => {
    const c = searchParams.get('min_capacity');
    return c ? Number(c) : null;
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
    const popoverHeight = activePopover === 'dates' ? 360 : activePopover === 'filters' ? 450 : 400;

    if (spaceBelow < popoverHeight && spaceAbove > spaceBelow) {
      setPopoverPosition('above');
    } else {
      setPopoverPosition('below');
    }
  }, [activePopover]);

  // 🚀 MOTOR DE INYECCIÓN ASÍNCRONA (A LA URL)
  const triggerSearch = (from: Date | undefined, to: Date | undefined, a: number, c: number) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (from && to) {
      params.set('checkin', format(from, 'yyyy-MM-dd'));
      params.set('checkout', format(to, 'yyyy-MM-dd'));
    } else {
      params.delete('checkin');
      params.delete('checkout');
    }

    params.set('adults', a.toString());
    params.set('children', c.toString());

    // Filtros
    if (maxPrice !== null) params.set('max_price', maxPrice.toString());
    else params.delete('max_price');

    if (minCapacity !== null) params.set('min_capacity', minCapacity.toString());
    else params.delete('min_capacity');

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
      triggerSearch(newDate.from, newDate.to, adults, children);
    } else {
      setDate(newDate);
    }
  };

  const handleApplyGuests = () => {
    setActivePopover(null);
    triggerSearch(date?.from, date?.to, adults, children);
  };

  const handleApplyFilters = () => {
    setActivePopover(null);
    triggerSearch(date?.from, date?.to, adults, children);
  };

  const toggleAmenity = (id: string) => {
    const updated = selectedAmenities.includes(id)
      ? selectedAmenities.filter((a) => a !== id)
      : [...selectedAmenities, id];
    setSelectedAmenities(updated);
  };

  const hasActiveFilters = maxPrice !== null || minCapacity !== null || selectedAmenities.length > 0;
  const filterCount = [maxPrice, minCapacity, ...selectedAmenities].filter(Boolean).length;

  // Live results counter (same logic as RoomsListWithFilters)
  const matchingCount = useMemo(() => {
    if (!hasActiveFilters) return rooms.length;
    return rooms.filter((room) => {
      const price = room.price_per_night || room.price || 0;
      const capacity = room.capacity || 0;
      if (maxPrice !== null && price > maxPrice) return false;
      if (minCapacity !== null && capacity < minCapacity) return false;
      if (selectedAmenities.length > 0) {
        const roomAmenities = room.amenities || [];
        if (!selectedAmenities.every((a) => roomAmenities.includes(a))) return false;
      }
      return true;
    }).length;
  }, [rooms, maxPrice, minCapacity, selectedAmenities, hasActiveFilters]);

  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDate(undefined);
    setAdults(2);
    setChildren(0);
    setMaxPrice(null);
    setMinCapacity(null);
    setSelectedAmenities([]);
    setActivePopover(null);
    
    const params = new URLSearchParams(searchParams.toString());
    params.delete('checkin');
    params.delete('checkout');
    params.delete('adults');
    params.delete('children');
    params.delete('max_price');
    params.delete('min_capacity');
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

  const totalGuests = adults + children;

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

        {/* ZONA 2: HUÉSPEDES */}
        <div 
          onClick={() => !isPending && setActivePopover(activePopover === 'guests' ? null : 'guests')}
          className={cn(
            "flex-1 flex items-center justify-between cursor-pointer hover:bg-muted transition-colors",
            sticky
              ? "px-3 py-2 sm:py-1.5 rounded-b-[var(--radius-squircle-xl)] sm:rounded-r-full sm:rounded-l-none"
              : "px-4 py-3 sm:py-2 rounded-b-[var(--radius-squircle-xl)] sm:rounded-r-full sm:rounded-l-none"
          )}
        >
          <div className="flex items-center gap-4">
            <div className={cn(
              "rounded-full bg-brand-50 flex items-center justify-center shrink-0",
              sticky ? "size-8" : "size-10"
            )}>
              <Users size={sticky ? 14 : 18} className="text-brand-600" />
            </div>
            <div className="flex flex-col">
              <span className={cn(
                "font-bold text-muted-foreground uppercase tracking-widest",
                sticky ? "text-[10px]" : "text-xs"
              )}>Ocupación</span>
              <span className={cn(
                "tracking-tight text-foreground font-bold",
                sticky ? "text-sm" : "text-base"
              )}>
                {totalGuests} Huésped{totalGuests > 1 ? 'es' : ''}
              </span>
            </div>
          </div>

          {/* Botón Purga (Solo visible si hay un cambio real) */}
          {(date?.from || adults > 2 || children > 0 || hasActiveFilters) && !isPending && (
            <button 
              onClick={clearAll}
              className={cn(
                "rounded-full transition-colors text-muted-foreground hover:text-destructive shadow-inner bg-card border border-border",
                sticky ? "p-1.5 ml-1.5 hover:bg-destructive/10" : "p-2 ml-2 hover:bg-destructive/10"
              )}
              title="Borrar filtros"
            >
              <X size={sticky ? 14 : 16} strokeWidth={2.5} />
            </button>
          )}
        </div>

        {/* ZONA 3: FILTROS (Solo visible si hay habitaciones) */}
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

        {/* POPOVER DE HUÉSPEDES */}
        {activePopover === 'guests' && (
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
              <div className="space-y-6">
                <h3 className="font-black text-foreground tracking-tight mb-2 text-lg">Detalles del Grupo</h3>
                
                {/* Counter Adultos */}
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-bold text-foreground">Adultos</p>
                    <p className="text-xs text-muted-foreground font-medium">13+ años</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <motion.button 
                      onClick={() => setAdults(Math.max(1, adults - 1))}
                      disabled={adults <= 1}
                      whileTap={{ scale: 0.85 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                      className="size-10 rounded-full bg-muted border border-border flex items-center justify-center hover:bg-accent disabled:opacity-30 transition-colors"
                    >
                      <Minus size={16} className="text-muted-foreground" />
                    </motion.button>
                    <span className="font-bold text-foreground text-lg w-4 text-center">{adults}</span>
                    <motion.button 
                      onClick={() => setAdults(adults + 1)}
                      whileTap={{ scale: 0.85 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                      className="size-10 rounded-full bg-muted border border-border flex items-center justify-center hover:bg-accent transition-colors"
                    >
                      <Plus size={16} className="text-muted-foreground" />
                    </motion.button>
                  </div>
                </div>

                {/* Counter Niños */}
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-bold text-foreground">Niños</p>
                    <p className="text-xs text-muted-foreground font-medium">0 - 12 años</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <motion.button 
                      onClick={() => setChildren(Math.max(0, children - 1))}
                      disabled={children <= 0}
                      whileTap={{ scale: 0.85 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                      className="size-10 rounded-full bg-muted border border-border flex items-center justify-center hover:bg-accent disabled:opacity-30 transition-colors"
                    >
                      <Minus size={16} className="text-muted-foreground" />
                    </motion.button>
                    <span className="font-bold text-foreground text-lg w-4 text-center">{children}</span>
                    <motion.button 
                      onClick={() => setChildren(children + 1)}
                      whileTap={{ scale: 0.85 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                      className="size-10 rounded-full bg-muted border border-border flex items-center justify-center hover:bg-accent transition-colors"
                    >
                      <Plus size={16} className="text-muted-foreground" />
                    </motion.button>
                  </div>
                </div>

                {/* Botón de Aplicar */}
                <div className="pt-4 border-t border-border mt-2">
                  <motion.button 
                    onClick={handleApplyGuests}
                    whileTap={{ scale: 0.96 }}
                    transition={springSnappy()}
                    className="w-full bg-foreground hover:bg-primary/90 text-primary-foreground font-bold py-4 rounded-[var(--radius-squircle-2xl)] transition-all shadow-md"
                  >
                    Aplicar y Buscar
                  </motion.button>
                </div>
              </div>
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
                      onClick={() => { setMaxPrice(null); setMinCapacity(null); setSelectedAmenities([]); }}
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
