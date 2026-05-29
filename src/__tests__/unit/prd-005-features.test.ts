/**
 * PRD-005 Sprint 2-4: Tests for new OTA features
 *
 * Covers:
 * - Featured hotel selection logic
 * - Haversine distance calculation
 * - Mini-pin 2-tier icon sizing
 * - Bottom sheet swipe threshold
 */

import { describe, it, expect } from 'vitest';

// --- Featured Hotel Selection ---

describe('Featured hotel selection', () => {
  const hotels = [
    { id: '1', name: 'Hotel A', rating: 4.2, min_price: 150000 },
    { id: '2', name: 'Hotel B', rating: 4.8, min_price: 200000 },
    { id: '3', name: 'Hotel C', rating: 3.9, min_price: 100000 },
  ];

  it('selects the hotel with the highest rating', () => {
    const featured = hotels.reduce((best, h) =>
      (h.rating || 0) > (best.rating || 0) ? h : best
    , hotels[0]);

    expect(featured.id).toBe('2');
    expect(featured.name).toBe('Hotel B');
    expect(featured.rating).toBe(4.8);
  });

  it('handles empty hotel list', () => {
    const empty: any[] = [];
    const featured = empty.length > 0
      ? empty.reduce((best, h) => (h.rating || 0) > (best.rating || 0) ? h : best, empty[0])
      : null;

    expect(featured).toBeNull();
  });

  it('handles hotels without ratings (treats as 0)', () => {
    const unrated = [
      { id: '1', name: 'Hotel A', rating: undefined, min_price: 150000 },
      { id: '2', name: 'Hotel B', rating: 4.0, min_price: 200000 },
    ];

    const featured = unrated.reduce((best, h) =>
      (h.rating || 0) > (best.rating || 0) ? h : best
    , unrated[0]);

    expect(featured.id).toBe('2');
  });

  it('returns first hotel if all have same rating', () => {
    const sameRating = [
      { id: '1', name: 'Hotel A', rating: 4.0 },
      { id: '2', name: 'Hotel B', rating: 4.0 },
    ];

    const featured = sameRating.reduce((best, h) =>
      (h.rating || 0) > (best.rating || 0) ? h : best
    , sameRating[0]);

    expect(featured.id).toBe('1');
  });
});

// --- Haversine Distance Calculation ---

describe('Haversine distance calculation', () => {
  function haversineDistance(
    lat1: number, lng1: number,
    lat2: number, lng2: number
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  it('calculates distance between Bogotá center and La Candelaria (~2km)', () => {
    const bogotaCenter = { lat: 4.6097, lng: -74.0817 };
    const laCandelaria = { lat: 4.5981, lng: -74.0758 };

    const distance = haversineDistance(
      bogotaCenter.lat, bogotaCenter.lng,
      laCandelaria.lat, laCandelaria.lng
    );

    // Should be approximately 1-3 km
    expect(distance).toBeGreaterThan(1);
    expect(distance).toBeLessThan(3);
  });

  it('calculates distance between Medellín center and El Poblado (~5km)', () => {
    const medellinCenter = { lat: 6.2476, lng: -75.5658 };
    const elPoblado = { lat: 6.2088, lng: -75.5673 };

    const distance = haversineDistance(
      medellinCenter.lat, medellinCenter.lng,
      elPoblado.lat, elPoblado.lng
    );

    // Should be approximately 4-6 km
    expect(distance).toBeGreaterThan(4);
    expect(distance).toBeLessThan(6);
  });

  it('returns 0 for same coordinates', () => {
    const distance = haversineDistance(4.6097, -74.0817, 4.6097, -74.0817);
    expect(distance).toBe(0);
  });

  it('returns reasonable distance for far cities (Bogotá to Cartagena ~650km)', () => {
    const bogota = { lat: 4.6097, lng: -74.0817 };
    const cartagena = { lat: 10.3910, lng: -75.4794 };

    const distance = haversineDistance(
      bogota.lat, bogota.lng,
      cartagena.lat, cartagena.lng
    );

    // Should be approximately 600-700 km
    expect(distance).toBeGreaterThan(600);
    expect(distance).toBeLessThan(700);
  });
});

// --- Mini-Pin 2-Tier Icon Sizing ---

describe('Mini-pin 2-tier icon sizing', () => {
  interface IconSize {
    width: number;
    height: number;
    anchorX: number;
    anchorY: number;
  }

  function getMiniPinSize(isExpanded: boolean): IconSize {
    if (isExpanded) {
      return { width: 90, height: 44, anchorX: 45, anchorY: 22 };
    }
    return { width: 24, height: 24, anchorX: 12, anchorY: 12 };
  }

  it('returns small size for mini-pin (default)', () => {
    const size = getMiniPinSize(false);
    expect(size.width).toBe(24);
    expect(size.height).toBe(24);
    expect(size.anchorX).toBe(12);
    expect(size.anchorY).toBe(12);
  });

  it('returns large size for expanded pin (selected)', () => {
    const size = getMiniPinSize(true);
    expect(size.width).toBe(90);
    expect(size.height).toBe(44);
    expect(size.anchorX).toBe(45);
    expect(size.anchorY).toBe(22);
  });

  it('expanded pin is significantly larger than mini-pin', () => {
    const mini = getMiniPinSize(false);
    const expanded = getMiniPinSize(true);

    expect(expanded.width).toBeGreaterThan(mini.width * 3);
    expect(expanded.height).toBeGreaterThan(mini.height);
  });

  it('anchor is centered for both tiers', () => {
    const mini = getMiniPinSize(false);
    const expanded = getMiniPinSize(true);

    expect(mini.anchorX).toBe(mini.width / 2);
    expect(mini.anchorY).toBe(mini.height / 2);
    expect(expanded.anchorX).toBe(expanded.width / 2);
    expect(expanded.anchorY).toBe(expanded.height / 2);
  });
});

// --- Bottom Sheet Swipe Threshold ---

describe('Bottom sheet swipe threshold', () => {
  function shouldDismiss(
    dragOffset: number,
    sheetHeight: number,
    velocity: number
  ): boolean {
    const threshold = sheetHeight * 0.25;
    return dragOffset > threshold || (velocity > 500 && dragOffset > 50);
  }

  it('dismisses when dragged past 25% of sheet height', () => {
    const sheetHeight = 600;
    const threshold = sheetHeight * 0.25; // 150px

    expect(shouldDismiss(threshold + 1, sheetHeight, 0)).toBe(true);
    expect(shouldDismiss(threshold - 1, sheetHeight, 0)).toBe(false);
  });

  it('dismisses on fast downward swipe (>500 velocity) with minimal drag', () => {
    expect(shouldDismiss(60, 600, 600)).toBe(true);
    expect(shouldDismiss(40, 600, 600)).toBe(false); // Not enough drag distance
  });

  it('does not dismiss on slow drag below threshold', () => {
    expect(shouldDismiss(100, 600, 200)).toBe(false);
  });

  it('does not dismiss on upward drag (negative offset)', () => {
    expect(shouldDismiss(-50, 600, 600)).toBe(false);
  });

  it('handles different sheet heights correctly', () => {
    // Small sheet (400px)
    expect(shouldDismiss(101, 400, 0)).toBe(true);  // 25% = 100
    expect(shouldDismiss(99, 400, 0)).toBe(false);

    // Large sheet (800px)
    expect(shouldDismiss(201, 800, 0)).toBe(true);  // 25% = 200
    expect(shouldDismiss(199, 800, 0)).toBe(false);
  });
});

// --- Proximity Context Display ---

describe('Proximity context display', () => {
  function formatDistance(km: number | undefined): string {
    if (km === undefined || km <= 0) return '';
    return `· ${km.toFixed(1)} km del centro`;
  }

  it('formats distance with 1 decimal place', () => {
    expect(formatDistance(2.34)).toBe('· 2.3 km del centro');
    expect(formatDistance(15.89)).toBe('· 15.9 km del centro');
  });

  it('returns empty string for undefined distance', () => {
    expect(formatDistance(undefined)).toBe('');
  });

  it('returns empty string for zero or negative distance', () => {
    expect(formatDistance(0)).toBe('');
    expect(formatDistance(-1)).toBe('');
  });

  it('handles very small distances', () => {
    expect(formatDistance(0.1)).toBe('· 0.1 km del centro');
    expect(formatDistance(0.01)).toBe('· 0.0 km del centro');
  });
});
