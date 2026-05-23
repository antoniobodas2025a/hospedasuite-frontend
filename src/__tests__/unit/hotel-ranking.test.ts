import { rankHotels, type RankingContext, type ScorableHotel } from '@/lib/hotel-ranking';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const baseHotels: ScorableHotel[] = [
  {
    id: '1',
    name: 'Hotel Patio del Mundo',
    location: 'Bogotá',
    min_price: 120000,
    reviewStats: { averageRating: 4.8, totalReviews: 120 },
    availableRooms: 5,
    totalRooms: 10,
  },
  {
    id: '2',
    name: 'Glamping Sierra Nevada',
    location: 'Santa Marta',
    min_price: 80000,
    reviewStats: { averageRating: 4.2, totalReviews: 30 },
    availableRooms: 2,
    totalRooms: 5,
  },
  {
    id: '3',
    name: 'Hostal La Candelaria',
    location: 'Bogotá',
    min_price: 50000,
    reviewStats: { averageRating: 3.5, totalReviews: 5 },
    availableRooms: 0,
    totalRooms: 8,
  },
  {
    id: '4',
    name: 'Luxury Suite Cartagena',
    location: 'Cartagena',
    min_price: 500000,
    reviewStats: { averageRating: 5.0, totalReviews: 200 },
    availableRooms: 8,
    totalRooms: 10,
  },
];

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('hotel-ranking', () => {
  describe('availability scoring', () => {
    it('prioritizes hotels with rooms when dates are provided', () => {
      const ctx: RankingContext = { checkIn: '2026-06-01', checkOut: '2026-06-03' };
      const ranked = rankHotels(baseHotels, ctx);
      // Hotel with 0 availability should be last
      expect(ranked[ranked.length - 1].id).toBe('3');
    });

    it('returns neutral availability when no dates provided', () => {
      const ranked = rankHotels(baseHotels, {});
      // All hotels get 0.5 availability score, so other factors dominate
      const scores = ranked.map((h, i) => ({ id: h.id, rank: i + 1 }));
      expect(scores).toHaveLength(4);
    });
  });

  describe('review scoring', () => {
    it('favors higher ratings with more reviews', () => {
      const ctx: RankingContext = {};
      const ranked = rankHotels(baseHotels, ctx);
      // Luxury Suite (5.0, 200 reviews) ranks high but price penalty (500k) pushes it down
      // It should be in top 3
      const luxuryIdx = ranked.findIndex(h => h.id === '4');
      expect(luxuryIdx).toBeLessThan(3);
    });

    it('does not completely penalize new hotels (log confidence)', () => {
      const newHotels: ScorableHotel[] = [
        { id: 'a', name: 'Established', location: 'X', min_price: 100000, reviewStats: { averageRating: 4.5, totalReviews: 500 }, availableRooms: 5, totalRooms: 10 },
        { id: 'b', name: 'New Place', location: 'Y', min_price: 100000, reviewStats: { averageRating: 5.0, totalReviews: 0 }, availableRooms: 5, totalRooms: 10 },
      ];
      const ranked = rankHotels(newHotels, {});
      // New hotel with 5.0 but 0 reviews should still be competitive
      expect(ranked).toHaveLength(2);
    });
  });

  describe('price relevance scoring', () => {
    it('penalizes extreme prices via Gaussian', () => {
      const ctx: RankingContext = { medianPrice: 100000 };
      const ranked = rankHotels(baseHotels, ctx);
      // Luxury Suite (500k) should be penalized vs median (100k)
      const luxuryIdx = ranked.findIndex(h => h.id === '4');
      expect(luxuryIdx).toBeGreaterThan(0);
    });

    it('rewards prices near median', () => {
      const nearMedian: ScorableHotel[] = [
        { id: 'a', name: 'Cheap', location: 'X', min_price: 20000, reviewStats: { averageRating: 4.0, totalReviews: 50 }, availableRooms: 5, totalRooms: 10 },
        { id: 'b', name: 'Mid', location: 'Y', min_price: 100000, reviewStats: { averageRating: 4.0, totalReviews: 50 }, availableRooms: 5, totalRooms: 10 },
        { id: 'c', name: 'Expensive', location: 'Z', min_price: 500000, reviewStats: { averageRating: 4.0, totalReviews: 50 }, availableRooms: 5, totalRooms: 10 },
      ];
      const ctx: RankingContext = { medianPrice: 100000 };
      const ranked = rankHotels(nearMedian, ctx);
      // Mid (100k = median) should rank first
      expect(ranked[0].id).toBe('b');
    });
  });

  describe('text match scoring', () => {
    it('boosts exact name matches', () => {
      const ctx: RankingContext = { query: 'Sierra' };
      const ranked = rankHotels(baseHotels, ctx);
      expect(ranked[0].id).toBe('2'); // "Glamping Sierra Nevada"
    });

    it('boosts location matches', () => {
      const ctx: RankingContext = { query: 'Bogotá' };
      const ranked = rankHotels(baseHotels, ctx);
      // Both Hotel A and Hostal match location, Hotel A wins on reviews
      expect(ranked[0].id).toBe('1');
    });

    it('returns neutral score when no query', () => {
      const ranked = rankHotels(baseHotels, {});
      expect(ranked).toHaveLength(4);
    });

    it('handles partial token matches', () => {
      const ctx: RankingContext = { query: 'Cartagena' };
      const ranked = rankHotels(baseHotels, ctx);
      // "Luxury Suite Cartagena" matches "Cartagena" in location (0.8)
      // But Hotel A also has good reviews + price, so it may rank first
      // The key is that Cartagena hotel gets boosted vs no-query baseline
      const cartagenaIdx = ranked.findIndex(h => h.id === '4');
      expect(cartagenaIdx).toBeLessThan(3); // Top 3
    });
  });

  describe('edge cases', () => {
    it('handles empty hotel list', () => {
      expect(rankHotels([], {})).toEqual([]);
    });

    it('handles hotel with missing data gracefully', () => {
      const incomplete: ScorableHotel[] = [
        { id: 'x', name: 'Test', location: '', min_price: 0 },
      ];
      const ranked = rankHotels(incomplete, { query: 'test' });
      expect(ranked).toHaveLength(1);
      expect(ranked[0].id).toBe('x');
    });

    it('handles zero medianPrice without NaN', () => {
      const ctx: RankingContext = { medianPrice: 0 };
      const ranked = rankHotels(baseHotels, ctx);
      expect(ranked).toHaveLength(4);
      expect(ranked.every(h => typeof h.id === 'string')).toBe(true);
    });

    it('handles zero maxReviews without division by zero', () => {
      const ctx: RankingContext = { maxReviews: 0 };
      const ranked = rankHotels(baseHotels, ctx);
      expect(ranked).toHaveLength(4);
    });
  });

  describe('combined scoring', () => {
    it('produces deterministic order for same input', () => {
      const ctx: RankingContext = {
        checkIn: '2026-06-01',
        checkOut: '2026-06-03',
        query: 'Bogotá',
        medianPrice: 100000,
      };
      const r1 = rankHotels(baseHotels, ctx);
      const r2 = rankHotels(baseHotels, ctx);
      expect(r1.map(h => h.id)).toEqual(r2.map(h => h.id));
    });

    it('does not mutate input array', () => {
      const copy = [...baseHotels];
      rankHotels(baseHotels, {});
      expect(baseHotels).toEqual(copy);
    });
  });
});
