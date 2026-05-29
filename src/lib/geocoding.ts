/**
 * Geocoding utility using Nominatim (OpenStreetMap).
 * Free, no API key required, but rate-limited to 1 request/second.
 * Uses GeoCacheManager for multi-level caching.
 */

import { getCachedCoords, setCachedCoords } from './geo-cache';

export interface GeoResult {
  lat: number;
  lng: number;
  displayName: string;
}

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org/search';

/**
 * Geocode a location string using Nominatim.
 * Checks cache first (precomputed → memory → session), then falls back to API.
 */
export async function geocodeLocation(query: string): Promise<GeoResult | null> {
  if (!query || query.length < 3) return null;

  // Check all cache levels first
  const cached = getCachedCoords(query);
  if (cached) {
    return cached;
  }

  // Nominatim requires a User-Agent header
  const url = `${NOMINATIM_BASE_URL}?format=json&q=${encodeURIComponent(query)}&limit=1&countrycodes=co`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'HospedaSuite/1.0 (https://hospedasuite.com)',
      },
    });

    if (!response.ok) {
      console.warn(`[Geocoding] Nominatim error: ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (data.length > 0) {
      const result = data[0];
      const lat = parseFloat(result.lat);
      const lng = parseFloat(result.lon);

      const geoResult: GeoResult = { lat, lng, displayName: result.display_name };

      // Cache the result in all levels
      setCachedCoords(query, geoResult);

      return geoResult;
    }

    return null;
  } catch (error) {
    console.error('[Geocoding] Failed to geocode:', error);
    return null;
  }
}

/**
 * Batch geocode multiple locations with rate limiting.
 * Nominatim allows 1 request per second.
 */
export async function batchGeocode(
  queries: string[]
): Promise<Map<string, GeoResult>> {
  const results = new Map<string, GeoResult>();
  
  for (const query of queries) {
    const result = await geocodeLocation(query);
    if (result) {
      results.set(query, result);
    }
    // Rate limit: wait 1 second between requests
    await new Promise((resolve) => setTimeout(resolve, 1100));
  }

  return results;
}
