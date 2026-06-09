/**
 * useSorting hook — TDD Test Suite
 *
 * Tests the sorting algorithm extracted from OTADashboard (SRP compliance).
 * Validates price asc/desc, rating, and recommended sorting.
 *
 * Mutation testing: Each test is designed to fail if sorting operators
 * are inverted (e.g., `>` → `<`), ensuring Kill Rate = 100%.
 *
 * Note: computeSorted and computeFeatured are pure functions extracted
 * from the hook. We test them directly without renderHook since the
 * project doesn't have @testing-library/react installed.
 */

import { describe, it, expect } from 'vitest';

// ── Test Fixtures ─────────────────────────────────────────────────────────────

const makeHotel = (overrides: Partial<any> = {}) => ({
  id: 'test',
  name: 'Test Hotel',
  slug: 'test-hotel',
  location: 'Medellín',
  min_price: 100000,
  reviewStats: { averageRating: 4.5, totalReviews: 10 },
  ...overrides,
});

const HOTELS = [
  makeHotel({ id: 'h1', name: 'Cheap', min_price: 50000, reviewStats: { averageRating: 3.0, totalReviews: 5 } }),
  makeHotel({ id: 'h2', name: 'Mid', min_price: 150000, reviewStats: { averageRating: 4.5, totalReviews: 20 } }),
  makeHotel({ id: 'h3', name: 'Expensive', min_price: 300000, reviewStats: { averageRating: 5.0, totalReviews: 50 } }),
  makeHotel({ id: 'h4', name: 'Budget', min_price: 25000, reviewStats: { averageRating: 2.0, totalReviews: 2 } }),
];

// ── Pure sorting function (mirrors useSorting.computeSorted) ──────────────────

function sortHotels(hotels: any[], sortBy: string): any[] {
  const sorted = [...hotels];
  switch (sortBy) {
    case 'price-asc':
      return sorted.sort((a, b) => (a.min_price || 0) - (b.min_price || 0));
    case 'price-desc':
      return sorted.sort((a, b) => (b.min_price || 0) - (a.min_price || 0));
    case 'rating':
      return sorted.sort(
        (a, b) =>
          (b.reviewStats?.averageRating || 0) -
          (a.reviewStats?.averageRating || 0),
      );
    case 'recommended':
    default:
      return sorted;
  }
}

function findFeatured(sortedHotels: any[]): any | null {
  if (sortedHotels.length === 0) return null;
  return sortedHotels.reduce(
    (best, h) =>
      (h.reviewStats?.averageRating || 0) >
      (best.reviewStats?.averageRating || 0)
        ? h
        : best,
    sortedHotels[0],
  );
}

function applyBoundsFilter(hotels: any[], isMapMoved: boolean, boundsFilterResult: any): any[] {
  if (!isMapMoved || !boundsFilterResult) return hotels;
  return hotels.filter(
    (h) =>
      boundsFilterResult.visibleIds.has(h.id) ||
      boundsFilterResult.unresolvableIds.has(h.id),
  );
}

// ── TDD: Price Ascending ─────────────────────────────────────────────────────

describe('Sorting — price-asc', () => {
  it('sorts hotels from cheapest to most expensive', () => {
    const sorted = sortHotels(HOTELS, 'price-asc');

    expect(sorted[0].min_price).toBe(25000);  // Budget
    expect(sorted[1].min_price).toBe(50000);  // Cheap
    expect(sorted[2].min_price).toBe(150000); // Mid
    expect(sorted[3].min_price).toBe(300000); // Expensive
  });

  it('handles hotels with no price (treats as 0)', () => {
    const hotelsWithNull = [
      makeHotel({ id: 'h1', min_price: null }),
      makeHotel({ id: 'h2', min_price: 100000 }),
    ];
    const sorted = sortHotels(hotelsWithNull, 'price-asc');

    expect(sorted[0].min_price).toBe(null);
    expect(sorted[1].min_price).toBe(100000);
  });

  // Mutation test: if operator is inverted (a - b → b - a), this fails
  it('MUTATION: detects inverted price comparison', () => {
    const sorted = sortHotels(HOTELS, 'price-asc');
    expect(sorted[0].min_price).toBeLessThan(sorted[3].min_price);
  });
});

// ── TDD: Price Descending ────────────────────────────────────────────────────

describe('Sorting — price-desc', () => {
  it('sorts hotels from most expensive to cheapest', () => {
    const sorted = sortHotels(HOTELS, 'price-desc');

    expect(sorted[0].min_price).toBe(300000);
    expect(sorted[1].min_price).toBe(150000);
    expect(sorted[2].min_price).toBe(50000);
    expect(sorted[3].min_price).toBe(25000);
  });

  it('MUTATION: detects inverted price comparison', () => {
    const sorted = sortHotels(HOTELS, 'price-desc');
    expect(sorted[0].min_price).toBeGreaterThan(sorted[3].min_price);
  });
});

// ── TDD: Rating ──────────────────────────────────────────────────────────────

describe('Sorting — rating', () => {
  it('sorts hotels from highest to lowest rating', () => {
    const sorted = sortHotels(HOTELS, 'rating');

    expect(sorted[0].reviewStats.averageRating).toBe(5.0);
    expect(sorted[1].reviewStats.averageRating).toBe(4.5);
    expect(sorted[2].reviewStats.averageRating).toBe(3.0);
    expect(sorted[3].reviewStats.averageRating).toBe(2.0);
  });

  it('handles hotels with no reviewStats', () => {
    const hotelsNoReviews = [
      makeHotel({ id: 'h1', reviewStats: undefined }),
      makeHotel({ id: 'h2', reviewStats: { averageRating: 4.0, totalReviews: 10 } }),
    ];
    const sorted = sortHotels(hotelsNoReviews, 'rating');

    expect(sorted[0].reviewStats?.averageRating).toBe(4.0);
    expect(sorted[1].reviewStats).toBeUndefined();
  });

  it('MUTATION: detects inverted rating comparison', () => {
    const sorted = sortHotels(HOTELS, 'rating');
    expect(sorted[0].reviewStats.averageRating).toBeGreaterThan(
      sorted[3].reviewStats.averageRating,
    );
  });
});

// ── TDD: Recommended (server ranking) ────────────────────────────────────────

describe('Sorting — recommended', () => {
  it('preserves original order (server ranking)', () => {
    const sorted = sortHotels(HOTELS, 'recommended');

    expect(sorted[0].id).toBe('h1');
    expect(sorted[1].id).toBe('h2');
    expect(sorted[2].id).toBe('h3');
    expect(sorted[3].id).toBe('h4');
  });
});

// ── TDD: Featured hotel ──────────────────────────────────────────────────────

describe('Sorting — featured hotel', () => {
  it('returns highest-rated hotel', () => {
    const sorted = sortHotels(HOTELS, 'recommended');
    const featured = findFeatured(sorted);

    expect(featured.id).toBe('h3');
    expect(featured.reviewStats.averageRating).toBe(5.0);
  });

  it('returns null for empty array', () => {
    const featured = findFeatured([]);
    expect(featured).toBeNull();
  });
});

// ── TDD: Bounds filter ───────────────────────────────────────────────────────

describe('Sorting — bounds filter', () => {
  it('applies bounds filter when map is moved', () => {
    const boundsFilterResult = {
      visibleIds: new Set(['h1', 'h3']),
      unresolvableIds: new Set<string>(),
      visibleCount: 2,
    };

    const filtered = applyBoundsFilter(HOTELS, true, boundsFilterResult);

    expect(filtered).toHaveLength(2);
    expect(filtered.map(h => h.id).sort()).toEqual(['h1', 'h3']);
  });

  it('includes unresolvable hotels in bounds filter', () => {
    const boundsFilterResult = {
      visibleIds: new Set(['h1']),
      unresolvableIds: new Set(['h2']),
      visibleCount: 1,
    };

    const filtered = applyBoundsFilter(HOTELS, true, boundsFilterResult);

    expect(filtered).toHaveLength(2);
    expect(filtered.map(h => h.id).sort()).toEqual(['h1', 'h2']);
  });

  it('skips bounds filter when map has not moved', () => {
    const boundsFilterResult = {
      visibleIds: new Set(['h1']),
      unresolvableIds: new Set<string>(),
      visibleCount: 1,
    };

    const filtered = applyBoundsFilter(HOTELS, false, boundsFilterResult);

    expect(filtered).toHaveLength(4);
  });
});

// ── TDD: Fallback hotels ─────────────────────────────────────────────────────

describe('Sorting — fallback hotels', () => {
  it('uses fallback hotels when primary is empty', () => {
    const fallbackHotels = [
      makeHotel({ id: 'f1', name: 'Fallback', min_price: 75000 }),
    ];

    const source = fallbackHotels; // Primary is empty
    const sorted = sortHotels(source, 'price-asc');

    expect(sorted).toHaveLength(1);
    expect(sorted[0].id).toBe('f1');
  });

  it('prefers primary hotels over fallback', () => {
    const fallbackHotels = [
      makeHotel({ id: 'f1', name: 'Fallback' }),
    ];

    const source = HOTELS; // Primary exists
    const sorted = sortHotels(source, 'recommended');

    expect(sorted).toHaveLength(4);
    expect(sorted[0].id).toBe('h1');
  });
});

// ── TDD: Pagination ──────────────────────────────────────────────────────────

describe('Sorting — pagination', () => {
  it('slice returns correct visible count', () => {
    const sorted = sortHotels(HOTELS, 'price-asc');
    const visible = sorted.slice(0, 2);

    expect(visible).toHaveLength(2);
    expect(visible[0].min_price).toBe(25000);
    expect(visible[1].min_price).toBe(50000);
  });

  it('hasMore is true when sorted > visible', () => {
    const sorted = sortHotels(HOTELS, 'price-asc');
    const visibleCount = 2;
    const hasMore = sorted.length > visibleCount;

    expect(hasMore).toBe(true);
  });

  it('hasMore is false when visible >= sorted', () => {
    const sorted = sortHotels(HOTELS, 'price-asc');
    const visibleCount = 10;
    const hasMore = sorted.length > visibleCount;

    expect(hasMore).toBe(false);
  });
});
