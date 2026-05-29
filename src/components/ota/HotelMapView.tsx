'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, useMap, Marker, Popup } from 'react-leaflet';
import { MapPin, Loader2 } from 'lucide-react';
import L from 'leaflet';
import { geocodeLocation, GeoResult } from '@/lib/geocoding';
import ClusteredMarkers from './ClusteredMarkers';
import 'leaflet/dist/leaflet.css';
import '@/styles/map.css';

// Fix Leaflet default icon path issues in Next.js
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: icon.src,
  shadowUrl: iconShadow.src,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

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
}

// Custom marker icon factory
function createHotelIcon(price: number, isSelected: boolean): L.DivIcon {
  return L.divIcon({
    className: 'hotel-marker-wrapper',
    html: `
      <div class="hotel-marker-pin ${isSelected ? 'selected' : ''}">
        <span class="marker-price">$${price.toLocaleString()}</span>
      </div>
    `,
    iconSize: [80, 40],
    iconAnchor: [40, 20],
    popupAnchor: [0, -20],
  });
}

/**
 * HotelMapView — Interactive map using Leaflet + OpenStreetMap.
 *
 * Phase 3: Clustering + custom icons.
 */
export default function HotelMapView({ hotels }: HotelMapViewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [markers, setMarkers] = useState<L.Marker[]>([]);
  const [geocodedCount, setGeocodedCount] = useState(0);

  // Geocode all hotels on mount
  useEffect(() => {
    let cancelled = false;
    const newMarkers: L.Marker[] = [];

    const geocodeAll = async () => {
      for (const hotel of hotels) {
        if (cancelled) return;

        const query = hotel.location || hotel.address || '';
        if (!query) continue;

        const result = await geocodeLocation(query);
        if (!cancelled && result) {
          const marker = L.marker([result.lat, result.lng], {
            icon: createHotelIcon(hotel.min_price, false),
          });

          // Add popup
          marker.bindPopup(`
            <div class="hotel-popup">
              ${hotel.main_image_url ? `<img src="${hotel.main_image_url}" alt="${hotel.name}" class="popup-image" onerror="this.style.display='none'" />` : ''}
              <div class="popup-info">
                <h3 class="popup-name">${hotel.name}</h3>
                <p class="popup-location">${hotel.location}</p>
                <p class="popup-price">
                  <span class="price-amount">$${hotel.min_price.toLocaleString()}</span>
                  <span class="price-period"> /noche</span>
                </p>
                <a href="/hotel/${hotel.slug}" class="popup-cta">Ver hotel →</a>
              </div>
            </div>
          `);

          newMarkers.push(marker);
          setGeocodedCount((prev) => prev + 1);
        }
      }

      if (!cancelled) {
        setMarkers(newMarkers);
        setIsLoading(false);
      }
    };

    geocodeAll();
    return () => { cancelled = true; };
  }, [hotels]);

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
            <p className="text-xs text-muted-foreground">
              Buscando ubicaciones... ({geocodedCount}/{hotels.length})
            </p>
          </div>
        </div>
      )}

      {/* Map Container */}
      <MapContainer
        center={[4.6097, -74.0817]} // Default center (Bogotá)
        zoom={6}
        className="w-full h-full z-0"
        zoomControl={false}
        whenReady={() => {
          // Only stop loading if we have markers or if geocoding is done
          if (markers.length > 0 || geocodedCount === hotels.length) {
            setIsLoading(false);
          }
        }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Clustered markers */}
        {markers.length > 0 && <ClusteredMarkers markers={markers} />}
      </MapContainer>
    </div>
  );
}
