'use client';

import { MapPin, ExternalLink, Shield } from 'lucide-react';
import { useMemo } from 'react';

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
  /** Si es true, muestra ubicación exacta (solo post-pago) */
  isPaidBooking?: boolean;
}

/**
 * LocationCard — Hybrid location display with Coordinate Firewall.
 * 
 * SECURITY: Before payment, coordinates are obfuscated with ~1.5km random offset
 * to prevent guests from identifying the exact property location and searching
 * for competitors. Exact location is only revealed after payment (isPaidBooking=true).
 */
export default function LocationCard({
  hotelName,
  address,
  latitude,
  longitude,
  nearbyPoints,
  isPaidBooking = false,
}: LocationCardProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const hasCoordinates = latitude != null && longitude != null;

  // Coordinate Firewall: Apply random offset (~1.5km) for non-paid bookings
  const displayCoords = useMemo(() => {
    if (!hasCoordinates || isPaidBooking) {
      return { lat: latitude, lng: longitude };
    }

    // Generate deterministic offset based on hotel name (consistent per hotel)
    const seed = hotelName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const randomOffset = (seed % 1000) / 1000; // 0 to 0.999

    // ~1.5km offset in degrees (approximate)
    const latOffset = (randomOffset - 0.5) * 0.027; // ~1.5km
    const lngOffset = ((randomOffset * 7) % 1 - 0.5) * 0.027; // ~1.5km

    return {
      lat: (latitude as number) + latOffset,
      lng: (longitude as number) + lngOffset,
    };
  }, [latitude, longitude, hotelName, isPaidBooking, hasCoordinates]);

  const showStaticMap = !!apiKey && hasCoordinates;

  return (
    <div className="w-full max-w-[600px] mx-auto space-y-4">
      {showStaticMap ? (
        <StaticMap
          lat={displayCoords.lat!}
          lng={displayCoords.lng!}
          hotelName={hotelName}
          apiKey={apiKey!}
          isApproximate={!isPaidBooking}
        />
      ) : (
        <TextualCard address={address} nearbyPoints={nearbyPoints} />
      )}

      {/* Coordenadas ofuscadas (sin enlace externo) */}
      {hasCoordinates && !isPaidBooking && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Shield size={12} className="text-amber-500" />
          <span>
            Ubicación aproximada (se revela tras la reserva)
          </span>
        </div>
      )}

      {/* Coordenadas exactas solo post-pago */}
      {hasCoordinates && isPaidBooking && (
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
  isApproximate = false,
}: {
  lat: number;
  lng: number;
  hotelName: string;
  apiKey: string;
  isApproximate?: boolean;
}) {
  const mapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=${isApproximate ? 13 : 15}&size=600x300&markers=color:${isApproximate ? 'yellow' : 'red'}%7C${lat},${lng}&key=${apiKey}`;

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
        <span>{isApproximate ? 'Ubicación aproximada' : 'Ubicación'}</span>
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
