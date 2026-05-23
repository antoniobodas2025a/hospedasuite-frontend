'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, DollarSign, Bed, Tag, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { springSnappy, springGentle, springBounce } from '@/lib/mac2026/spring';
import { SectionHeader } from '@/components/ui/glass';
import { ROOM_AMENITY_REGISTRY } from '@/lib/amenity-registry';
import { useTranslations } from 'next-intl';

// ── Types ─────────────────────────────────────────────────────────────────────

interface RoomItem {
  id: string;
  name: string;
  price: number;
  price_per_night?: number;
  capacity?: number;
  beds?: number;
  amenities?: string[];
}

export interface RefinementPanelProps {
  /** All rooms for dynamic range calculation */
  rooms: RoomItem[];
  /** Current max price filter (null = no limit) */
  maxPrice: number | null;
  /** Called when max price changes */
  onMaxPriceChange: (v: number | null) => void;
  /** Current minimum beds filter (null = no limit) */
  minBeds: number | null;
  /** Called when min beds changes */
  onMinBedsChange: (v: number | null) => void;
  /** Currently selected amenity IDs */
  selectedAmenities: string[];
  /** Called when selected amenities change */
  onAmenitiesChange: (v: string[]) => void;
  /** Called to clear all refinement filters */
  onClearAll: () => void;
  /** Number of rooms matching current refinement filters */
  matchingCount: number;
  /** Total room count */
  totalCount: number;
  /** Called to close the modal */
  onClose: () => void;
  /** Called when user taps "See results" CTA */
  onApply?: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

const AMENITIES_VISIBLE_DEFAULT = 4;

export default function RefinementPanel({
  rooms,
  maxPrice,
  onMaxPriceChange,
  minBeds,
  onMinBedsChange,
  selectedAmenities,
  onAmenitiesChange,
  onClearAll,
  matchingCount,
  totalCount,
  onClose,
  onApply,
}: RefinementPanelProps) {
  const t = useTranslations();

  // ── Derived values ──────────────────────────────────────────────────────

  const prices = rooms.map((r) => r.price_per_night || r.price || 0);
  const maxPossiblePrice = prices.length > 0 ? Math.max(...prices) : 0;
  const maxPossibleBeds = rooms.length > 0 ? Math.max(...rooms.map((r) => r.beds || 0)) : 0;
  const bedsRangeCount = Math.max(4, Math.min(maxPossibleBeds, 6));

  const hasActiveFilters =
    maxPrice !== null || minBeds !== null || selectedAmenities.length > 0;

  // ── Progressive disclosure: amenities ───────────────────────────────────

  const [showAllAmenities, setShowAllAmenities] = useState(false);
  const allAmenities = Object.values(ROOM_AMENITY_REGISTRY);
  const visibleAmenities = showAllAmenities ? allAmenities : allAmenities.slice(0, AMENITIES_VISIBLE_DEFAULT);
  const hasMoreAmenities = allAmenities.length > AMENITIES_VISIBLE_DEFAULT;

  // ── Handlers ────────────────────────────────────────────────────────────

  const toggleAmenity = (id: string) => {
    if (selectedAmenities.includes(id)) {
      onAmenitiesChange(selectedAmenities.filter((a) => a !== id));
    } else {
      onAmenitiesChange([...selectedAmenities, id]);
    }
  };

  const handleApply = () => {
    onClose();
    onApply?.();
  };

  return (
    <div className="flex flex-col h-full">
      {/* ── Header: Title + Close (clear exit path) ───────────────────── */}
      <div className="flex items-center justify-between px-5 pt-5 sm:px-6 sm:pt-6">
        <div>
          <h2 className="font-black text-foreground tracking-tight text-lg sm:text-xl">
            {t('ota.refinement.title')}
          </h2>
          <p className="text-xs text-muted-foreground/70 mt-0.5 tracking-tight">
            {t('ota.refinement.subtitle')}
          </p>
        </div>

        {/* Close button — prominent, high affordance */}
        <motion.button
          onClick={onClose}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.9 }}
          transition={springSnappy()}
          className="size-9 rounded-[var(--radius-squircle-lg)] flex items-center justify-center bg-muted/60 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground ring-1 ring-foreground/5"
          aria-label={t('ota.refinement.closePanel')}
          title={t('ota.refinement.close')}
        >
          <X size={16} strokeWidth={2.5} />
        </motion.button>
      </div>

      {/* ── Scrollable filter content ─────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-6">
        {/* Price Slider — Chunk 1: Budget */}
        <section>
          <SectionHeader
            title={t('ota.refinement.maxPrice')}
            subtitle={
              maxPrice !== null
                ? `Hasta $${maxPrice.toLocaleString()}`
                : t('ota.refinement.noLimit')
            }
          />
          <div className="px-1">
            <input
              type="range"
              min={0}
              max={maxPossiblePrice}
              step={10000}
              value={maxPrice ?? maxPossiblePrice}
              onChange={(e) => {
                const val = Number(e.target.value);
                onMaxPriceChange(val >= maxPossiblePrice ? null : val);
              }}
              className="w-full accent-primary cursor-pointer"
              aria-label={t('ota.refinement.maxPriceAria', { price: maxPrice !== null ? `$${maxPrice.toLocaleString()}` : t('ota.refinement.noLimit') })}
            />
            <div className="flex justify-between text-[10px] text-muted-foreground/50 mt-1.5 font-medium">
              <span>$0</span>
              <span>${maxPossiblePrice.toLocaleString()}</span>
            </div>
          </div>
        </section>

        {/* Beds Selector — Chunk 2: Capacity */}
        <section>
          <SectionHeader
            title={t('ota.refinement.minBeds')}
            subtitle={minBeds ? `${minBeds} ${t('ota.refinement.beds', { count: minBeds })}` : t('ota.refinement.any')}
          />
          <div className="flex gap-2 px-1">
            {Array.from({ length: bedsRangeCount }, (_, i) => i + 1).map((bed) => (
              <motion.button
                key={bed}
                onClick={() => onMinBedsChange(minBeds === bed ? null : bed)}
                whileTap={{ scale: 0.88 }}
                transition={springSnappy()}
                className={cn(
                  'size-11 rounded-[var(--radius-squircle-lg)] text-sm font-bold transition-all ring-1',
                  minBeds === bed
                    ? 'bg-primary text-primary-foreground shadow-lg ring-primary/20'
                    : 'bg-muted/50 text-muted-foreground border-0 ring-foreground/5 hover:ring-foreground/15 hover:bg-muted'
                )}
                aria-pressed={minBeds === bed}
                aria-label={t('ota.refinement.minBedsAria', { count: bed })}
              >
                {bed}
              </motion.button>
            ))}
          </div>
        </section>

        {/* Amenity Chips — Chunk 3: Features (progressive disclosure) */}
        <section>
          <SectionHeader
            title={t('ota.refinement.amenities')}
            subtitle={
              selectedAmenities.length > 0
                ? `${selectedAmenities.length} seleccionada${selectedAmenities.length > 1 ? 's' : ''}`
                : undefined
            }
          />
          <div className="flex flex-wrap gap-2 px-1">
            <AnimatePresence mode="popLayout">
              {visibleAmenities.map((amenity) => {
                const isSelected = selectedAmenities.includes(amenity.id);
                return (
                  <motion.button
                    key={amenity.id}
                    layout
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    transition={springSnappy()}
                    onClick={() => toggleAmenity(amenity.id)}
                    whileTap={{ scale: 0.93 }}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-3 py-2 rounded-[var(--radius-squircle-md)] text-xs font-semibold transition-all ring-1',
                      isSelected
                        ? 'bg-brand-50 text-brand-700 ring-brand-200 shadow-sm'
                        : 'bg-muted/40 text-muted-foreground ring-foreground/5 hover:ring-foreground/12 hover:bg-muted/70'
                    )}
                    aria-pressed={isSelected}
                  >
                    {amenity.icon && <amenity.icon size={13} strokeWidth={2} className="opacity-70" />}
                    {amenity.label}
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </div>

          {/* Progressive disclosure toggle */}
          {hasMoreAmenities && (
            <motion.button
              onClick={() => setShowAllAmenities((p) => !p)}
              whileTap={{ scale: 0.97 }}
              transition={springSnappy()}
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-1"
            >
              {showAllAmenities ? (
                <>
                  <ChevronUp size={13} strokeWidth={2.5} />
                  {t('ota.refinement.showLessAmenities')}
                </>
              ) : (
                <>
                  <ChevronDown size={13} strokeWidth={2.5} />
                  {t('ota.refinement.showMoreAmenities')} ({allAmenities.length - AMENITIES_VISIBLE_DEFAULT} más)
                </>
              )}
            </motion.button>
          )}
        </section>
      </div>

      {/* ── Footer: Active filters summary + CTA ──────────────────────── */}
      <div className="px-5 sm:px-6 pb-5 sm:pb-6 pt-3 border-t border-foreground/5">
        {/* Active filter pills — compact row */}
        <AnimatePresence>
          {hasActiveFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={springGentle()}
              className="flex flex-wrap items-center gap-1.5 mb-3 overflow-hidden"
            >
              {maxPrice !== null && (
                <FilterPill
                  icon={DollarSign}
                  label={`${t('ota.refinement.upTo')} $${maxPrice.toLocaleString()}`}
                  onRemove={() => onMaxPriceChange(null)}
                />
              )}
              {minBeds !== null && (
                <FilterPill
                  icon={Bed}
                  label={`${t('ota.refinement.minShort')} ${minBeds} ${t('ota.refinement.beds', { count: minBeds })}`}
                  onRemove={() => onMinBedsChange(null)}
                />
              )}
              {selectedAmenities.map((amenityId) => {
                const amenity = Object.values(ROOM_AMENITY_REGISTRY).find(
                  (a) => a.id === amenityId
                );
                if (!amenity) return null;
                return (
                  <FilterPill
                    key={amenityId}
                    icon={Tag}
                    label={amenity.label}
                    onRemove={() => toggleAmenity(amenityId)}
                  />
                );
              })}

              {/* Clear all — secondary action */}
              <motion.button
                onClick={onClearAll}
                whileTap={{ scale: 0.95 }}
                transition={springSnappy()}
                className="text-[11px] font-semibold text-muted-foreground hover:text-destructive transition-colors px-2 py-1"
              >
                {t('ota.refinement.clearAll')}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CTA: Primary action — "See Results" */}
        <motion.button
          onClick={handleApply}
          whileHover={{ scale: 1.015 }}
          whileTap={{ scale: 0.97 }}
          transition={springBounce()}
          className={cn(
            'w-full py-3.5 rounded-[var(--radius-squircle-xl)] text-sm font-bold tracking-tight transition-all ring-1',
            matchingCount > 0
              ? 'bg-primary text-primary-foreground shadow-lg ring-primary/20 hover:shadow-xl'
              : 'bg-muted text-muted-foreground ring-foreground/5 cursor-default'
          )}
        >
          {matchingCount > 0
            ? t('ota.refinement.seeResults', { count: matchingCount })
            : t('ota.refinement.seeAllRooms')
          }
          {matchingCount < totalCount && matchingCount > 0 && (
            <span className="ml-1.5 text-xs opacity-70">
              {t('ota.booking.of')} {totalCount}
            </span>
          )}
        </motion.button>
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function FilterPill({
  icon: Icon,
  label,
  onRemove,
}: {
  icon: React.ElementType;
  label: string;
  onRemove: () => void;
}) {
  return (
    <motion.span
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={springSnappy()}
      className="inline-flex items-center gap-1 pl-2 pr-1 py-1 rounded-full bg-muted/60 ring-1 ring-foreground/5 text-[11px] font-medium text-foreground"
    >
      <Icon size={11} className="text-muted-foreground/60" strokeWidth={2.5} />
      <span>{label}</span>
      <button
        onClick={onRemove}
        className="size-4 rounded-full flex items-center justify-center hover:bg-destructive/15 hover:text-destructive transition-colors"
        aria-label={`Remove ${label}`}
      >
        <X size={9} strokeWidth={3} />
      </button>
    </motion.span>
  );
}
