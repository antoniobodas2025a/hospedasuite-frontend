'use client';

import { useState } from 'react';
import { MapPin, ExternalLink, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { springSnappy } from '@/lib/mac2026/spring';

interface HotelMapViewProps {
  hotels: Array<{
    id: string;
    name: string;
    location: string;
    address?: string;
    min_price: number;
    slug: string;
  }>;
  centerLocation?: string;
}

/**
 * HotelMapView — Simple map view showing hotel locations.
 *
 * Uses free Google Maps embed (no API key required).
 * Falls back to a list view if map fails to load.
 */
export default function HotelMapView({ hotels, centerLocation }: HotelMapViewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [selectedHotel, setSelectedHotel] = useState<string | null>(null);

  if (hotels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <MapPin size={48} className="mb-4 text-muted-foreground/40" />
        <p className="text-sm font-medium">No hay hoteles para mostrar en el mapa</p>
      </div>
    );
  }

  // Free Google Maps embed URL (no API key required)
  const center = centerLocation || hotels[0]?.location || '';
  const centerEncoded = encodeURIComponent(center);
  const mapUrl = `https://maps.google.com/maps?q=${centerEncoded}&t=&z=12&ie=UTF8&iwloc=&output=embed`;

  if (hasError) {
    // Fallback: list view
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-foreground">Hoteles encontrados</h3>
        <div className="space-y-2">
          {hotels.map((hotel) => (
            <a
              key={hotel.id}
              href={`/hotel/${hotel.slug}`}
              className="flex items-center gap-3 p-3 bg-muted/30 rounded-[var(--radius-squircle-lg)] border border-border/30 hover:bg-muted/50 transition-colors"
            >
              <MapPin size={16} className="text-brand-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground truncate">{hotel.name}</p>
                <p className="text-xs text-muted-foreground truncate">{hotel.location}</p>
              </div>
              <span className="text-xs font-bold text-secondary">${hotel.min_price.toLocaleString()}</span>
              <ExternalLink size={14} className="text-muted-foreground shrink-0" />
            </a>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-64 sm:h-80 rounded-[var(--radius-squircle-xl)] overflow-hidden border border-border/30">
      {/* Loading state */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-10">
          <Loader2 size={24} className="text-brand-500 animate-spin" />
        </div>
      )}

      {/* Map iframe — free embed, no API key needed */}
      <iframe
        src={mapUrl}
        className="w-full h-full border-0"
        loading="lazy"
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
        }}
        allowFullScreen
        title="Mapa de hoteles"
      />

      {/* Hotel list overlay (bottom) */}
      <div className="absolute bottom-0 left-0 right-0 bg-background/90 backdrop-blur-sm border-t border-border/30 p-3">
        <div className="flex items-center gap-2 overflow-x-auto">
          {hotels.slice(0, 5).map((hotel, i) => (
            <button
              key={hotel.id}
              onClick={() => setSelectedHotel(selectedHotel === hotel.id ? null : hotel.id)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-[var(--radius-squircle-lg)] text-xs font-medium whitespace-nowrap transition-colors',
                selectedHotel === hotel.id
                  ? 'bg-brand-500 text-primary-foreground'
                  : 'bg-muted/50 text-foreground hover:bg-muted'
              )}
            >
              <span className="size-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold">
                {i + 1}
              </span>
              <span className="truncate max-w-[120px]">{hotel.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Helper for className merging
function cn(...classes: (string | false | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}
