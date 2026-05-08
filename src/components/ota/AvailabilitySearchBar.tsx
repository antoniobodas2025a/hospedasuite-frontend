'use client';

import React, { useState, useRef, useEffect, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Calendar as CalendarIcon, X, Loader2, CheckCircle2, Users, Plus, Minus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DayPicker, DateRange } from 'react-day-picker';
import { format, parseISO, isValid, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
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
    <div className="relative w-full z-[100]" ref={popoverRef}>
      
      {/* 🔮 SMART PILL INTERACTIVO MULTI-ZONA */}
      <div 
        className={cn(
          "flex flex-col sm:flex-row items-stretch sm:items-center bg-white rounded-[2rem] sm:rounded-full p-2 transition-all duration-300",
          activePopover ? "ring-2 ring-indigo-500 shadow-xl" : "hover:border-slate-300 hover:shadow-md",
          isPending && "opacity-70 pointer-events-none grayscale-[0.2]"
        )}
      >
        
        {/* ZONA 1: FECHAS */}
        <div 
          onClick={() => !isPending && setActivePopover(activePopover === 'dates' ? null : 'dates')}
          className="flex-1 flex items-center gap-4 px-4 py-3 sm:py-2 cursor-pointer hover:bg-slate-50 rounded-t-[1.5rem] sm:rounded-l-full sm:rounded-r-none transition-colors"
        >
          <div className="size-10 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
            {isPending ? <Loader2 size={18} className="text-indigo-600 animate-spin" /> : 
             (date?.from && date?.to ? <CheckCircle2 size={18} className="text-emerald-500" /> : <CalendarIcon size={18} className="text-indigo-600" />)}
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Estadía</span>
            <span className={cn("text-base tracking-tight", date?.from ? "text-slate-900 font-bold" : "text-slate-500 font-medium")}>
              {displayRange()}
            </span>
          </div>
        </div>

        {/* DIVISOR */}
        <div className="h-px w-full sm:w-px sm:h-10 bg-slate-200 mx-0 sm:mx-2 hidden sm:block"></div>
        <div className="h-px w-full sm:w-px sm:h-10 bg-slate-100 mx-0 sm:mx-2 block sm:hidden my-1"></div>

        {/* ZONA 2: HUÉSPEDES */}
        <div 
          onClick={() => !isPending && setActivePopover(activePopover === 'guests' ? null : 'guests')}
          className="flex-1 flex items-center justify-between px-4 py-3 sm:py-2 cursor-pointer hover:bg-slate-50 rounded-b-[1.5rem] sm:rounded-r-full sm:rounded-l-none transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="size-10 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
              <Users size={18} className="text-indigo-600" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ocupación</span>
              <span className="text-base tracking-tight text-slate-900 font-bold">
                {totalGuests} Huésped{totalGuests > 1 ? 'es' : ''}
              </span>
            </div>
          </div>

          {/* Botón Purga (Solo visible si hay un cambio real) */}
          {(date?.from || adults > 2 || children > 0) && !isPending && (
            <button 
              onClick={clearAll}
              className="p-2 ml-2 hover:bg-rose-100 rounded-full transition-colors text-slate-400 hover:text-rose-500 shadow-inner bg-white border border-slate-100"
              title="Borrar filtros"
            >
              <X size={16} strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>

      {/* 📅 & 👥 POPOVERS (Vistas Flotantes) */}
      <AnimatePresence>
        
        {/* POPOVER DE FECHAS */}
        {activePopover === 'dates' && (
          <motion.div 
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="absolute top-[110%] left-0 w-full md:w-auto md:left-1/2 md:-translate-x-1/2 z-50 bg-white/95 backdrop-blur-3xl p-6 rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.12)] border border-slate-200/60 ring-1 ring-slate-900/5 date-picker-b2c"
          >
            <DayPicker
              mode="range"
              selected={date}
              onSelect={handleSelectDates}
              locale={es}
              numberOfMonths={typeof window !== 'undefined' && window.innerWidth > 768 ? 2 : 1}
              disabled={{ before: today }}
              className="text-slate-800 font-sans"
              modifiersClassNames={{
                selected: 'bg-indigo-600 text-white font-bold shadow-md rounded-xl',
                range_middle: 'bg-indigo-50 text-indigo-900 rounded-none',
                range_start: 'rounded-l-xl rounded-r-none',
                range_end: 'rounded-r-xl rounded-l-none'
              }}
            />
          </motion.div>
        )}

        {/* POPOVER DE HUÉSPEDES */}
        {activePopover === 'guests' && (
          <motion.div 
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="absolute top-[110%] right-0 w-full sm:w-[340px] z-50 bg-white/95 backdrop-blur-3xl p-6 rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.12)] border border-slate-200/60 ring-1 ring-slate-900/5"
          >
            <div className="space-y-6">
              <h3 className="font-black text-slate-900 tracking-tight mb-2 text-lg">Detalles del Grupo</h3>
              
              {/* Counter Adultos */}
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-bold text-slate-900">Adultos</p>
                  <p className="text-xs text-slate-500 font-medium">13+ años</p>
                </div>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setAdults(Math.max(1, adults - 1))}
                    disabled={adults <= 1}
                    className="size-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center hover:bg-slate-100 disabled:opacity-30 transition-colors"
                  >
                    <Minus size={16} className="text-slate-600" />
                  </button>
                  <span className="font-bold text-slate-900 text-lg w-4 text-center">{adults}</span>
                  <button 
                    onClick={() => setAdults(adults + 1)}
                    className="size-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center hover:bg-slate-100 transition-colors"
                  >
                    <Plus size={16} className="text-slate-600" />
                  </button>
                </div>
              </div>

              {/* Counter Niños */}
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-bold text-slate-900">Niños</p>
                  <p className="text-xs text-slate-500 font-medium">0 - 12 años</p>
                </div>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setChildren(Math.max(0, children - 1))}
                    disabled={children <= 0}
                    className="size-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center hover:bg-slate-100 disabled:opacity-30 transition-colors"
                  >
                    <Minus size={16} className="text-slate-600" />
                  </button>
                  <span className="font-bold text-slate-900 text-lg w-4 text-center">{children}</span>
                  <button 
                    onClick={() => setChildren(children + 1)}
                    className="size-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center hover:bg-slate-100 transition-colors"
                  >
                    <Plus size={16} className="text-slate-600" />
                  </button>
                </div>
              </div>

              {/* Botón de Aplicar */}
              <div className="pt-4 border-t border-slate-100 mt-2">
                <button 
                  onClick={handleApplyGuests}
                  className="w-full bg-slate-900 hover:bg-indigo-600 text-white font-bold py-4 rounded-2xl transition-all shadow-md active:scale-95"
                >
                  Aplicar y Buscar
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}