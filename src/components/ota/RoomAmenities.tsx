'use client';

import { useState } from 'react';
import { Wifi, Car, Waves, Tv, Wind, Bath, X, Coffee, Vault } from 'lucide-react';

const AMENITY_DICT: Record<string, { label: string, icon: any, category: string }> = {
  'wifi': { label: 'Wi-Fi Rapido', icon: Wifi, category: 'Conectividad' },
  'tv': { label: 'Smart TV', icon: Tv, category: 'Entretenimiento' },
  'ac': { label: 'Aire Acondicionado', icon: Wind, category: 'Climatizacion' },
  'hot_water': { label: 'Agua Caliente', icon: Bath, category: 'Bano' },
  'parking': { label: 'Parqueadero', icon: Car, category: 'Instalaciones' },
  'pool': { label: 'Piscina Privada', icon: Waves, category: 'Instalaciones' },
  'coffee': { label: 'Cafetera', icon: Coffee, category: 'Cocina' },
  'safe': { label: 'Caja Fuerte', icon: Vault, category: 'Seguridad' },
};

export interface AmenityData {
  id: string;
  isFree: boolean;
  details?: string;
}

export function RoomAmenities({ amenities = [] }: { amenities: AmenityData[] }) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const safeAmenities = Array.isArray(amenities) ? amenities : [];

  if (safeAmenities.length === 0) return null;

  const topAmenities = safeAmenities.slice(0, 4);

  return (
    <>
      <div className="grid grid-cols-2 gap-y-3 gap-x-4">
        {topAmenities.map((am) => {
          const dict = AMENITY_DICT[am.id];
          if (!dict) return null;
          const Icon = dict.icon;

          return (
            <div key={am.id} className="flex items-center gap-3 text-foreground/80">
              <Icon size={20} className="text-muted-foreground" strokeWidth={1.5} />
              <span className="text-sm">
                {dict.label}
                {am.details && <span className="text-xs text-muted-foreground/60 block">{am.details}</span>}
              </span>
            </div>
          );
        })}
      </div>

      {safeAmenities.length > 4 && (
        <button
          onClick={() => setIsModalOpen(true)}
          className="mt-4 text-sm font-semibold text-foreground border border-foreground rounded-lg px-4 py-2 hover:bg-muted/50 transition-colors w-full sm:w-auto"
        >
          Mostrar las {safeAmenities.length} amenidades
        </button>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-border flex justify-between items-center sticky top-0 bg-card rounded-t-2xl z-10">
              <h2 className="text-2xl font-bold text-foreground">Que ofrece este lugar?</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-muted/50 rounded-full transition-colors">
                <X size={24} className="text-muted-foreground" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              <div className="space-y-6">
                {safeAmenities.map((am) => {
                  const dict = AMENITY_DICT[am.id];
                  if (!dict) return null;
                  const Icon = dict.icon;
                  return (
                    <div key={am.id} className="flex items-center gap-4 pb-4 border-b border-border/40 last:border-0">
                      <Icon size={28} className="text-foreground/70" strokeWidth={1.5} />
                      <div>
                        <p className="font-medium text-foreground text-lg">{dict.label}</p>
                        <p className="text-sm text-muted-foreground">
                          {am.isFree ? 'Incluido sin costo' : 'Aplica recargo'} {am.details && `• ${am.details}`}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
