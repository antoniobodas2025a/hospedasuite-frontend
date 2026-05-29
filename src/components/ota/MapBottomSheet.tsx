'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  SlidersHorizontal,
  Tent,
  Building2,
  Home,
  Castle,
  ChevronDown,
  ArrowUpDown,
  Plus,
} from 'lucide-react';
import { springGentle, springSnappy } from '@/lib/mac2026/spring';
import { preserveSearchParams } from '@/lib/handoff-url';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import FeaturedCard from './FeaturedCard';
import HotelCard from './HotelCard';

/* ------------------------------------------------------------------ */
/*  Constants — Snap points                                            */
/* ------------------------------------------------------------------ */

/** Collapsed: only the drag handle is visible. */
const SNAP_COLLAPSED_HEIGHT = 60;

/** Category definitions (mirrors OTADashboard for standalone use). */
const CATEGORIES = [
  { id: 'all', labelKey: 'ota.categories.all', icon: SlidersHorizontal, popular: false },
  { id: 'glamping', labelKey: 'ota.categories.glamping', icon: Tent, popular: true },
  { id: 'hotel', labelKey: 'ota.categories.hotels', icon: Building2, popular: true },
  { id: 'cabin', labelKey: 'ota.categories.cabins', icon: Home, popular: false },
  { id: 'boutique', labelKey: 'ota.categories.boutique', icon: Castle, popular: false },
] as const;

const POPULAR_CATEGORIES = CATEGORIES.filter((c) => c.popular);
const OTHER_CATEGORIES = CATEGORIES.filter((c) => !c.popular);

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type SnapIndex = 0 | 1 | 2; // expanded | partial | collapsed

interface MapBottomSheetProps {
  hotels: any[];
  featuredHotel: any | null;
  sortBy: 'recommended' | 'price-asc' | 'price-desc' | 'rating';
  onSortChange: (sort: 'recommended' | 'price-asc' | 'price-desc' | 'rating') => void;
  onHotelSelect: (id: string) => void;
  onMarkerClick: (id: string) => void;
  onLoadMore: () => void;
  visibleCount: number;
  hasMoreHotels: boolean;
  getDistanceFromCenter: (hotel: any) => number | undefined;
  activeCategory?: string;
  onCategoryChange?: (category: string) => void;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getSnapLabel(index: SnapIndex): string {
  switch (index) {
    case 0:
      return 'Mapa minimizado, lista expandida';
    case 1:
      return 'Mapa y lista visibles';
    case 2:
      return 'Lista minimizada, mapa expandido';
  }
}

/**
 * Compute the three snap Y-values given the window height.
 * Returns [expanded, partial, collapsed] in pixels.
 */
export function getSnapTargets(windowHeight: number): [number, number, number] {
  const expanded = 0; // show 60vh of content
  const partial = Math.round(windowHeight * 0.3); // show 30vh
  const collapsed = Math.max(
    Math.round(windowHeight * 0.6 - SNAP_COLLAPSED_HEIGHT),
    SNAP_COLLAPSED_HEIGHT,
  );
  return [expanded, partial, collapsed];
}

/** Pick nearest snap biased by velocity direction. */
export function findNearestSnap(
  y: number,
  velocityY: number,
  snaps: [number, number, number],
): SnapIndex {
  // Light velocity bias (~150 ms of projected movement)
  const bias = velocityY * 0.15;
  const projectedY = y + bias;

  let bestIdx = 1 as SnapIndex;
  let bestDist = Infinity;
  (snaps as number[]).forEach((snap, i) => {
    const dist = Math.abs(projectedY - snap);
    if (dist < bestDist) {
      bestDist = dist;
      bestIdx = i as SnapIndex;
    }
  });
  return bestIdx;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function MapBottomSheet({
  hotels,
  featuredHotel,
  sortBy,
  onSortChange,
  onHotelSelect,
  onMarkerClick,
  onLoadMore,
  visibleCount,
  hasMoreHotels,
  getDistanceFromCenter,
  activeCategory = 'all',
  onCategoryChange,
}: MapBottomSheetProps) {
  const searchParams = useSearchParams();
  const t = useTranslations();

  /* ---- Window-aware snap targets ---- */
  const [winHeight, setWinHeight] = useState(
    () => (typeof window !== 'undefined' ? window.innerHeight : 800),
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => setWinHeight(window.innerHeight);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const snapTargets = useMemo<[number, number, number]>(
    () => getSnapTargets(winHeight),
    [winHeight],
  );

  /* ---- Snap state ---- */
  const [snapIndex, setSnapIndex] = useState<SnapIndex>(1); // partial
  const targetY = snapTargets[snapIndex];

  /* ---- Drag state ---- */
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartY, setDragStartY] = useState(targetY);
  const [dragDelta, setDragDelta] = useState(0);

  /* ---- Category dropdown ---- */
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);

  /* ---- Drag handlers ---- */
  const handleDragStart = useCallback(() => {
    setIsDragging(true);
    setDragStartY(targetY);
    setDragDelta(0);
  }, [targetY]);

  const handleDrag = useCallback(
    (_: unknown, info: { offset: { y: number } }) => {
      setDragDelta(info.offset.y);
    },
    [],
  );

  const handleDragEnd = useCallback(
    (_: unknown, info: { offset: { y: number }; velocity: { y: number } }) => {
      setIsDragging(false);
      // Total effective y = where we started + drag offset
      const totalY = dragStartY + info.offset.y;
      const nearest = findNearestSnap(totalY, info.velocity.y, snapTargets);
      setSnapIndex(nearest);
      setDragDelta(0);
    },
    [snapTargets, dragStartY],
  );

  /* ---- Derived ---- */
  const effectiveY = isDragging ? dragStartY + dragDelta : targetY;

  /* ---- ARIA live region for screen readers ---- */
  const [liveMessage, setLiveMessage] = useState(getSnapLabel(1));
  useEffect(() => {
    setLiveMessage(getSnapLabel(snapIndex));
  }, [snapIndex]);

  /* ---- Hotel card href helper ---- */
  const getHotelHref = useCallback(
    (hotel: any) => preserveSearchParams(searchParams, `/hotel/${hotel.slug}`),
    [searchParams],
  );

  /* ================================================================ */
  /*  Render                                                            */
  /* ================================================================ */
  return (
    <>
      {/* ARIA live region */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {liveMessage}
      </div>

      {/* Bottom sheet */}
      <motion.div
        className="fixed bottom-0 left-0 right-0 z-[var(--z-modal)] flex flex-col bg-background rounded-t-[var(--radius-squircle-2xl)] shadow-2xl overflow-hidden"
        style={{
          maxHeight: '60vh',
          height: '60vh',
          y: effectiveY,
        }}
        animate={{ y: targetY }}
        transition={springGentle()}
        drag="y"
        dragConstraints={{
          top: snapTargets[0], // can't go above expanded
          bottom: snapTargets[2], // can't go below collapsed
        }}
        dragElastic={0.05}
        dragMomentum={false}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        role="region"
        aria-label="Lista de alojamientos"
      >
        {/* ---- Drag handle ---- */}
        <div
          className="flex-shrink-0 flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing touch-none select-none"
          role="button"
          tabIndex={0}
          aria-label="Arrastrar o usar flechas para ajustar vista"
          aria-keyshortcuts="ArrowUp ArrowDown"
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp' && snapIndex > 0) {
              e.preventDefault();
              setSnapIndex((snapIndex - 1) as SnapIndex);
            } else if (e.key === 'ArrowDown' && snapIndex < 2) {
              e.preventDefault();
              setSnapIndex((snapIndex + 1) as SnapIndex);
            }
          }}
        >
          <div className="w-10 h-1 rounded-full bg-foreground/15 transition-all hover:bg-foreground/25 focus-visible:ring-2 focus-visible:ring-brand-500" />
        </div>

        {/* ---- Scrollable content ---- */}
        <div className="flex-1 overflow-y-auto overscroll-behavior-contain px-4 pb-6">
          {/* ---- Categories: horizontal scrollable row ---- */}
          {onCategoryChange && (
            <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-3 scrollbar-none">
              {POPULAR_CATEGORIES.map((cat) => {
                const isActive = activeCategory === cat.id;
                return (
                  <motion.button
                    key={cat.id}
                    onClick={() => onCategoryChange(cat.id)}
                    whileTap={{ scale: 0.95 }}
                    transition={springSnappy()}
                    className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-foreground text-background shadow-md'
                        : 'bg-card text-muted-foreground hover:text-foreground border border-border/50'
                    }`}
                  >
                    <cat.icon size={12} />
                    {t(cat.labelKey)}
                  </motion.button>
                );
              })}

              {/* Category dropdown trigger for remaining categories */}
              <div className="relative flex-shrink-0">
                <motion.button
                  onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                  whileTap={{ scale: 0.95 }}
                  transition={springSnappy()}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    activeCategory === 'all' && !isCategoryOpen
                      ? 'bg-foreground text-background shadow-md'
                      : 'bg-card text-muted-foreground hover:text-foreground border-border/50'
                  }`}
                >
                  <SlidersHorizontal size={12} />
                  {activeCategory !== 'all'
                    ? t(CATEGORIES.find((c) => c.id === activeCategory)?.labelKey || 'ota.categories.all')
                    : t('ota.categories.all')}
                  <ChevronDown size={10} className={`transition-transform ${isCategoryOpen ? 'rotate-180' : ''}`} />
                </motion.button>

                {isCategoryOpen && (
                  <>
                    {/* Backdrop */}
                    <div
                      className="fixed inset-0 z-50"
                      onClick={() => setIsCategoryOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 4, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 4, scale: 0.95 }}
                      transition={springGentle()}
                      className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-50 bg-card border border-border/50 rounded-[var(--radius-squircle-xl)] shadow-xl p-2 min-w-[160px]"
                    >
                      {OTHER_CATEGORIES.map((cat) => {
                        const isActive = activeCategory === cat.id;
                        return (
                          <button
                            key={cat.id}
                            onClick={() => {
                              onCategoryChange(cat.id);
                              setIsCategoryOpen(false);
                            }}
                            className={`w-full flex items-center gap-2 px-3 py-2 rounded-[var(--radius-squircle-md)] text-xs font-medium transition-colors ${
                              isActive
                                ? 'bg-foreground/10 text-foreground'
                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                            }`}
                          >
                            <cat.icon size={12} />
                            {t(cat.labelKey)}
                          </button>
                        );
                      })}
                    </motion.div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ---- FeaturedCard (compact in sheet context) ---- */}
          {featuredHotel && sortBy === 'recommended' && (
            <div className="mb-4">
              <FeaturedCard hotel={featuredHotel} variant="compact" />
            </div>
          )}

          {/* ---- Sort controls ---- */}
          <div className="flex items-center justify-between mb-3">
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => onSortChange(e.target.value as typeof sortBy)}
                className="appearance-none flex items-center gap-2 px-3 py-1.5 bg-card border border-border/30 rounded-[var(--radius-squircle-lg)] text-xs font-medium text-foreground cursor-pointer hover:border-border/50 transition-colors pr-7"
                aria-label="Ordenar alojamientos"
              >
                <option value="recommended">⭐ Recomendados</option>
                <option value="price-asc">💰 Menor precio</option>
                <option value="price-desc">💰 Mayor precio</option>
                <option value="rating">⭐ Mejor rating</option>
              </select>
              <ArrowUpDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
            {hasMoreHotels && (
              <p className="text-xs text-muted-foreground">
                {visibleCount}/{hotels.length}
              </p>
            )}
          </div>

          {/* ---- Hotel grid (2 columns on mobile sheet) ---- */}
          {hotels.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {hotels.map((hotel: any) => (
                <div
                  key={hotel.id}
                  id={`hotel-card-sheet-${hotel.id}`}
                  onMouseEnter={() => {
                    onHotelSelect(hotel.id);
                    onMarkerClick(hotel.id);
                  }}
                  onTouchStart={() => onMarkerClick(hotel.id)}
                >
                  <HotelCard
                    hotel={hotel}
                    href={getHotelHref(hotel)}
                    isSelected={false}
                    distanceFromCenter={getDistanceFromCenter(hotel)}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Tent size={32} className="mx-auto mb-2 text-muted-foreground/30" />
              <p className="text-sm font-medium text-muted-foreground">
                {t('ota.noResults.title')}
              </p>
            </div>
          )}

          {/* ---- Load more (lazy reveal) ---- */}
          {hasMoreHotels && (
            <div className="flex justify-center mt-5 mb-3">
              <motion.button
                onClick={onLoadMore}
                whileTap={{ scale: 0.97 }}
                transition={springSnappy()}
                className="flex items-center gap-2 px-5 py-2.5 bg-card border border-border/50 rounded-[var(--radius-squircle-xl)] text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-all"
              >
                <Plus size={12} />
                Mostrar más
              </motion.button>
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}
