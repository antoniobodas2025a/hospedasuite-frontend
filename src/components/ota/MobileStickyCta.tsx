'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { calculateTotalWithTax, DEFAULT_TAX_RATE } from '@/lib/pricing';
import { useTranslations } from 'next-intl';

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
  taxRate?: number;
}

export default function MobileStickyCta({
  minPrice,
  availableCount,
  checkIn,
  checkOut,
  taxRate,
}: MobileStickyCtaProps) {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const guests = searchParams.get('guests');
  const showRoom = searchParams.get('showRoom');
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

  // Hide sticky CTA when RoomShowcaseModal is open
  if (showRoom) return null;

  const handleReserve = () => {
    if (checkIn && checkOut) {
      // Navigate to rooms section with guests preserved in URL
      const params = new URLSearchParams(searchParams.toString());
      if (guests) params.set('guests', guests);
      router.push(`?${params.toString()}`, { scroll: false });
      document.querySelector('[id="rooms-section"]')?.scrollIntoView({ behavior: 'smooth' });
    } else {
      // Scroll to top where the sticky search bar lives
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Mac 2026: Price coherence — use hotel's tax_rate, default 0.19
  const effectiveRate = taxRate ?? DEFAULT_TAX_RATE;
  const { total: displayPrice } = calculateTotalWithTax(minPrice, effectiveRate);

  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50 lg:hidden transition-transform duration-300',
        isVisible ? 'translate-y-0' : 'translate-y-full',
      )}
    >
      <div className="backdrop-blur-2xl bg-background/70 border-t border-white/10 shadow-2xl shadow-elev-2 px-4 py-3 safe-area-bottom !rounded-none">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1">
            <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">{t('ota.mobileCta.from')}</p>
            <div className="flex items-baseline gap-1">
              <p className="text-2xl font-black text-foreground">${displayPrice.toLocaleString()}</p>
              <span className="text-xs text-muted-foreground font-medium">{t('ota.mobileCta.copPerNight')}</span>
            </div>
            {availableCount > 0 && availableCount <= 2 && (
              <p className="text-[10px] font-bold text-destructive flex items-center gap-1 mt-0.5">
                <span className="size-1.5 rounded-full bg-destructive animate-pulse" />
                {availableCount === 1 ? t('ota.mobileCta.onlyOneLeft') : t('ota.mobileCta.onlyXLeft', { count: availableCount })}
              </p>
            )}
          </div>

          <button
            onClick={handleReserve}
            className={cn(
              'px-6 py-3.5 rounded-[var(--radius-squircle-lg)] font-bold text-sm flex items-center gap-2 transition-all active:scale-95 shadow-lg',
              checkIn && checkOut
                ? 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-cta'
                : 'bg-white/10 hover:bg-white/20 text-foreground border border-white/20 shadow-none',
            )}
          >
            <ShieldCheck size={14} />
            {checkIn && checkOut ? t('ota.mobileCta.reserve') : t('ota.mobileCta.checkAvailability')}
            <ArrowRight size={14} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}
