'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// MOBILE STICKY CTA — Barra inferior fija para mobile
//
// Aparece cuando el usuario scrollea pasado el hero.
// Muestra precio minimo + boton "Reservar" que scrollea al search bar.
//
// Performance: rAF-throttled scroll + ref guard to prevent unnecessary re-renders.
// ============================================================================

interface MobileStickyCtaProps {
  minPrice: number;
  availableCount: number;
  checkIn?: string | null;
  checkOut?: string | null;
}

export default function MobileStickyCta({
  minPrice,
  availableCount,
  checkIn,
  checkOut,
}: MobileStickyCtaProps) {
  const [isVisible, setIsVisible] = useState(false);
  const visibleRef = useRef(false);

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const shouldBeVisible = window.scrollY > 300;
          // Only update state when value actually changes
          if (shouldBeVisible !== visibleRef.current) {
            visibleRef.current = shouldBeVisible;
            setIsVisible(shouldBeVisible);
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleReserve = () => {
    if (checkIn && checkOut) {
      document.querySelector('[id="rooms-section"]')?.scrollIntoView({ behavior: 'smooth' });
    } else {
      document.querySelector('[id="search-bar"]')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50 lg:hidden transition-transform duration-300',
        isVisible ? 'translate-y-0' : 'translate-y-full',
      )}
    >
      <div className="backdrop-blur-md bg-card/80 border-t border-border/60 shadow-2xl shadow-elev-2 px-4 py-3 safe-area-bottom !rounded-none">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1">
            <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">Desde</p>
            <div className="flex items-baseline gap-1">
              <p className="text-2xl font-black text-foreground">${minPrice.toLocaleString()}</p>
              <span className="text-xs text-muted-foreground font-medium">COP/noche</span>
            </div>
            {availableCount > 0 && availableCount <= 2 && (
              <p className="text-[10px] font-bold text-destructive flex items-center gap-1 mt-0.5">
                <span className="size-1.5 rounded-full bg-destructive animate-pulse" />
                {availableCount === 1 ? 'Solo queda 1' : `Solo quedan ${availableCount}`}
              </p>
            )}
          </div>

          <button
            onClick={handleReserve}
            className={cn(
              'px-6 py-3.5 rounded-[var(--radius-squircle-lg)] font-bold text-sm flex items-center gap-2 transition-all active:scale-95 shadow-lg',
              checkIn && checkOut
                ? 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-cta'
                : 'bg-foreground hover:bg-primary text-background shadow-foreground/20',
            )}
          >
            <ShieldCheck size={14} />
            {checkIn && checkOut ? 'Reservar' : 'Ver disponibilidad'}
            <ArrowRight size={14} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}
