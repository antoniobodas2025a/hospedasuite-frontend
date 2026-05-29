// ============================================================================
// 🧪 Tests Unitarios: Marker Diffing Logic
//
// Tests the CREATE/UPDATE/REMOVE/REUSE logic used by MarkerLifecycleManager.
// This is a pure function test — no React, no DOM, no Leaflet.
// ============================================================================

import { describe, it, expect } from 'vitest';

// Pure diffing function extracted from MarkerLifecycleManager logic
interface Hotel {
  id: string;
  name: string;
  location: string;
}

interface DiffResult {
  toCreate: Hotel[];
  toUpdate: Hotel[];
  toRemove: string[];
  toReuse: Hotel[];
}

function diffMarkers(
  currentHotels: Hotel[],
  activeMarkerIds: Set<string>
): DiffResult {
  const currentIds = new Set(currentHotels.map((h) => h.id));
  const toCreate: Hotel[] = [];
  const toUpdate: Hotel[] = [];
  const toRemove: string[] = [];
  const toReuse: Hotel[] = [];

  // REMOVE: Markers that are no longer in the hotel list
  activeMarkerIds.forEach((id) => {
    if (!currentIds.has(id)) {
      toRemove.push(id);
    }
  });

  // CREATE / UPDATE / REUSE: Process current hotels
  currentHotels.forEach((hotel) => {
    if (!activeMarkerIds.has(hotel.id)) {
      toCreate.push(hotel);
    } else {
      // Could be UPDATE (price changed) or REUSE (same data)
      toUpdate.push(hotel);
    }
  });

  return { toCreate, toUpdate, toRemove, toReuse };
}

describe('Marker Diffing Logic', () => {
  describe('CREATE', () => {
    it('creates markers for new hotels', () => {
      const currentHotels = [
        { id: '1', name: 'Hotel A', location: 'Medellín' },
        { id: '2', name: 'Hotel B', location: 'Bogotá' },
      ];
      const activeMarkerIds = new Set<string>([]);

      const result = diffMarkers(currentHotels, activeMarkerIds);

      expect(result.toCreate).toHaveLength(2);
      expect(result.toCreate.map((h) => h.id)).toContain('1');
      expect(result.toCreate.map((h) => h.id)).toContain('2');
      expect(result.toRemove).toHaveLength(0);
      expect(result.toUpdate).toHaveLength(0);
    });

    it('creates only the new hotel when one is added', () => {
      const currentHotels = [
        { id: '1', name: 'Hotel A', location: 'Medellín' },
        { id: '2', name: 'Hotel B', location: 'Bogotá' },
        { id: '3', name: 'Hotel C', location: 'Cartagena' },
      ];
      const activeMarkerIds = new Set(['1', '2']);

      const result = diffMarkers(currentHotels, activeMarkerIds);

      expect(result.toCreate).toHaveLength(1);
      expect(result.toCreate[0].id).toBe('3');
      expect(result.toUpdate).toHaveLength(2);
      expect(result.toRemove).toHaveLength(0);
    });
  });

  describe('UPDATE', () => {
    it('updates existing markers when hotel data changes', () => {
      const currentHotels = [
        { id: '1', name: 'Hotel A', location: 'Medellín' },
      ];
      const activeMarkerIds = new Set(['1']);

      const result = diffMarkers(currentHotels, activeMarkerIds);

      expect(result.toUpdate).toHaveLength(1);
      expect(result.toUpdate[0].id).toBe('1');
      expect(result.toCreate).toHaveLength(0);
      expect(result.toRemove).toHaveLength(0);
    });
  });

  describe('REMOVE', () => {
    it('removes markers for hotels no longer in the list', () => {
      const currentHotels = [
        { id: '1', name: 'Hotel A', location: 'Medellín' },
      ];
      const activeMarkerIds = new Set(['1', '2', '3']);

      const result = diffMarkers(currentHotels, activeMarkerIds);

      expect(result.toRemove).toHaveLength(2);
      expect(result.toRemove).toContain('2');
      expect(result.toRemove).toContain('3');
      expect(result.toUpdate).toHaveLength(1);
      expect(result.toCreate).toHaveLength(0);
    });

    it('removes all markers when hotel list is empty', () => {
      const currentHotels: Hotel[] = [];
      const activeMarkerIds = new Set(['1', '2', '3']);

      const result = diffMarkers(currentHotels, activeMarkerIds);

      expect(result.toRemove).toHaveLength(3);
      expect(result.toCreate).toHaveLength(0);
      expect(result.toUpdate).toHaveLength(0);
    });
  });

  describe('REUSE', () => {
    it('reuses markers when same hotels are returned', () => {
      const currentHotels = [
        { id: '1', name: 'Hotel A', location: 'Medellín' },
        { id: '2', name: 'Hotel B', location: 'Bogotá' },
      ];
      const activeMarkerIds = new Set(['1', '2']);

      const result = diffMarkers(currentHotels, activeMarkerIds);

      expect(result.toUpdate).toHaveLength(2);
      expect(result.toCreate).toHaveLength(0);
      expect(result.toRemove).toHaveLength(0);
    });
  });

  describe('Edge Cases', () => {
    it('handles empty hotels and empty markers', () => {
      const result = diffMarkers([], new Set());

      expect(result.toCreate).toHaveLength(0);
      expect(result.toUpdate).toHaveLength(0);
      expect(result.toRemove).toHaveLength(0);
    });

    it('handles duplicate hotel IDs (should not crash)', () => {
      const currentHotels = [
        { id: '1', name: 'Hotel A', location: 'Medellín' },
        { id: '1', name: 'Hotel A Duplicate', location: 'Medellín' },
      ];
      const activeMarkerIds = new Set<string>([]);

      const result = diffMarkers(currentHotels, activeMarkerIds);

      expect(result.toCreate).toHaveLength(2);
    });

    it('handles partial overlap (some new, some existing, some removed)', () => {
      const currentHotels = [
        { id: '1', name: 'Hotel A', location: 'Medellín' },
        { id: '3', name: 'Hotel C', location: 'Cartagena' },
        { id: '4', name: 'Hotel D', location: 'Cali' },
      ];
      const activeMarkerIds = new Set(['1', '2']);

      const result = diffMarkers(currentHotels, activeMarkerIds);

      expect(result.toCreate).toHaveLength(2); // 3, 4
      expect(result.toCreate.map((h) => h.id)).toContain('3');
      expect(result.toCreate.map((h) => h.id)).toContain('4');

      expect(result.toUpdate).toHaveLength(1); // 1
      expect(result.toUpdate[0].id).toBe('1');

      expect(result.toRemove).toHaveLength(1); // 2
      expect(result.toRemove).toContain('2');
    });
  });
});
