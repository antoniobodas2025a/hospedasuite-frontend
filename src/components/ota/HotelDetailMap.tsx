'use client';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

/**
 * HotelDetailMap — Small Leaflet map for the hotel detail page.
 * Dynamically imported with ssr: false (Leaflet needs window).
 */

// Default marker icon fix for Leaflet + webpack/next.js
const icon = L.divIcon({
  className: 'hotel-marker-wrapper',
  html: '<div style="width:16px;height:16px;border-radius:50%;background:var(--bg-brand-500);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.2)"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

interface HotelDetailMapProps {
  latitude: number;
  longitude: number;
  hotelName: string;
  location: string;
}

export default function HotelDetailMap({ latitude, longitude, hotelName, location }: HotelDetailMapProps) {
  return (
    <div 
      className="rounded-[var(--radius-squircle-2xl)] overflow-hidden border border-border h-48"
      role="region"
      aria-label={`Mapa de ubicación de ${hotelName} en ${location}`}
    >
      <MapContainer
        center={[latitude, longitude]}
        zoom={15}
        scrollWheelZoom={false}
        zoomControl={false}
        dragging={false}
        style={{ width: '100%', height: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[latitude, longitude]} icon={icon}>
          <Popup>
            <strong>{hotelName}</strong>
            <br />
            <span style={{ fontSize: '12px', color: '#666' }}>{location}</span>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
