'use client';

import React, { useMemo, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useVirtualizer } from '@tanstack/react-virtual';
import { SlidersHorizontal, Users, CalendarX2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import RoomCard from './RoomCard';
import RoomComparison from './RoomComparison';
import { useTranslations } from 'next-intl';
import { MOTION_STAGGER } from '@/lib/motion-tokens';

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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: MOTION_STAGGER.card / 1000,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 300,
      damping: 25,
    },
  },
  exit: { opacity: 0, scale: 0.95 },
};

const ROOMS_VIRTUALIZATION_THRESHOLD = 10;

interface VirtualizedRoomListProps {
  filteredRooms: RoomItem[];
  slug: string;
  hotelId?: string;
  checkin?: string | null;
  checkout?: string | null;
  isSearchingDates: boolean;
  totalRooms: number;
  availableCount: number;
  hotel?: { cancellation_policy?: string | null; tax_rate?: number | null };
  searchParams: URLSearchParams;
}

function VirtualizedRoomList({
  filteredRooms,
  slug,
  hotelId,
  checkin,
  checkout,
  isSearchingDates,
  totalRooms,
  availableCount,
  hotel,
  searchParams,
}: VirtualizedRoomListProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: filteredRooms.length,
    getScrollElement: () => listRef.current,
    estimateSize: () => 300,
    overscan: 3,
    measureElement:
      typeof window !== 'undefined'
        ? (el: HTMLElement) => el.getBoundingClientRect().height
        : undefined,
  });

  return (
    <div
      ref={listRef}
      data-testid="virtual-list"
      className="max-h-[80vh] overflow-auto"
    >
      <div
        style={{
          height: virtualizer.getTotalSize(),
          position: 'relative',
          width: '100%',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const room = filteredRooms[virtualItem.index];
          return (
            <div
              key={virtualItem.key}
              data-testid={`virtual-item-${virtualItem.index}`}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <RoomCard
                room={room}
                hotelSlug={slug}
                hotelId={hotelId}
                checkIn={checkin}
                checkOut={checkout}
                isSearchingDates={isSearchingDates}
                allRooms={filteredRooms}
                totalRooms={totalRooms}
                availableCount={availableCount}
                hotel={hotel}
                searchParams={searchParams}
                imagePriority={virtualItem.index < 2}
                index={virtualItem.index}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface RoomsListWithFiltersProps {
  rooms: RoomItem[];
  availableRooms: RoomItem[];
  slug: string;
  hotelId?: string;
  checkin?: string | null;
  checkout?: string | null;
  isSearchingDates: boolean;
  hotel?: { cancellation_policy?: string | null; tax_rate?: number | null };
}

export default function RoomsListWithFilters({
  rooms,
  availableRooms,
  slug,
  hotelId,
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
        ) : filteredRooms.length >= ROOMS_VIRTUALIZATION_THRESHOLD ? (
          <VirtualizedRoomList
            filteredRooms={filteredRooms}
            slug={slug}
            hotelId={hotelId}
            checkin={checkin}
            checkout={checkout}
            isSearchingDates={isSearchingDates}
            totalRooms={rooms.length}
            availableCount={availableRooms.length}
            hotel={hotel}
            searchParams={searchParams}
          />
        ) : (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
          >
            <AnimatePresence mode="popLayout">
              {filteredRooms.map((room, i) => (
                <motion.div
                  key={room.id}
                  variants={itemVariants}
                >
                  <RoomCard
                    room={room}
                    hotelSlug={slug}
                    hotelId={hotelId}
                    checkIn={checkin}
                    checkOut={checkout}
                    isSearchingDates={isSearchingDates}
                    allRooms={filteredRooms}
                    totalRooms={rooms.length}
                    availableCount={availableRooms.length}
                    hotel={hotel}
                    searchParams={searchParams}
                    imagePriority={i < 2}
                    index={i}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </>
  );
}
