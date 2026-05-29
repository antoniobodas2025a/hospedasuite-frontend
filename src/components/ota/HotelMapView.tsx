'use client';

import { useState } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import { MapPin, Loader2 } from 'lucide-react';
import L from 'leaflet';
import MarkerLifecycleManager from './MarkerLifecycleManager';
import MapTransitionController from './MapTransitionController';
import MapSearchSync from './MapSearchSync';
import 'leaflet/dist/leaflet.css';
import '@/styles/map.css';

interface Hotel {
  id: string;
  name: string;
  location: string;
  address?: string;
  min_price: number;
  slug: string;
  main_image_url?: string;
}

interface HotelMapViewProps {
  hotels: Hotel[];
  centerLocation?: string;
  onMapBoundsChange?: (bounds: L.LatLngBounds, center: L.LatLng, zoom: number) => void;
  onSearchAreaChange?: (areaName: string) => void;
  enableSearchOnMove?: boolean;
}

/**
 * HotelMapView — Interactive map using Leaflet + OpenStreetMap.
 *
 * Phase 2: MarkerLifecycleManager integration.
 */
export default function HotelMapView({
  hotels,
  centerLocation,
  onMapBoundsChange,
  onSearchAreaChange,
  enableSearchOnMove = false,
}: HotelMapViewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [geocodingProgress, setGeocodingProgress] = useState({ current: 0, total: 0 });

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
          <div className="flex flex-col items-center gap-2">
            <Loader2 size={24} className="text-brand-500 animate-spin" />
            {geocodingProgress.total > 0 && (
              <p className="text-xs text-muted-foreground">
                Buscando ubicaciones... ({geocodingProgress.current}/{geocodingProgress.total})
              </p>
            )}
          </div>
        </div>
      )}

      {/* Map Container */}
      <MapContainer
        center={[4.6097, -74.0817]} // Default center (Bogotá)
        zoom={6}
        className="w-full h-full z-0"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Marker lifecycle manager */}
        <MarkerLifecycleManager
          hotels={hotels}
          onGeocodingProgress={(current, total) => setGeocodingProgress({ current, total })}
          onMarkersReady={() => setIsLoading(false)}
        />

        {/* Smooth transitions */}
        <MapTransitionController
          hotels={hotels}
          centerLocation={centerLocation}
          transitionDuration={1.2}
        />

        {/* Search ↔ Map sync */}
        <MapSearchSync
          searchLocation={centerLocation}
          onMapBoundsChange={onMapBoundsChange}
          onSearchAreaChange={onSearchAreaChange}
          enableSearchOnMove={enableSearchOnMove}
          moveDebounceMs={1000}
        />
      </MapContainer>
    </div>
  );
}
