'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  SlidersHorizontal,
  Tent,
  Building2,
  Home,
  Castle,
  Plus,
  Search,
  UserLock,
  Loader2,
  ChevronDown,
} from 'lucide-react';
import HotelCard from './HotelCard';
import LanguageSwitcher from './LanguageSwitcher';
import SearchBarUnified from './SearchBarUnified';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { fetchOTAHotelsAction } from '@/app/actions/ota';
import { useTranslations } from 'next-intl';
import { springSnappy, springGentle } from '@/lib/mac2026/spring';
import { preserveSearchParams } from '@/lib/handoff-url';

const CATEGORIES = [
  { id: 'all', labelKey: 'ota.categories.all', icon: SlidersHorizontal, popular: false },
  { id: 'glamping', labelKey: 'ota.categories.glamping', icon: Tent, popular: true },
  { id: 'hotel', labelKey: 'ota.categories.hotels', icon: Building2, popular: true },
  { id: 'cabin', labelKey: 'ota.categories.cabins', icon: Home, popular: false },
  { id: 'boutique', labelKey: 'ota.categories.boutique', icon: Castle, popular: false },
];

const POPULAR_CATEGORIES = CATEGORIES.filter(c => c.popular);
const OTHER_CATEGORIES = CATEGORIES.filter(c => !c.popular);

interface OTADashboardProps {
  initialHotels: any[];
  initialHasMore?: boolean;
}

export default function OTADashboard({
  initialHotels,
  initialHasMore = false,
}: OTADashboardProps) {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isInitialized = useRef(false);

  // Initialize from URL params (survives refresh, back navigation, shared links)
  const urlCategory = searchParams.get('category') || 'all';
  const urlSearch = searchParams.get('search') || '';
  const locationParam = searchParams.get('location') || '';

  const [hotels, setHotels] = useState(initialHotels);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [activeCategory, setActiveCategory] = useState(urlCategory);
  const [searchTerm, setSearchTerm] = useState(urlSearch);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);

  // Sync category and searchTerm to URL (debounced for search, immediate for category)
  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;
    // Skip initial sync — URL is already correct on mount
  }, []);

  const syncToUrl = useCallback((updates: { category?: string; search?: string; location?: string }) => {
    const params = new URLSearchParams(searchParams.toString());
    if (updates.category !== undefined) {
      if (updates.category === 'all') params.delete('category');
      else params.set('category', updates.category);
    }
    if (updates.search !== undefined) {
      if (updates.search === '') params.delete('search');
      else params.set('search', updates.search);
    }
    if (updates.location !== undefined) {
      if (updates.location === '') params.delete('location');
      else params.set('location', updates.location);
    }
    const query = params.toString();
    const url = query ? `${pathname}?${query}` : pathname;
    router.replace(url, { scroll: false });
  }, [searchParams, pathname, router]);

  // Debounced search effect
  useEffect(() => {
    let isMounted = true;

    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);

      const response = await fetchOTAHotelsAction(0, 24, activeCategory, searchTerm, locationParam);

      if (isMounted) {
        if (response.success) {
          setHotels(response.data);
          setPage(0);
          setHasMore(response.hasMore);
        }
        setIsSearching(false);
      }
    }, 500);

    return () => {
      isMounted = false;
      clearTimeout(delayDebounceFn);
    };
  }, [searchTerm, activeCategory, locationParam]);

  // Scroll handler: hide header on scroll down, show on scroll up
  useEffect(() => {
    let lastScrollY = 0;
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          if (currentScrollY > 80) {
            setIsHeaderVisible(currentScrollY < lastScrollY);
          } else {
            setIsHeaderVisible(true);
          }
          lastScrollY = currentScrollY;
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const loadMoreHotels = async () => {
    if (isLoadingMore) return;
    setIsLoadingMore(true);

    const nextPage = page + 1;
    // FIX: pass locationParam to preserve location filter on pagination
    const response = await fetchOTAHotelsAction(nextPage, 24, activeCategory, searchTerm, locationParam);

    if (response.success) {
      setHotels((prev) => [...prev, ...response.data]);
      setPage(nextPage);
      setHasMore(response.hasMore);
    } else {
      alert(t('hotelDetail.errorLoadingMore'));
    }

    setIsLoadingMore(false);
  };

  const activeCat = CATEGORIES.find(c => c.id === activeCategory);

  return (
    <div className='min-h-screen bg-background flex flex-col font-sans text-foreground'>
      {/* HEADER — glass-pill, h-14 mobile */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 glass-pill border-b border-border/20 !rounded-none transition-transform ${isHeaderVisible ? 'translate-y-0' : '-translate-y-full'}`}
        style={{ transition: 'transform 0.3s var(--spring-gentle)' }}
      >
        <div className='max-w-7xl mx-auto px-4 h-14 flex items-center justify-between'>
          <div className='flex items-center gap-2.5'>
            <div className='w-8 h-8 bg-brand-600 rounded-[var(--radius-squircle-md)] flex items-center justify-center text-primary-foreground font-bold text-sm'>
              H
            </div>
            <span className='text-lg font-bold text-foreground tracking-tight'>
              {t('ota.header.brand')}<span className='text-brand-500'>{t('ota.header.brandAccent')}</span>
            </span>
          </div>

          <div className='flex items-center gap-2'>
            <LanguageSwitcher />
            <Link
              href='/software'
              className='hidden sm:flex items-center gap-1.5 text-xs font-bold text-brand-600 bg-brand-50 px-3 py-1.5 rounded-full hover:bg-brand-100 transition-colors border border-brand-200'
            >
              <UserLock size={12} />
              <span>{t('ota.header.hotelAccess')}</span>
            </Link>
          </div>
        </div>
      </header>

      <main className='flex-1 max-w-7xl mx-auto px-4 pt-20 pb-8 w-full'>
        {/* HERO — clean typography, no gradient */}
        <div className='text-center mb-6 sm:mb-8'>
          <h1 className='text-3xl sm:text-4xl md:text-5xl font-bold text-foreground tracking-tight leading-tight'>
            {t('ota.hero.title')}{' '}
            <span className='text-brand-500'>
              {t('ota.hero.highlight')}
            </span>
          </h1>
        </div>

        {/* SEARCH BAR — Unified 3-zone (Location, Dates, Guests) */}
        <div className={`sticky z-40 mb-8 sm:mb-12 transition-[top] ${isHeaderVisible ? 'top-14' : 'top-0'}`}
          style={{ transition: 'top 0.3s var(--spring-gentle)' }}
        >
          <div className='max-w-3xl mx-auto relative group'>
            <SearchBarUnified
              onSearch={(filters) => {
                setSearchTerm(filters.location);
              }}
            />
          </div>
        </div>

        {/* CATEGORIES — 2 popular pills + chip for rest */}
        <div className='flex flex-wrap items-center justify-center gap-2 mb-8 sm:mb-12'>
          {POPULAR_CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <motion.button
                key={cat.id}
                onClick={() => {
                  setActiveCategory(cat.id);
                  syncToUrl({ category: cat.id });
                }}
                whileTap={{ scale: 0.95 }}
                transition={springSnappy()}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-foreground text-background shadow-md'
                    : 'bg-card text-muted-foreground hover:text-foreground border border-border/50 hover:border-foreground/20'
                }`}
              >
                <cat.icon size={14} />
                {t(cat.labelKey)}
              </motion.button>
            );
          })}

          {/* Category chip for "All" + others */}
          <div className='relative'>
            <motion.button
              onClick={() => setIsCategoryOpen(!isCategoryOpen)}
              whileTap={{ scale: 0.95 }}
              transition={springSnappy()}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold border transition-all ${
                activeCategory === 'all' && !isCategoryOpen
                  ? 'bg-foreground text-background shadow-md'
                  : 'bg-card text-muted-foreground hover:text-foreground border-border/50 hover:border-foreground/20'
              }`}
            >
              <SlidersHorizontal size={14} />
              {activeCategory !== 'all' && activeCat ? t(activeCat.labelKey) : t('ota.categories.all')}
              <ChevronDown size={12} className={`transition-transform ${isCategoryOpen ? 'rotate-180' : ''}`} />
            </motion.button>

            <AnimatePresence>
              {isCategoryOpen && (
                <>
                  {/* Backdrop */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className='fixed inset-0 z-40'
                    onClick={() => setIsCategoryOpen(false)}
                  />
                  {/* Dropdown */}
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={springGentle()}
                    className='absolute top-full mt-2 left-1/2 -translate-x-1/2 z-50 bg-card border border-border/50 rounded-[var(--radius-squircle-xl)] shadow-xl p-2 min-w-[180px]'
                  >
                    {OTHER_CATEGORIES.map((cat) => {
                      const isActive = activeCategory === cat.id;
                      return (
                        <button
                          key={cat.id}
                          onClick={() => {
                            setActiveCategory(cat.id);
                            setIsCategoryOpen(false);
                            syncToUrl({ category: cat.id });
                          }}
                          className={`w-full flex items-center gap-2 px-3 py-2 rounded-[var(--radius-squircle-md)] text-sm font-medium transition-colors ${
                            isActive
                              ? 'bg-foreground/10 text-foreground'
                              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                          }`}
                        >
                          <cat.icon size={14} />
                          {t(cat.labelKey)}
                        </button>
                      );
                    })}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* GRID DE HOTELES — gap-4 mobile, gap-8 desktop */}
        {isSearching ? (
          <div className='flex flex-col items-center justify-center py-20 text-muted-foreground'>
            <Loader2 size={40} className='animate-spin mb-3 text-brand-500' />
            <p className='font-semibold text-sm'>{t('ota.loading.searching')}</p>
          </div>
        ) : hotels.length > 0 ? (
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8'>
            <AnimatePresence mode='popLayout'>
              {hotels.map((hotel) => (
                <HotelCard
                  key={hotel.id}
                  hotel={hotel}
                  href={preserveSearchParams(searchParams, `/hotel/${hotel.city_slug}`)}
                />
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className='text-center py-20'>
            <Tent size={48} className='mx-auto mb-4 text-muted-foreground/40' />
            <h3 className='text-lg font-bold text-muted-foreground mb-1'>
              {t('ota.noResults.title')}
            </h3>
            <p className='text-sm text-muted-foreground/70'>{t('ota.noResults.description')}</p>
          </div>
        )}

        {/* BOTON CARGAR MAS */}
        {hasMore && !isSearching && (
          <div className='flex justify-center mt-12 sm:mt-16 mb-16 sm:mb-20'>
            <motion.button
              onClick={loadMoreHotels}
              disabled={isLoadingMore}
              whileTap={{ scale: 0.97 }}
              transition={springSnappy()}
              className='flex items-center gap-2 px-6 py-3 bg-card border border-border/50 rounded-[var(--radius-squircle-xl)] text-sm font-semibold text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-all disabled:opacity-50'
            >
              {isLoadingMore ? (
                <>
                  <Loader2 size={14} className='animate-spin text-brand-500' />
                  {t('ota.loading.loadingMore')}
                </>
              ) : (
                <>
                  <Plus size={14} /> {t('ota.loadMore')}
                </>
              )}
            </motion.button>
          </div>
        )}
      </main>
    </div>
  );
}
