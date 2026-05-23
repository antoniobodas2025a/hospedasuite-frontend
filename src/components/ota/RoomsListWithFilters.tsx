'use client';

import React, { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { SlidersHorizontal, Users, CalendarX2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import RoomCard from './RoomCard';
import RoomComparison from './RoomComparison';
import { useTranslations } from 'next-intl';

interface RoomItem {
  id: string;
  name: string;
  price: number;
  price_per_night?: number;
  capacity?: number;
  beds?: number;
  status?: string;
  amenities?: string[];
  gallery?: any[];
  description?: string;
}

interface RoomsListWithFiltersProps {
  rooms: RoomItem[];
  availableRooms: RoomItem[];
  slug: string;
  checkin?: string | null;
  checkout?: string | null;
  isSearchingDates: boolean;
  hotel?: { cancellation_policy?: string | null };
}

export default function RoomsListWithFilters({
  rooms,
  availableRooms,
  slug,
  checkin,
  checkout,
  isSearchingDates,
  hotel,
}: RoomsListWithFiltersProps) {
  const searchParams = useSearchParams();
  const t = useTranslations();

  // Leer filtros de refinamiento de la URL (client-side only)
  const maxPriceParam = searchParams.get('max_price');
  const minBedsParam = searchParams.get('min_beds');
  const amenitiesParam = searchParams.get('amenities');

  const maxPrice = maxPriceParam ? Number(maxPriceParam) : null;
  const minBeds = minBedsParam ? Number(minBedsParam) : null;
  const selectedAmenities = amenitiesParam ? amenitiesParam.split(',').filter(Boolean) : [];

  // Aplicar filtros de refinamiento localmente (sin network requests)
  const filteredRooms = useMemo(() => {
    if (!maxPrice && !minBeds && selectedAmenities.length === 0) return availableRooms;

    return availableRooms.filter((room) => {
      const price = room.price_per_night || room.price || 0;
      const beds = room.beds || 0;

      if (maxPrice !== null && price > maxPrice) return false;
      if (minBeds !== null && beds < minBeds) return false;
      if (selectedAmenities.length > 0) {
        const roomAmenities = room.amenities || [];
        const hasAll = selectedAmenities.every((a) => roomAmenities.includes(a));
        if (!hasAll) return false;
      }
      return true;
    });
  }, [availableRooms, maxPrice, minBeds, selectedAmenities]);

  const hasResults = filteredRooms.length > 0;
  const hasAvailable = availableRooms.length > 0;

  return (
    <>
      {/* Tabla comparativa — solo desktop (en mobile es inutilizable) */}
      <div className="hidden lg:block">
        <RoomComparison rooms={availableRooms} />
      </div>

      <div id="rooms-section" className="space-y-6">
        {!hasAvailable ? (
          <div className="bg-card p-16 rounded-[var(--radius-squircle-3xl)] border border-border text-center flex flex-col items-center justify-center shadow-sm">
            <div className="w-20 h-20 bg-muted rounded-[var(--radius-squircle-2xl)] border border-border/60 flex items-center justify-center mb-6 shadow-inner">
              {availableRooms.length === 0 ? <CalendarX2 size={32} className="text-muted-foreground" /> : <Users size={32} className="text-muted-foreground" />}
            </div>
            <h4 className="text-2xl font-bold text-foreground mb-2 tracking-tight">
              {t('ota.roomsList.inventoryExhausted')}
            </h4>
            <p className="text-muted-foreground max-w-sm mx-auto text-sm mb-6">
              {t('ota.roomsList.inventoryExhaustedDesc')}
            </p>
            {/* Contextual suggestion */}
            {isSearchingDates && (
              <div className="glass-card p-4 max-w-sm">
                <p className="text-xs text-muted-foreground">
                  <span className="font-bold text-foreground">{t('ota.roomsList.tipLabel')}:</span> {t('ota.roomsList.tipText')}
                </p>
              </div>
            )}
          </div>
        ) : !hasResults ? (
          <div className="bg-card p-16 rounded-[var(--radius-squircle-3xl)] border border-border text-center flex flex-col items-center justify-center shadow-sm">
            <div className="w-20 h-20 bg-muted rounded-[var(--radius-squircle-2xl)] border border-border/60 flex items-center justify-center mb-6 shadow-inner">
              <SlidersHorizontal size={32} className="text-muted-foreground" />
            </div>
            <h4 className="text-2xl font-bold text-foreground mb-2 tracking-tight">
              {t('ota.roomsList.noResults')}
            </h4>
            <p className="text-muted-foreground max-w-sm mx-auto text-sm">
              {t('ota.roomsList.noResultsDesc')}
            </p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filteredRooms.map((room, index) => (
              <motion.div
                key={room.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ 
                  type: 'spring', 
                  stiffness: 300, 
                  damping: 25,
                  delay: index * 0.04 
                }}
                className="animate-fade-in-up"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <RoomCard
                  room={room}
                  hotelSlug={slug}
                  checkIn={checkin}
                  checkOut={checkout}
                  isSearchingDates={isSearchingDates}
                  allRooms={filteredRooms}
                  totalRooms={rooms.length}
                  availableCount={availableRooms.length}
                  hotel={hotel}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </>
  );
}
