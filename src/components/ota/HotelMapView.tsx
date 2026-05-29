'use client';

import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { MapPin, ExternalLink, Loader2 } from 'lucide-react';
import L from 'leaflet';
import { geocodeLocation, GeoResult } from '@/lib/geocoding';
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

// Component to handle map bounds fitting
function FitBounds({ markers }: { markers: L.LatLngExpression[] }) {
  const map = useMap();

  useEffect(() => {
    if (markers.length > 0 && map) {
      const bounds = L.latLngBounds(markers);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [markers, map]);

  return null;
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

// Individual hotel marker component with geocoding
function HotelMarker({ hotel }: { hotel: Hotel }) {
  const [coords, setCoords] = useState<GeoResult | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [selected, setSelected] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const doGeocode = async () => {
      // Try location first, then address
      const query = hotel.location || hotel.address || '';
      if (!query) return;

      setIsGeocoding(true);
      const result = await geocodeLocation(query);
      if (!cancelled && result) {
        setCoords(result);
      }
      setIsGeocoding(false);
    };

    doGeocode();
    return () => { cancelled = true; };
  }, [hotel.location, hotel.address]);

  if (!coords) {
    // Optionally show a loading indicator or nothing
    return null;
  }

  return (
    <Marker
      position={[coords.lat, coords.lng]}
      icon={createHotelIcon(hotel.min_price, selected)}
      eventHandlers={{
        click: () => setSelected(true),
        popupclose: () => setSelected(false),
      }}
    >
      <Popup>
        <div className="hotel-popup">
          {hotel.main_image_url && (
            <img
              src={hotel.main_image_url}
              alt={hotel.name}
              className="popup-image"
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
          )}
          <div className="popup-info">
            <h3 className="popup-name">{hotel.name}</h3>
            <p className="popup-location">{hotel.location}</p>
            <p className="popup-price">
              <span className="price-amount">${hotel.min_price.toLocaleString()}</span>
              <span className="price-period"> /noche</span>
            </p>
            <a href={`/hotel/${hotel.slug}`} className="popup-cta">
              Ver hotel →
            </a>
          </div>
        </div>
      </Popup>
    </Marker>
  );
}

/**
 * HotelMapView — Interactive map using Leaflet + OpenStreetMap.
 *
 * Phase 2: Geocoding + markers.
 */
export default function HotelMapView({ hotels, centerLocation }: HotelMapViewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [markerPositions, setMarkerPositions] = useState<L.LatLngExpression[]>([]);

  // We'll update marker positions as markers are geocoded
  // This is handled inside HotelMarker via a callback if needed,
  // but for simplicity, FitBounds will rely on rendered markers.
  // Since HotelMarker renders conditionally, we can't easily collect positions here.
  // Instead, we'll just use a default center or the first hotel's location if available.

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
        
        {/* Render markers */}
        {hotels.map((hotel) => (
          <HotelMarker key={hotel.id} hotel={hotel} />
        ))}
      </MapContainer>
    </div>
  );
}
