'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  ArrowDown,
  ArrowUpDown,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import HotelCard from './HotelCard';
import FeaturedCard from './FeaturedCard';
import LanguageSwitcher from './LanguageSwitcher';
import SearchBarUnified from './SearchBarUnified';
import MobileSearchSheet from './MobileSearchSheet';
import MapBottomSheet from './MapBottomSheet';

// PRD-008 fix: Leaflet depends on window/document → must be client-only
const HotelMapView = dynamic(() => import('./HotelMapView'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-64 sm:h-80 bg-muted/30 rounded-[var(--radius-squircle-xl)] animate-pulse flex items-center justify-center border border-border/30">
      <div className="flex flex-col items-center gap-2">
        <Loader2 size={24} className="animate-spin text-muted-foreground" />
        <p className="text-xs text-muted-foreground">Cargando mapa...</p>
      </div>
    </div>
  ),
});
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { fetchOTAHotelsAction } from '@/app/actions/ota';
import { useTranslations } from 'next-intl';
import { springSnappy, springGentle } from '@/lib/mac2026/spring';
import { preserveSearchParams } from '@/lib/handoff-url';
import { searchCache } from '@/lib/search-cache';
import { useSharedMoveGuard } from '@/lib/use-shared-move-guard';
import L from 'leaflet';
import { filterHotelsByBounds, BoundsFilterResult } from '@/lib/bounds-filter';
import { getCachedCoords } from '@/lib/geo-cache';
import { deserializeMapParams, serializeMapParams } from '@/lib/map-url-state';
import SearchSuggestions, { type SearchSuggestion } from './SearchSuggestions';
import { fuzzySearch } from '@/lib/fuzzy-search';
import { Globe } from 'lucide-react';

const CATEGORIES = [
  { id: 'all', labelKey: 'ota.categories.all', icon: SlidersHorizontal, popular: false },
  { id: 'glamping', labelKey: 'ota.categories.glamping', icon: Tent, popular: true },
  { id: 'hotel', labelKey: 'ota.categories.hotels', icon: Building2, popular: true },
  { id: 'cabin', labelKey: 'ota.categories.cabins', icon: Home, popular: false },
  { id: 'boutique', labelKey: 'ota.categories.boutique', icon: Castle, popular: false },
];

const POPULAR_CATEGORIES = CATEGORIES.filter(c => c.popular);
const OTHER_CATEGORIES = CATEGORIES.filter(c => !c.popular);

// ── Fallback chain: static city lists for fuzzy typo detection ──────────────
const FALLBACK_CITIES = [
  'Bogotá', 'Medellín', 'Cartagena', 'Cali', 'Barranquilla',
  'Santa Marta', 'San Andrés', 'Pereira', 'Manizales', 'Armenia',
  'Bucaramanga', 'Villavicencio', 'Cúcuta', 'Ibagué', 'Neiva',
  'Popayán', 'Pasto', 'Montería', 'Sincelejo', 'Valledupar',
  'Guatapé', 'Jardín', 'Salento', 'Filandia', 'Villa de Leyva',
  'Barichara', 'Palomino', 'Minca', 'Capurganá', 'Nuquí',
];

const POPULAR_DESTINATIONS = [
  { city: 'Medellín', hotelCount: 45 },
  { city: 'Cartagena', hotelCount: 38 },
  { city: 'Bogotá', hotelCount: 32 },
  { city: 'Santa Marta', hotelCount: 28 },
  { city: 'San Andrés', hotelCount: 22 },
  { city: 'Eje Cafetero', hotelCount: 20 },
  { city: 'Guatapé', hotelCount: 15 },
  { city: 'Villa de Leyva', hotelCount: 12 },
];

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
  // Progressive disclosure: searchTerm captures location from Step 1, synced from URL location
  const [searchTerm, setSearchTerm] = useState(urlLocation);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);

  // PRD-006: Desktop split-view detection (≥768px)
  // Initialized to false (matches SSR) — corrected after mount via useEffect
  const [isSplitView, setIsSplitView] = useState(false);

  // PRD-006: Restore map center/zoom from URL params
  const initialMapState = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return deserializeMapParams(new URLSearchParams(window.location.search));
  }, []);
  const initialCenter = useMemo<[number, number] | undefined>(() => {
    if (!initialMapState) return undefined;
    return [initialMapState.center.lat, initialMapState.center.lng];
  }, [initialMapState]);
  const initialZoom = initialMapState?.zoom ?? undefined;

  // PRD-006: Shared move guard for map flyTo deduplication
  useSharedMoveGuard();

  // Media query: listen for viewport changes (resize, orientation)
  // Also sets initial value after mount to match SSR
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 768px)');
    setIsSplitView(mql.matches); // set initial value after hydration

    const handler = (e: MediaQueryListEvent) => setIsSplitView(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  // Map state tracking (Phase 1: PRD-004 integration)
  const [mapBounds, setMapBounds] = useState<L.LatLngBounds | null>(null);
  const [mapCenter, setMapCenter] = useState<L.LatLng | null>(null);
  const [mapZoom, setMapZoom] = useState<number>(6);
  const [isMapMoved, setIsMapMoved] = useState(false);
  const originalSearchLocation = useRef(urlLocation);

  // Bounds filter state (Phase 2: PRD-004 bounds filtering)
  const [boundsFilterResult, setBoundsFilterResult] = useState<BoundsFilterResult | null>(null);
  const boundsFilterTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // PRD-006: Bounds-exceeded state (pan > 20% threshold → show "Search this area")
  const [isBoundsExceeded, setIsBoundsExceeded] = useState(false);

  // Selected hotel for map ↔ list sync (Idea #2: hover hotel → zoom to marker)
  const [selectedHotelId, setSelectedHotelId] = useState<string>('');
  const selectedHotelRef = useRef<string>('');

  // Sprint 1: PRD-005 — Sorting + Progressive Disclosure
  const [sortBy, setSortBy] = useState<'recommended' | 'price-asc' | 'price-desc' | 'rating'>('recommended');
  const [visibleCount, setVisibleCount] = useState(6);
  const [searchStep, setSearchStep] = useState<'location' | 'full'>('location');

  // ── PRD-008 Phase 3: Fallback Chain State ─────────────────────────────────
  /** Current relaxation level (0=normal, 1-5=fallback cascade) */
  const [fallbackLevel, setFallbackLevel] = useState(0);
  /** User-facing message explaining the current fallback state */
  const [fallbackMessage, setFallbackMessage] = useState('');
  /** Search suggestions to display (typo corrections, alternatives) */
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  /** Results from relaxed fallback searches (shown instead of empty state) */
  const [fallbackHotels, setFallbackHotels] = useState<any[]>([]);
  /** Whether a fallback search is currently in-flight */
  const [isFallbackSearching, setIsFallbackSearching] = useState(false);
  /** Tracks whether the current param change was triggered by fallback */
  const fallbackTriggeredRef = useRef(false);
  /** Total result count from fallback search (for "X resultados" display) */
  const [fallbackResultCount, setFallbackResultCount] = useState(0);

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

  // PRD-006: Persist map state to URL (center, zoom) with 300ms debounce
  const mapUrlTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!mapCenter || !mapZoom) return;

    if (mapUrlTimeoutRef.current) clearTimeout(mapUrlTimeoutRef.current);

    mapUrlTimeoutRef.current = setTimeout(() => {
      const qs = serializeMapParams({ center: { lat: mapCenter.lat, lng: mapCenter.lng }, zoom: mapZoom });
      const params = new URLSearchParams(searchParams.toString());
      qs.split('&').forEach((p) => {
        const [k, v] = p.split('=');
        if (k && v !== undefined) params.set(k, v);
      });
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }, 300);

    return () => {
      if (mapUrlTimeoutRef.current) clearTimeout(mapUrlTimeoutRef.current);
    };
  }, [mapCenter, mapZoom, pathname, router, searchParams]);

  // PRD-006: Bounds-exceeded callback (pan > 20% threshold → show re-search button)
  const handleBoundsExceeded = useCallback((bounds: L.LatLngBounds) => {
    setIsBoundsExceeded(true);
    setMapBounds(bounds);
  }, []);

  // "Search this area" handler (Phase 4: PRD-006 bounds re-search)
  const handleSearchThisArea = useCallback(async () => {
    if (!mapCenter) return;

    setIsMapMoved(false);
    setIsBoundsExceeded(false);
    setBoundsFilterResult(null);

    // Trigger full server re-fetch with current map area
    const response = await fetchOTAHotelsAction(
      0, 24, activeCategory, searchTerm, urlLocation, urlCheckin, urlCheckout, urlGuests
    );

    if (response.success) {
      setHotels(response.data);
      setPage(0);
      setHasMore(response.hasMore);
    }
  }, [mapCenter, activeCategory, searchTerm, urlLocation, urlCheckin, urlCheckout, urlGuests]);

  // Cleanup bounds filter timeout on unmount
  useEffect(() => {
    return () => {
      if (boundsFilterTimeoutRef.current) {
        clearTimeout(boundsFilterTimeoutRef.current);
      }
    };
  }, []);

  // Handle hotel selection from list (hover → zoom to marker)
  const handleHotelSelect = useCallback((hotelId: string) => {
    setSelectedHotelId(hotelId);
    selectedHotelRef.current = hotelId;
  }, []);

  // Sprint 1: Sorting logic
  // PRD-008: Use effective hotels (primary results, or fallback results when primary is empty)
  const effectiveHotels = useMemo(() => {
    return hotels.length > 0 ? hotels : fallbackHotels;
  }, [hotels, fallbackHotels]);

  const sortedHotels = useMemo(() => {
    const sorted = [...effectiveHotels];
    switch (sortBy) {
      case 'price-asc':
        return sorted.sort((a, b) => (a.min_price || 0) - (b.min_price || 0));
      case 'price-desc':
        return sorted.sort((a, b) => (b.min_price || 0) - (a.min_price || 0));
      case 'rating':
        return sorted.sort((a, b) => (b.reviewStats?.averageRating || 0) - (a.reviewStats?.averageRating || 0));
      case 'recommended':
      default:
        return sorted; // Default order (server ranking)
    }
  }, [effectiveHotels, sortBy]);

  const visibleHotels = sortedHotels.slice(0, visibleCount);
  const hasMoreHotels = sortedHotels.length > visibleCount;

  // Sprint 2: Proximity context — calculate distance from city center
  const cityCenterCoords = useMemo(() => {
    if (!urlLocation) return null;
    return getCachedCoords(urlLocation);
  }, [urlLocation]);

  const getDistanceFromCenter = useCallback((hotel: any): number | undefined => {
    if (!cityCenterCoords) return undefined;
    const hotelCoords = getCachedCoords(hotel.location);
    if (!hotelCoords) return undefined;

    // Haversine formula
    const R = 6371; // Earth's radius in km
    const dLat = (hotelCoords.lat - cityCenterCoords.lat) * Math.PI / 180;
    const dLng = (hotelCoords.lng - cityCenterCoords.lng) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(cityCenterCoords.lat * Math.PI / 180) *
      Math.cos(hotelCoords.lat * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }, [cityCenterCoords]);

  // Sprint 2: Featured card — pick the highest-rated hotel
  const featuredHotel = useMemo(() => {
    if (sortedHotels.length === 0) return null;
    return sortedHotels.reduce((best: any, h: any) =>
      (h.reviewStats?.averageRating || 0) > (best.reviewStats?.averageRating || 0) ? h : best
    , sortedHotels[0]);
  }, [sortedHotels]);

  // Sprint 2: Click marker → scroll to card
  const handleMarkerClick = useCallback((hotelId: string) => {
    const element = document.getElementById(`hotel-card-${hotelId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setSelectedHotelId(hotelId);
      // Clear highlight after 2s
      setTimeout(() => setSelectedHotelId(''), 2000);
    }
  }, []);

  // Progressive disclosure: sync location to URL before transitioning to full search bar
  const handleCommitLocation = useCallback(() => {
    if (!searchTerm.trim()) return;
    syncToUrl({ location: searchTerm });
    setSearchStep('full');
  }, [searchTerm, syncToUrl]);

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

  // ── PRD-008 Phase 3: Reset fallback when user manually changes search ──────
  // Detects genuine user-driven param changes (not fallback-triggered re-fetches)
  useEffect(() => {
    if (!fallbackTriggeredRef.current) {
      setFallbackLevel(0);
      setFallbackMessage('');
      setFallbackHotels([]);
      setSuggestions([]);
      setFallbackResultCount(0);
    }
    fallbackTriggeredRef.current = false;
  }, [searchTerm, activeCategory, urlLocation, urlCheckin, urlCheckout, urlGuests]);

  // ── PRD-008 Phase 3: Fallback Cascade Effect ──────────────────────────────
  // 5-level relaxation chain when primary search returns zero results
  useEffect(() => {
    // Guard: don't run during search or when results exist
    if (isSearching || isFallbackSearching) return;
    if (hotels.length > 0 || fallbackHotels.length > 0 || fallbackLevel >= 5) return;

    // Don't cascade if no filters are active to relax
    const hasCategory = activeCategory !== 'all';
    const hasLocation = !!urlLocation;
    if (fallbackLevel >= 2 && !hasCategory && !hasLocation) return;

    const runFallback = async () => {
      const nextLevel = fallbackLevel + 1;
      fallbackTriggeredRef.current = true;
      setIsFallbackSearching(true);

      let message = '';
      let newSuggestions: SearchSuggestion[] = [];
      let newHotels: any[] = [];
      let resultCount = 0;

      switch (nextLevel) {
        // ── Level 1: Fuzzy typo detection on location ─────────────────────
        case 1: {
          if (!urlLocation) break;
          const citiesList = FALLBACK_CITIES.map(c => ({ city: c }));
          const matches = fuzzySearch(citiesList, urlLocation, ['city'], 5);
          const goodMatches = matches.filter(m => m.score < 0.3);

          if (goodMatches.length > 0) {
            const best = goodMatches[0].item.city;
            newSuggestions = [{
              text: best,
              subtitle: `Corrección de "${urlLocation}"`,
              action: best,
              icon: 'city',
            }];
            message = `¿Querías decir "${best}"?`;
          }
          break;
        }

        // ── Level 2: Remove category filter ───────────────────────────────
        case 2: {
          if (activeCategory === 'all') break;
          const response = await fetchOTAHotelsAction(
            0, 24, 'all', searchTerm, urlLocation, urlCheckin, urlCheckout, urlGuests,
          );
          if (response.success && response.data.length > 0) {
            newHotels = response.data;
            resultCount = response.data.length;
            message = `Mostrando ${resultCount} resultados de todas las categorías`;
          }
          break;
        }

        // ── Level 3: Remove location filter ───────────────────────────────
        case 3: {
          if (!urlLocation) break;
          const response = await fetchOTAHotelsAction(
            0, 24, activeCategory, searchTerm, '', urlCheckin, urlCheckout, urlGuests,
          );
          if (response.success && response.data.length > 0) {
            newHotels = response.data;
            resultCount = response.data.length;
            message = `Mostrando ${resultCount} resultados en otras zonas`;
          }
          break;
        }

        // ── Level 4: Remove both filters + show popular alternatives ──────
        case 4: {
          const response = await fetchOTAHotelsAction(
            0, 24, 'all', searchTerm, '', urlCheckin, urlCheckout, urlGuests,
          );
          if (response.success && response.data.length > 0) {
            newHotels = response.data;
            resultCount = response.data.length;
            message = `Resultados en toda Colombia • ${resultCount} alojamientos`;
          }

          // Always show popular destination suggestions at this level
          newSuggestions = POPULAR_DESTINATIONS.map(d => ({
            text: d.city,
            subtitle: `${d.hotelCount} alojamientos`,
            action: d.city,
            icon: 'city' as const,
          }));
          break;
        }

        // ── Level 5: Pure suggestions (no results at all) ─────────────────
        case 5: {
          newSuggestions = POPULAR_DESTINATIONS.map(d => ({
            text: d.city,
            subtitle: `${d.hotelCount} alojamientos`,
            action: d.city,
            icon: 'city' as const,
          }));
          message = 'No encontramos resultados. Explorá estas alternativas:';
          break;
        }
      }

      setFallbackLevel(nextLevel);
      setFallbackMessage(message);
      setSuggestions(newSuggestions);
      setFallbackHotels(newHotels);
      setFallbackResultCount(resultCount);
      setIsFallbackSearching(false);
    };

    runFallback();
  }, [hotels.length, fallbackHotels.length, fallbackLevel, isSearching,
      activeCategory, urlLocation, searchTerm, urlCheckin, urlCheckout, urlGuests]);

  // ── PRD-008 Phase 3: Handle suggestion click ──────────────────────────────
  const handleSuggestionClick = useCallback((suggestion: SearchSuggestion) => {
    // Reset all fallback state
    setFallbackLevel(0);
    setFallbackMessage('');
    setFallbackHotels([]);
    setSuggestions([]);
    setFallbackResultCount(0);

    // Apply the suggestion as the new location and reset category
    setActiveCategory('all');
    setSearchTerm(suggestion.action);
    syncToUrl({ location: suggestion.action, category: 'all' });
  }, [syncToUrl]);

  // ── PRD-008 Phase 3: "Buscar en toda Colombia" handler ────────────────────
  const handleSearchAllColombia = useCallback(() => {
    setFallbackLevel(0);
    setFallbackMessage('');
    setFallbackHotels([]);
    setSuggestions([]);
    setFallbackResultCount(0);
    setActiveCategory('all');
    syncToUrl({ category: 'all', location: '' });
  }, [syncToUrl]);

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

  // PRD-006: Extract hotel list (categories + grid) for reuse in split-view and mobile
  const renderHotelList = () => (
    <>
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

      {/* GRID DE HOTELES — Sprint 1: 3 cols (2 in split-view), 6 cards iniciales */}
      {isSearching ? (
        <div className='flex flex-col items-center justify-center py-20 text-muted-foreground'>
          <Loader2 size={40} className='animate-spin mb-3 text-brand-500' />
          <p className='font-semibold text-sm'>{t('ota.loading.searching')}</p>
        </div>
      ) : visibleHotels.length > 0 ? (
        <>
          {/* Sprint 2: Featured card */}
          {featuredHotel && sortBy === 'recommended' && (
            <FeaturedCard hotel={featuredHotel} variant={isSplitView ? 'compact' : 'full'} />
          )}

          {/* Sorting controls — Sprint 1: PRD-005 */}
          <div className='flex items-center justify-between mb-4'>
            <div className='relative'>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className='appearance-none flex items-center gap-2 px-4 py-2 bg-card border border-border/30 rounded-[var(--radius-squircle-xl)] text-sm font-medium text-foreground cursor-pointer hover:border-border/50 transition-colors pr-8'
              >
                <option value='recommended'>⭐ Recomendados</option>
                <option value='price-asc'>💰 Precio: menor a mayor</option>
                <option value='price-desc'>💰 Precio: mayor a menor</option>
                <option value='rating'>⭐ Mejor rating</option>
              </select>
              <ArrowUpDown size={14} className='absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none' />
            </div>
            {hasMoreHotels && (
              <p className='text-xs text-muted-foreground'>
                Mostrando {visibleCount} de {sortedHotels.length}
              </p>
            )}
          </div>

          <div className={`grid grid-cols-1 sm:grid-cols-2 ${isSplitView ? '' : 'lg:grid-cols-3'} gap-4 sm:gap-6 lg:gap-8`}>
            <AnimatePresence mode='popLayout'>
              {visibleHotels.map((hotel: any) => (
                <div key={hotel.id} id={`hotel-card-${hotel.id}`}>
                  <HotelCard
                    hotel={hotel}
                    href={preserveSearchParams(searchParams, `/hotel/${hotel.slug}`)}
                    isSelected={hotel.id === selectedHotelId}
                    onSelect={handleHotelSelect}
                    distanceFromCenter={getDistanceFromCenter(hotel)}
                  />
                </div>
              ))}
            </AnimatePresence>
          </div>

          {/* "Mostrar más" button — Sprint 1 */}
          {hasMoreHotels && (
            <div className='flex justify-center mt-12 sm:mt-16 mb-16 sm:mb-20'>
              <motion.button
                onClick={() => setVisibleCount(prev => prev + 6)}
                whileTap={{ scale: 0.97 }}
                transition={springSnappy()}
                className='flex items-center gap-2 px-6 py-3 bg-card border border-border/50 rounded-[var(--radius-squircle-xl)] text-sm font-semibold text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-all'
              >
                <Plus size={14} /> Mostrar más alojamientos
              </motion.button>
            </div>
          )}
        </>
      ) : (
        <div className='text-center py-10'>
          {/* Fallback message banner */}
          {fallbackMessage && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={springSnappy()}
              className='mb-6'
            >
              <div className='inline-flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-[var(--radius-squircle-lg)] text-sm font-medium text-amber-800 dark:text-amber-200'>
                <Search size={14} className='shrink-0' />
                {fallbackMessage}
              </div>
            </motion.div>
          )}

          {/* Fallback searching spinner */}
          {isFallbackSearching && (
            <div className='flex flex-col items-center justify-center py-12'>
              <Loader2 size={32} className='animate-spin mb-3 text-brand-500' />
              <p className='text-sm text-muted-foreground'>Buscando alternativas…</p>
            </div>
          )}

          {/* SearchSuggestions component */}
          {!isFallbackSearching && suggestions.length > 0 && (
            <SearchSuggestions
              suggestions={suggestions}
              onSuggestionClick={handleSuggestionClick}
              type={
                fallbackLevel === 1 ? 'typo'
                : fallbackLevel >= 5 ? 'empty'
                : 'alternative'
              }
              className='mb-6'
            />
          )}

          {/* "Buscar en toda Colombia" button (level 4) */}
          {!isFallbackSearching && fallbackLevel >= 4 && (
            <motion.button
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...springSnappy(), delay: 0.2 }}
              onClick={handleSearchAllColombia}
              className='mt-4 flex items-center gap-2 mx-auto px-5 py-2.5 bg-brand-600 text-white text-sm font-semibold rounded-[var(--radius-squircle-xl)] active:scale-[0.98] transition-all hover:bg-brand-700'
            >
              <Globe size={16} />
              Buscar en toda Colombia
            </motion.button>
          )}

          {/* Default empty state when no fallback is active */}
          {!isFallbackSearching && suggestions.length === 0 && (
            <>
              <Tent size={48} className='mx-auto mb-4 text-muted-foreground/40' />
              <h3 className='text-lg font-bold text-muted-foreground mb-1'>
                {t('ota.noResults.title')}
              </h3>
              <p className='text-sm text-muted-foreground/70'>{t('ota.noResults.description')}</p>
            </>
          )}
        </div>
      )}

      {/* BOTON CARGAR MAS (server-side pagination) */}
      {hasMore && !isSearching && (
        <div className='flex justify-center mt-8 mb-16 sm:mb-20'>
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
    </>
  );

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
        {/* HERO — Sprint 1: PRD-005 redesign */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springGentle()}
          className='text-center mb-6 sm:mb-8'
        >
          <h1 className='text-3xl sm:text-4xl md:text-5xl font-bold text-foreground tracking-tight leading-tight'>
            {t('ota.hero.title')}{' '}
            <span className='text-brand-500'>
              {t('ota.hero.highlight')}
            </span>
          </h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className='mt-3 text-sm sm:text-base text-muted-foreground max-w-md mx-auto'
          >
            Reserva directo · Sin comisiones · Mejor precio garantizado
          </motion.p>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className='mt-6 flex justify-center'
          >
            <motion.div
              animate={{ y: [0, 6, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              className='w-8 h-12 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center p-1.5'
            >
              <ArrowDown size={14} className='text-muted-foreground/60' />
            </motion.div>
          </motion.div>
        </motion.div>

        {/* SEARCH BAR — Sprint 1: Progressive disclosure */}
        <div className={`sticky z-40 mb-6 sm:mb-8 transition-[top] ${isHeaderVisible ? 'top-14' : 'top-0'}`}
          style={{ transition: 'top 0.3s var(--spring-gentle)' }}
        >
          {/* Desktop: Progressive disclosure search bar */}
          <div className='hidden sm:block max-w-3xl mx-auto relative'>
            <AnimatePresence mode='wait'>
              {searchStep === 'location' ? (
                <motion.div
                  key='location-step'
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={springSnappy()}
                >
                  <div className='flex items-center gap-2 bg-card rounded-[var(--radius-squircle-xl)] border border-border/30 shadow-sm p-2'>
                    <div className='flex-1 flex items-center gap-3 px-4'>
                      <MapPin size={20} className='text-brand-600 shrink-0' />
                      <input
                        type='text'
                        placeholder='¿A dónde querés escapar?'
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && searchTerm.trim()) {
                            handleCommitLocation();
                          }
                        }}
                        className='flex-1 bg-transparent text-sm font-medium text-foreground placeholder:text-muted-foreground outline-none'
                        autoFocus
                      />
                    </div>
                    <button
                      onClick={handleCommitLocation}
                      className='flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white text-sm font-semibold rounded-[var(--radius-squircle-xl)] transition-colors active:scale-[0.97] active:bg-brand-700'
                    >
                      <Search size={16} />
                      Buscar
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key='full-step'
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={springSnappy()}
                >
                  <SearchBarUnified
                    onSearch={(filters) => {
                      setSearchTerm(filters.location);
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
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

        {/* PRD-006: Desktop split-view layout (≥768px) */}
        {isSplitView && sortedHotels.length > 0 ? (
          <div className="split-view-layout mb-0">
            {/* List panel (40%) — independent scroll */}
            <div className="list-panel-scroll">
              <h2 className="text-sm font-bold text-foreground mb-4">
                {sortedHotels.length} {sortedHotels.length === 1 ? 'alojamiento' : 'alojamientos'}
              </h2>
              {renderHotelList()}
            </div>

            {/* Map panel (60%) — sticky, always visible */}
            <div className="map-panel-sticky relative">
              <HotelMapView
                hotels={sortedHotels.map((h: any) => ({
                  id: h.id,
                  name: h.name,
                  location: h.location,
                  address: h.address,
                  min_price: h.min_price,
                  slug: h.slug,
                  main_image_url: h.main_image_url,
                }))}
                centerLocation={urlLocation || undefined}
                selectedHotelId={selectedHotelId}
                onMarkerClick={handleMarkerClick}
                onMapBoundsChange={handleMapBoundsChange}
                onSearchAreaChange={handleSearchAreaChange}
                enableSearchOnMove={true}
                initialCenter={initialCenter}
                initialZoom={initialZoom}
                onBoundsExceeded={handleBoundsExceeded}
                boundsThreshold={0.2}
              />

              {/* "Search this area" — bounds exceeded button */}
              <AnimatePresence>
                {isBoundsExceeded && (
                  <motion.button
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    onClick={handleSearchThisArea}
                    className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white text-sm font-semibold rounded-[var(--radius-squircle-xl)] shadow-lg active:scale-[0.98] active:bg-brand-700 transition-all"
                  >
                    <Search size={14} />
                    Buscar en esta zona
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </div>
        ) : (
          <>
            {/* PRD-006: Mobile map-first (full-viewport map + bottom sheet) */}
            {sortedHotels.length > 0 ? (
              <>
                {/* Full-viewport map (fixed, covers entire screen below header/search) */}
                <div className="fixed inset-0 z-0">
                  <HotelMapView
                    hotels={sortedHotels.map((h: any) => ({
                      id: h.id,
                      name: h.name,
                      location: h.location,
                      address: h.address,
                      min_price: h.min_price,
                      slug: h.slug,
                      main_image_url: h.main_image_url,
                    }))}
                    centerLocation={urlLocation || undefined}
                    selectedHotelId={selectedHotelId}
                    onMarkerClick={handleMarkerClick}
                    onMapBoundsChange={handleMapBoundsChange}
                    onSearchAreaChange={handleSearchAreaChange}
                    enableSearchOnMove={true}
                    initialCenter={initialCenter}
                    initialZoom={initialZoom}
                    onBoundsExceeded={handleBoundsExceeded}
                    boundsThreshold={0.2}
                  />

                  {/* "Search this area" button (appears when user pans beyond bounds threshold) */}
                  <AnimatePresence>
                    {isBoundsExceeded && (
                      <motion.button
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 16 }}
                        onClick={handleSearchThisArea}
                        className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white text-sm font-semibold rounded-[var(--radius-squircle-xl)] shadow-lg active:scale-[0.98] active:bg-brand-700 transition-all"
                      >
                        <Search size={14} />
                        Buscar en esta zona
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>

                {/* Bottom sheet overlay */}
                <MapBottomSheet
                  hotels={visibleHotels}
                  featuredHotel={featuredHotel}
                  sortBy={sortBy}
                  onSortChange={setSortBy}
                  onHotelSelect={handleHotelSelect}
                  onMarkerClick={handleMarkerClick}
                  onLoadMore={() => setVisibleCount(prev => prev + 6)}
                  visibleCount={visibleCount}
                  hasMoreHotels={hasMoreHotels}
                  getDistanceFromCenter={getDistanceFromCenter}
                  activeCategory={activeCategory}
                  onCategoryChange={(cat) => {
                    setActiveCategory(cat);
                    syncToUrl({ category: cat });
                  }}
                />

                {/* Spacer: prevents main content from collapsing when map is fixed.
                    The hero text is hidden behind the map, but the sticky search bar
                    still overlays correctly via z-40. */}
                <div className="h-screen sm:hidden" aria-hidden="true" />
              </>
            ) : (
              /* No results fallback: show categories + empty grid */
              renderHotelList()
            )}
          </>
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
