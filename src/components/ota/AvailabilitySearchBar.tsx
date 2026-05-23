'use client';

import React, { useState, useRef, useEffect, useTransition, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Calendar as CalendarIcon, X, Loader2, CheckCircle2, User, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DayPicker, DateRange } from 'react-day-picker';
import { format, parseISO, isValid, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { springSnappy, springLayout, springGentle, springModal, springBounce } from '@/lib/mac2026/spring';
import { GlassPanel } from '@/components/ui/glass';
import GuestSelector from '@/components/ota/GuestSelector';
import 'react-day-picker/dist/style.css';

import { useTranslations, useLocale } from 'next-intl';
import { getDateFnsLocale } from '@/lib/date-locale';

// ── Types ─────────────────────────────────────────────────────────────────────

interface NavSection {
  id: string;
  label: string;
}

interface AvailabilitySearchBarProps {
  sticky?: boolean;
  navSections?: NavSection[];
}

// ── URL builder ───────────────────────────────────────────────────────────────

function buildUrl(
  currentParams: URLSearchParams,
  overrides: {
    checkin?: Date;
    checkout?: Date;
    guests?: number;
  }
): string {
  const p = new URLSearchParams(currentParams.toString());
  const { checkin, checkout, guests } = overrides;

  if (checkin && checkout) { p.set('checkin', format(checkin, 'yyyy-MM-dd')); p.set('checkout', format(checkout, 'yyyy-MM-dd')); }
  else { p.delete('checkin'); p.delete('checkout'); }

  if (guests !== undefined && guests > 0) { p.set('guests', guests.toString()); p.set('min_capacity', guests.toString()); }
  else { p.delete('guests'); p.delete('min_capacity'); }

  p.delete('showRoom');
  return `?${p.toString()}`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AvailabilitySearchBar({
  sticky = false,
  navSections = [],
}: AvailabilitySearchBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations();
  const appLocale = useLocale();
  const dateLocale = getDateFnsLocale(appLocale);
  const popoverRef = useRef<HTMLDivElement>(null);
  const datesTriggerRef = useRef<HTMLDivElement>(null);
  const guestsTriggerRef = useRef<HTMLDivElement>(null);
  const navIoRef = useRef<IntersectionObserver | null>(null);

  // Active modal: unified — only one modal open at a time
  const [activeModal, setActiveModal] = useState<'dates' | 'guests' | null>(null);
  const [isPending, startTransition] = useTransition();

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
  // Pending date selection (not yet applied)
  const [pendingDate, setPendingDate] = useState<DateRange | undefined>(date);

  // State: guests
  const [guests, setGuests] = useState<number>(() => { const g = searchParams.get('guests'); return g ? Number(g) : 1; });
  // Pending guest selection (not yet applied)
  const [pendingGuests, setPendingGuests] = useState<number>(guests);

  const today = startOfDay(new Date());

  // Sync pending state when modal opens
  useEffect(() => {
    if (activeModal === 'dates') setPendingDate(date);
    if (activeModal === 'guests') setPendingGuests(guests);
  }, [activeModal, date, guests]);

  // URL sync
  const pushUrl = useCallback(
    (overrides?: { checkin?: Date; checkout?: Date; guests?: number }) => {
      const url = buildUrl(searchParams, {
        checkin: overrides?.checkin ?? date?.from ?? undefined,
        checkout: overrides?.checkout ?? date?.to ?? undefined,
        guests: overrides?.guests ?? guests,
      });
      startTransition(() => router.push(url, { scroll: false }));
    },

    [searchParams, date, guests, router]
  );

  // Handlers: Dates
  const handleSelectDates = (newDate: DateRange | undefined) => {
    if (newDate?.from && newDate?.to) {
      if (newDate.from.getTime() === newDate.to.getTime()) { setPendingDate({ from: newDate.from, to: undefined }); return; }
      setPendingDate(newDate);
    } else setPendingDate(newDate);
  };

  const handleConfirmDates = () => {
    if (pendingDate?.from && pendingDate?.to) {
      setDate(pendingDate);
      setActiveModal(null);
      if (guests > 0) pushUrl({ checkin: pendingDate.from, checkout: pendingDate.to, guests });
    }
  };

  const handleClearDates = () => {
    setPendingDate(undefined);
    setDate(undefined);
    pushUrl({ checkin: undefined, checkout: undefined });
  };

  // Handlers: Guests
  const handlePendingGuestsChange = (value: number) => {
    setPendingGuests(value);
  };

  const handleConfirmGuests = () => {
    setGuests(pendingGuests);
    setActiveModal(null);
    if (date?.from && date?.to) pushUrl({ checkin: date.from, checkout: date.to, guests: pendingGuests });
    else pushUrl({ guests: pendingGuests });
  };

  const handleClearAll = () => {
    setDate(undefined); setGuests(1);
    setActiveModal(null);
    const p = new URLSearchParams(searchParams.toString());
    ['checkin', 'checkout', 'guests', 'min_capacity'].forEach(k => p.delete(k));
    startTransition(() => router.push(`?${p.toString()}`, { scroll: false }));
  };

  // Derived

  const displayRange = () => {
    if (date?.from) {
      if (!date.to) return format(date.from, "dd 'de' MMM", { locale: dateLocale }) + ` — ${t('ota.search.departure')}`;
      return `${format(date.from, 'dd MMM', { locale: dateLocale })} — ${format(date.to, 'dd MMM', { locale: dateLocale })}`;
    }
    return `${t('ota.search.arrival')} — ${t('ota.search.departure')}`;
  };
  const guestLabel = `${guests} ${t('ota.search.guest', { count: guests })}`;

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

  // Date selection progress indicator
  const dateStep = pendingDate?.from && pendingDate?.to ? 'complete' : pendingDate?.from ? 'checkout' : 'checkin';

  return (
    <div className="relative w-full z-[var(--z-dropdown)]" ref={popoverRef}>
      {/* UNIFIED STICKY BAR */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-3">
        {/* ═══ MOBILE: Single CTA when NO dates selected (Progressive Disclosure Step 1) ═══ */}
        {!date?.from && (
          <motion.button
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={springGentle()}
            onClick={() => !isPending && setActiveModal('dates')}
            className="sm:hidden flex items-center justify-center gap-3 w-full px-5 py-3.5 bg-card rounded-[var(--radius-squircle-xl)] border border-border/30 shadow-sm active:scale-[0.98] transition-transform"
            aria-label={t('ota.search.selectDates')}
          >
            {isPending ? <Loader2 size={20} className="text-brand-600 animate-spin" />
              : <CalendarIcon size={20} className="text-brand-600" />}
            <span className="text-base font-bold text-foreground tracking-tight">{t('ota.search.chooseDates')}</span>
            <ChevronRight size={18} className="text-muted-foreground" />
          </motion.button>
        )}

        {/* ═══ MOBILE: Compact pill when dates ARE selected ═══ */}
        {date?.from && (
          <div className="sm:hidden flex items-center bg-card rounded-[var(--radius-squircle-xl)] border border-border/30 shadow-sm overflow-hidden">
            {/* Dates zone — triggers dates modal */}
            <div
              onClick={() => !isPending && setActiveModal(activeModal === 'dates' ? null : 'dates')}
              role="button" aria-expanded={activeModal === 'dates'} aria-label={t('ota.search.selectDates')}
              className="flex-1 flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-muted/50 transition-colors"
            >
              <div className="rounded-full bg-brand-50 flex items-center justify-center shrink-0 size-8">
                {date?.from && date?.to ? <CheckCircle2 size={14} className="text-secondary" />
                  : <CalendarIcon size={14} className="text-brand-600" />}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t('ota.search.stay')}</span>
                <span className="text-sm text-foreground font-bold tracking-tight truncate">{displayRange()}</span>
              </div>
              {/* Clear dates */}
              <motion.button
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={springSnappy()}
                onClick={(e) => { e.stopPropagation(); handleClearDates(); }}
                className="size-5 rounded-full flex items-center justify-center hover:bg-destructive/10 hover:text-destructive transition-colors shrink-0 ml-1"
                aria-label={t('ota.search.clearDates')}
              >
                <X size={10} strokeWidth={2.5} />
              </motion.button>
            </div>

            {/* Divider */}
            <div className="w-px h-8 bg-border/50 shrink-0" />

            {/* Guests zone — triggers guests modal */}
            <div
              onClick={() => !isPending && setActiveModal(activeModal === 'guests' ? null : 'guests')}
              role="button" aria-expanded={activeModal === 'guests'} aria-label={t('ota.search.selectGuests')}
              className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-muted/50 transition-colors shrink-0"
            >
              <div className="rounded-full bg-brand-50 flex items-center justify-center shrink-0 size-8">
                <User size={14} className="text-brand-600" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t('ota.search.guests')}</span>
                <span className="text-sm text-foreground font-bold tracking-tight">{guestLabel}</span>
              </div>
            </div>
          </div>
        )}

        {/* ═══ DESKTOP: Full two-zone pill (always visible) ═══ */}
        <div
          className={cn(
            'hidden sm:flex flex-row items-center bg-card rounded-full transition-all duration-300 lg:w-2/3',
            sticky ? 'p-1' : 'p-2',
            activeModal ? 'ring-2 ring-ring shadow-xl' : 'hover:border-border hover:shadow-md',
            isPending && 'opacity-70 pointer-events-none grayscale-[0.2]'
          )}
        >
          {/* ZONE 1: DATES */}
          <div
            ref={datesTriggerRef}
            onClick={() => !isPending && setActiveModal(activeModal === 'dates' ? null : 'dates')}
            role="button" aria-expanded={activeModal === 'dates'} aria-label={t('ota.search.selectDates')}
            className={pillBase('rounded-l-full rounded-r-none')}
          >
            <div className={iconCircle}>
              {isPending ? <Loader2 size={ios} className="text-brand-600 animate-spin" />
                : date?.from && date?.to ? <CheckCircle2 size={ios} className="text-secondary" />
                : <CalendarIcon size={ios} className="text-brand-600" />}
            </div>
            <div className="flex flex-col min-w-0">
              <span className={labelClass}>{t('ota.search.stay')}</span>
              <span className={valueClass(!!date?.from)}>{displayRange()}</span>
            </div>
            {/* Clear dates button — only visible when dates are selected */}
            {date?.from && (
              <motion.button
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={springSnappy()}
                onClick={(e) => { e.stopPropagation(); handleClearDates(); }}
                className="size-6 rounded-full flex items-center justify-center hover:bg-destructive/10 hover:text-destructive transition-colors shrink-0 ml-1"
                aria-label={t('ota.search.clearDates')}
                title={t('ota.search.clearDates')}
              >
                <X size={12} strokeWidth={2.5} />
              </motion.button>
            )}
          </div>

          {/* DIVIDER */}
          <div className={cn('bg-border mx-2 hidden sm:block', sticky ? 'h-px w-px h-8' : 'h-px w-px h-10')} />

          {/* ZONE 2: GUESTS */}
          <div
            ref={guestsTriggerRef}
            onClick={() => !isPending && setActiveModal(activeModal === 'guests' ? null : 'guests')}
            role="button" aria-expanded={activeModal === 'guests'} aria-label={t('ota.search.selectGuests')}
            className={pillBase('rounded-r-full rounded-l-none')}
          >
            <div className={iconCircle}>
              <User size={ios} className="text-brand-600" />
            </div>
            <div className="flex flex-col">
              <span className={labelClass}>{t('ota.search.guests')}</span>
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

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* UNIFIED MODAL SYSTEM — backdrop + glass container          */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {activeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[var(--z-modal)] flex items-end md:items-center md:justify-center"
          >
            {/* Backdrop overlay — click to close */}
            <div
              className="absolute inset-0 bg-black/20 backdrop-blur-sm"
              onClick={() => setActiveModal(null)}
              aria-hidden="true"
            />

            {/* Modal container — bottom sheet on mobile, centered on desktop */}
            <motion.div
              initial={{ opacity: 0, y: '100%' }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: '100%' }}
              transition={springModal()}
              className="relative z-10 w-full md:w-auto md:max-w-md md:mx-4 mb-0"
            >
              <GlassPanel
                intensity="heavy"
                className="md:rounded-[var(--radius-squircle-2xl)] rounded-t-[var(--radius-squircle-2xl)] rounded-b-none md:rounded-b-[var(--radius-squircle-2xl)] bg-background/95 backdrop-blur-3xl ring-1 ring-foreground/10 shadow-2xl"
              >
                  {/* Mobile drag handle indicator */}
                  <div className="md:hidden flex justify-center pt-3 pb-1">
                    <div className="w-10 h-1 rounded-full bg-foreground/15" />
                  </div>

                  {/* ── DATES MODAL ──────────────────────────── */}
                  {activeModal === 'dates' && (
                    <div className="flex flex-col max-h-[85dvh] md:max-h-[80vh] overflow-hidden">
                      {/* Header — X en esquina superior absoluta */}
                      <div className="relative px-5 pt-5 sm:px-6 sm:pt-6 pb-3 shrink-0">
                        <h2 className="font-black text-foreground tracking-tight text-lg sm:text-xl pr-10">
                          {t('ota.search.stay')}
                        </h2>
                        {/* Step indicator */}
                        <div className="flex items-center gap-1.5 mt-1">
                          <div className={cn('size-1.5 rounded-full transition-colors', dateStep === 'checkin' ? 'bg-primary' : 'bg-primary/30')} />
                          <div className={cn('h-px w-4 transition-colors', dateStep !== 'checkin' ? 'bg-primary/30' : 'bg-muted')} />
                          <div className={cn('size-1.5 rounded-full transition-colors', dateStep === 'checkout' ? 'bg-primary' : dateStep === 'complete' ? 'bg-primary/30' : 'bg-muted')} />
                          <div className={cn('h-px w-4 transition-colors', dateStep === 'complete' ? 'bg-primary/30' : 'bg-muted')} />
                          <div className={cn('size-1.5 rounded-full transition-colors', dateStep === 'complete' ? 'bg-primary' : 'bg-muted')} />
                        </div>
                        <p className="text-[11px] text-muted-foreground/60 mt-1 tracking-tight">
                          {dateStep === 'checkin' && t('ota.search.arrival')}
                          {dateStep === 'checkout' && `${format(pendingDate!.from!, 'dd MMM', { locale: dateLocale })} → ${t('ota.search.departure')}`}
                          {dateStep === 'complete' && pendingDate?.from && pendingDate?.to && `${format(pendingDate.from, 'dd MMM')} — ${format(pendingDate.to, 'dd MMM')}`}
                        </p>

                        {/* X button — esquina superior derecha absoluta */}
                        <motion.button
                          onClick={() => setActiveModal(null)}
                          whileHover={{ scale: 1.08 }}
                          whileTap={{ scale: 0.9 }}
                          transition={springSnappy()}
                          className="absolute top-4 right-4 sm:top-5 sm:right-5 size-9 rounded-[var(--radius-squircle-lg)] flex items-center justify-center bg-muted/60 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground ring-1 ring-foreground/5"
                          aria-label={t('common.close')}
                        >
                          <X size={16} strokeWidth={2.5} />
                        </motion.button>
                      </div>

                      {/* Calendar — scrollable */}
                      <div className="flex-1 overflow-y-auto px-3 sm:px-4 pb-3">
                        <div className="modal-calendar">
                          <DayPicker
                            mode="range"
                            selected={pendingDate}
                            onSelect={handleSelectDates}
                            locale={dateLocale}
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
                      </div>

                      {/* Footer: Clear + Confirm — sticky al fondo */}
                      <div className="px-5 sm:px-6 pb-5 sm:pb-6 pt-3 border-t border-foreground/5 flex items-center gap-3 shrink-0">
                        <motion.button
                          onClick={handleClearDates}
                          whileTap={{ scale: 0.95 }}
                          transition={springSnappy()}
                          className="px-4 py-3 rounded-[var(--radius-squircle-xl)] text-sm font-semibold text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted transition-colors ring-1 ring-foreground/5"
                        >
                          {t('ota.search.clearDates')}
                        </motion.button>
                        <motion.button
                          onClick={handleConfirmDates}
                          disabled={!pendingDate?.from || !pendingDate?.to}
                          whileHover={pendingDate?.from && pendingDate?.to ? { scale: 1.015 } : {}}
                          whileTap={pendingDate?.from && pendingDate?.to ? { scale: 0.97 } : {}}
                          transition={springBounce()}
                          className={cn(
                            'flex-1 py-3 rounded-[var(--radius-squircle-xl)] text-sm font-bold tracking-tight transition-all ring-1',
                            pendingDate?.from && pendingDate?.to
                              ? 'bg-primary text-primary-foreground shadow-lg ring-primary/20 hover:shadow-xl'
                              : 'bg-muted/40 text-muted-foreground/50 ring-foreground/5 cursor-not-allowed'
                          )}
                        >
                          {pendingDate?.from && pendingDate?.to
                            ? t('ota.search.confirmDates')
                            : t('ota.search.selectDates')
                          }
                        </motion.button>
                      </div>
                    </div>
                  )}

                  {/* ── GUESTS MODAL ─────────────────────────── */}
                  {activeModal === 'guests' && (
                    <div className="flex flex-col max-h-[85dvh] md:max-h-[80vh] overflow-hidden">
                      {/* Header — X en esquina superior absoluta */}
                      <div className="relative px-5 pt-5 sm:px-6 sm:pt-6 pb-2 shrink-0">
                        <h2 className="font-black text-foreground tracking-tight text-lg sm:text-xl pr-10">
                          {t('ota.search.guests')}
                        </h2>
                        <p className="text-xs text-muted-foreground/70 mt-0.5 tracking-tight">
                          {pendingGuests} {t('ota.search.guest', { count: pendingGuests })}
                        </p>

                        {/* X button — esquina superior derecha absoluta */}
                        <motion.button
                          onClick={() => setActiveModal(null)}
                          whileHover={{ scale: 1.08 }}
                          whileTap={{ scale: 0.9 }}
                          transition={springSnappy()}
                          className="absolute top-4 right-4 sm:top-5 sm:right-5 size-9 rounded-[var(--radius-squircle-lg)] flex items-center justify-center bg-muted/60 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground ring-1 ring-foreground/5"
                          aria-label={t('common.close')}
                        >
                          <X size={16} strokeWidth={2.5} />
                        </motion.button>
                      </div>

                      {/* Guest Selector — scrollable */}
                      <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4">
                        <GuestSelector
                          value={pendingGuests}
                          onChange={handlePendingGuestsChange}
                          min={1}
                          max={20}
                        />
                      </div>

                      {/* Footer: Confirm — sticky al fondo */}
                      <div className="px-5 sm:px-6 pb-5 sm:pb-6 pt-3 border-t border-foreground/5 shrink-0">
                        <motion.button
                          onClick={handleConfirmGuests}
                          whileHover={{ scale: 1.015 }}
                          whileTap={{ scale: 0.97 }}
                          transition={springBounce()}
                          className="w-full py-3.5 rounded-[var(--radius-squircle-xl)] text-sm font-bold tracking-tight bg-primary text-primary-foreground shadow-lg ring-1 ring-primary/20 hover:shadow-xl transition-all"
                        >
                          {t('ota.search.confirmGuests')}
                        </motion.button>
                      </div>
                    </div>
                  )}
                </GlassPanel>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
    </div>
  );
}
