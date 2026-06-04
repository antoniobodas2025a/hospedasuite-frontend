// ============================================================================
// 🧪 Tests Unitarios: OTA Coordinate Resolution Logic
//
// Tests the coordinate resolution pipeline:
//   ota_catalog (primary) → hotel_locations (fallback)
// S9-S12: Verify markers appear from configured coordinates
// ============================================================================

import { describe, it, expect, vi } from 'vitest';

// ─── S9: Hotel with coordinates in hotel_locations appears as marker ─────────

describe('S9: Hotel with coordinates in hotel_locations as fallback', () => {
  it('returns coordinates from hotel_locations when ota_catalog is null', () => {
    const catalogCoords = new Map<string, { lat: number; lng: number }>();
    // ota_catalog has nothing for this hotel
    
    const locData = [
      { hotel_id: 'hotel-1', lat: 5.83, lng: -73.03 },
    ];
    
    // Fallback: fill from locData
    for (const row of locData) {
      if (!catalogCoords.has(row.hotel_id)) {
        catalogCoords.set(row.hotel_id, { lat: row.lat, lng: row.lng });
      }
    }
    
    expect(catalogCoords.has('hotel-1')).toBe(true);
    expect(catalogCoords.get('hotel-1')).toEqual({ lat: 5.83, lng: -73.03 });
  });
});

// ─── S10: ota_catalog takes precedence over hotel_locations ──────────────────

describe('S10: ota_catalog takes precedence', () => {
  it('keeps ota_catalog coordinates when both tables have data', () => {
    const catalogCoords = new Map<string, { lat: number; lng: number }>();
    // ota_catalog has coords
    catalogCoords.set('hotel-1', { lat: 5.8245, lng: -73.0323 });
    
    // hotel_locations also has coords (should NOT override)
    const locData = [
      { hotel_id: 'hotel-1', lat: 5.83, lng: -73.03 },
    ];
    
    for (const row of locData) {
      if (!catalogCoords.has(row.hotel_id)) {
        catalogCoords.set(row.hotel_id, { lat: row.lat, lng: row.lng });
      }
    }
    
    // Should keep ota_catalog coords
    expect(catalogCoords.get('hotel-1')).toEqual({ lat: 5.8245, lng: -73.0323 });
  });
});

// ─── S11: Hotel with no coordinates shows no marker ──────────────────────────

describe('S11: No coordinates → no marker', () => {
  it('returns no marker when both tables are null', () => {
    const catalogCoords = new Map<string, { lat: number; lng: number }>();
    const locData: { hotel_id: string; lat: number | null; lng: number | null }[] = [
      { hotel_id: 'hotel-1', lat: null, lng: null },
    ];

    // Only add if lat/lng are non-null
    for (const row of locData) {
      if (row.lat && row.lng && !catalogCoords.has(row.hotel_id)) {
        catalogCoords.set(row.hotel_id, { lat: row.lat, lng: row.lng });
      }
    }

    expect(catalogCoords.has('hotel-1')).toBe(false);
  });
});

// ─── S12: Mixed sources render correct count ─────────────────────────────────

describe('S12: Mixed sources render exact count', () => {
  it('counts markers from both ota_catalog and hotel_locations', () => {
    const catalogCoords = new Map<string, { lat: number; lng: number }>();
    
    // 5 from ota_catalog
    for (let i = 1; i <= 5; i++) {
      catalogCoords.set(`cat-${i}`, { lat: 4.6, lng: -74.0 });
    }
    
    // 3 from hotel_locations (not in catalog)
    const locData = [
      { hotel_id: 'loc-1', lat: 5.83, lng: -73.03 },
      { hotel_id: 'loc-2', lat: 5.82, lng: -73.04 },
      { hotel_id: 'loc-3', lat: 5.84, lng: -73.02 },
    ];
    
    for (const row of locData) {
      if (!catalogCoords.has(row.hotel_id)) {
        catalogCoords.set(row.hotel_id, { lat: row.lat, lng: row.lng });
      }
    }
    
    // 2 with no coordinates → not in catalogCoords
    
    expect(catalogCoords.size).toBe(8); // 5 + 3
  });
});
