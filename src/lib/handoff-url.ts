/**
 * Handoff URL utility — preserves relevant search params when navigating
 * from homepage to hotel detail.
 *
 * Relevant params: checkin, checkout, guests
 * Stripped params: scroll, showRoom, category, max_price, etc.
 */

export const RELEVANT_PARAMS = ['checkin', 'checkout', 'guests'] as const;

/**
 * Filters URL searchParams to only include relevant params for hotel detail handoff.
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
