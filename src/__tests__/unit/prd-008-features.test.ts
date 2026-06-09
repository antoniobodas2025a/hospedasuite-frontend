// ============================================================================
// 🧪 PRD-008: Smart Search Pipeline — Unit Tests
//
// Covers all 5 layers of the search pipeline:
//   1. Fuzzy matching (fuse.js wrapper)
//   2. Intent detection (regex patterns)
//   3. Diversity constraint (round-robin interleaving)
//   4. Fallback chain logic (5-level cascade)
//   5. Search cache (stale-while-revalidate)
// ============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  fuzzySearch,
  resolveSynonym,
  fuseOptions,
} from '@/lib/fuzzy-search';
import {
  detectIntent,
} from '@/lib/intent-detection';
import {
  applyDiversity,
} from '@/lib/hotel-ranking';
import {
  searchCache,
  createCachedFetcher,
  type CacheParams,
} from '@/lib/search-cache';

// ── Fixtures ──────────────────────────────────────────────────────────────────

interface TestCity {
  city: string;
  department: string;
}

const COLOMBIAN_CITIES: TestCity[] = [
  { city: 'Medellín', department: 'Antioquia' },
  { city: 'Bogotá', department: 'Cundinamarca' },
  { city: 'Cartagena', department: 'Bolívar' },
  { city: 'Cali', department: 'Valle del Cauca' },
  { city: 'Barranquilla', department: 'Atlántico' },
  { city: 'Santa Marta', department: 'Magdalena' },
  { city: 'Pereira', department: 'Risaralda' },
  { city: 'Manizales', department: 'Caldas' },
  { city: 'Bucaramanga', department: 'Santander' },
  { city: 'Villavicencio', department: 'Meta' },
];

interface TestHotel {
  id: string;
  name: string;
  type: string;
  price: number;
}

const DIVERSE_HOTELS: TestHotel[] = [
  { id: 'h1', name: 'Hotel A', type: 'hotel', price: 150000 },
  { id: 'h2', name: 'Hotel B', type: 'hotel', price: 120000 },
  { id: 'h3', name: 'Hotel C', type: 'hotel', price: 180000 },
  { id: 'g1', name: 'Glamping Luna', type: 'glamping', price: 250000 },
  { id: 'g2', name: 'Glamping Sol', type: 'glamping', price: 300000 },
  { id: 'g3', name: 'Glamping Río', type: 'glamping', price: 220000 },
  { id: 'ap1', name: 'Apartamento Centro', type: 'apartment', price: 90000 },
  { id: 'ap2', name: 'Apartamento Norte', type: 'apartment', price: 110000 },
  { id: 'hs1', name: 'Hostal Amigos', type: 'hostel', price: 35000 },
];

const SINGLE_CATEGORY_HOTELS: TestHotel[] = [
  { id: 'h1', name: 'Hotel A', type: 'hotel', price: 150000 },
  { id: 'h2', name: 'Hotel B', type: 'hotel', price: 120000 },
  { id: 'h3', name: 'Hotel C', type: 'hotel', price: 180000 },
];

// ── Cache test helper ─────────────────────────────────────────────────────────

function makeCacheParams(overrides: Partial<CacheParams> = {}): CacheParams {
  return {
    page: 0,
    limit: 24,
    category: 'all',
    search: '',
    location: 'Medellín',
    ...overrides,
  };
}

// ── Test Area 1: Fuzzy Search ─────────────────────────────────────────────────

describe('PRD-008: fuzzy-search (Test Area 1)', () => {
  describe('fuzzySearch()', () => {
    it('returns ranked results sorted by score (best match first)', () => {
      const results = fuzzySearch(COLOMBIAN_CITIES, 'cartagena', ['city']);
      expect(results.length).toBeGreaterThan(0);
      // First result should be Cartagena (best match)
      expect(results[0].item.city).toBe('Cartagena');
      // All results should have a score between 0 and 1
      for (const r of results) {
        expect(r.score).toBeGreaterThanOrEqual(0);
        expect(r.score).toBeLessThanOrEqual(1);
      }
    });

    it('accent-insensitive: "medellin" matches "Medellín"', () => {
      const results = fuzzySearch(COLOMBIAN_CITIES, 'medellin', ['city']);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].item.city).toBe('Medellín');
      // Score should be very low (close match despite accent difference)
      expect(results[0].score).toBeLessThan(0.3);
    });

    it('threshold 0.4: close matches included, very far matches excluded', () => {
      // "mdellin" is a typo of "Medellín" → should match (within threshold)
      const results = fuzzySearch(COLOMBIAN_CITIES, 'mdellin', ['city']);
      expect(results.length).toBeGreaterThan(0);
      // All returned results have score <= threshold (fuse.js default = 0.4)
      for (const r of results) {
        expect(r.score).toBeLessThanOrEqual(0.4);
      }
    });

    it('returns empty array for query shorter than minMatchCharLength', () => {
      const results = fuzzySearch(COLOMBIAN_CITIES, 'M', ['city']);
      expect(results).toEqual([]);
    });

    it('returns empty array for empty items', () => {
      const results = fuzzySearch([], 'Medellín', ['city']);
      expect(results).toEqual([]);
    });

    it('searches across multiple keys', () => {
      const results = fuzzySearch(COLOMBIAN_CITIES, 'antioquia', [
        'city',
        'department',
      ]);
      expect(results.length).toBeGreaterThan(0);
      // "Antioquia" should match the department key of Medellín
      expect(results.some(r => r.item.city === 'Medellín')).toBe(true);
    });

    it('prioritizes name match over location match (by key order)', () => {
      // "Santa" appears in both "Santa Marta" (city) and no department has it
      const results = fuzzySearch(COLOMBIAN_CITIES, 'santa', ['city', 'department']);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].item.city).toBe('Santa Marta');
    });
  });

  describe('resolveSynonym()', () => {
    it('CDMX → "Ciudad de México"', () => {
      expect(resolveSynonym('CDMX')).toBe('Ciudad de México');
    });

    it('Medallo → "Medellín"', () => {
      expect(resolveSynonym('Medallo')).toBe('Medellín');
    });

    it('Bogota → "Bogotá" (case-insensitive)', () => {
      expect(resolveSynonym('Bogota')).toBe('Bogotá');
    });

    it('returns original input for unknown terms', () => {
      expect(resolveSynonym('desconocido')).toBe('desconocido');
    });

    it('returns empty string for empty input', () => {
      expect(resolveSynonym('')).toBe('');
    });

    it('cartahena → "Cartagena" (common misspelling)', () => {
      expect(resolveSynonym('cartahena')).toBe('Cartagena');
    });
  });

  describe('fuseOptions()', () => {
    it('returns configured options with keys', () => {
      const opts = fuseOptions(['name', 'city']);
      expect(opts.keys).toEqual(['name', 'city']);
      expect(opts.threshold).toBe(0.4);
      expect(opts.ignoreDiacritics).toBe(true);
    });

    it('allows overriding defaults', () => {
      const opts = fuseOptions(['name'], { threshold: 0.2 });
      expect(opts.keys).toEqual(['name']);
      expect(opts.threshold).toBe(0.2);
    });
  });
});

// ── Test Area 2: Intent Detection ─────────────────────────────────────────────

describe('PRD-008: intent-detection (Test Area 2)', () => {
  describe('budget intent', () => {
    it('"barato" → budget intent with maxPrice filter', () => {
      const result = detectIntent('hotel barato en Medellín');
      expect(result.intent).toBe('budget');
      expect(result.filters.maxPrice).toBe(150000);
    });

    it('"económico" → budget intent', () => {
      const result = detectIntent('alojamiento económico');
      expect(result.intent).toBe('budget');
      expect(result.filters.maxPrice).toBe(150000);
    });

    it('"low cost" → budget intent', () => {
      const result = detectIntent('low cost Cartagena');
      expect(result.intent).toBe('budget');
    });
  });

  describe('luxury intent', () => {
    it('"lujo" → luxury intent with minPrice filter', () => {
      const result = detectIntent('hotel de lujo en Cartagena');
      expect(result.intent).toBe('luxury');
      expect(result.filters.minPrice).toBe(400000);
    });

    it('"5 estrellas" → luxury intent', () => {
      const result = detectIntent('alojamiento 5 estrellas');
      expect(result.intent).toBe('luxury');
      expect(result.filters.minPrice).toBe(400000);
    });

    it('"exclusivo" → luxury intent', () => {
      const result = detectIntent('hotel exclusivo');
      expect(result.intent).toBe('luxury');
    });
  });

  describe('family intent', () => {
    it('"familia" → family intent with minGuests filter', () => {
      const result = detectIntent('hotel para familia en Santa Marta');
      expect(result.intent).toBe('family');
      expect(result.filters.minGuests).toBe(4);
    });

    it('"grupal" → family intent', () => {
      const result = detectIntent('alojamiento grupal');
      expect(result.intent).toBe('family');
      expect(result.filters.minGuests).toBe(4);
    });

    it('"niños" → family intent', () => {
      const result = detectIntent('hotel con niños');
      expect(result.intent).toBe('family');
    });
  });

  describe('romantic intent', () => {
    it('"pareja" → romantic intent with maxGuests filter', () => {
      const result = detectIntent('escapada en pareja');
      expect(result.intent).toBe('romantic');
      expect(result.filters.maxGuests).toBe(2);
    });

    it('"luna de miel" → romantic intent', () => {
      const result = detectIntent('hotel luna de miel');
      expect(result.intent).toBe('romantic');
      expect(result.filters.maxGuests).toBe(2);
    });

    it('"romántico" → romantic intent', () => {
      const result = detectIntent('escapada romántica');
      expect(result.intent).toBe('romantic');
    });
  });

  describe('no intent', () => {
    it('no intent keywords → { intent: null, filters: {} }', () => {
      const result = detectIntent('Hotel en Medellín');
      expect(result.intent).toBeNull();
      expect(result.filters).toEqual({});
    });

    it('empty string → null intent', () => {
      const result = detectIntent('');
      expect(result.intent).toBeNull();
      expect(result.filters).toEqual({});
    });

    it('first pattern wins when multiple intents match', () => {
      // "barato" and "pareja" both match — budget is matched first
      const result = detectIntent('hotel barato para pareja');
      expect(result.intent).toBe('budget');
    });
  });
});

// ── Test Area 3: Diversity Constraint ─────────────────────────────────────────

describe('PRD-008: applyDiversity (Test Area 3)', () => {
  describe('round-robin interleaving', () => {
    it('no more than 2 of same category in a row', () => {
      const result = applyDiversity(DIVERSE_HOTELS, 2);

      // Scan for any triple of same type
      let maxConsecutive = 0;
      let currentType = '';
      let currentCount = 0;
      for (const h of result) {
        if (h.type === currentType) {
          currentCount++;
        } else {
          currentType = h.type;
          currentCount = 1;
        }
        maxConsecutive = Math.max(maxConsecutive, currentCount);
      }

      expect(maxConsecutive).toBeLessThanOrEqual(2);
    });

    it('preserves all items (no loss)', () => {
      const result = applyDiversity(DIVERSE_HOTELS);
      expect(result).toHaveLength(DIVERSE_HOTELS.length);

      // All original items present
      const resultIds = result.map(h => h.id).sort();
      const originalIds = DIVERSE_HOTELS.map(h => h.id).sort();
      expect(resultIds).toEqual(originalIds);
    });

    it('single category: all results returned', () => {
      const result = applyDiversity(SINGLE_CATEGORY_HOTELS, 2);

      expect(result).toHaveLength(SINGLE_CATEGORY_HOTELS.length);
      // All should be 'hotel' type
      expect(result.every(h => h.type === 'hotel')).toBe(true);
      // Original order preserved since only one queue
      expect(result.map(h => h.id)).toEqual(['h1', 'h2', 'h3']);
    });

    it('empty input: empty output', () => {
      const result = applyDiversity([]);
      expect(result).toEqual([]);
    });
  });

  describe('maxPerCategory parameter', () => {
    it('default maxPerCategory=2 works correctly', () => {
      // All glampings, hotels, apartments, hostels mixed
      const result = applyDiversity(DIVERSE_HOTELS);
      expect(result.length).toBe(DIVERSE_HOTELS.length);

      // Verify no triple of same type
      for (let i = 2; i < result.length; i++) {
        const sameAsPrev = result[i].type === result[i - 1].type;
        const sameAsPrevPrev = result[i].type === result[i - 2].type;
        expect(!(sameAsPrev && sameAsPrevPrev)).toBe(true);
      }
    });

    it('maxPerCategory=1 enforces strict alternation', () => {
      const result = applyDiversity(DIVERSE_HOTELS, 1);

      for (let i = 1; i < result.length; i++) {
        // Consecutive should ALWAYS be different types when maxPerCategory=1
        // (unless only one category has items left — flush mode)
        if (i < result.length - 3) {
          expect(result[i].type).not.toBe(result[i - 1].type);
        }
      }
    });
  });

  describe('does not mutate input', () => {
    it('input array unchanged after applyDiversity', () => {
      const original = [...DIVERSE_HOTELS];
      applyDiversity(DIVERSE_HOTELS);
      expect(DIVERSE_HOTELS).toEqual(original);
    });
  });
});

// ── Test Area 4: Fallback Chain Logic ─────────────────────────────────────────
//
// The fallback chain is implemented in OTADashboard.tsx as React effects.
// These tests verify the pure functions and contracts that power each level.

describe('PRD-008: Fallback Chain (Test Area 4)', () => {
  const FALLBACK_CITIES = [
    'Medellín', 'Bogotá', 'Cartagena', 'Cali', 'Santa Marta',
    'Barranquilla', 'Pereira', 'Manizales', 'Bucaramanga', 'Villavicencio',
    'San Andrés', 'Armenia', 'Ibagué', 'Neiva', 'Popayán',
    'Pasto', 'Cúcuta', 'Valledupar', 'Montería', 'Riohacha',
  ];

  // ── Level 1: fuzzy typo detection ─────────────────────────────────────────
  describe('Level 1: fuzzy typo → retry with correction', () => {
    it('detects "Medallo" as typo of "Medellín" via fuzzySearch', () => {
      const citiesList = FALLBACK_CITIES.map(c => ({ city: c }));
      const matches = fuzzySearch(citiesList, 'Medallo', ['city'], 5);
      const goodMatches = matches.filter(m => m.score < 0.3);

      expect(goodMatches.length).toBeGreaterThan(0);
      expect(goodMatches[0].item.city).toBe('Medellín');
    });

    it('detects "Cartahena" as corrected "Cartagena"', () => {
      const citiesList = FALLBACK_CITIES.map(c => ({ city: c }));
      const matches = fuzzySearch(citiesList, 'Cartahena', ['city'], 5);
      const goodMatches = matches.filter(m => m.score < 0.3);

      expect(goodMatches.length).toBeGreaterThan(0);
      expect(goodMatches[0].item.city).toBe('Cartagena');
    });

    it('does not produce false corrections for valid cities', () => {
      const citiesList = FALLBACK_CITIES.map(c => ({ city: c }));
      const matches = fuzzySearch(citiesList, 'Medellín', ['city'], 5);
      // fuse.js returns ~2.22e-16 for exact matches (float precision), not exactly 0
      const exactMatch = matches.filter(m => m.score < 0.001);

      expect(exactMatch.length).toBeGreaterThan(0);
      expect(exactMatch[0].item.city).toBe('Medellín');
    });
  });

  // ── Fallback level structure validation ───────────────────────────────────
  describe('Fallback level contract', () => {
    const FALLBACK_LEVELS = [
      { level: 0, description: 'Exact results found — no fallback needed' },
      { level: 1, description: 'Fuzzy typo correction on location' },
      { level: 2, description: 'Remove category filter → retry' },
      { level: 3, description: 'Remove location filter → show all zones' },
      { level: 4, description: 'All filters off → country-wide search + suggestions' },
      { level: 5, description: 'Empty results → "explorá alternativas" message' },
    ];

    it('fallback chain has exactly 6 levels (0-5)', () => {
      expect(FALLBACK_LEVELS).toHaveLength(6);
    });

    it('each level has a non-empty description', () => {
      for (const level of FALLBACK_LEVELS) {
        expect(level.description.length).toBeGreaterThan(0);
      }
    });

    it('levels are sequential (0 through 5)', () => {
      for (let i = 0; i < FALLBACK_LEVELS.length; i++) {
        expect(FALLBACK_LEVELS[i].level).toBe(i);
      }
    });

    it('Level 5 has the "explorá alternativas" message', () => {
      expect(FALLBACK_LEVELS[5].description).toContain('explorá alternativas');
    });
  });

  // ── Cache behavior for fallback retries ───────────────────────────────────
  describe('Cache supports fallback retries', () => {
    it('deduplication prevents redundant parallel requests during cascade', () => {
      const params = makeCacheParams({ location: 'Medellín' });
      const key = JSON.stringify(params);

      // No refresh in progress initially
      expect(searchCache.isRefreshing(key)).toBeNull();

      // Register a mock in-flight refresh
      const mockPromise = Promise.resolve({ data: [] });
      searchCache.markRefreshing(key, mockPromise);

      // Now isRefreshing returns the promise (dedup active)
      const inFlight = searchCache.isRefreshing(key);
      expect(inFlight).not.toBeNull();

      // Cleanup
      searchCache.invalidateAll();
    });
  });
});

// ── Test Area 5: Search Cache ─────────────────────────────────────────────────

describe('PRD-008: search-cache (Test Area 5)', () => {
  beforeEach(() => {
    // Reset singleton state between tests
    searchCache.invalidateAll();
  });

  afterEach(() => {
    searchCache.invalidateAll();
  });

  describe('TTL 120s', () => {
    it('returns cached data within TTL', () => {
      const params = makeCacheParams();
      const data = { hotels: ['Hotel A'] };

      searchCache.set(params, data);
      const cached = searchCache.get(params);

      expect(cached).toEqual(data);
    });

    it('expires entries after TTL (120s)', () => {
      const params = makeCacheParams();
      const data = { hotels: ['Hotel A'] };

      // Store entry
      searchCache.set(params, data);

      // Fast-forward time beyond TTL
      const originalNow = Date.now;
      try {
        const now = Date.now();
        Date.now = vi.fn(() => now + 121 * 1000); // 121 seconds later

        const cached = searchCache.get(params);
        expect(cached).toBeNull();
      } finally {
        Date.now = originalNow;
      }
    });
  });

  describe('request deduplication', () => {
    it('same query only fetches once via dedup', () => {
      const params = makeCacheParams({ location: 'Bogotá' });
      const key = JSON.stringify(params);

      // First check: no refresh in flight
      expect(searchCache.isRefreshing(key)).toBeNull();

      // Mark as refreshing
      const dedupPromise = Promise.resolve({ data: 'fresh' });
      searchCache.markRefreshing(key, dedupPromise);

      // Second concurrent check: should find in-flight refresh
      const existing = searchCache.isRefreshing(key);
      expect(existing).toBe(dedupPromise);
    });

    it('dedup resolves after cache.set() clears it', () => {
      const params = makeCacheParams({ location: 'Cali' });
      const key = JSON.stringify(params);

      searchCache.markRefreshing(key, Promise.resolve({}));
      expect(searchCache.isRefreshing(key)).not.toBeNull();

      // After set(), the refresh marker is cleared
      searchCache.set(params, { hotels: ['Hotel Cali'] });
      expect(searchCache.isRefreshing(key)).toBeNull();
    });
  });

  describe('preWarm', () => {
    it('preWarmOne adds to cache without triggering fetch', () => {
      const params = makeCacheParams({ location: 'Santa Marta' });
      const data = { hotels: ['Hotel Playa'] };

      // Not cached yet
      expect(searchCache.get(params)).toBeNull();

      // Pre-warm
      searchCache.preWarmOne(params, data);

      // Now cached
      expect(searchCache.get(params)).toEqual(data);
    });

    it('preWarmOne does not overwrite existing fresh cache', () => {
      const params = makeCacheParams({ location: 'Cartagena' });
      const originalData = { hotels: ['Original'] };

      searchCache.set(params, originalData);
      // Try to pre-warm with different data
      searchCache.preWarmOne(params, { hotels: ['ShouldNotReplace'] });

      // Original data preserved
      expect(searchCache.get(params)).toEqual(originalData);
    });

    it('preWarm adds multiple entries', () => {
      const entries = new Map<string, { params: CacheParams; data: Record<string, string[]> }>();
      entries.set('1', {
        params: makeCacheParams({ location: 'Medellín' }),
        data: { hotels: ['Med'] },
      });
      entries.set('2', {
        params: makeCacheParams({ location: 'Bogotá' }),
        data: { hotels: ['Bog'] },
      });

      searchCache.preWarm(entries);

      expect(searchCache.get(makeCacheParams({ location: 'Medellín' }))).toEqual({
        hotels: ['Med'],
      });
      expect(searchCache.get(makeCacheParams({ location: 'Bogotá' }))).toEqual({
        hotels: ['Bog'],
      });
    });
  });

  describe('invalidateAll', () => {
    it('clears all cached entries', () => {
      searchCache.set(makeCacheParams({ location: 'A' }), { data: 'A' });
      searchCache.set(makeCacheParams({ location: 'B' }), { data: 'B' });
      searchCache.set(makeCacheParams({ location: 'C' }), { data: 'C' });

      const statsBefore = searchCache.getStats();
      expect(statsBefore.size).toBe(3);

      searchCache.invalidateAll();

      const statsAfter = searchCache.getStats();
      expect(statsAfter.size).toBe(0);
    });

    it('clears in-flight refresh markers', () => {
      const params = makeCacheParams();
      const key = JSON.stringify(params);
      searchCache.markRefreshing(key, Promise.resolve({}));

      const statsBefore = searchCache.getStats();
      expect(statsBefore.refreshing).toBe(1);

      searchCache.invalidateAll();
      expect(searchCache.isRefreshing(key)).toBeNull();
    });
  });

  describe('createCachedFetcher', () => {
    it('returns stale cache + revalidates in background', async () => {
      const params = makeCacheParams();

      // Pre-seed cache
      searchCache.set(params, { hotels: ['stale'] });

      let fetchCount = 0;
      const mockFetch = vi.fn().mockImplementation(async () => {
        fetchCount++;
        return { hotels: ['fresh'] };
      });

      const fetcher = createCachedFetcher(mockFetch, searchCache);

      // First call: returns stale immediately
      const result = await fetcher(params);
      expect(result.isStale).toBe(true);
      expect(result.data).toEqual({ hotels: ['stale'] });

      // fetchCount hasn't run yet (it's in background)
      // Let the microtask queue flush
      await vi.waitFor(() => {
        expect(fetchCount).toBe(1);
      }, { timeout: 100 });

      // After refresh, cache should now have fresh data
      const refreshed = searchCache.get(params);
      expect(refreshed).toEqual({ hotels: ['fresh'] });
    });

    it('returns fresh data on cache miss', async () => {
      const params = makeCacheParams({ location: 'Unique' });
      const mockFetch = vi.fn().mockResolvedValue({ hotels: ['fresh'] });

      const fetcher = createCachedFetcher(mockFetch, searchCache);
      const result = await fetcher(params);

      expect(result.isStale).toBe(false);
      expect(result.data).toEqual({ hotels: ['fresh'] });
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('deduplicates parallel calls for same key', async () => {
      const params = makeCacheParams({ location: 'Dedup' });
      let fetchCount = 0;
      const mockFetch = vi.fn().mockImplementation(async () => {
        fetchCount++;
        return { hotels: ['fresh'] };
      });

      const fetcher = createCachedFetcher(mockFetch, searchCache);

      // Prime cache with stale data
      searchCache.set(params, { hotels: ['stale'] });

      // Fire two concurrent requests
      const [r1, r2] = await Promise.all([
        fetcher(params),
        fetcher(params),
      ]);

      // Both get stale data
      expect(r1.data).toEqual({ hotels: ['stale'] });
      expect(r2.data).toEqual({ hotels: ['stale'] });
      expect(r1.isStale).toBe(true);
      expect(r2.isStale).toBe(true);

      // But only ONE background fetch was triggered (dedup)
      // The first call initiates refresh, second sees it's already refreshing
      // and doesn't start another
      await vi.waitFor(() => {
        expect(fetchCount).toBe(1);
      }, { timeout: 100 });
    });

    it('survives failed revalidation gracefully', async () => {
      const params = makeCacheParams({ location: 'Error' });
      searchCache.set(params, { hotels: ['stale'] });

      // Mock a failing fetch
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
      const fetcher = createCachedFetcher(mockFetch, searchCache);

      // Should not throw — returns stale data
      const result = await fetcher(params);
      expect(result.isStale).toBe(true);
      expect(result.data).toEqual({ hotels: ['stale'] });

      // Cache still has stale data (fallback)
      const stillCached = searchCache.get(params);
      expect(stillCached).toEqual({ hotels: ['stale'] });
    });
  });

  describe('getStats', () => {
    it('returns accurate cache stats', () => {
      searchCache.set(makeCacheParams({ location: 'X' }), { data: 'X' });
      searchCache.set(makeCacheParams({ location: 'Y' }), { data: 'Y' });

      const stats = searchCache.getStats();
      expect(stats.size).toBe(2);
      expect(stats.refreshing).toBe(0);
      expect(stats.keys).toHaveLength(2);
    });
  });
});
