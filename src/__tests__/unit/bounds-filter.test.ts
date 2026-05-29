// ============================================================================
// 🧪 Tests Unitarios: Bounds Filter Utility
//
// Tests filterHotelsByBounds, isHotelInBounds, and getBoundsFilterSummary.
// Uses GeoCacheManager to resolve hotel coordinates.
// ============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  filterHotelsByBounds,
  isHotelInBounds,
  getBoundsFilterSummary,
  BoundsFilterResult,
} from '@/lib/bounds-filter';
import * as geoCache from '@/lib/geo-cache';

// Mock GeoCacheManager
vi.mock('@/lib/geo-cache', () => ({
  getCachedCoords: vi.fn(),
}));

// Mock Leaflet LatLngBounds
const mockLatLngBounds = {
  contains: vi.fn(),
};

vi.mock('leaflet', () => ({
  default: {
    latLngBounds: () => mockLatLngBounds,
  },
}));

describe('Bounds Filter Utility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLatLngBounds.contains.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const createBounds = (containsFn: (coords: [number, number]) => boolean) => {
    mockLatLngBounds.contains.mockImplementation((coords: [number, number]) => containsFn(coords));
    return mockLatLngBounds as any;
  };

  describe('filterHotelsByBounds', () => {
    it('returns all hotels when all are within bounds', () => {
      vi.mocked(geoCache.getCachedCoords).mockImplementation((query: string) => {
        if (query === 'Medellín') return { lat: 6.2442, lng: -75.5812, displayName: 'Medellín' };
        if (query === 'Bogotá') return { lat: 4.6097, lng: -74.0817, displayName: 'Bogotá' };
        return null;
      });

      const hotels = [
        { id: '1', location: 'Medellín' },
        { id: '2', location: 'Bogotá' },
      ];

      // Bounds covering both cities
      const bounds = createBounds(() => true);
      const result = filterHotelsByBounds(hotels, bounds);

      expect(result.visibleCount).toBe(2);
      expect(result.outsideCount).toBe(0);
      expect(result.unresolvableIds.size).toBe(0);
      expect(result.visibleIds.has('1')).toBe(true);
      expect(result.visibleIds.has('2')).toBe(true);
    });

    it('filters out hotels outside bounds', () => {
      vi.mocked(geoCache.getCachedCoords).mockImplementation((query: string) => {
        if (query === 'Medellín') return { lat: 6.2442, lng: -75.5812, displayName: 'Medellín' };
        if (query === 'Cartagena') return { lat: 10.3910, lng: -75.5144, displayName: 'Cartagena' };
        return null;
      });

      const hotels = [
        { id: '1', location: 'Medellín' },
        { id: '2', location: 'Cartagena' },
      ];

      // Bounds covering only Medellín
      const bounds = createBounds(([lat]) => lat >= 5 && lat <= 7);
      const result = filterHotelsByBounds(hotels, bounds);

      expect(result.visibleCount).toBe(1);
      expect(result.outsideCount).toBe(1);
      expect(result.visibleIds.has('1')).toBe(true);
      expect(result.visibleIds.has('2')).toBe(false);
    });

    it('marks hotels without coords as unresolvable', () => {
      vi.mocked(geoCache.getCachedCoords).mockReturnValue(null);

      const hotels = [
        { id: '1', location: 'UnknownCity' },
        { id: '2', location: 'AnotherUnknown' },
      ];

      const bounds = createBounds(() => true);
      const result = filterHotelsByBounds(hotels, bounds);

      expect(result.visibleCount).toBe(0);
      expect(result.outsideCount).toBe(0);
      expect(result.unresolvableIds.size).toBe(2);
      expect(result.unresolvableIds.has('1')).toBe(true);
      expect(result.unresolvableIds.has('2')).toBe(true);
    });

    it('handles empty hotel list', () => {
      const bounds = createBounds(() => true);
      const result = filterHotelsByBounds([], bounds);

      expect(result.visibleCount).toBe(0);
      expect(result.outsideCount).toBe(0);
      expect(result.unresolvableIds.size).toBe(0);
      expect(result.total).toBe(0);
    });

    it('tries address when location is not resolvable', () => {
      vi.mocked(geoCache.getCachedCoords).mockImplementation((query: string) => {
        if (query === 'UnknownLocation') return null;
        if (query === 'Calle 10 #5-20, Medellín') return { lat: 6.2442, lng: -75.5812, displayName: 'Address' };
        return null;
      });

      const hotels = [
        { id: '1', location: 'UnknownLocation', address: 'Calle 10 #5-20, Medellín' },
      ];

      const bounds = createBounds(() => true);
      const result = filterHotelsByBounds(hotels, bounds);

      expect(result.visibleCount).toBe(1);
      expect(result.unresolvableIds.size).toBe(0);
    });

    it('handles mixed resolvable and unresolvable hotels', () => {
      vi.mocked(geoCache.getCachedCoords).mockImplementation((query: string) => {
        if (query === 'Medellín') return { lat: 6.2442, lng: -75.5812, displayName: 'Medellín' };
        return null;
      });

      const hotels = [
        { id: '1', location: 'Medellín' },
        { id: '2', location: 'UnknownCity' },
        { id: '3', location: 'Medellín' },
      ];

      const bounds = createBounds(() => true);
      const result = filterHotelsByBounds(hotels, bounds);

      expect(result.visibleCount).toBe(2);
      expect(result.outsideCount).toBe(0);
      expect(result.unresolvableIds.size).toBe(1);
      expect(result.unresolvableIds.has('2')).toBe(true);
    });
  });

  describe('isHotelInBounds', () => {
    it('returns true when hotel is within bounds', () => {
      vi.mocked(geoCache.getCachedCoords).mockReturnValue({ lat: 6.2442, lng: -75.5812, displayName: 'Medellín' });

      const hotel = { id: '1', location: 'Medellín' };
      const bounds = createBounds(() => true);
      const result = isHotelInBounds(hotel, bounds);

      expect(result).toBe(true);
    });

    it('returns false when hotel is outside bounds', () => {
      vi.mocked(geoCache.getCachedCoords).mockReturnValue({ lat: 6.2442, lng: -75.5812, displayName: 'Medellín' });

      const hotel = { id: '1', location: 'Medellín' };
      const bounds = createBounds(() => false);
      const result = isHotelInBounds(hotel, bounds);

      expect(result).toBe(false);
    });

    it('returns null when hotel coords cannot be resolved', () => {
      vi.mocked(geoCache.getCachedCoords).mockReturnValue(null);

      const hotel = { id: '1', location: 'UnknownCity' };
      const bounds = createBounds(() => true);
      const result = isHotelInBounds(hotel, bounds);

      expect(result).toBeNull();
    });
  });

  describe('getBoundsFilterSummary', () => {
    it('returns "all visible" message when all hotels are in bounds', () => {
      const result: BoundsFilterResult = {
        visibleIds: new Set(['1', '2', '3']),
        unresolvableIds: new Set(),
        total: 3,
        visibleCount: 3,
        outsideCount: 0,
      };

      const summary = getBoundsFilterSummary(result);
      expect(summary).toContain('Todos los alojamientos visibles');
    });

    it('returns count message when some hotels are filtered', () => {
      const result: BoundsFilterResult = {
        visibleIds: new Set(['1', '2']),
        unresolvableIds: new Set(),
        total: 5,
        visibleCount: 2,
        outsideCount: 3,
      };

      const summary = getBoundsFilterSummary(result);
      expect(summary).toContain('2 de 5 alojamientos en esta zona');
    });

    it('handles all unresolvable hotels', () => {
      const result: BoundsFilterResult = {
        visibleIds: new Set(),
        unresolvableIds: new Set(['1', '2', '3']),
        total: 3,
        visibleCount: 0,
        outsideCount: 0,
      };

      const summary = getBoundsFilterSummary(result);
      expect(summary).toContain('No se pueden filtrar por ubicación');
    });

    it('excludes unresolvable from total in summary', () => {
      const result: BoundsFilterResult = {
        visibleIds: new Set(['1']),
        unresolvableIds: new Set(['2', '3']),
        total: 3,
        visibleCount: 1,
        outsideCount: 0,
      };

      const summary = getBoundsFilterSummary(result);
      // When all resolvable hotels are visible, shows "Todos los alojamientos visibles"
      expect(summary).toContain('Todos los alojamientos visibles');
    });
  });
});
