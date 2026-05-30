/**
 * Geocoding Service — Server-only geocoding with Mapbox + Nominatim fallback.
 *
 * Flow:
 *   1. Mapbox Geocoding API (primary, requires MAPBOX_ACCESS_TOKEN env)
 *   2. Nominatim (fallback, 1 req/sec rate limit)
 *   3. City-level fallback (si ambos fallan, geocodear solo la ciudad)
 *   4. Error (si todo falla)
 */

import 'server-only';

import { MAPBOX_LIMITER, NOMINATIM_LIMITER } from './rate-limiter';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface GeocodeResult {
  lat: number;
  lng: number;
  precision: 'rooftop' | 'street' | 'city' | 'none';
  source: 'mapbox' | 'nominatim' | 'fallback';
}

export class GeocodeError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'GeocodeError';
  }
}

// ─── Precision Inference ─────────────────────────────────────────────────────

/**
 * Infer geocoding precision from the address query.
 *
 * - Rooftop: address contains a street number (e.g. "Calle 10 #20-30")
 * - Street:  address has meaningful text but no number
 * - City:    only city name provided
 * - None:    no address or city
 */
export function inferPrecision(
  address: string,
  city: string,
): GeocodeResult['precision'] {
  const hasStreetNumber = /\d/.test(address.split(',')[0]?.trim() ?? '');
  const hasStreet = (address?.length ?? 0) > 5;
  if (hasStreetNumber) return 'rooftop';
  if (hasStreet) return 'street';
  if (city?.length > 0) return 'city';
  return 'none';
}

// ─── Providers ───────────────────────────────────────────────────────────────

async function geocodeWithMapbox(
  query: string,
  token: string,
): Promise<Omit<GeocodeResult, 'precision'> | null> {
  if (!MAPBOX_LIMITER().tryConsume()) {
    console.warn('[GEOCODE] Mapbox rate limit exceeded, skipping');
    return null;
  }

  const encoded = encodeURIComponent(query);
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?access_token=${token}&country=CO&limit=1`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) {
      console.warn(`[GEOCODE] Mapbox returned ${res.status}`);
      return null;
    }

    const data = await res.json();
    if (!data.features?.[0]?.center) {
      console.warn('[GEOCODE] Mapbox returned no results');
      return null;
    }

    return {
      lat: data.features[0].center[1],
      lng: data.features[0].center[0],
      source: 'mapbox' as const,
    };
  } catch (err) {
    console.warn('[GEOCODE] Mapbox request failed:', err instanceof Error ? err.message : err);
    return null;
  }
}

async function geocodeWithNominatim(
  query: string,
  source: GeocodeResult['source'] = 'nominatim',
): Promise<Omit<GeocodeResult, 'precision'> | null> {
  if (!NOMINATIM_LIMITER().tryConsume()) {
    console.warn('[GEOCODE] Nominatim rate limit exceeded, skipping');
    return null;
  }

  const encoded = encodeURIComponent(query);
  const url = `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'HospedaSuite/1.0 (geocoding-service)' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      console.warn(`[GEOCODE] Nominatim returned ${res.status}`);
      return null;
    }

    const data = await res.json();
    if (!data?.[0]?.lat || !data?.[0]?.lon) {
      console.warn('[GEOCODE] Nominatim returned no results');
      return null;
    }

    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
      source,
    };
  } catch (err) {
    console.warn('[GEOCODE] Nominatim request failed:', err instanceof Error ? err.message : err);
    return null;
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

/**
 * Geocode an address with cascading fallback.
 *
 * @param address - Street address or location description
 * @param city    - City name
 * @param country - Country (default: Colombia)
 * @returns GeocodeResult with coordinates, precision level, and source
 * @throws GeocodeError if all providers fail
 */
export async function geocodeAddress(
  address: string,
  city: string,
  country?: string,
): Promise<GeocodeResult> {
  const precision = inferPrecision(address, city);
  const fullQuery = [address, city, country ?? 'Colombia'].filter(Boolean).join(', ');

  // 1. Try Mapbox (primary)
  const mapboxToken = process.env.MAPBOX_ACCESS_TOKEN;
  if (mapboxToken) {
    const result = await geocodeWithMapbox(fullQuery, mapboxToken);
    if (result) {
      return { ...result, precision };
    }
  }

  // 2. Fallback to Nominatim
  const nominatimResult = await geocodeWithNominatim(fullQuery);
  if (nominatimResult) {
    return { ...nominatimResult, precision };
  }

  // 3. City-level fallback (always via Nominatim)
  if (city) {
    const cityResult = await geocodeWithNominatim(city, 'fallback');
    if (cityResult) {
      return { ...cityResult, precision: 'city' as const };
    }
  }

  throw new GeocodeError(
    'No se pudo determinar la ubicación en el mapa. ' +
      'El alojamiento se guardará sin coordenadas — puedes agregarlas después desde el panel.',
    'GEOCODE_FAILED',
  );
}
