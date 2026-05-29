# PRD-004: OTA Search-Map Integration & Testing

**Status**: Draft  
**Created**: 2026-05-28  
**Parent**: PRD-003 (Search ↔ Map Interaction)  
**Priority**: High  

---

## 1. Executive Summary

PRD-003 delivered the foundational map components (MarkerLifecycleManager, MapTransitionController, MapSearchSync, UI polish). PRD-004 closes the loop by integrating these components with the live OTADashboard state, adding bounds-based hotel filtering, mobile map-sheet integration, and test coverage.

**Goal**: A fully interactive, production-ready map experience where search ↔ map ↔ mobile sheet work as one coherent system.

---

## 2. Current State Analysis

### What Works
| Component | Status | Notes |
|-----------|--------|-------|
| `HotelMapView` | ✅ Renders | Shows markers, clusters, popups |
| `MarkerLifecycleManager` | ✅ CRUD | Diffing, geocoding, race protection |
| `MapTransitionController` | ✅ Animations | flyTo, fitBounds with spring easing |
| `MapSearchSync` | ✅ Sync | Bidirectional search ↔ map state |
| `map.css` | ✅ Polish | Glassmorphism, spring animations |

### What's Missing
| Gap | Impact | Priority |
|-----|--------|----------|
| Map doesn't receive real hotel data from OTADashboard | High: Map shows stale props | P0 |
| No bounds-based filtering | Medium: Can't "search this area" | P1 |
| Mobile sheet doesn't integrate with map view | Medium: Mobile UX fragmented | P1 |
| Zero test coverage for map components | High: Regression risk | P0 |

---

## 3. Architecture

### 3.1 Data Flow (Current vs Target)

**Current** (broken):
```
OTADashboard ──hotels──> HotelMapView (static props, no sync)
```

**Target** (fully integrated):
```
OTADashboard
├── hotels (state) ──> HotelMapView ──> MarkerLifecycleManager
├── centerLocation ──> MapTransitionController ──> flyTo
├── onMapBoundsChange ──> client-side bounds filter
├── onSearchAreaChange ──> update URL location param
└── MobileSearchSheet ──> onSearch ──> update hotels state
```

### 3.2 Component Responsibility Matrix

| Component | Owns | Receives | Emits |
|-----------|------|----------|-------|
| `OTADashboard` | hotels state, URL params | — | `setHotels`, `router.push` |
| `HotelMapView` | loading state, map container | hotels, centerLocation | `onMapBoundsChange`, `onSearchAreaChange` |
| `MarkerLifecycleManager` | marker refs, cluster group | hotels | `onGeocodingProgress`, `onMarkersReady` |
| `MapTransitionController` | lastHotelIds ref | hotels, centerLocation | — (side effects on map) |
| `MapSearchSync` | move listeners, reverse geocoding | searchLocation | `onMapBoundsChange`, `onSearchAreaChange` |
| `MobileSearchSheet` | form state (location, dates, guests) | isOpen, onSearch | `onSearch(filters)`, `onClose` |

---

## 4. Requirements

### 4.1 Integration with OTADashboard (P0)

**Problem**: `HotelMapView` receives `hotels` as static props but the dashboard doesn't pass the full hotel object (missing `address`, `main_image_url`).

**Solution**:
1. Update `OTADashboard` to pass complete hotel objects to `HotelMapView`
2. Add `address` and `main_image_url` to the hotel mapping
3. Connect `onMapBoundsChange` and `onSearchAreaChange` callbacks

**Acceptance Criteria**:
- [ ] Map markers show hotel images in popups
- [ ] Panning the map updates the URL `location` param (opt-in)
- [ ] Changing search location flies the map to that location
- [ ] No TypeScript errors or console warnings

### 4.2 Bounds-Based Filtering (P1)

**Problem**: User can pan/zoom the map but there's no way to filter hotels by visible area.

**Solution**:
1. Add `filterHotelsByBounds(hotels, bounds)` utility function
2. On `onMapBoundsChange`, compute visible hotel IDs
3. Add "Search this area" button when map moves away from search location
4. Debounce bounds filtering (500ms) to avoid excessive re-renders

**Acceptance Criteria**:
- [ ] `filterHotelsByBounds` correctly identifies hotels within LatLngBounds
- [ ] "Search this area" button appears after user pans map
- [ ] Clicking button updates URL and triggers new search
- [ ] Button disappears when map returns to original search area

### 4.3 Mobile Bottom Sheet + Map Integration (P1)

**Problem**: On mobile, the map and search sheet are disconnected — user can't search while viewing the map.

**Solution**:
1. Add a floating "Search" button on mobile map view
2. When tapped, opens `MobileSearchSheet` over the map
3. Sheet results update the map markers in real-time
4. Add a "Back to list" button to exit map view on mobile

**Acceptance Criteria**:
- [ ] Floating search button visible on mobile map view
- [ ] Sheet opens over map (map stays visible behind backdrop)
- [ ] Search results update map markers without closing sheet
- [ ] "Back to list" button returns to list view

### 4.4 Test Coverage (P0)

**Problem**: Zero test coverage for map components. Any regression would go undetected.

**Solution**: Add unit tests for the pure logic functions:

| Test File | What It Tests |
|-----------|---------------|
| `geo-cache.test.ts` | `getCachedCoords`, `setCachedCoords`, cache levels, TTL expiry |
| `marker-diffing.test.ts` | CREATE/UPDATE/REMOVE/REUSE logic, race condition protection |
| `bounds-filter.test.ts` | `filterHotelsByBounds` with various bounds scenarios |
| `map-search-sync.test.ts` | Reverse geocoding debounce, internal move detection |

**Acceptance Criteria**:
- [ ] All 4 test files exist and pass
- [ ] Tests cover edge cases (empty hotels, duplicate IDs, cache miss)
- [ ] `npm test` runs without errors
- [ ] Test coverage > 80% for new files

---

## 5. Implementation Plan

### Phase 1: OTADashboard Integration (Estimated: ~120 lines)

**Files to modify**:
- `src/components/ota/OTADashboard.tsx` — Add callbacks, complete hotel mapping
- `src/components/ota/HotelMapView.tsx` — Wire up callbacks to parent

**Changes**:
```diff
// OTADashboard.tsx
<HotelMapView
  hotels={hotels.map((h: any) => ({
    id: h.id,
    name: h.name,
    location: h.location,
+   address: h.address,
    min_price: h.min_price,
    slug: h.slug,
+   main_image_url: h.main_image_url,
  }))}
  centerLocation={urlLocation || undefined}
+ onMapBoundsChange={handleMapBoundsChange}
+ onSearchAreaChange={handleSearchAreaChange}
+ enableSearchOnMove={true}
/>
```

### Phase 2: Bounds Filtering (Estimated: ~80 lines)

**Files to create**:
- `src/lib/bounds-filter.ts` — `filterHotelsByBounds` utility

**Files to modify**:
- `src/components/ota/OTADashboard.tsx` — Add bounds filter state + "Search this area" button

**Algorithm**:
```typescript
function filterHotelsByBounds(
  hotels: HotelWithCoords[],
  bounds: LatLngBounds
): HotelWithCoords[] {
  return hotels.filter(hotel => {
    if (!hotel.lat || !hotel.lng) return false;
    return bounds.contains([hotel.lat, hotel.lng]);
  });
}
```

**Note**: Hotels don't have lat/lng stored in the database. We need to:
1. Geocode hotel locations on the server side (one-time migration), OR
2. Use client-side geocoding cache to resolve coordinates for visible hotels

**Recommendation**: Option 2 — use the existing `GeoCacheManager` to resolve coordinates. Hotels already geocoded for markers can be filtered.

### Phase 3: Mobile Integration (Estimated: ~100 lines)

**Files to modify**:
- `src/components/ota/OTADashboard.tsx` — Add floating search button, connect sheet to map state
- `src/components/ota/MobileSearchSheet.tsx` — Add `variant="map-overlay"` prop

**New UI elements**:
- Floating search button (bottom-right on mobile map)
- "Back to list" button (top-left on mobile map)
- Sheet opens with `position: fixed` over map

### Phase 4: Tests (Estimated: ~200 lines)

**Files to create**:
- `src/__tests__/unit/geo-cache.test.ts`
- `src/__tests__/unit/marker-diffing.test.ts`
- `src/__tests__/unit/bounds-filter.test.ts`
- `src/__tests__/unit/map-search-sync.test.ts`

**Test patterns** (follow existing conventions):
```typescript
import { getCachedCoords, setCachedCoords, clearGeoCache } from '@/lib/geo-cache';

describe('geo-cache', () => {
  beforeEach(() => clearGeoCache());

  it('returns pre-computed coords for major cities', () => {
    const result = getCachedCoords('Medellín');
    expect(result).toEqual({
      lat: 6.2442,
      lng: -75.5812,
      displayName: 'Medellín',
    });
  });

  it('matches accent-insensitive queries', () => {
    const withAccent = getCachedCoords('Medellín');
    const withoutAccent = getCachedCoords('medellin');
    expect(withAccent).toEqual(withoutAccent);
  });
});
```

---

## 6. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Nominatim rate limiting (1 req/s) | Medium | High | GeoCacheManager already handles this; pre-computed 150+ cities |
| Mobile sheet z-index conflicts | Low | Medium | Use `--z-modal: 400` consistently |
| Bounds filter with no coords | High | Medium | Skip hotels without coords; log warning |
| Test flakiness with async geocoding | Medium | Low | Mock `geocodeLocation` in tests |

---

## 7. Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Map loads with markers | < 2s | Performance observer |
| Cache hit rate (geocoding) | > 80% | `getGeoCacheStats()` |
| Test coverage (new files) | > 80% | `npm test -- --coverage` |
| Zero console errors | 0 | Browser dev tools |
| Mobile sheet opens/closes smoothly | 60fps | React DevTools profiler |

---

## 8. Dependencies

| Dependency | Status | Notes |
|------------|--------|-------|
| PRD-003 (Map components) | ✅ Complete | All 5 phases delivered |
| GeoCacheManager | ✅ Complete | 3-level cache with 150+ cities |
| `fetchOTAHotelsAction` | ✅ Complete | Supports location, dates, guests |
| `useSearchContext` | ✅ Complete | URL sync + sessionStorage |
| Nominatim API | ✅ Available | Free, no API key, 1 req/s limit |

---

## 9. Out of Scope

- Server-side geocoding migration (separate PRD)
- Real-time availability on map markers (requires WebSocket)
- Multi-hotel comparison view
- Route/directions between hotels
- Map style customization (satellite, terrain)

---

## 10. Appendix

### A. Hotel Interface (Map-ready)

```typescript
interface HotelForMap {
  id: string;
  name: string;
  location: string;
  address?: string;
  min_price: number;
  slug: string;
  main_image_url?: string;
  // Resolved from GeoCacheManager
  lat?: number;
  lng?: number;
}
```

### B. Bounds Filter Algorithm

```
1. User pans map → onMapBoundsChange fires
2. Get current bounds (LatLngBounds)
3. For each hotel in state:
   a. If hotel has cached coords (from marker geocoding):
      - Check if coords within bounds
   b. If no coords:
      - Skip (can't filter without coords)
4. Return filtered hotel IDs
5. If filtered count differs from total → show "Search this area" button
```

### C. Mobile Sheet Overlay Pattern

```
┌─────────────────────────┐
│  Map (visible behind)   │
│                         │
│  ┌───────────────────┐  │
│  │ Backdrop (dim)    │  │
│  │                   │  │
│  │  ┌─────────────┐  │  │
│  │  │ Sheet       │  │  │
│  │  │ Location    │  │  │
│  │  │ Dates       │  │  │
│  │  │ Guests      │  │  │
│  │  │ [Search]    │  │  │
│  │  └─────────────┘  │  │
│  └───────────────────┘  │
└─────────────────────────┘
```
