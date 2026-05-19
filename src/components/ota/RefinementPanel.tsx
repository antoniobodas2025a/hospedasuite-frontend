'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, DollarSign, Bed, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { springSnappy, springGentle, progressiveReveal } from '@/lib/mac2026/spring';
import { GlassPanel } from '@/components/ui/glass';
import { ROOM_AMENITY_REGISTRY } from '@/lib/amenity-registry';

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
  /** Whether the panel is expanded */
  isOpen: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

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
  isOpen,
}: RefinementPanelProps) {
  // ── Derived values ──────────────────────────────────────────────────────

  const prices = rooms.map((r) => r.price_per_night || r.price || 0);
  const maxPossiblePrice = prices.length > 0 ? Math.max(...prices) : 0;
  const maxPossibleBeds = rooms.length > 0 ? Math.max(...rooms.map((r) => r.beds || 0)) : 0;
  const bedsRangeCount = Math.max(4, Math.min(maxPossibleBeds, 6));

  const hasActiveFilters =
    maxPrice !== null || minBeds !== null || selectedAmenities.length > 0;

  const filterCount =
    [maxPrice, minBeds, ...selectedAmenities].filter(Boolean).length;

  // ── Amenity toggle ──────────────────────────────────────────────────────

  const toggleAmenity = (id: string) => {
    if (selectedAmenities.includes(id)) {
      onAmenitiesChange(selectedAmenities.filter((a) => a !== id));
    } else {
      onAmenitiesChange([...selectedAmenities, id]);
    }
  };

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          variants={progressiveReveal}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={springGentle()}
          className="overflow-hidden"
        >
          <GlassPanel intensity="medium" className="p-5 sm:p-6 ring-1 ring-foreground/5 bg-background/95 backdrop-blur-2xl">
            <div className="space-y-5">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h3 className="font-black text-foreground tracking-tight text-lg">
                  Refinar búsqueda
                </h3>
                {hasActiveFilters && (
                  <motion.button
                    onClick={onClearAll}
                    whileTap={{ scale: 0.95 }}
                    transition={springSnappy()}
                    className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-destructive transition-colors"
                    aria-label="Limpiar todos los filtros"
                  >
                    <X size={12} />
                    Limpiar todo
                  </motion.button>
                )}
              </div>

              {/* Price Slider */}
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 block">
                  Precio máximo:{' '}
                  {maxPrice !== null
                    ? `$${maxPrice.toLocaleString()}`
                    : 'Sin límite'}
                </label>
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
                  className="w-full accent-primary"
                  aria-label={`Precio máximo: ${maxPrice !== null ? `$${maxPrice.toLocaleString()}` : 'Sin límite'}`}
                />
                <div className="flex justify-between text-[10px] text-muted-foreground/60 mt-1">
                  <span>$0</span>
                  <span>${maxPossiblePrice.toLocaleString()}</span>
                </div>
              </div>

              {/* Beds Selector */}
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 block">
                  Camas mínimas: {minBeds || 'Cualquiera'}
                </label>
                <div className="flex gap-2">
                  {Array.from({ length: bedsRangeCount }, (_, i) => i + 1).map((bed) => (
                    <motion.button
                      key={bed}
                      onClick={() => onMinBedsChange(minBeds === bed ? null : bed)}
                      whileTap={{ scale: 0.9 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                      className={cn(
                        'size-10 rounded-[var(--radius-squircle-lg)] text-sm font-bold transition-all',
                        minBeds === bed
                          ? 'bg-primary text-primary-foreground shadow-md'
                          : 'bg-muted text-muted-foreground border border-border hover:border-brand-300'
                      )}
                      aria-pressed={minBeds === bed}
                      aria-label={`${bed} cama${bed > 1 ? 's' : ''} mínima`}
                    >
                      {bed}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Amenity Chips */}
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 block">
                  Amenidades
                </label>
                <div className="flex flex-wrap gap-2">
                  {Object.values(ROOM_AMENITY_REGISTRY).map((amenity) => {
                    const isSelected = selectedAmenities.includes(amenity.id);
                    return (
                      <motion.button
                        key={amenity.id}
                        onClick={() => toggleAmenity(amenity.id)}
                        whileTap={{ scale: 0.95 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                        className={cn(
                          'px-3 py-1.5 rounded-[var(--radius-squircle-md)] text-xs font-medium transition-all',
                          isSelected
                            ? 'bg-brand-50 text-brand-700 border border-brand-200'
                            : 'bg-muted text-muted-foreground border border-border hover:border-border/80'
                        )}
                        aria-pressed={isSelected}
                      >
                        {amenity.label}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Live Counter */}
              <div className="flex items-center justify-between pt-2 border-t border-border/50">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      'size-2 rounded-full transition-colors',
                      matchingCount > 0 ? 'bg-secondary' : 'bg-muted-foreground/30'
                    )}
                  />
                  <span className="text-xs font-medium text-muted-foreground">
                    {matchingCount}{' '}
                    {matchingCount === 1
                      ? 'habitación disponible'
                      : 'habitaciones disponibles'}
                  </span>
                </div>
                {hasActiveFilters && (
                  <span className="text-[10px] text-muted-foreground/50">
                    de {rooms.length}
                  </span>
                )}
              </div>
            </div>
          </GlassPanel>

          {/* Active Filter Pills (outside the glass panel, below it) */}
          <AnimatePresence>
            {hasActiveFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className="flex flex-wrap items-center gap-2 mt-2 overflow-hidden"
              >
                {/* Price pill */}
                {maxPrice !== null && (
                  <motion.span
                    layout
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={springSnappy()}
                    className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full bg-muted/80 border border-border text-xs font-medium text-foreground"
                  >
                    <DollarSign size={12} className="text-muted-foreground" />
                    <span>Hasta ${maxPrice.toLocaleString()}</span>
                    <button
                      onClick={() => onMaxPriceChange(null)}
                      className="size-4 rounded-full flex items-center justify-center hover:bg-destructive/20 hover:text-destructive transition-colors"
                      title="Quitar filtro de precio"
                      aria-label="Quitar filtro de precio"
                    >
                      <X size={10} strokeWidth={3} />
                    </button>
                  </motion.span>
                )}

                {/* Beds pill */}
                {minBeds !== null && (
                  <motion.span
                    layout
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={springSnappy()}
                    className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full bg-muted/80 border border-border text-xs font-medium text-foreground"
                  >
                    <Bed size={12} className="text-muted-foreground" />
                    <span>Mín. {minBeds} cama{minBeds > 1 ? 's' : ''}</span>
                    <button
                      onClick={() => onMinBedsChange(null)}
                      className="size-4 rounded-full flex items-center justify-center hover:bg-destructive/20 hover:text-destructive transition-colors"
                      title="Quitar filtro de camas"
                      aria-label="Quitar filtro de camas"
                    >
                      <X size={10} strokeWidth={3} />
                    </button>
                  </motion.span>
                )}

                {/* Amenity pills */}
                {selectedAmenities.map((amenityId) => {
                  const amenity = Object.values(ROOM_AMENITY_REGISTRY).find(
                    (a) => a.id === amenityId
                  );
                  if (!amenity) return null;
                  return (
                    <motion.span
                      key={amenityId}
                      layout
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={springSnappy()}
                      className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full bg-muted/80 border border-border text-xs font-medium text-foreground"
                    >
                      <Tag size={12} className="text-muted-foreground" />
                      <span>{amenity.label}</span>
                      <button
                        onClick={() => toggleAmenity(amenityId)}
                        className="size-4 rounded-full flex items-center justify-center hover:bg-destructive/20 hover:text-destructive transition-colors"
                        title={`Quitar filtro ${amenity.label}`}
                        aria-label={`Quitar filtro ${amenity.label}`}
                      >
                        <X size={10} strokeWidth={3} />
                      </button>
                    </motion.span>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
