'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { MapPin, ExternalLink, Loader2 } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import '@/styles/map.css';

// Fix Leaflet default icon path issues in Next.js
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: icon.src,
  shadowUrl: iconShadow.src,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

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

// Component to handle map bounds fitting
function FitBounds({ hotels }: { hotels: HotelMapViewProps['hotels'] }) {
  const map = useMap();

  useEffect(() => {
    if (hotels.length > 0 && map) {
      // For now, we just center on a default location.
      // In Phase 2, we'll geocode and fit bounds properly.
      map.setView([4.6097, -74.0817], 6); // Center on Colombia
    }
  }, [hotels, map]);

  return null;
}

/**
 * HotelMapView — Interactive map using Leaflet + OpenStreetMap.
 *
 * Phase 1: Basic map with tiles.
 * Phase 2+: Geocoding, markers, clustering, popups.
 */
export default function HotelMapView({ hotels, centerLocation }: HotelMapViewProps) {
  const [isLoading, setIsLoading] = useState(true);

  if (hotels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <MapPin size={48} className="mb-4 text-muted-foreground/40" />
        <p className="text-sm font-medium">No hay hoteles para mostrar en el mapa</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-64 sm:h-80 rounded-[var(--radius-squircle-xl)] overflow-hidden border border-border/30 shadow-sm">
      {/* Loading state */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-[1000]">
          <Loader2 size={24} className="text-brand-500 animate-spin" />
        </div>
      )}

      {/* Map Container */}
      <MapContainer
        center={[4.6097, -74.0817]} // Default center (Bogotá)
        zoom={6}
        className="w-full h-full z-0"
        zoomControl={false}
        whenReady={() => setIsLoading(false)}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Zoom control repositioned */}
        <FitBounds hotels={hotels} />
      </MapContainer>

      {/* Zoom Controls (Custom Position) */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
        <button
          onClick={() => {
            // We'll add zoom controls logic later or use Leaflet's default
          }}
          className="size-8 bg-background rounded-[var(--radius-squircle-md)] shadow-md flex items-center justify-center text-foreground hover:bg-muted transition-colors"
          aria-label="Zoom in"
        >
          +
        </button>
        <button
          onClick={() => {
            // Zoom out logic
          }}
          className="size-8 bg-background rounded-[var(--radius-squircle-md)] shadow-md flex items-center justify-center text-foreground hover:bg-muted transition-colors"
          aria-label="Zoom out"
        >
          -
        </button>
      </div>
    </div>
  );
}
