/**
 * Handoff URL utility — preserves ALL search params when navigating
 * between homepage and hotel detail.
 *
 * Preserved params: location, checkin, checkout, guests, category,
 *                    search, max_price, min_beds, amenities
 * Stripped params: scroll, showRoom, and internal tracking params.
 */

export const RELEVANT_PARAMS = [
  'location',
  'checkin',
  'checkout',
  'guests',
  'category',
  'search',
  'max_price',
  'min_beds',
  'amenities',
  // Map state params (PRD-006: Map-First Discovery)
  'z',     // zoom
  'lat',   // center latitude
  'lng',   // center longitude
] as const;

/**
 * Filters URL searchParams to only include relevant params for navigation.
 * Returns a clean URL string.
 */
export function preserveSearchParams(
  params: URLSearchParams,
  basePath: string
): string {
  const relevant = new URLSearchParams();

  for (const key of RELEVANT_PARAMS) {
    const value = params.get(key);
    if (value) {
      relevant.set(key, value);
    }
  }

  const query = relevant.toString();
  return query ? `${basePath}?${query}` : basePath;
}

/**
 * Extends existing URLSearchParams with a new key-value pair.
 * Use this instead of `new URLSearchParams()` to avoid wiping existing params.
 */
export function extendSearchParams(
  params: URLSearchParams,
  key: string,
  value: string
): URLSearchParams {
  const next = new URLSearchParams(params.toString());
  next.set(key, value);
  return next;
}
