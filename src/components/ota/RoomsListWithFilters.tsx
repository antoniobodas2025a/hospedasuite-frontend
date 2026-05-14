'use client';

import React, { useState, useMemo } from 'react';
import { SlidersHorizontal, X, Users, CalendarX2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import RoomCard from './RoomCard';
import RoomFilters from './RoomFilters';
import RoomComparison from './RoomComparison';

interface RoomItem {
  id: string;
  name: string;
  price: number;
  price_per_night?: number;
  capacity?: number;
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
  adults?: string | null;
  children?: string | null;
  isSearchingDates: boolean;
  hotel?: { cancellation_policy?: string | null };
}

export default function RoomsListWithFilters({
  rooms,
  availableRooms,
  slug,
  checkin,
  checkout,
  adults,
  children,
  isSearchingDates,
  hotel,
}: RoomsListWithFiltersProps) {
  const [filteredRooms, setFilteredRooms] = useState<RoomItem[]>(availableRooms);

  const hasResults = filteredRooms.length > 0;
  const hasAvailable = availableRooms.length > 0;

  return (
    <>
      {/* Tabla comparativa — solo si hay 4+ habitaciones */}
      <RoomComparison rooms={availableRooms} />

      <RoomFilters rooms={availableRooms} onFilterChange={setFilteredRooms} />

      <div id="rooms-section" className="space-y-6">
        {!hasAvailable ? (
          <div className="bg-card p-16 rounded-[var(--radius-squircle-3xl)] border border-border text-center flex flex-col items-center justify-center shadow-sm">
            <div className="w-20 h-20 bg-muted rounded-[var(--radius-squircle-2xl)] border border-border/60 flex items-center justify-center mb-6 shadow-inner">
              {availableRooms.length === 0 ? <CalendarX2 size={32} className="text-muted-foreground" /> : <Users size={32} className="text-muted-foreground" />}
            </div>
            <h4 className="text-2xl font-bold text-foreground mb-2 tracking-tight">
              Inventario Agotado
            </h4>
            <p className="text-muted-foreground max-w-sm mx-auto text-sm mb-6">
              No encontramos unidades disponibles para estas fechas. Prueba modificando tu estancia.
            </p>
            {/* Contextual suggestion */}
            {isSearchingDates && (
              <div className="glass-card p-4 max-w-sm">
                <p className="text-xs text-muted-foreground">
                  <span className="font-bold text-foreground">Tip:</span> Las fechas entre semana suelen tener mayor disponibilidad.
                  También puedes contactar al hotel directamente para consultar opciones.
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
              Sin resultados
            </h4>
            <p className="text-muted-foreground max-w-sm mx-auto text-sm">
              No hay habitaciones que coincidan con los filtros. Proba ajustando los criterios.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredRooms.map((room, index) => (
              <div
                key={room.id}
                className="animate-fade-in-up"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <RoomCard
                  room={room}
                  hotelSlug={slug}
                  checkIn={checkin}
                  checkOut={checkout}
                  adults={adults}
                  children={children}
                  isSearchingDates={isSearchingDates}
                  allRooms={filteredRooms}
                  totalRooms={rooms.length}
                  availableCount={availableRooms.length}
                  hotel={hotel}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
