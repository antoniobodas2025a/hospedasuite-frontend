'use client';

import { MapPin } from 'lucide-react';

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
 * otherwise falls back to a textual card. Both include a "View on Google Maps" link.
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

  const googleMapsUrl = hasCoordinates
    ? `https://www.google.com/maps?q=${latitude},${longitude}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address || hotelName)}`;

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

      <ViewOnGoogleMapsButton url={googleMapsUrl} />
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
    <img
      src={mapUrl}
      alt={`Ubicación de ${hotelName}`}
      className="w-full h-auto rounded-xl"
      loading="lazy"
    />
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

function ViewOnGoogleMapsButton({ url }: { url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-brand-500 text-white rounded-xl font-bold hover:bg-brand-600 transition-colors min-h-[44px] text-sm"
      aria-label="Ver ubicación en Google Maps (abre en nueva pestaña)"
    >
      Ver en Google Maps ↗
    </a>
  );
}
