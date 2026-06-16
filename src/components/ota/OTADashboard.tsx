"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
	X,
} from "lucide-react";
import dynamic from "next/dynamic";
import HotelCard from "./HotelCard";
import FeaturedCard from "./FeaturedCard";
import LanguageSwitcher from "./LanguageSwitcher";
import SearchBarUnified from "./SearchBarUnified";
import MobileSearchSheet from "./MobileSearchSheet";
import MapBottomSheet from "./MapBottomSheet";
// import MapToggle from "./MapToggle"; // disabled in production V1

// PRD-008 fix: Leaflet depends on window/document → must be client-only
const HotelMapView = dynamic(() => import("./HotelMapView"), {
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
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { fetchChannelHotelsAction } from "@/app/actions/ota";
import { useTranslations } from "next-intl";
import { springSnappy, springGentle } from "@/lib/mac2026/spring";
import { preserveSearchParams } from "@/lib/handoff-url";
import { searchCache } from "@/lib/search-cache";
import { useSharedMoveGuard } from "@/lib/use-shared-move-guard";
import { useSearchState } from "@/hooks/useSearchState";
import { useSorting, type SortOption } from "@/hooks/useSorting";
import { useFallbackChain } from "@/hooks/useFallbackChain";
import L from "leaflet";
import { filterHotelsByBounds, BoundsFilterResult } from "@/lib/bounds-filter";
import { getCachedCoords } from "@/lib/geo-cache";
import { deserializeMapParams, serializeMapParams } from "@/lib/map-url-state";
import SearchSuggestions, { type SearchSuggestion } from "./SearchSuggestions";
import { fuzzySearch } from "@/lib/fuzzy-search";
import { Globe } from "lucide-react";

const CATEGORIES = [
	{
		id: "all",
		labelKey: "ota.categories.all",
		icon: SlidersHorizontal,
		popular: false,
	},
	{
		id: "glamping",
		labelKey: "ota.categories.glamping",
		icon: Tent,
		popular: true,
	},
	{
		id: "hotel",
		labelKey: "ota.categories.hotels",
		icon: Building2,
		popular: true,
	},
	{
		id: "cabin",
		labelKey: "ota.categories.cabins",
		icon: Home,
		popular: false,
	},
	{
		id: "boutique",
		labelKey: "ota.categories.boutique",
		icon: Castle,
		popular: false,
	},
];

const POPULAR_CATEGORIES = CATEGORIES.filter((c) => c.popular);
const OTHER_CATEGORIES = CATEGORIES.filter((c) => !c.popular);

// ── Fallback chain: static city lists for fuzzy typo detection ──────────────
const FALLBACK_CITIES = [
	"Bogotá",
	"Medellín",
	"Cartagena",
	"Cali",
	"Barranquilla",
	"Santa Marta",
	"San Andrés",
	"Pereira",
	"Manizales",
	"Armenia",
	"Bucaramanga",
	"Villavicencio",
	"Cúcuta",
	"Ibagué",
	"Neiva",
	"Popayán",
	"Pasto",
	"Montería",
	"Sincelejo",
	"Valledupar",
	"Guatapé",
	"Jardín",
	"Salento",
	"Filandia",
	"Villa de Leyva",
	"Barichara",
	"Palomino",
	"Minca",
	"Capurganá",
	"Nuquí",
];

const POPULAR_DESTINATIONS = [
	{ city: "Medellín", hotelCount: 45 },
	{ city: "Cartagena", hotelCount: 38 },
	{ city: "Bogotá", hotelCount: 32 },
	{ city: "Santa Marta", hotelCount: 28 },
	{ city: "San Andrés", hotelCount: 22 },
	{ city: "Eje Cafetero", hotelCount: 20 },
	{ city: "Guatapé", hotelCount: 15 },
	{ city: "Villa de Leyva", hotelCount: 12 },
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

  // SRP: Search state extracted to hook (was 120+ lines of state + callbacks)
  const {
    searchTerm,
    setSearchTerm,
    searchStep,
    setSearchStep,
    activeCategory,
    setActiveCategory,
    isCategoryOpen,
    setIsCategoryOpen,
    handleCommitLocation,
    syncToUrl,
    urlValues,
  } = useSearchState();

  const { location: urlLocation, checkin: urlCheckin, checkout: urlCheckout, guests: urlGuests } = urlValues;

  // Ref for location input — used to restore focus after clear
  const inputRef = useRef<HTMLInputElement>(null);

  const [hotels, setHotels] = useState(initialHotels);
	const [page, setPage] = useState(0);
	const [hasMore, setHasMore] = useState(initialHasMore);
	const [isLoadingMore, setIsLoadingMore] = useState(false);
	const [isSearching, setIsSearching] = useState(false);
	const [isHeaderVisible, setIsHeaderVisible] = useState(true);
	const isFirstSearchDone = useRef(false);
	const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);

	// PRD-006: Desktop split-view detection (≥768px)
	// Initialized to false (matches SSR) — corrected after mount via useEffect
	const [isSplitView, setIsSplitView] = useState(false);

	// PRD-006: Restore map center/zoom from URL params
	const initialMapState = useMemo(() => {
		if (typeof window === "undefined") return null;
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
		const mql = window.matchMedia("(min-width: 768px)");
		setIsSplitView(mql.matches); // set initial value after hydration

		const handler = (e: MediaQueryListEvent) => setIsSplitView(e.matches);
		mql.addEventListener("change", handler);
		return () => mql.removeEventListener("change", handler);
	}, []);

	const [_mapBounds, setMapBounds] = useState<L.LatLngBounds | null>(null);
	const [mapCenter, setMapCenter] = useState<L.LatLng | null>(null);
	const [mapZoom, setMapZoom] = useState<number>(6);
	const [isMapMoved, setIsMapMoved] = useState(false);
	const originalSearchLocation = useRef(urlLocation);

	// Bounds filter state (Phase 2: PRD-004 bounds filtering)
	const [boundsFilterResult, setBoundsFilterResult] =
		useState<BoundsFilterResult | null>(null);
	const boundsFilterTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
		null,
	);

	// Selected hotel for map ↔ list sync (Idea #2: hover hotel → zoom to marker)
	const [selectedHotelId, setSelectedHotelId] = useState<string>("");
	const selectedHotelRef = useRef<string>("");

	// SRP: Sorting logic extracted to hook (was ~40 lines of state + useMemo)
  const {
    sortBy,
    setSortBy,
    visibleCount,
    showMore,
    computeSorted,
    computeFeatured,
    getDistanceFromCenter,
  } = useSorting({ urlLocation });

  // SRP: Fallback chain extracted to hook (was ~150 lines of state + useEffect)
  const {
    fallbackLevel,
    fallbackMessage,
    suggestions,
    fallbackHotels,
    isFallbackSearching,
    resetFallback,
    handleSuggestionClick: onSuggestionClick,
    handleSearchAllColombia: onSearchAllColombia,
  } = useFallbackChain({
    isSearching,
    hotelsLength: hotels.length,
    activeCategory,
    urlLocation,
    searchTerm,
    urlCheckin,
    urlCheckout,
    urlGuests,
  });

	// PRD-014: Two-stage navigation — cards first, map on demand
	const [viewMode] = useState<"cards" | "map">("cards"); // Production V1: map disabled, lab only

	// Judge verdict: map and split-view only exist if search is active
	const isSearchActive = useMemo(() => !!urlLocation, [urlLocation]);

	// Map callbacks (Phase 1: PRD-004 integration)
	const handleMapBoundsChange = useCallback(
		(bounds: L.LatLngBounds, center: L.LatLng, zoom: number) => {
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
					bounds,
				);
				setBoundsFilterResult(result);
			}, 500);
		},
		[urlLocation, hotels],
	);

	const handleSearchAreaChange = useCallback(
		(areaName: string) => {
			// Update URL location param when user pans to a new area
			if (areaName && areaName !== urlLocation) {
				syncToUrl({ location: areaName });
			}
		},
		[urlLocation, syncToUrl],
	);

	// PRD-006: Persist map state to URL (center, zoom) with 300ms debounce
	const mapUrlTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	useEffect(() => {
		if (!mapCenter || !mapZoom || !urlLocation) return;

		if (mapUrlTimeoutRef.current) clearTimeout(mapUrlTimeoutRef.current);

		mapUrlTimeoutRef.current = setTimeout(() => {
			const qs = serializeMapParams({
				center: { lat: mapCenter.lat, lng: mapCenter.lng },
				zoom: mapZoom,
			});
			const params = new URLSearchParams(searchParams.toString());
			qs.split("&").forEach((p) => {
				const [k, v] = p.split("=");
				if (k && v !== undefined) params.set(k, v);
			});
			// Use history.replaceState to avoid Next.js re-render — Airbnb-style silent URL update
			window.history.replaceState(null, "", `${pathname}?${params.toString()}`);
		}, 2000);

		return () => {
			if (mapUrlTimeoutRef.current) clearTimeout(mapUrlTimeoutRef.current);
		};
	}, [mapCenter, mapZoom, pathname, router, searchParams]);

	// PRD-006: Bounds-exceeded → auto-enable map filtering (Airbnb-style)
	const handleBoundsExceeded = useCallback((bounds: L.LatLngBounds) => {
		setIsMapMoved(true);
		setMapBounds(bounds);
	}, []);

	// Cleanup bounds filter timeout on unmount
	useEffect(() => {
		return () => {
			if (boundsFilterTimeoutRef.current) {
				clearTimeout(boundsFilterTimeoutRef.current);
			}
		};
	}, []);

	// Handle hotel selection from list (hover → zoom to marker) with debounce
	const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const handleHotelSelect = useCallback((hotelId: string) => {
		if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
		hoverTimeoutRef.current = setTimeout(() => {
			setSelectedHotelId(hotelId);
			selectedHotelRef.current = hotelId;
		}, 80); // 80ms debounce — evita flyTo excesivo en scroll rápido
	}, []);

	// SRP: Sorting computed via hook (was ~40 lines of inline logic)
	const sortedHotels = useMemo(
		() => computeSorted(hotels, fallbackHotels, isMapMoved, boundsFilterResult),
		[computeSorted, hotels, fallbackHotels, isMapMoved, boundsFilterResult],
	);

	const visibleHotels = sortedHotels.slice(0, visibleCount);
	const hasMoreHotels = sortedHotels.length > visibleCount;

	const featuredHotel = useMemo(
		() => computeFeatured(sortedHotels),
		[computeFeatured, sortedHotels],
	);

	// Sprint 2: Click marker → scroll to card
	const handleMarkerClick = useCallback((hotelId: string) => {
		const element = document.getElementById(`hotel-card-${hotelId}`);
		if (element) {
			element.scrollIntoView({ behavior: "smooth", block: "center" });
			setSelectedHotelId(hotelId);
			// Clear highlight after 2s
			setTimeout(() => setSelectedHotelId(""), 2000);
		}
	}, []);

	// PRD-009 Fase 3: Scroll list → highlight marker on map (IntersectionObserver)
	// Guard: skip flyTo while user is actively panning the map

	// User map interaction guard: pause flyTo while user is dragging/zooming
	// Uses Leaflet native dragstart/dragend events — NO timeouts needed

	useEffect(() => {
		// Observe both split-view cards and bottom-sheet cards
		const cards = document.querySelectorAll('[id^="hotel-card-"]');
		if (cards.length === 0) return;

		const observer = new IntersectionObserver(
			(entries) => {
				// Find the card with the highest intersection ratio
				let bestEntry: IntersectionObserverEntry | null = null;
				for (const entry of entries) {
					if (
						entry.intersectionRatio > 0.3 &&
						(!bestEntry ||
							entry.intersectionRatio > bestEntry.intersectionRatio)
					) {
						bestEntry = entry;
					}
				}
				if (bestEntry) {
					const id = bestEntry.target.getAttribute("data-hotel-id") || "";
					// Skip flyTo while user is actively panning the map
					if (id && id !== selectedHotelRef.current) {
						setSelectedHotelId(id);
						selectedHotelRef.current = id;
					}
				}
			},
			{ rootMargin: "-10% 0px -40% 0px", threshold: [0.1, 0.3, 0.6, 1.0] },
		);

		cards.forEach((card) => observer.observe(card));
		return () => observer.disconnect();
	}, [sortedHotels]);

	// Debounced search effect with stale-while-revalidate cache
	useEffect(() => {
		let isMounted = true;

		// Skip initial mount — SSR already loaded hotels
		const hasUserSearch =
			searchTerm || urlLocation || urlCheckin || urlCheckout;
		if (!hasUserSearch && !isFirstSearchDone.current) {
			isFirstSearchDone.current = true;
			return;
		}

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
			const cached = searchCache.get<{ data: any[]; hasMore: boolean }>(
				cacheParams,
			);
			if (cached) {
				// Return cached data immediately
				if (isMounted) {
					setHotels(cached.data);
					setPage(0);
					setHasMore(cached.hasMore);
					setIsSearching(false);
				}

				// Revalidate in background
				fetchChannelHotelsAction(
					cacheParams.page,
					cacheParams.limit,
					cacheParams.category,
					cacheParams.search,
					cacheParams.location,
					cacheParams.checkin,
					cacheParams.checkout,
					cacheParams.guests,
				)
					.then((response) => {
						if (isMounted && response.success) {
							searchCache.set(cacheParams, {
								data: response.data,
								hasMore: response.hasMore,
							});
							// Only update if data changed
							if (
								JSON.stringify(response.data) !== JSON.stringify(cached.data)
							) {
								setHotels(response.data);
								setHasMore(response.hasMore);
							}
						}
					})
					.catch(() => {
						// Silently ignore revalidation errors
					});

				return;
			}

			// Cache miss — fetch fresh
			setIsSearching(true);
			try {
				const response = await fetchChannelHotelsAction(
					0,
					24,
					activeCategory,
					searchTerm,
					urlLocation,
					urlCheckin,
					urlCheckout,
					urlGuests,
				);

				if (isMounted) {
					if (response.success) {
						searchCache.set(cacheParams, {
							data: response.data,
							hasMore: response.hasMore,
						});
						setHotels(response.data);
						setPage(0);
						setHasMore(response.hasMore);
					}
					setIsSearching(false);
				}
			} catch (error) {
				if (isMounted) setIsSearching(false);
				console.error("Channel search error:", error);
			}
		}, 300); // Reduced from 500ms to 300ms since cache provides instant feedback

		return () => {
			isMounted = false;
			clearTimeout(delayDebounceFn);
		};
	}, [
		searchTerm,
		activeCategory,
		urlLocation,
		urlCheckin,
		urlCheckout,
		urlGuests,
	]);

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

		window.addEventListener("scroll", handleScroll, { passive: true });
		return () => window.removeEventListener("scroll", handleScroll);
	}, []);

	const loadMoreHotels = async () => {
		if (isLoadingMore) return;
		setIsLoadingMore(true);

		const nextPage = page + 1;
		const response = await fetchChannelHotelsAction(
			nextPage,
			24,
			activeCategory,
			searchTerm,
			urlLocation,
			urlCheckin,
			urlCheckout,
			urlGuests,
		);

		if (response.success) {
			setHotels((prev) => [...prev, ...response.data]);
			setPage(nextPage);
			setHasMore(response.hasMore);
		} else {
			alert(t("hotelDetail.errorLoadingMore"));
		}

		setIsLoadingMore(false);
	};

	const activeCat = CATEGORIES.find((c) => c.id === activeCategory);

	// PRD-006: Extract hotel list (categories + grid) for reuse in split-view and mobile
	const renderHotelList = () => (
		<>
			{/* CATEGORIES — 2 popular pills + chip for rest */}
			<div className="flex flex-wrap items-center justify-center gap-2 mb-8 sm:mb-12">
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
									? "bg-foreground text-background shadow-md"
									: "bg-card text-muted-foreground hover:text-foreground border border-border/50 hover:border-foreground/20"
							}`}
						>
							<cat.icon size={14} />
							{t(cat.labelKey)}
						</motion.button>
					);
				})}

				{/* Category chip for "All" + others */}
				<div className="relative">
					<motion.button
						onClick={() => setIsCategoryOpen(!isCategoryOpen)}
						whileTap={{ scale: 0.95 }}
						transition={springSnappy()}
						className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold border transition-all ${
							activeCategory === "all" && !isCategoryOpen
								? "bg-foreground text-background shadow-md"
								: "bg-card text-muted-foreground hover:text-foreground border-border/50 hover:border-foreground/20"
						}`}
					>
						<SlidersHorizontal size={14} />
						{activeCategory !== "all" && activeCat
							? t(activeCat.labelKey)
							: t("ota.categories.all")}
						<ChevronDown
							size={12}
							className={`transition-transform ${isCategoryOpen ? "rotate-180" : ""}`}
						/>
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
									className="fixed inset-0 z-40"
									onClick={() => setIsCategoryOpen(false)}
								/>
								{/* Dropdown */}
								<motion.div
									initial={{ opacity: 0, y: 8, scale: 0.95 }}
									animate={{ opacity: 1, y: 0, scale: 1 }}
									exit={{ opacity: 0, y: 8, scale: 0.95 }}
									transition={springGentle()}
									className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-50 bg-card border border-border/50 rounded-[var(--radius-squircle-xl)] shadow-xl p-2 min-w-[180px]"
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
														? "bg-foreground/10 text-foreground"
														: "text-muted-foreground hover:bg-muted hover:text-foreground"
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
				<div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
					<Loader2 size={40} className="animate-spin mb-3 text-brand-500" />
					<p className="font-semibold text-sm">{t("ota.loading.searching")}</p>
				</div>
			) : visibleHotels.length > 0 ? (
				<>
					{/* Sprint 2: Featured card */}
					{featuredHotel && sortBy === "recommended" && (
						<FeaturedCard
							hotel={featuredHotel}
							variant={isSplitView ? "compact" : "full"}
						/>
					)}

					{/* Sorting controls — Sprint 1: PRD-005 */}
					<div className="flex items-center justify-between mb-4">
						<div className="relative">
							<select
								value={sortBy}
								onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
								className="appearance-none flex items-center gap-2 px-4 py-2 bg-card border border-border/30 rounded-[var(--radius-squircle-xl)] text-sm font-medium text-foreground cursor-pointer hover:border-border/50 transition-colors pr-8"
							>
								<option value="recommended">⭐ Recomendados</option>
								<option value="price-asc">💰 Precio: menor a mayor</option>
								<option value="price-desc">💰 Precio: mayor a menor</option>
								<option value="rating">⭐ Mejor rating</option>
							</select>
							<ArrowUpDown
								size={14}
								className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
							/>
						</div>
						{hasMoreHotels && (
							<p className="text-xs text-muted-foreground">
								Mostrando {visibleCount} de {sortedHotels.length}
							</p>
						)}
					</div>

					<div
						className={`grid grid-cols-1 sm:grid-cols-2 ${isSplitView ? "" : "lg:grid-cols-3"} gap-4 sm:gap-6 lg:gap-8`}
					>
						<AnimatePresence mode="popLayout">
							{visibleHotels.map((hotel: any) => (
								<div
									key={hotel.id}
									id={`hotel-card-${hotel.id}`}
									data-hotel-id={hotel.id}
								>
									<HotelCard
										hotel={hotel}
										href={preserveSearchParams(
											searchParams,
											`/hotel/${hotel.slug}`,
										)}
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
						<div className="flex justify-center mt-12 sm:mt-16 mb-32 sm:mb-32">
							<motion.button
								onClick={() => showMore()}
								whileTap={{ scale: 0.97 }}
								transition={springSnappy()}
								className="flex items-center gap-2 px-6 py-3 bg-card border border-border/50 rounded-[var(--radius-squircle-xl)] text-sm font-semibold text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-all"
							>
								<Plus size={14} /> Mostrar más alojamientos
							</motion.button>
						</div>
					)}
				</>
			) : (
				<div className="text-center py-10">
					{/* Fallback message banner */}
					{fallbackMessage && (
						<motion.div
							initial={{ opacity: 0, y: -8 }}
							animate={{ opacity: 1, y: 0 }}
							transition={springSnappy()}
							className="mb-6"
						>
							<div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-[var(--radius-squircle-lg)] text-sm font-medium text-amber-800 dark:text-amber-200">
								<Search size={14} className="shrink-0" />
								{fallbackMessage}
							</div>
						</motion.div>
					)}

					{/* Fallback searching spinner */}
					{isFallbackSearching && (
						<div className="flex flex-col items-center justify-center py-12">
							<Loader2 size={32} className="animate-spin mb-3 text-brand-500" />
							<p className="text-sm text-muted-foreground">
								Buscando alternativas…
							</p>
						</div>
					)}

					{/* SearchSuggestions component */}
					{!isFallbackSearching && suggestions.length > 0 && (
						<SearchSuggestions
							suggestions={suggestions}
							onSuggestionClick={(s) => onSuggestionClick(s, (loc, cat) => {
								setActiveCategory(cat);
								setSearchTerm(loc);
								syncToUrl({ location: loc, category: cat });
							})}
							type={
								fallbackLevel === 1
									? "typo"
									: fallbackLevel >= 5
										? "empty"
										: "alternative"
							}
							className="mb-6"
						/>
					)}

					{/* "Buscar en toda Colombia" button (level 4) */}
					{!isFallbackSearching && fallbackLevel >= 4 && (
						<motion.button
							initial={{ opacity: 0, y: 8 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ ...springSnappy(), delay: 0.2 }}
							onClick={() => onSearchAllColombia((loc, cat) => {
								setActiveCategory(cat);
								syncToUrl({ category: cat, location: loc });
							})}
							className="mt-4 flex items-center gap-2 mx-auto px-5 py-2.5 bg-brand-600 text-primary-foreground text-sm font-semibold rounded-[var(--radius-squircle-xl)] active:scale-[0.98] transition-all hover:bg-brand-500"
						>
							<Globe size={16} />
							Buscar en toda Colombia
						</motion.button>
					)}

					{/* Default empty state when no fallback is active */}
					{!isFallbackSearching && suggestions.length === 0 && (
						<>
							<Tent
								size={48}
								className="mx-auto mb-4 text-muted-foreground/40"
							/>
							<h3 className="text-lg font-bold text-muted-foreground mb-1">
								{t("ota.noResults.title")}
							</h3>
							<p className="text-sm text-muted-foreground/70">
								{t("ota.noResults.description")}
							</p>
						</>
					)}
				</div>
			)}

			{/* BOTON CARGAR MAS (server-side pagination) */}
			{hasMore && !isSearching && (
				<div className="flex justify-center mt-8 mb-16 sm:mb-20">
					<motion.button
						onClick={loadMoreHotels}
						disabled={isLoadingMore}
						whileTap={{ scale: 0.97 }}
						transition={springSnappy()}
						className="flex items-center gap-2 px-6 py-3 bg-card border border-border/50 rounded-[var(--radius-squircle-xl)] text-sm font-semibold text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-all disabled:opacity-50"
					>
						{isLoadingMore ? (
							<>
								<Loader2 size={14} className="animate-spin text-brand-500" />
								{t("ota.loading.loadingMore")}
							</>
						) : (
							<>
								<Plus size={14} /> {t("ota.loadMore")}
							</>
						)}
					</motion.button>
				</div>
			)}
		</>
	);

	return (
		<div className="min-h-screen bg-background flex flex-col font-sans text-foreground">
			{/* HEADER — glass-pill, h-14 mobile */}
			<header
				className={`fixed top-0 left-0 right-0 z-50 glass-pill border-b border-border/20 !rounded-none transition-transform ${isHeaderVisible ? "translate-y-0" : "-translate-y-full"}`}
				style={{ transition: "transform 0.3s var(--spring-gentle)" }}
			>
				<div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
					<Link
						href="/"
						className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
					>
						<div className="w-8 h-8 rounded-[var(--radius-squircle-md)] overflow-hidden bg-white/10 p-0.5">
							<img
								src="/logo.png"
								alt="HospedaSuite"
								className="w-full h-full object-contain"
							/>
						</div>
						<span className="text-lg font-bold text-foreground tracking-tight">
							{t("ota.header.brand")}
							<span className="text-brand-500">
								{t("ota.header.brandAccent")}
							</span>
						</span>
					</Link>

					<div className="flex items-center gap-2">
						<LanguageSwitcher />
						<Link
							href="/software"
							className="flex items-center gap-1 sm:gap-1.5 text-xs font-bold text-brand-600 bg-brand-50 px-2 sm:px-3 py-1.5 rounded-full hover:bg-brand-100 transition-colors border border-brand-200 shrink-0"
						>
							<UserLock size={12} />
							<span className="hidden sm:inline">{t("ota.header.hotelAccess")}</span>
						</Link>
					</div>
				</div>
			</header>

			<main className="flex-1 max-w-7xl mx-auto px-4 pt-20 pb-8 w-full">
				{/* HERO — Sprint 1: PRD-005 redesign */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={springGentle()}
					className="text-center mb-6 sm:mb-8"
				>
					<h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground tracking-tight leading-tight">
						{t("ota.hero.title")}{" "}
						<span className="text-brand-500">{t("ota.hero.highlight")}</span>
					</h1>
					<motion.p
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ delay: 0.3, duration: 0.5 }}
						className="mt-3 text-sm sm:text-base text-muted-foreground max-w-md mx-auto"
					>
						Glampings y hoteles boutique en los lugares más lindos de Colombia
					</motion.p>
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ delay: 0.6, duration: 0.5 }}
						className="mt-6 flex justify-center"
					>
						<motion.div
							animate={{ y: [0, 6, 0] }}
							transition={{
								duration: 1.5,
								repeat: Infinity,
								ease: "easeInOut",
							}}
							className="w-8 h-12 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center p-1.5"
						>
							<ArrowDown size={14} className="text-muted-foreground/60" />
						</motion.div>
					</motion.div>
				</motion.div>

				{/* SEARCH BAR — Sprint 1: Progressive disclosure */}
				<div
					className={`sticky z-40 mb-6 sm:mb-8 transition-[top] ${isHeaderVisible ? "top-14" : "top-0"}`}
					style={{ transition: "top 0.3s var(--spring-gentle)" }}
				>
					{/* Desktop: Progressive disclosure search bar */}
					<div className="hidden sm:block max-w-3xl mx-auto relative">
						<AnimatePresence mode="wait">
							{searchStep === "location" ? (
								<motion.div
									key="location-step"
									initial={{ opacity: 0, scale: 0.95 }}
									animate={{ opacity: 1, scale: 1 }}
									exit={{ opacity: 0, scale: 0.95 }}
									transition={springSnappy()}
								>
								<div className="flex items-center gap-2 bg-card rounded-[var(--radius-squircle-xl)] border border-border/30 shadow-sm p-2">
									<div className="flex-1 flex items-center gap-3 px-4">
										<MapPin size={20} className="text-brand-600 shrink-0" />
										<input
											type="text"
											placeholder="¿A dónde querés escapar?"
											value={searchTerm}
											suppressHydrationWarning
											onChange={(e) => setSearchTerm(e.target.value)}
											onKeyDown={(e) => {
												if (e.key === "Enter" && searchTerm.trim()) {
													handleCommitLocation();
												}
											}}
											className="flex-1 bg-transparent text-sm font-medium text-foreground placeholder:text-muted-foreground outline-none"
											autoFocus
										/>
										{/* Clear button — Heurística #3: Control del usuario */}
										{searchTerm && (
											<button
												onClick={() => {
													setSearchTerm("");
													syncToUrl({ location: "" });
													inputRef.current?.focus();
												}}
												className="size-6 rounded-full flex items-center justify-center hover:bg-muted transition-colors shrink-0"
												aria-label="Limpiar búsqueda"
											>
												<X size={12} strokeWidth={2.5} />
											</button>
										)}
									</div>
									<button
										onClick={handleCommitLocation}
										className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-primary-foreground text-sm font-semibold rounded-[var(--radius-squircle-xl)] transition-colors active:scale-[0.97] active:bg-brand-700"
									>
										<Search size={16} />
										Buscar
									</button>
								</div>
								</motion.div>
							) : (
								<motion.div
									key="full-step"
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

					{/* Mobile: Direct input — no modal (Heurística #3: user freedom) */}
					<div className="sm:hidden flex items-center gap-2 bg-card rounded-[var(--radius-squircle-xl)] border border-border/30 shadow-sm p-2">
						<div className="flex-1 flex items-center gap-3 px-3">
							<MapPin size={18} className="text-brand-600 shrink-0" />
							<input
								ref={inputRef}
								type="text"
								placeholder="¿A dónde querés escapar?"
								value={searchTerm}
								suppressHydrationWarning
								onChange={(e) => setSearchTerm(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter" && searchTerm.trim()) {
										handleCommitLocation();
									}
								}}
								className="flex-1 bg-transparent text-sm font-medium text-foreground placeholder:text-muted-foreground outline-none"
							/>
							{/* Clear button */}
							{searchTerm && (
								<button
									onClick={() => {
										setSearchTerm("");
										syncToUrl({ location: "" });
										inputRef.current?.focus();
									}}
									className="size-6 rounded-full flex items-center justify-center hover:bg-muted transition-colors shrink-0"
									aria-label="Limpiar búsqueda"
								>
									<X size={12} strokeWidth={2.5} />
								</button>
							)}
						</div>
						<button
							onClick={handleCommitLocation}
							className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-primary-foreground text-sm font-semibold rounded-[var(--radius-squircle-xl)] transition-colors active:scale-[0.97] active:bg-brand-700"
						>
							<Search size={14} />
						</button>
					</div>
				</div>

				{/* Judge verdict: split-view only if search active AND map requested */}
				{isSplitView &&
				isSearchActive &&
				viewMode === "map" &&
				sortedHotels.length > 0 ? (
					<div className="split-view-layout mb-0">
						<div className="list-panel-scroll">
							<h2 className="text-sm font-bold text-foreground mb-4">
								{sortedHotels.length}{" "}
								{sortedHotels.length === 1 ? "alojamiento" : "alojamientos"}
								{isMapMoved && boundsFilterResult && (
									<span className="ml-2 text-xs font-normal text-muted-foreground">
										·{" "}
										{boundsFilterResult.visibleCount +
											boundsFilterResult.unresolvableIds.size}{" "}
										en esta zona
									</span>
								)}
							</h2>
							{renderHotelList()}
						</div>

						{/* Map panel — hidden with CSS when not in map mode, avoids Leaflet crash */}
						<div
							className={`map-panel-sticky relative ${viewMode !== "map" ? "hidden" : ""}`}
						>
							<HotelMapView
								hotels={sortedHotels.map((h: any) => ({
									id: h.id,
									name: h.name,
									location: h.location,
									address: h.address,
									min_price: h.min_price,
									slug: h.slug,
									main_image_url: h.main_image_url,
									latitude: h.latitude,
									longitude: h.longitude,
									precision: h.precision,
									reviewStats: h.reviewStats,
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
							/>
						</div>
					</div>
				) : !isSplitView ? (
					<>
						{/* Desktop cards-only: no map, clean grid */}
						{renderHotelList()}
					</>
				) : (
					<>
						{/* Mobile */}
						{sortedHotels.length > 0 && viewMode === "map" ? (
							<>
								{/* Mobile map + bottom sheet */}
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
											latitude: h.latitude,
											longitude: h.longitude,
											precision: h.precision,
											reviewStats: h.reviewStats,
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
								</div>

								{/* Bottom sheet overlay */}
								<MapBottomSheet
									hotels={visibleHotels}
									featuredHotel={featuredHotel}
									sortBy={sortBy}
									onSortChange={setSortBy}
									onHotelSelect={handleHotelSelect}
									onMarkerClick={handleMarkerClick}
									onLoadMore={() => showMore()}
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
							/* Mobile cards-only or no results */
							renderHotelList()
						)}
					</>
				)}
			</main>

			{/* PRD-014: Map toggle — only after user has searched for a location */}
			{/* MapToggle removed in production V1 */}

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
					if (filters.checkin) params.set("checkin", filters.checkin);
					else params.delete("checkin");
					if (filters.checkout) params.set("checkout", filters.checkout);
					else params.delete("checkout");
					if (filters.guests > 1)
						params.set("guests", filters.guests.toString());
					else params.delete("guests");
					const query = params.toString();
					const url = query ? `${pathname}?${query}` : pathname;
					router.replace(url, { scroll: false });
				}}
				isLoading={isSearching}
			/>
		</div>
	);
}
