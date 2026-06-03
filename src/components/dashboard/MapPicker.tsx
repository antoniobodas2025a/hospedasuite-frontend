'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { MapPin, Loader2 } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '@/styles/map.css';

// Default center: Colombia
const DEFAULT_CENTER: [number, number] = [4.6097, -74.0817];
const DEFAULT_ZOOM = 5;

// Custom draggable pin icon
function createDraggablePinIcon(): L.DivIcon {
  return L.divIcon({
    className: 'map-picker-pin',
    html: `<svg width="36" height="48" viewBox="0 0 36 48" fill="none">
      <path d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 30 18 30s18-16.5 18-30C36 8.06 27.94 0 18 0z" fill="#2563eb" stroke="white" stroke-width="2"/>
      <circle cx="18" cy="16" r="6" fill="white"/>
    </svg>`,
    iconSize: [36, 48],
    iconAnchor: [18, 48],
    popupAnchor: [0, -48],
  });
}

interface MapPickerProps {
  /** Initial latitude (from saved coordinates or geocoding) */
  initialLat?: number | null;
  /** Initial longitude */
  initialLng?: number | null;
  /** Called when the pin position changes */
  onPositionChange?: (lat: number, lng: number) => void;
  /** City name for geocoding fallback center */
  cityName?: string;
}

/**
 * MapPicker — Draggable map with a single pin for hotel location.
 *
 * Hotelier drags the pin to the exact hotel position.
 * Coordinates are returned via onPositionChange callback.
 */
export default function MapPicker({
  initialLat,
  initialLng,
  onPositionChange,
  cityName,
}: MapPickerProps) {
  const [center, setCenter] = useState<[number, number]>(DEFAULT_CENTER);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const markerRef = useRef<L.Marker | null>(null);

  // Set initial position from props or geocode city
  useEffect(() => {
    if (initialLat && initialLng) {
      setCenter([initialLat, initialLng]);
      setPosition([initialLat, initialLng]);
      setZoom(15);
      setIsLoading(false);
      return;
    }

    // Try geocoding city name
    if (cityName) {
      fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityName)}%2C+Colombia&format=json&limit=1`
      )
        .then((r) => r.json())
        .then((data) => {
          if (data.length > 0) {
            const lat = parseFloat(data[0].lat);
            const lng = parseFloat(data[0].lon);
            setCenter([lat, lng]);
            setZoom(13);
          }
        })
        .catch(() => {})
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [initialLat, initialLng, cityName]);

  const handleDragEnd = useCallback(
    (e: L.LeafletEvent) => {
      const marker = e.target as L.Marker;
      const pos = marker.getLatLng();
      setPosition([pos.lat, pos.lng]);
      onPositionChange?.(pos.lat, pos.lng);
    },
    [onPositionChange]
  );

  // Map click: move pin to click position (create if no position yet)
  function MapClickHandler() {
    useMapEvents({
      click(e) {
        setPosition([e.latlng.lat, e.latlng.lng]);
        onPositionChange?.(e.latlng.lat, e.latlng.lng);
      },
    });
    return null;
  }

  if (isLoading) {
    return (
      <div className="w-full h-64 bg-muted/30 rounded-[var(--radius-squircle-xl)] flex items-center justify-center border border-border/30">
        <Loader2 size={24} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="w-full h-64 rounded-[var(--radius-squircle-xl)] overflow-hidden border border-border/30 shadow-sm">
      <MapContainer
        center={center}
        zoom={zoom}
        className="w-full h-full"
        zoomControl={false}
        doubleClickZoom={true}
        scrollWheelZoom={true}
        dragging={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapClickHandler />

        {position && (
          <Marker
            position={position}
            draggable={true}
            icon={createDraggablePinIcon()}
            ref={markerRef}
            eventHandlers={{ dragend: handleDragEnd }}
          />
        )}
      </MapContainer>

      <style jsx global>{`
        .map-picker-pin {
          background: transparent !important;
          border: none !important;
        }
      `}</style>
    </div>
  );
}
