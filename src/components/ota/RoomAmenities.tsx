'use client';

import { useState } from 'react';
import { Wifi, Car, Waves, Tv, Wind, Bath, X, Coffee, Vault } from 'lucide-react';
import { useTranslations } from 'next-intl';

const AMENITY_DICT: Record<string, { labelKey: string, icon: any, categoryKey: string }> = {
  'wifi': { labelKey: 'roomAmenities.wifi', icon: Wifi, categoryKey: 'roomAmenities.connectivity' },
  'tv': { labelKey: 'roomAmenities.smartTv', icon: Tv, categoryKey: 'roomAmenities.entertainment' },
  'ac': { labelKey: 'roomAmenities.ac', icon: Wind, categoryKey: 'roomAmenities.climate' },
  'hot_water': { labelKey: 'roomAmenities.hotWater', icon: Bath, categoryKey: 'roomAmenities.bathroom' },
  'parking': { labelKey: 'roomAmenities.parking', icon: Car, categoryKey: 'roomAmenities.facilities' },
  'pool': { labelKey: 'roomAmenities.pool', icon: Waves, categoryKey: 'roomAmenities.facilities' },
  'coffee': { labelKey: 'roomAmenities.coffee', icon: Coffee, categoryKey: 'roomAmenities.kitchen' },
  'safe': { labelKey: 'roomAmenities.safe', icon: Vault, categoryKey: 'roomAmenities.security' },
};

export interface AmenityData {
  id: string;
  isFree: boolean;
  details?: string;
}

export function RoomAmenities({ amenities = [] }: { amenities: AmenityData[] }) {
  const t = useTranslations();
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
                {t(dict.labelKey)}
                {am.details && <span className="text-xs text-muted-foreground/60 block">{am.details}</span>}
              </span>
            </div>
          );
        })}
      </div>

      {safeAmenities.length > 4 && (
        <button
          onClick={() => setIsModalOpen(true)}
          className="mt-4 text-sm font-semibold text-foreground border border-foreground rounded-[var(--radius-squircle-md)] px-4 py-2 hover:bg-muted/50 transition-colors w-full sm:w-auto"
        >
          {t('roomAmenities.showAll', { count: safeAmenities.length })}
        </button>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card rounded-[var(--radius-squircle-2xl)] w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-border flex justify-between items-center sticky top-0 bg-card rounded-t-2xl z-10">
              <h2 className="text-2xl font-bold text-foreground">{t('roomAmenities.modalTitle')}</h2>
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
                        <p className="font-medium text-foreground text-lg">{t(dict.labelKey)}</p>
                        <p className="text-sm text-muted-foreground">
                          {am.isFree ? t('roomAmenities.included') : t('roomAmenities.extraCharge')} {am.details && `• ${am.details}`}
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
