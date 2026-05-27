'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { X, MapPin, Calendar, User, Search, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DayPicker, DateRange } from 'react-day-picker';
import { format, parseISO, isValid, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { springSnappy, springGentle, springModal, springBounce } from '@/lib/mac2026/spring';
import { GlassPanel } from '@/components/ui/glass';
import GuestSelector from '@/components/ota/GuestSelector';
import LocationAutocomplete from '@/components/ota/LocationAutocomplete';
import 'react-day-picker/dist/style.css';

import { useTranslations, useLocale } from 'next-intl';
import { getDateFnsLocale } from '@/lib/date-locale';

interface MobileSearchSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch: (filters: {
    location: string;
    checkin: string | null;
    checkout: string | null;
    guests: number;
  }) => void;
  isLoading?: boolean;
}

/**
 * MobileSearchSheet — Full-screen bottom sheet for mobile search.
 *
 * Opens when user taps the search bar on mobile.
 * Contains: Location, Dates, Guests, and Search button.
 * Follows Mac 2026 aesthetics: squircles, glass, spring physics.
 */
export default function MobileSearchSheet({
  isOpen,
  onClose,
  onSearch,
  isLoading = false,
}: MobileSearchSheetProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations();
  const appLocale = useLocale();
  const dateLocale = getDateFnsLocale(appLocale);

  // State: location
  const [location, setLocation] = useState(searchParams.get('location') || '');

  // State: dates
  const [date, setDate] = useState<DateRange | undefined>(() => {
    const ci = searchParams.get('checkin'), co = searchParams.get('checkout');
    if (ci && co) { const f = parseISO(ci), to = parseISO(co); if (isValid(f) && isValid(to)) return { from: f, to }; }
    return undefined;
  });
  const [pendingDate, setPendingDate] = useState<DateRange | undefined>(date);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // State: guests
  const [guests, setGuests] = useState<number>(() => {
    const g = searchParams.get('guests');
    return g ? Number(g) : 1;
  });
  const [pendingGuests, setPendingGuests] = useState<number>(guests);
  const [showGuestPicker, setShowGuestPicker] = useState(false);

  const today = startOfDay(new Date());

  // Sync pending state when picker opens
  useEffect(() => {
    if (showDatePicker) setPendingDate(date);
    if (showGuestPicker) setPendingGuests(guests);
  }, [showDatePicker, showGuestPicker, date, guests]);

  // Reset state when sheet opens
  useEffect(() => {
    if (isOpen) {
      setLocation(searchParams.get('location') || '');
      const ci = searchParams.get('checkin'), co = searchParams.get('checkout');
      if (ci && co) {
        const f = parseISO(ci), to = parseISO(co);
        if (isValid(f) && isValid(to)) {
          setDate({ from: f, to });
          setPendingDate({ from: f, to });
        }
      } else {
        setDate(undefined);
        setPendingDate(undefined);
      }
      const g = searchParams.get('guests');
      setGuests(g ? Number(g) : 1);
      setPendingGuests(g ? Number(g) : 1);
      setShowDatePicker(false);
      setShowGuestPicker(false);
    }
  }, [isOpen, searchParams]);

  // Handlers: Dates
  const handleSelectDates = (newDate: DateRange | undefined) => {
    if (newDate?.from && newDate?.to) {
      if (newDate.from.getTime() === newDate.to.getTime()) {
        setPendingDate({ from: newDate.from, to: undefined });
        return;
      }
      setPendingDate(newDate);
    } else {
      setPendingDate(newDate);
    }
  };

  const handleConfirmDates = () => {
    if (pendingDate?.from && pendingDate?.to) {
      setDate(pendingDate);
      setShowDatePicker(false);
    }
  };

  const handleClearDates = () => {
    setPendingDate(undefined);
    setDate(undefined);
    setShowDatePicker(false);
  };

  // Handlers: Guests
  const handleConfirmGuests = () => {
    setGuests(pendingGuests);
    setShowGuestPicker(false);
  };

  // Handlers: Search
  const handleSearch = () => {
    const checkin = date?.from ? format(date.from, 'yyyy-MM-dd') : null;
    const checkout = date?.to ? format(date.to, 'yyyy-MM-dd') : null;

    // Update URL
    const params = new URLSearchParams(searchParams.toString());
    if (location) params.set('location', location);
    else params.delete('location');
    if (checkin) params.set('checkin', checkin);
    else params.delete('checkin');
    if (checkout) params.set('checkout', checkout);
    else params.delete('checkout');
    if (guests > 1) params.set('guests', guests.toString());
    else params.delete('guests');

    const query = params.toString();
    const url = query ? `${pathname}?${query}` : pathname;
    router.push(url, { scroll: false });

    onSearch({ location, checkin, checkout, guests });
    onClose();
  };

  // Derived
  const displayRange = () => {
    if (date?.from) {
      if (!date.to) return format(date.from, "dd 'de' MMM", { locale: dateLocale });
      return `${format(date.from, 'dd MMM', { locale: dateLocale })} — ${format(date.to, 'dd MMM', { locale: dateLocale })}`;
    }
    return `${t('ota.search.checkin')} — ${t('ota.search.checkout')}`;
  };

  const isFormComplete = location.trim().length > 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[var(--z-modal)] sm:hidden"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Bottom sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={springModal()}
            className="absolute bottom-0 left-0 right-0 max-h-[90dvh] flex flex-col bg-background rounded-t-[var(--radius-squircle-2xl)] shadow-2xl overflow-hidden"
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-foreground/15" />
            </div>

            {/* Header */}
            <div className="px-5 pb-4 flex items-center justify-between">
              <h2 className="text-lg font-black text-foreground tracking-tight">
                {t('ota.search.refine')}
              </h2>
              <motion.button
                onClick={onClose}
                whileTap={{ scale: 0.9 }}
                transition={springSnappy()}
                className="size-9 rounded-[var(--radius-squircle-lg)] flex items-center justify-center bg-muted/60 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                aria-label={t('common.close')}
              >
                <X size={18} strokeWidth={2.5} />
              </motion.button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-4">
              {/* Date picker modal */}
              {showDatePicker ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-foreground">{t('ota.search.stay')}</h3>
                    <button
                      onClick={() => setShowDatePicker(false)}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      {t('common.close')}
                    </button>
                  </div>
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
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleClearDates}
                      className="px-4 py-3 rounded-[var(--radius-squircle-xl)] text-sm font-semibold text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted transition-colors"
                    >
                      {t('ota.search.clearDates')}
                    </button>
                    <button
                      onClick={handleConfirmDates}
                      disabled={!pendingDate?.from || !pendingDate?.to}
                      className={cn(
                        'flex-1 py-3 rounded-[var(--radius-squircle-xl)] text-sm font-bold tracking-tight transition-all',
                        pendingDate?.from && pendingDate?.to
                          ? 'bg-primary text-primary-foreground shadow-lg'
                          : 'bg-muted/40 text-muted-foreground/50 cursor-not-allowed'
                      )}
                    >
                      {pendingDate?.from && pendingDate?.to
                        ? t('ota.search.confirmDates')
                        : t('ota.search.selectDates')
                      }
                    </button>
                  </div>
                </div>
              ) : showGuestPicker ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-foreground">{t('ota.search.guests')}</h3>
                    <button
                      onClick={() => setShowGuestPicker(false)}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      {t('common.close')}
                    </button>
                  </div>
                  <GuestSelector
                    value={pendingGuests}
                    onChange={setPendingGuests}
                    min={1}
                    max={20}
                  />
                  <button
                    onClick={handleConfirmGuests}
                    className="w-full py-3.5 rounded-[var(--radius-squircle-xl)] text-sm font-bold tracking-tight bg-primary text-primary-foreground shadow-lg transition-all"
                  >
                    {t('ota.search.confirmGuests')}
                  </button>
                </div>
              ) : (
                <>
                  {/* Location */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                      {t('ota.search.destination')}
                    </label>
                    <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-[var(--radius-squircle-xl)] border border-border/30">
                      <MapPin size={18} className="text-muted-foreground/50 shrink-0" />
                      <div className="flex-1">
                        <LocationAutocomplete
                          value={location}
                          onChange={setLocation}
                          placeholder={t('ota.search.placeholder')}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                      {t('ota.search.stay')}
                    </label>
                    <button
                      onClick={() => setShowDatePicker(true)}
                      className="w-full flex items-center gap-3 p-3 bg-muted/30 rounded-[var(--radius-squircle-xl)] border border-border/30 text-left hover:bg-muted/50 transition-colors"
                    >
                      <Calendar size={18} className={cn('shrink-0', date?.from && date?.to ? 'text-secondary' : 'text-muted-foreground/50')} />
                      <div className="flex-1 min-w-0">
                        <p className={cn('text-sm truncate', date?.from ? 'text-foreground font-bold' : 'text-muted-foreground/50')}>
                          {displayRange()}
                        </p>
                      </div>
                    </button>
                  </div>

                  {/* Guests */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                      {t('ota.search.guests')}
                    </label>
                    <button
                      onClick={() => setShowGuestPicker(true)}
                      className="w-full flex items-center gap-3 p-3 bg-muted/30 rounded-[var(--radius-squircle-xl)] border border-border/30 text-left hover:bg-muted/50 transition-colors"
                    >
                      <User size={18} className="text-muted-foreground/50 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground font-bold truncate">
                          {guests} {t('ota.search.guest', { count: guests })}
                        </p>
                      </div>
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Footer: Search button */}
            {!showDatePicker && !showGuestPicker && (
              <div className="shrink-0 p-5 border-t border-border/30">
                <motion.button
                  onClick={handleSearch}
                  disabled={!isFormComplete || isLoading}
                  whileTap={isFormComplete && !isLoading ? { scale: 0.97 } : {}}
                  transition={springBounce()}
                  className={cn(
                    'w-full py-4 rounded-[var(--radius-squircle-xl)] text-sm font-bold tracking-tight flex items-center justify-center gap-2 transition-all',
                    isFormComplete && !isLoading
                      ? 'bg-primary text-primary-foreground shadow-lg shadow-brand-500/20 hover:shadow-xl'
                      : 'bg-muted/40 text-muted-foreground/50 cursor-not-allowed'
                  )}
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      {t('ota.loading.searching')}
                    </>
                  ) : (
                    <>
                      <Search size={18} />
                      {t('ota.search.button')}
                    </>
                  )}
                </motion.button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
