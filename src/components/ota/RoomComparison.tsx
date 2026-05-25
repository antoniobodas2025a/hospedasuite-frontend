'use client';

import React, { useState } from 'react';
import { Check, X, ChevronDown, ChevronUp, Bed } from 'lucide-react';
import { ROOM_AMENITY_REGISTRY } from '@/lib/amenity-registry';
import { formatBedType } from '@/lib/room-helpers';
import { useTranslations } from 'next-intl';

// ============================================================================
// ROOM COMPARISON TABLE — Tabla comparativa de habitaciones
//
// Muestra una tabla lado a lado para comparar amenidades, precio y capacidad.
// Solo aparece cuando hay 4+ habitaciones disponibles.
// ============================================================================

interface RoomComparisonProps {
  rooms: Array<{
    id: string;
    name: string;
    price: number;
    price_per_night?: number;
    capacity?: number;
    beds?: number;
    bed_type?: string;
    amenities?: string[];
    description?: string;
    size_sqm?: number;
  }>;
}

export default function RoomComparison({ rooms }: RoomComparisonProps) {
  const t = useTranslations();
  const [isOpen, setIsOpen] = useState(false);

  if (rooms.length < 4) return null;

  return (
    <div className="mb-8">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors"
      >
        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        {t('ota.comparison.compare', { count: rooms.length })}
      </button>

      {isOpen && (
        <div className="mt-4 overflow-x-auto animate-in slide-in-from-top-2 fade-in duration-200">
          <div className="min-w-[600px]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-muted-foreground font-bold text-xs uppercase tracking-widest w-40">
                    {t('ota.comparison.feature')}
                  </th>
                  {rooms.map((room) => (
                    <th key={room.id} className="text-center py-3 px-4 min-w-[140px]">
                      <div className="font-bold text-foreground">{room.name}</div>
                      <div className="text-xs text-secondary font-bold mt-1">
                        ${(room.price_per_night || room.price).toLocaleString()} COP
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Capacidad */}
                <tr className="border-b border-border/40">
                  <td className="py-3 px-4 text-muted-foreground font-medium">{t('ota.comparison.capacity')}</td>
                  {rooms.map((room) => (
                    <td key={room.id} className="text-center py-3 px-4 text-foreground font-bold">
                      {room.capacity || '-'} {t('ota.comparison.people')}
                    </td>
                  ))}
                </tr>

                {/* Camas */}
                <tr className="border-b border-border/40">
                  <td className="py-3 px-4 text-muted-foreground font-medium flex items-center gap-1.5">
                    <Bed size={14} /> {t('ota.comparison.beds')}
                  </td>
                  {rooms.map((room) => (
                    <td key={room.id} className="text-center py-3 px-4 text-foreground font-bold text-sm">
                      {formatBedType(room.bed_type, room.beds || 0, true)}
                    </td>
                  ))}
                </tr>

                {/* Tamano */}
                <tr className="border-b border-border/40">
                  <td className="py-3 px-4 text-muted-foreground font-medium">{t('ota.comparison.size')}</td>
                  {rooms.map((room) => (
                    <td key={room.id} className="text-center py-3 px-4 text-foreground font-bold">
                      {room.size_sqm ? `${room.size_sqm} m2` : '-'}
                    </td>
                  ))}
                </tr>

                {/* Amenidades */}
                {Object.values(ROOM_AMENITY_REGISTRY).map((amenity) => (
                  <tr key={amenity.id} className="border-b border-border/20">
                    <td className="py-3 px-4 text-muted-foreground font-medium">{amenity.label}</td>
                    {rooms.map((room) => {
                      const has = (room.amenities || []).includes(amenity.id);
                      return (
                        <td key={room.id} className="text-center py-3 px-4">
                          {has ? (
                            <Check size={16} className="text-secondary mx-auto" />
                          ) : (
                            <X size={16} className="text-muted-foreground/30 mx-auto" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
