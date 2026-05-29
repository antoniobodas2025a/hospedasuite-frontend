/**
 * Geocoding utility using Nominatim (OpenStreetMap).
 * Free, no API key required, but rate-limited to 1 request/second.
 * Includes sessionStorage caching to avoid redundant requests.
 */

const GEOCACHE_KEY = 'hospedasuite_geocache';
const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org/search';

export interface GeoResult {
  lat: number;
  lng: number;
  displayName: string;
}

/**
 * Get cached coordinates from sessionStorage.
 */
export function getCachedCoords(query: string): [number, number] | null {
  try {
    const raw = sessionStorage.getItem(GEOCACHE_KEY);
    if (!raw) return null;
    const cache = JSON.parse(raw);
    const entry = cache[query];
    if (entry && Date.now() - entry.timestamp < 24 * 60 * 60 * 1000) {
      return [entry.lat, entry.lng];
    }
    // Expired
    delete cache[query];
    sessionStorage.setItem(GEOCACHE_KEY, JSON.stringify(cache));
    return null;
  } catch {
    return null;
  }
}

/**
 * Save coordinates to sessionStorage cache.
 */
export function setCachedCoords(query: string, lat: number, lng: number) {
  try {
    const raw = sessionStorage.getItem(GEOCACHE_KEY);
    const cache = raw ? JSON.parse(raw) : {};
    cache[query] = {
      lat,
      lng,
      timestamp: Date.now(),
    };
    sessionStorage.setItem(GEOCACHE_KEY, JSON.stringify(cache));
  } catch {
    // Storage full or disabled
  }
}

/**
 * Geocode a location string using Nominatim.
 * Respects rate limits and uses cache.
 */
export async function geocodeLocation(query: string): Promise<GeoResult | null> {
  if (!query || query.length < 3) return null;

  // Check cache first
  const cached = getCachedCoords(query);
  if (cached) {
    return { lat: cached[0], lng: cached[1], displayName: query };
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

      // Cache the result
      setCachedCoords(query, lat, lng);

      return { lat, lng, displayName: result.display_name };
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
