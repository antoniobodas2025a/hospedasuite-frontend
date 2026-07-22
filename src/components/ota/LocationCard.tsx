'use client';

import { MapPin, ExternalLink } from 'lucide-react';

interface NearbyPoint {
  name: string;
  distance: string;
}

interface LocationCardProps {
  hotelName: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  nearbyPoints?: NearbyPoint[];
}

/**
 * LocationCard — Hybrid location display.
 * Shows Google Maps Static image when API key + coordinates available,
 * otherwise falls back to a textual card. No external links to prevent user leakage.
 */
export default function LocationCard({
  hotelName,
  address,
  latitude,
  longitude,
  nearbyPoints,
}: LocationCardProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const hasCoordinates = latitude != null && longitude != null;
  const showStaticMap = !!apiKey && hasCoordinates;

  return (
    <div className="w-full max-w-[600px] mx-auto space-y-4">
      {showStaticMap ? (
        <StaticMap
          lat={latitude!}
          lng={longitude!}
          hotelName={hotelName}
          apiKey={apiKey!}
        />
      ) : (
        <TextualCard address={address} nearbyPoints={nearbyPoints} />
      )}

      {/* Coordenadas como texto (sin enlace externo) */}
      {hasCoordinates && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <MapPin size={12} />
          <span>
            {latitude!.toFixed(6)}, {longitude!.toFixed(6)}
          </span>
        </div>
      )}
    </div>
  );
}

function StaticMap({
  lat,
  lng,
  hotelName,
  apiKey,
}: {
  lat: number;
  lng: number;
  hotelName: string;
  apiKey: string;
}) {
  const mapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=15&size=600x300&markers=color:red%7C${lat},${lng}&key=${apiKey}`;

  return (
    <div className="relative">
      <img
        src={mapUrl}
        alt={`Ubicación de ${hotelName}`}
        className="w-full h-auto rounded-xl"
        loading="lazy"
      />
      {/* Badge indicando que es una imagen estática */}
      <div className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1">
        <MapPin size={12} />
        <span>Ubicación</span>
      </div>
    </div>
  );
}

function TextualCard({
  address,
  nearbyPoints,
}: {
  address?: string | null;
  nearbyPoints?: NearbyPoint[];
}) {
  return (
    <div className="space-y-4 p-4 rounded-xl border border-border bg-muted/30">
      {address && (
        <div className="flex items-start gap-3">
          <div className="size-9 rounded-lg bg-brand-50 flex items-center justify-center shrink-0 border border-brand-100">
            <MapPin size={16} className="text-brand-500" />
          </div>
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">
              Dirección
            </p>
            <p className="text-sm text-foreground/80">{address}</p>
          </div>
        </div>
      )}

      {nearbyPoints && nearbyPoints.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">
            Puntos de interés cercanos
          </h3>
          <ul className="space-y-1">
            {nearbyPoints.map((point) => (
              <li key={point.name} className="text-sm text-foreground/70 flex justify-between">
                <span>{point.name}</span>
                <span className="text-muted-foreground">{point.distance}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
