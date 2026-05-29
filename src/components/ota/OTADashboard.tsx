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
  Calendar,
  User,
  MapPin,
} from 'lucide-react';
import HotelCard from './HotelCard';
import LanguageSwitcher from './LanguageSwitcher';
import SearchBarUnified from './SearchBarUnified';
import MobileSearchSheet from './MobileSearchSheet';
import HotelMapView from './HotelMapView';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { fetchOTAHotelsAction } from '@/app/actions/ota';
import { useTranslations } from 'next-intl';
import { springSnappy, springGentle } from '@/lib/mac2026/spring';
import { preserveSearchParams } from '@/lib/handoff-url';
import { searchCache } from '@/lib/search-cache';
import L from 'leaflet';
import { filterHotelsByBounds, getBoundsFilterSummary, BoundsFilterResult } from '@/lib/bounds-filter';

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
  const urlLocation = searchParams.get('location') || '';
  const urlCheckin = searchParams.get('checkin') || '';
  const urlCheckout = searchParams.get('checkout') || '';
  const urlGuests = searchParams.get('guests') ? Number(searchParams.get('guests')) : undefined;

  const [hotels, setHotels] = useState(initialHotels);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [activeCategory, setActiveCategory] = useState(urlCategory);
  const [searchTerm, setSearchTerm] = useState(urlSearch);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);
  const [showMap, setShowMap] = useState(false);

  // Map state tracking (Phase 1: PRD-004 integration)
  const [mapBounds, setMapBounds] = useState<L.LatLngBounds | null>(null);
  const [mapCenter, setMapCenter] = useState<L.LatLng | null>(null);
  const [mapZoom, setMapZoom] = useState<number>(6);
  const [isMapMoved, setIsMapMoved] = useState(false);
  const originalSearchLocation = useRef(urlLocation);

  // Bounds filter state (Phase 2: PRD-004 bounds filtering)
  const [boundsFilterResult, setBoundsFilterResult] = useState<BoundsFilterResult | null>(null);
  const boundsFilterTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync category, searchTerm, and location to URL
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

  // Map callbacks (Phase 1: PRD-004 integration)
  const handleMapBoundsChange = useCallback((bounds: L.LatLngBounds, center: L.LatLng, zoom: number) => {
    setMapBounds(bounds);
    setMapCenter(center);
    setMapZoom(zoom);

    // Detect if user moved away from original search location
    if (originalSearchLocation.current && urlLocation) {
      setIsMapMoved(true);
    }

    // Debounce bounds filtering (500ms) to avoid excessive computation
    if (boundsFilterTimeoutRef.current) {
      clearTimeout(boundsFilterTimeoutRef.current);
    }

    boundsFilterTimeoutRef.current = setTimeout(() => {
      const result = filterHotelsByBounds(
        hotels.map((h: any) => ({
          id: h.id,
          location: h.location,
          address: h.address,
        })),
        bounds
      );
      setBoundsFilterResult(result);
    }, 500);
  }, [urlLocation, hotels]);

  const handleSearchAreaChange = useCallback((areaName: string) => {
    // Update URL location param when user pans to a new area
    if (areaName && areaName !== urlLocation) {
      syncToUrl({ location: areaName });
    }
  }, [urlLocation, syncToUrl]);

  // "Search this area" handler (Phase 2: PRD-004 bounds filtering)
  const handleSearchThisArea = useCallback(() => {
    if (mapCenter && boundsFilterResult) {
      // Use reverse geocoded area name from MapSearchSync (already updated URL)
      // The search effect will re-run with the new urlLocation
      setIsMapMoved(false);
      setBoundsFilterResult(null);
    }
  }, [mapCenter, boundsFilterResult]);

  // Cleanup bounds filter timeout on unmount
  useEffect(() => {
    return () => {
      if (boundsFilterTimeoutRef.current) {
        clearTimeout(boundsFilterTimeoutRef.current);
      }
    };
  }, []);

  // Debounced search effect with stale-while-revalidate cache
  useEffect(() => {
    let isMounted = true;

    const delayDebounceFn = setTimeout(async () => {
      const cacheParams = {
        page: 0,
        limit: 24,
        category: activeCategory,
        search: searchTerm,
        location: urlLocation,
        checkin: urlCheckin || undefined,
        checkout: urlCheckout || undefined,
        guests: urlGuests,
      };

      // Try cache first (stale-while-revalidate)
      const cached = searchCache.get<{ data: any[]; hasMore: boolean }>(cacheParams);
      if (cached) {
        // Return cached data immediately
        if (isMounted) {
          setHotels(cached.data);
          setPage(0);
          setHasMore(cached.hasMore);
          setIsSearching(false);
        }

        // Revalidate in background
        fetchOTAHotelsAction(
          cacheParams.page, cacheParams.limit, cacheParams.category,
          cacheParams.search, cacheParams.location,
          cacheParams.checkin, cacheParams.checkout, cacheParams.guests
        ).then((response) => {
          if (isMounted && response.success) {
            searchCache.set(cacheParams, { data: response.data, hasMore: response.hasMore });
            // Only update if data changed
            if (JSON.stringify(response.data) !== JSON.stringify(cached.data)) {
              setHotels(response.data);
              setHasMore(response.hasMore);
            }
          }
        }).catch(() => {
          // Silently ignore revalidation errors
        });

        return;
      }

      // Cache miss — fetch fresh
      setIsSearching(true);
      const response = await fetchOTAHotelsAction(
        0, 24, activeCategory, searchTerm, urlLocation, urlCheckin, urlCheckout, urlGuests
      );

      if (isMounted) {
        if (response.success) {
          searchCache.set(cacheParams, { data: response.data, hasMore: response.hasMore });
          setHotels(response.data);
          setPage(0);
          setHasMore(response.hasMore);
        }
        setIsSearching(false);
      }
    }, 300); // Reduced from 500ms to 300ms since cache provides instant feedback

    return () => {
      isMounted = false;
      clearTimeout(delayDebounceFn);
    };
  }, [searchTerm, activeCategory, urlLocation, urlCheckin, urlCheckout, urlGuests]);

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
    const response = await fetchOTAHotelsAction(nextPage, 24, activeCategory, searchTerm, urlLocation, urlCheckin, urlCheckout, urlGuests);

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
          {/* Desktop: Full search bar */}
          <div className='hidden sm:block max-w-3xl mx-auto relative group'>
            <SearchBarUnified
              onSearch={(filters) => {
                setSearchTerm(filters.location);
              }}
            />
          </div>

          {/* Mobile: Tap to open search sheet */}
          <button
            onClick={() => setIsMobileSheetOpen(true)}
            className='sm:hidden flex items-center gap-3 w-full px-5 py-3.5 bg-card rounded-[var(--radius-squircle-xl)] border border-border/30 shadow-sm active:scale-[0.98] transition-transform'
          >
            <MapPin size={20} className='text-brand-600 shrink-0' />
            <div className='flex-1 text-left'>
              <p className='text-xs text-muted-foreground'>{urlLocation || t('ota.search.destination')}</p>
              <p className='text-sm font-bold text-foreground truncate'>
                {urlLocation || t('ota.search.placeholder')}
              </p>
            </div>
            {(urlCheckin || urlGuests) && (
              <div className='flex items-center gap-2 text-xs text-muted-foreground'>
                {urlCheckin && <Calendar size={14} />}
                {urlGuests && <User size={14} />}
              </div>
            )}
          </button>
        </div>

        {/* Map toggle + Map view */}
        {hotels.length > 0 && (
          <div className='mb-6 sm:mb-8'>
            <div className='flex items-center justify-between mb-3'>
              <h2 className='text-sm font-bold text-foreground'>
                {hotels.length} {hotels.length === 1 ? 'alojamiento' : 'alojamientos'}
              </h2>
              <button
                onClick={() => setShowMap(!showMap)}
                className='flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors'
              >
                <MapPin size={14} />
                {showMap ? 'Ver lista' : 'Ver mapa'}
              </button>
            </div>

            {showMap ? (
              <div className="relative">
                <HotelMapView
                  hotels={hotels.map((h: any) => ({
                    id: h.id,
                    name: h.name,
                    location: h.location,
                    address: h.address,
                    min_price: h.min_price,
                    slug: h.slug,
                    main_image_url: h.main_image_url,
                  }))}
                  centerLocation={urlLocation || undefined}
                  onMapBoundsChange={handleMapBoundsChange}
                  onSearchAreaChange={handleSearchAreaChange}
                  enableSearchOnMove={true}
                />

                {/* Mobile: Back to list button (top-left) */}
                <motion.button
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  onClick={() => setShowMap(false)}
                  className="sm:hidden absolute top-3 left-3 z-[100] flex items-center gap-1.5 px-3 py-2 bg-card/90 backdrop-blur-sm text-xs font-semibold text-foreground rounded-[var(--radius-squircle-xl)] border border-border/30 shadow-sm active:scale-[0.95] transition-transform"
                >
                  <ChevronDown size={14} className="rotate-90" />
                  Lista
                </motion.button>

                {/* Mobile: Floating search button (bottom-right) */}
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIsMobileSheetOpen(true)}
                  className="sm:hidden absolute bottom-4 right-4 z-[100] flex items-center justify-center w-12 h-12 bg-brand-600 text-white rounded-[var(--radius-squircle-xl)] shadow-lg hover:bg-brand-700 transition-colors"
                >
                  <Search size={20} />
                </motion.button>

                {/* Bounds filter summary (Phase 2: PRD-004) */}
                {boundsFilterResult && boundsFilterResult.visibleCount < boundsFilterResult.total - boundsFilterResult.unresolvableIds.size && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute top-4 left-1/2 -translate-x-1/2 z-[100] px-3 py-1.5 bg-card/90 backdrop-blur-sm text-xs font-medium text-foreground rounded-full border border-border/30 shadow-sm"
                  >
                    {getBoundsFilterSummary(boundsFilterResult)}
                  </motion.div>
                )}

                {/* "Search this area" button (appears when user pans away) */}
                {isMapMoved && (
                  <motion.button
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    onClick={handleSearchThisArea}
                    className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white text-sm font-semibold rounded-[var(--radius-squircle-xl)] shadow-lg hover:bg-brand-700 transition-colors"
                  >
                    <Search size={14} />
                    Buscar en esta zona
                  </motion.button>
                )}
              </div>
            ) : null}
          </div>
        )}

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
                  href={preserveSearchParams(searchParams, `/hotel/${hotel.slug}`)}
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

      {/* Mobile Search Sheet (Phase 3: PRD-004 - works over map view) */}
      <MobileSearchSheet
        isOpen={isMobileSheetOpen}
        onClose={() => setIsMobileSheetOpen(false)}
        onSearch={(filters) => {
          // Update search term (triggers hotel fetch + map marker update)
          setSearchTerm(filters.location);
          // Update URL location param
          syncToUrl({ location: filters.location });
          // Update dates/guests URL params
          const params = new URLSearchParams(searchParams.toString());
          if (filters.checkin) params.set('checkin', filters.checkin);
          else params.delete('checkin');
          if (filters.checkout) params.set('checkout', filters.checkout);
          else params.delete('checkout');
          if (filters.guests > 1) params.set('guests', filters.guests.toString());
          else params.delete('guests');
          const query = params.toString();
          const url = query ? `${pathname}?${query}` : pathname;
          router.replace(url, { scroll: false });
        }}
        isLoading={isSearching}
      />
    </div>
  );
}
