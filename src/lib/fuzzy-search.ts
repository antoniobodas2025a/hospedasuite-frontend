/**
 * Fuzzy Search — Client-side fuzzy matching for OTA locations.
 *
 * Wraps fuse.js (v7) with accent-insensitive normalization, synonym
 * resolution, and typed convenience exports for city/entity search.
 *
 * Design decisions (PRD-008):
 *   - Threshold 0.4: forgiving enough for typos, not so loose it matches everything
 *   - ignoreDiacritics: true — accent-insensitive (fuse.js built-in)
 *   - ignoreLocation: true — treats query as bag-of-words for short inputs
 */

import Fuse, { type FuseResult, type IFuseOptions } from 'fuse.js';
import synonymGraph from './synonym-graph.json' with { type: 'json' };

const SYNONYMS: Record<string, string> = synonymGraph.synonyms;

// ── Default fuse.js options for OTA location search ──────────────────────────

const FUSE_DEFAULTS: IFuseOptions<unknown> = {
  threshold: 0.4,
  ignoreDiacritics: true,
  ignoreLocation: true,
  findAllMatches: false,
  minMatchCharLength: 2,
  includeScore: true,
};

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Fuse search result with scored items.
 */
export interface FuzzyResult<T> {
  item: T;
  score: number;
  refIndex: number;
}

/**
 * Resolve a user input string to its canonical synonym form.
 *
 * @param input - Raw user input (e.g., "CDMX", "bogota", "medallo")
 * @returns The canonical synonym if found, otherwise the original input.
 *
 * @example
 *   resolveSynonym("CDMX")    // → "Ciudad de México"
 *   resolveSynonym("bogota")  // → "Bogotá"
 *   resolveSynonym("unknown") // → "unknown"
 */
export function resolveSynonym(input: string): string {
  if (!input) return '';

  // Try exact match first
  if (SYNONYMS[input]) return SYNONYMS[input];

  // Try case-insensitive match
  const lower = input.toLowerCase();
  for (const [key, value] of Object.entries(SYNONYMS)) {
    if (key.toLowerCase() === lower) return value;
  }

  return input;
}

/**
 * Perform fuzzy search over items with accent-insensitive matching.
 *
 * @param items  - Array of items to search through
 * @param query  - Search query string
 * @param keys   - Object keys to search within each item
 * @param limit  - Max results to return (default: 10)
 * @returns Ranked array of fuzzy results (best match first)
 *
 * @example
 *   fuzzySearch(cities, "medellin", ["city"])
 *   // → [{ item: { city: "Medellín" }, score: 0.15, refIndex: 2 }, ...]
 */
export function fuzzySearch<T>(
  items: T[],
  query: string,
  keys: string[],
  limit = 10,
): FuzzyResult<T>[] {
  if (!query || query.trim().length < 2 || items.length === 0) {
    return [];
  }

  // Resolve synonyms before searching
  const resolved = resolveSynonym(query);

  const fuse = new Fuse(items, {
    ...FUSE_DEFAULTS,
    keys,
  });

  const results: FuseResult<T>[] = fuse.search(resolved, { limit });

  return results.map(r => ({
    item: r.item,
    score: r.score ?? 1,
    refIndex: r.refIndex,
  }));
}

/**
 * Build a fuse.js options override for a specific set of item keys.
 * Returns a configured options object for reuse with `new Fuse(items, opts)`.
 */
export function fuseOptions(keys: string[], overrides?: Partial<IFuseOptions<unknown>>): IFuseOptions<unknown> {
  return {
    ...FUSE_DEFAULTS,
    keys,
    ...overrides,
  };
}
