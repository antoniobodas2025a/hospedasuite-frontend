/**
 * PRD-006 Map-First Discovery: Unit tests for map utilities and snap logic.
 *
 * Test areas:
 *   1. boundsChangedOverThreshold — bounds change detection
 *   2. boundsArea — bounds area computation
 *   3. serializeMapParams / deserializeMapParams — URL state roundtrip
 *   4. Snap point calculation — getSnapTargets + findNearestSnap
 *   5. useSharedMoveGuard — shared ref coordination between map components
 */
import { describe, it, expect, vi } from 'vitest';

/* ------------------------------------------------------------------ */
/*  Mock: React useCallback → identity (no React runtime needed)       */
/* ------------------------------------------------------------------ */
vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react');
  return { ...actual, useCallback: ((fn: () => void) => fn) as typeof actual.useCallback };
});

/* ------------------------------------------------------------------ */
/*  Mock: Leaflet LatLngBounds (just SW/NE accessor objects)          */
/* ------------------------------------------------------------------ */
vi.mock('leaflet', () => {
  function makeBounds(sw: [number, number], ne: [number, number]) {
    return {
      getSouthWest: () => ({ lat: sw[0], lng: sw[1] }),
      getNorthEast: () => ({ lat: ne[0], lng: ne[1] }),
    };
  }
  return {
    default: {
      latLngBounds: (sw: [number, number], ne: [number, number]) => makeBounds(sw, ne),
    },
  };
});

/* ------------------------------------------------------------------ */
/*  Imports (after mocks)                                             */
/* ------------------------------------------------------------------ */
import L from 'leaflet';

import {
  serializeMapParams,
  deserializeMapParams,
  boundsArea,
  boundsChangedOverThreshold,
  type MapState,
} from '@/lib/map-url-state';

import { getSnapTargets, findNearestSnap } from '@/components/ota/MapBottomSheet';

import { useSharedMoveGuard } from '@/lib/use-shared-move-guard';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Create a mock LatLngBounds with the given SW / NE corners. */
function b(sw: [number, number], ne: [number, number]): L.LatLngBounds {
  return L.latLngBounds(sw, ne) as unknown as L.LatLngBounds;
}

/* ================================================================== */
/*  Test Area 1: boundsChangedOverThreshold                           */
/* ================================================================== */
describe('boundsChangedOverThreshold', () => {
  const THRESHOLD = 0.2;

  it('returns false for identical bounds (0% change)', () => {
    const b1 = b([4.0, -75.0], [5.0, -74.0]);
    const b2 = b([4.0, -75.0], [5.0, -74.0]);
    expect(boundsChangedOverThreshold(b1, b2, THRESHOLD)).toBe(false);
  });

  it('returns false for change below threshold (10%)', () => {
    // b1 area = 1.0, b2 area = 1.1 → change = 0.1/1.1 ≈ 9.1%
    const b1 = b([4.0, -75.0], [5.0, -74.0]);
    const b2 = b([4.0, -75.0], [5.1, -73.9]);
    expect(boundsChangedOverThreshold(b1, b2, THRESHOLD)).toBe(false);
  });

  it('returns true for change above threshold (25%)', () => {
    // b1 area = 1.0, b2 area = 1.25 → change = 0.25/1.25 = 20% … at threshold = false
    // Use 30% to guarantee > threshold
    const b1 = b([4.0, -75.0], [5.0, -74.0]);
    const b2 = b([4.0, -75.0], [5.3, -73.7]);
    expect(boundsChangedOverThreshold(b1, b2, THRESHOLD)).toBe(true);
  });

  it('returns true for large change (50% above threshold)', () => {
    // area1 = 1.0, area2 = 2.0 → change = 1.0/2.0 = 50%
    const b1 = b([4.0, -75.0], [5.0, -74.0]);
    const b2 = b([3.0, -76.0], [5.0, -72.0]); // 2×2 = 4 deg²
    expect(boundsChangedOverThreshold(b1, b2, THRESHOLD)).toBe(true);
  });

  it('returns false when both bounds have zero area', () => {
    // area = 0
    const zero1 = b([4.0, -75.0], [4.0, -75.0]);
    const zero2 = b([4.0, -75.0], [4.0, -75.0]);
    expect(boundsChangedOverThreshold(zero1, zero2, THRESHOLD)).toBe(false);
  });

  it('returns true when one area is zero and other is non-zero', () => {
    const zero = b([4.0, -75.0], [4.0, -75.0]);
    const nonZero = b([4.0, -75.0], [5.0, -74.0]);
    expect(boundsChangedOverThreshold(zero, nonZero, THRESHOLD)).toBe(true);
    // Commutative
    expect(boundsChangedOverThreshold(nonZero, zero, THRESHOLD)).toBe(true);
  });
});

/* ================================================================== */
/*  Test Area 2: boundsArea                                           */
/* ================================================================== */
describe('boundsArea', () => {
  it('returns positive number for valid bounds', () => {
    const bounds = b([4.0, -75.0], [5.0, -74.0]);
    // (5-4) × (-74-(-75)) = 1 × 1 = 1 deg²
    expect(boundsArea(bounds)).toBeGreaterThan(0);
    expect(boundsArea(bounds)).toBeCloseTo(1.0, 10);
  });

  it('returns 0 for identical corners', () => {
    const point = b([4.61, -74.08], [4.61, -74.08]);
    expect(boundsArea(point)).toBe(0);
  });

  it('handles negative longitudes correctly', () => {
    // SW = (0, -120), NE = (10, -70)
    // (10-0) × (-70-(-120)) = 10 × 50 = 500 deg²
    const bounds = b([0, -120], [10, -70]);
    expect(boundsArea(bounds)).toBeCloseTo(500, 10);
  });

  it('handles bounds crossing the Equator', () => {
    // SW = (-5, -75), NE = (5, -74)
    // (5 - (-5)) × (-74 - (-75)) = 10 × 1 = 10
    const bounds = b([-5, -75], [5, -74]);
    expect(boundsArea(bounds)).toBeCloseTo(10, 10);
  });
});

/* ================================================================== */
/*  Test Area 3: serializeMapParams / deserializeMapParams             */
/* ================================================================== */
describe('map URL state serialization', () => {
  /* ---- Serialize ---- */
  describe('serializeMapParams', () => {
    it('serializes center + zoom to query string', () => {
      const state: MapState = { center: { lat: 4.6097, lng: -74.0817 }, zoom: 6 };
      const qs = serializeMapParams(state);
      expect(qs).toContain('lat=4.6097');
      expect(qs).toContain('lng=-74.0817');
      expect(qs).toContain('z=6');
    });

    it('includes bounds param when bounds are present', () => {
      const state: MapState = {
        center: { lat: 4.61, lng: -74.08 },
        zoom: 7,
        bounds: b([4.0, -75.0], [5.0, -74.0]),
      };
      const qs = serializeMapParams(state);
      // URLSearchParams encodes commas as %2C
      expect(qs).toContain('b=4.0000%2C-75.0000%2C5.0000%2C-74.0000');
    });

    it('uses 4 decimal places for coordinates', () => {
      const state: MapState = { center: { lat: 4.6097, lng: -74.0817 }, zoom: 6 };
      const qs = serializeMapParams(state);
      // 4.6097.toFixed(4) = "4.6097" → preserves all digits
      expect(qs).toMatch(/lat=4\.\d{4}/);
      expect(qs).toMatch(/lng=-74\.\d{4}/);
    });

    it('truncates extra decimal digits to 4 places', () => {
      const state: MapState = { center: { lat: 4.6097123, lng: -74.0817567 }, zoom: 6 };
      const qs = serializeMapParams(state);
      expect(qs).toContain('lat=4.6097');
      expect(qs).toContain('lng=-74.0818'); // rounded
    });
  });

  /* ---- Deserialize ---- */
  describe('deserializeMapParams', () => {
    it('roundtrip: serialize → deserialize returns same values', () => {
      const original: MapState = {
        center: { lat: 4.6097, lng: -74.0817 },
        zoom: 6,
        bounds: b([4.0, -75.0], [5.0, -74.0]),
      };
      const qs = serializeMapParams(original);
      const params = new URLSearchParams(qs);
      const restored = deserializeMapParams(params);

      expect(restored).not.toBeNull();
      expect(restored!.center.lat).toBeCloseTo(4.6097, 4);
      expect(restored!.center.lng).toBeCloseTo(-74.0817, 4);
      expect(restored!.zoom).toBe(6);
      // Bounds restoration
      expect(restored!.bounds).not.toBeNull();
      const sw = restored!.bounds!.getSouthWest();
      const ne = restored!.bounds!.getNorthEast();
      expect(sw.lat).toBeCloseTo(4.0, 4);
      expect(sw.lng).toBeCloseTo(-75.0, 4);
      expect(ne.lat).toBeCloseTo(5.0, 4);
      expect(ne.lng).toBeCloseTo(-74.0, 4);
    });

    it('roundtrip without bounds preserves center + zoom', () => {
      const original: MapState = { center: { lat: 4.6097, lng: -74.0817 }, zoom: 6 };
      const qs = serializeMapParams(original);
      const params = new URLSearchParams(qs);
      const restored = deserializeMapParams(params);

      expect(restored).not.toBeNull();
      expect(restored!.center.lat).toBeCloseTo(4.6097, 4);
      expect(restored!.center.lng).toBeCloseTo(-74.0817, 4);
      expect(restored!.zoom).toBe(6);
      expect(restored!.bounds).toBeNull();
    });

    it('returns null when required params are missing', () => {
      const params = new URLSearchParams('lat=4.6097'); // missing lng, z
      expect(deserializeMapParams(params)).toBeNull();

      const params2 = new URLSearchParams('lng=-74.0817'); // missing lat, z
      expect(deserializeMapParams(params2)).toBeNull();

      const params3 = new URLSearchParams('z=6'); // missing lat, lng
      expect(deserializeMapParams(params3)).toBeNull();
    });

    it('returns null for non-numeric params', () => {
      expect(deserializeMapParams(new URLSearchParams('lat=abc&lng=-74.0817&z=6'))).toBeNull();
      expect(deserializeMapParams(new URLSearchParams('lat=4.6097&lng=xyz&z=6'))).toBeNull();
      expect(deserializeMapParams(new URLSearchParams('lat=4.6097&lng=-74.0817&z=abc'))).toBeNull();
    });

    it('returns null for empty URLSearchParams', () => {
      expect(deserializeMapParams(new URLSearchParams(''))).toBeNull();
    });

    it('handles bounds param with < 4 values gracefully', () => {
      const params = new URLSearchParams('lat=4.6097&lng=-74.0817&z=6&b=1,2');
      const restored = deserializeMapParams(params);
      expect(restored).not.toBeNull();
      // Bounds should be null because parts.length !== 4
      expect(restored!.bounds).toBeNull();
    });

    it('handles bounds param with non-numeric values', () => {
      const params = new URLSearchParams('lat=4.6097&lng=-74.0817&z=6&b=1,2,hello,4');
      const restored = deserializeMapParams(params);
      expect(restored).not.toBeNull();
      // Bounds should be null because not all parts are numeric
      expect(restored!.bounds).toBeNull();
    });
  });
});

/* ================================================================== */
/*  Test Area 4: Snap point calculation (MapBottomSheet)               */
/* ================================================================== */
describe('snap point calculation', () => {
  describe('getSnapTargets', () => {
    it('returns 3 snap targets for 800px viewport', () => {
      // expanded=0, partial=240 (0.3×800), collapsed=420 (0.6×800 - 60)
      const [expanded, partial, collapsed] = getSnapTargets(800);

      expect(expanded).toBe(0);
      expect(partial).toBe(240);
      expect(collapsed).toBe(420);
    });

    it('returns 3 snap targets for 1024px viewport', () => {
      // expanded=0, partial=307 (0.3×1024), collapsed=max(554, 60)=554
      const [expanded, partial, collapsed] = getSnapTargets(1024);

      expect(expanded).toBe(0);
      expect(partial).toBe(307);
      expect(collapsed).toBeGreaterThan(partial);
    });

    it('collapsed snap never falls below SNAP_COLLAPSED_HEIGHT (60px)', () => {
      // For a very small viewport (e.g. 200px)
      const [, , collapsed] = getSnapTargets(200);
      // 0.6 * 200 - 60 = 60, Math.max(60, 60) = 60
      expect(collapsed).toBeGreaterThanOrEqual(60);
    });

    it('expanded is always 0', () => {
      expect(getSnapTargets(400)[0]).toBe(0);
      expect(getSnapTargets(1080)[0]).toBe(0);
    });
  });

  describe('findNearestSnap', () => {
    const snaps800 = getSnapTargets(800); // [0, 240, 420]

    it('snaps to expanded when y is near 0', () => {
      expect(findNearestSnap(10, 0, snaps800)).toBe(0);
      expect(findNearestSnap(50, 0, snaps800)).toBe(0);
    });

    it('snaps to partial when y is near 240', () => {
      expect(findNearestSnap(200, 0, snaps800)).toBe(1);
      expect(findNearestSnap(240, 0, snaps800)).toBe(1);
    });

    it('snaps to collapsed when y is near 420', () => {
      expect(findNearestSnap(400, 0, snaps800)).toBe(2);
      expect(findNearestSnap(420, 0, snaps800)).toBe(2);
    });

    it('velocity biases snap toward the direction of movement', () => {
      // Start at partial (240), fast downward swipe → projected beyond partial
      // projectedY = 240 + (500 × 0.15) = 315 → nearest to [0,240,420]
      // dists: 315, 75, 105 → nearest is 240 (partial)
      // Need stronger: y=350 + velocity 500 → projectedY = 350+75 = 425
      // dists: 425, 185, 5 → nearest is 420 (collapsed)
      expect(findNearestSnap(350, 500, snaps800)).toBe(2);
    });

    it('drag 200px from expanded snaps to partial', () => {
      // Start at expanded (y=0), drag 200px → totalY=200, velocity=0
      // dists: 200, 40, 220 → nearest is 240 (partial, index 1)
      expect(findNearestSnap(200, 0, snaps800)).toBe(1);
    });

    it('handles extreme velocity (fast downward fling → collapsed)', () => {
      // y=300, velocity=2000 → projectedY = 300 + 300 = 600
      // dists: 600, 360, 180 → nearest is 420 (collapsed, index 2)
      expect(findNearestSnap(300, 2000, snaps800)).toBe(2);
    });
  });
});

/* ================================================================== */
/*  Test Area 5: useSharedMoveGuard                                   */
/* ================================================================== */
describe('useSharedMoveGuard', () => {
  it('initial state is false', () => {
    const { isInternalMove } = useSharedMoveGuard();
    expect(isInternalMove.current).toBe(false);
  });

  it('setInternalMove sets the flag to true', () => {
    const { isInternalMove, setInternalMove } = useSharedMoveGuard();
    setInternalMove();
    expect(isInternalMove.current).toBe(true);
  });

  it('clearInternalMove sets the flag back to false', () => {
    const { isInternalMove, setInternalMove, clearInternalMove } = useSharedMoveGuard();
    setInternalMove();
    expect(isInternalMove.current).toBe(true);
    clearInternalMove();
    expect(isInternalMove.current).toBe(false);
  });

  it('multiple consumers share the same ref (singleton)', () => {
    const consumer1 = useSharedMoveGuard();
    const consumer2 = useSharedMoveGuard();

    // Both see same initial state
    expect(consumer1.isInternalMove.current).toBe(false);
    expect(consumer2.isInternalMove.current).toBe(false);

    // Consumer 1 sets it
    consumer1.setInternalMove();

    // Consumer 2 sees it
    expect(consumer2.isInternalMove.current).toBe(true);

    // Consumer 2 clears it
    consumer2.clearInternalMove();

    // Consumer 1 sees it cleared
    expect(consumer1.isInternalMove.current).toBe(false);
  });

  it('consecutive set/clear cycles work correctly', () => {
    const { isInternalMove, setInternalMove, clearInternalMove } = useSharedMoveGuard();

    setInternalMove();
    expect(isInternalMove.current).toBe(true);
    clearInternalMove();
    expect(isInternalMove.current).toBe(false);

    setInternalMove();
    setInternalMove(); // double set → still true
    expect(isInternalMove.current).toBe(true);
    clearInternalMove();
    expect(isInternalMove.current).toBe(false);
  });
});
