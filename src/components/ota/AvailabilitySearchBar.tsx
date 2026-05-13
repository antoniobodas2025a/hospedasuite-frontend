'use client';

import React, { useState, useRef, useEffect, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Calendar as CalendarIcon, X, Loader2, CheckCircle2, Users, Plus, Minus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DayPicker, DateRange } from 'react-day-picker';
import { format, parseISO, isValid, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { mac2026Default as springPopover, springSnappy } from '@/lib/mac2026/spring';
import { GlassPanel } from '@/components/ui/glass';
import 'react-day-picker/dist/style.css'; 

export default function AvailabilitySearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const popoverRef = useRef<HTMLDivElement>(null);

  // Máquina de Estados Globales
  const [activePopover, setActivePopover] = useState<'dates' | 'guests' | null>(null);
  const [isPending, startTransition] = useTransition();
  
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

  const today = startOfDay(new Date());

  // Listener para cerrar cualquier Popover orgánicamente
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      // Protección de Race Condition del V-DOM
      if (!document.contains(target)) return;
      if (popoverRef.current && !popoverRef.current.contains(target)) {
        setActivePopover(null);
      }
    }
    if (activePopover) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
    params.delete('showRoom');

    startTransition(() => {
      router.push(`?${params.toString()}`, { scroll: false });
    });
  };

  // 🎯 MANEJADORES DE ESTADO
  const handleSelectDates = (newDate: DateRange | undefined) => {
    if (newDate?.from && newDate?.to) {
      // Prevención de cero noches
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

  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDate(undefined);
    setAdults(2); // Restaurar a valores por defecto
    setChildren(0);
    setActivePopover(null);
    
    const params = new URLSearchParams(searchParams.toString());
    params.delete('checkin');
    params.delete('checkout');
    params.delete('adults');
    params.delete('children');
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
      
      {/* 🔮 SMART PILL INTERACTIVO MULTI-ZONA */}
      <div 
        className={cn(
          "flex flex-col sm:flex-row items-stretch sm:items-center bg-card rounded-[var(--radius-squircle-2xl)] sm:rounded-full p-2 transition-all duration-300",
          activePopover ? "ring-2 ring-ring shadow-xl" : "hover:border-border hover:shadow-md",
          isPending && "opacity-70 pointer-events-none grayscale-[0.2]"
        )}
      >
        
        {/* ZONA 1: FECHAS */}
        <div 
          onClick={() => !isPending && setActivePopover(activePopover === 'dates' ? null : 'dates')}
          className="flex-1 flex items-center gap-4 px-4 py-3 sm:py-2 cursor-pointer hover:bg-muted rounded-t-[var(--radius-squircle-xl)] sm:rounded-l-full sm:rounded-r-none transition-colors"
        >
          <div className="size-10 rounded-full bg-brand-50 flex items-center justify-center shrink-0">
            {isPending ? <Loader2 size={18} className="text-brand-600 animate-spin" /> : 
             (date?.from && date?.to ? <CheckCircle2 size={18} className="text-secondary" /> : <CalendarIcon size={18} className="text-brand-600" />)}
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Estadía</span>
            <span className={cn("text-base tracking-tight", date?.from ? "text-foreground font-bold" : "text-muted-foreground font-medium")}>
              {displayRange()}
            </span>
          </div>
        </div>

        {/* DIVISOR */}
        <div className="h-px w-full sm:w-px sm:h-10 bg-border mx-0 sm:mx-2 hidden sm:block"></div>
        <div className="h-px w-full sm:w-px sm:h-10 bg-muted mx-0 sm:mx-2 block sm:hidden my-1"></div>

        {/* ZONA 2: HUÉSPEDES */}
        <div 
          onClick={() => !isPending && setActivePopover(activePopover === 'guests' ? null : 'guests')}
          className="flex-1 flex items-center justify-between px-4 py-3 sm:py-2 cursor-pointer hover:bg-muted rounded-b-[var(--radius-squircle-xl)] sm:rounded-r-full sm:rounded-l-none transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="size-10 rounded-full bg-brand-50 flex items-center justify-center shrink-0">
              <Users size={18} className="text-brand-600" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Ocupación</span>
              <span className="text-base tracking-tight text-foreground font-bold">
                {totalGuests} Huésped{totalGuests > 1 ? 'es' : ''}
              </span>
            </div>
          </div>

          {/* Botón Purga (Solo visible si hay un cambio real) */}
          {(date?.from || adults > 2 || children > 0) && !isPending && (
            <button 
              onClick={clearAll}
              className="p-2 ml-2 hover:bg-destructive/10 rounded-full transition-colors text-muted-foreground hover:text-destructive shadow-inner bg-card border border-border"
              title="Borrar filtros"
            >
              <X size={16} strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>

      {/* 📅 & 👥 POPOVERS (Vistas Flotantes) */}
      <AnimatePresence>
        
        {/* POPOVER DE FECHAS — Mac 2026: GlassPanel + spring physics */}
        {activePopover === 'dates' && (
          <motion.div 
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={springPopover}
            className="absolute top-[110%] left-0 w-full md:w-auto md:left-1/2 md:-translate-x-1/2 z-[var(--z-popover)] date-picker-b2c"
          >
            <GlassPanel className="p-6 ring-1 ring-foreground/5">
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

        {/* POPOVER DE HUÉSPEDES — Mac 2026: GlassPanel + spring physics */}
        {activePopover === 'guests' && (
          <motion.div 
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={springPopover}
            className="absolute top-[110%] right-0 w-full sm:w-[340px] z-[var(--z-popover)]"
          >
            <GlassPanel className="p-6 ring-1 ring-foreground/5">
              <div className="space-y-6">
                <h3 className="font-black text-foreground tracking-tight mb-2 text-lg">Detalles del Grupo</h3>
                
                {/* Counter Adultos */}
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-bold text-foreground">Adultos</p>
                    <p className="text-xs text-muted-foreground font-medium">13+ años</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => setAdults(Math.max(1, adults - 1))}
                      disabled={adults <= 1}
                      className="size-10 rounded-full bg-muted border border-border flex items-center justify-center hover:bg-accent disabled:opacity-30 transition-colors"
                    >
                      <Minus size={16} className="text-muted-foreground" />
                    </button>
                    <span className="font-bold text-foreground text-lg w-4 text-center">{adults}</span>
                    <button 
                      onClick={() => setAdults(adults + 1)}
                      className="size-10 rounded-full bg-muted border border-border flex items-center justify-center hover:bg-accent transition-colors"
                    >
                      <Plus size={16} className="text-muted-foreground" />
                    </button>
                  </div>
                </div>

                {/* Counter Niños */}
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-bold text-foreground">Niños</p>
                    <p className="text-xs text-muted-foreground font-medium">0 - 12 años</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => setChildren(Math.max(0, children - 1))}
                      disabled={children <= 0}
                      className="size-10 rounded-full bg-muted border border-border flex items-center justify-center hover:bg-accent disabled:opacity-30 transition-colors"
                    >
                      <Minus size={16} className="text-muted-foreground" />
                    </button>
                    <span className="font-bold text-foreground text-lg w-4 text-center">{children}</span>
                    <button 
                      onClick={() => setChildren(children + 1)}
                      className="size-10 rounded-full bg-muted border border-border flex items-center justify-center hover:bg-accent transition-colors"
                    >
                      <Plus size={16} className="text-muted-foreground" />
                    </button>
                  </div>
                </div>

                {/* Botón de Aplicar — Mac 2026 Spring Physics: whileTap + springSnappy */}
                <div className="pt-4 border-t border-border mt-2">
                  <motion.button 
                    onClick={handleApplyGuests}
                    whileTap={{ scale: 0.96 }}
                    transition={springSnappy()}
                    className="w-full bg-foreground hover:bg-brand-600 text-primary-foreground font-bold py-4 rounded-[var(--radius-squircle-2xl)] transition-all shadow-md"
                  >
                    Aplicar y Buscar
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
