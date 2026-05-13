'use client';

import React, { useState, useMemo } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ROOM_AMENITY_REGISTRY } from '@/lib/amenity-registry';

interface RoomFiltersProps {
  rooms: RoomItem[];
  onFilterChange: (filteredRooms: RoomItem[]) => void;
}

interface RoomItem {
  id: string;
  name: string;
  price: number;
  price_per_night?: number;
  capacity?: number;
  amenities?: string[];
}

export default function RoomFilters({ rooms, onFilterChange }: RoomFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [minCapacity, setMinCapacity] = useState<number | null>(null);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);

  const prices = rooms.map((r) => r.price_per_night || r.price || 0);
  const maxPossiblePrice = prices.length > 0 ? Math.max(...prices) : 0;
  const maxPossibleCapacity = rooms.length > 0 ? Math.max(...rooms.map((r) => r.capacity || 0)) : 0;

  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      const price = room.price_per_night || room.price || 0;
      const capacity = room.capacity || 0;

      if (maxPrice !== null && price > maxPrice) return false;
      if (minCapacity !== null && capacity < minCapacity) return false;
      if (selectedAmenities.length > 0) {
        const roomAmenities = room.amenities || [];
        const hasAll = selectedAmenities.every((a) => roomAmenities.includes(a));
        if (!hasAll) return false;
      }
      return true;
    });
  }, [rooms, maxPrice, minCapacity, selectedAmenities]);

  const clearFilters = () => {
    setMaxPrice(null);
    setMinCapacity(null);
    setSelectedAmenities([]);
    onFilterChange(rooms);
  };

  const toggleAmenity = (id: string) => {
    const updated = selectedAmenities.includes(id)
      ? selectedAmenities.filter((a) => a !== id)
      : [...selectedAmenities, id];
    setSelectedAmenities(updated);
  };

  const applyFilters = () => {
    onFilterChange(filteredRooms);
  };

  const hasActiveFilters = maxPrice !== null || minCapacity !== null || selectedAmenities.length > 0;

  // Guard AFTER all hooks — early return before JSX only
  if (rooms.length < 3) return null;

  return (
    <div className="mb-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 px-4 py-2.5 rounded-[var(--radius-squircle-lg)] text-sm font-bold transition-all',
          hasActiveFilters
            ? 'bg-primary text-primary-foreground shadow-md shadow-brand-500/20'
            : 'bg-card text-muted-foreground border border-border hover:border-border/80',
        )}
      >
        <SlidersHorizontal size={16} />
        Filtros
        {hasActiveFilters && (
          <span className="size-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-black">
            {[maxPrice, minCapacity, ...selectedAmenities].filter(Boolean).length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="mt-3 bg-card rounded-[var(--radius-squircle-2xl)] border border-border shadow-xl p-6 space-y-5 animate-in slide-in-from-top-2 fade-in duration-200">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-foreground">Filtrar habitaciones</h4>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors">
                <X size={12} /> Limpiar
              </button>
            )}
          </div>

          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 block">
              Precio maximo: {maxPrice !== null ? `$${maxPrice.toLocaleString()}` : 'Sin limite'}
            </label>
            <input
              type="range"
              min={0}
              max={maxPossiblePrice}
              step={10000}
              value={maxPrice ?? maxPossiblePrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground/60 mt-1">
              <span>$0</span>
              <span>${maxPossiblePrice.toLocaleString()}</span>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 block">
              Capacidad minima: {minCapacity || 'Cualquiera'}
            </label>
            <div className="flex gap-2">
              {Array.from({ length: Math.min(maxPossibleCapacity, 8) }, (_, i) => i + 1).map((cap) => (
                <button
                  key={cap}
                  onClick={() => setMinCapacity(minCapacity === cap ? null : cap)}
                  className={cn(
                    'size-10 rounded-[var(--radius-squircle-lg)] text-sm font-bold transition-all',
                    minCapacity === cap
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'bg-muted text-muted-foreground border border-border hover:border-brand-300',
                  )}
                >
                  {cap}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 block">
              Amenidades
            </label>
            <div className="flex flex-wrap gap-2">
              {Object.values(ROOM_AMENITY_REGISTRY).map((amenity) => (
                <button
                  key={amenity.id}
                  onClick={() => toggleAmenity(amenity.id)}
                  className={cn(
                    'px-3 py-1.5 rounded-[var(--radius-squircle-md)] text-xs font-medium transition-all',
                    selectedAmenities.includes(amenity.id)
                      ? 'bg-brand-50 text-brand-700 border border-brand-200'
                      : 'bg-muted text-muted-foreground border border-border hover:border-border/80',
                  )}
                >
                  {amenity.label}
                </button>
              ))}
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            Mostrando <span className="font-bold text-foreground">{filteredRooms.length}</span> de {rooms.length} habitaciones
          </div>

          <button
            onClick={applyFilters}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 rounded-[var(--radius-squircle-lg)] transition-all text-sm active:scale-[0.98]"
          >
            Aplicar filtros
          </button>
        </div>
      )}
    </div>
  );
}
