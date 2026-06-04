# Proposal: Fix OTA Map Navigation

**Change**: `fix-ota-map-navigation`
**Type**: Bug Fix
**Pipeline**: Uncle Bob (Spec → Gherkin → TDD → Judge → Mutation)

## Problem

Three map issues persist despite multiple fixes:
1. **Map doesn't center on search location** — after searching and clicking "Mostrar mapa", the map stays at default center (Colombia overview)
2. **Gestures feel unreliable** — even with native Leaflet events, pan/zoom sometimes don't respond
3. **Markers don't appear for hotels with coordinates** — hotels configured in dashboard (MapPicker) don't show their pins

## Root Cause Analysis

### Issue 1: Map not centering
- `MapTransitionController` Transition 1 fires on `centerLocation` change
- `geocodeLocation(centerLocation)` checks `getCachedCoords(query)` first
- If the location IS in precomputed cache → works. If NOT → Nominatim API → may fail silently
- **Fix**: Add geocoding fallback and error handling. If geocoding fails, show user feedback.

### Issue 2: Gestures
- `MapDragDetector` uses `useMapEvents` with `dragstart`/`dragend`/`zoomstart`/`zoomend`
- `isUserPanningRef` blocks IntersectionObserver during drag
- BUT: MarkerCluster intercepts clicks on clusters → prevents map drag on clustered areas
- **Fix**: Set `disableClusteringAtZoom: 11` (already at 14, lower it). Test interaction flows.

### Issue 3: Markers not appearing
- `hotel_locations` table has coordinates but ota_catalog might not
- Fallback: ota_catalog → hotel_locations (ordered by geocoded_at DESC)
- **Fix**: Verify the coordinate loading logs. Add explicit fallback logging.

## Files
- `src/components/ota/MapTransitionController.tsx` — centering logic
- `src/components/ota/MarkerLifecycleManager.tsx` — clustering config
- `src/app/actions/ota.ts` — coordinate loading
- `src/lib/geocoding.ts` — geocoding fallback

## Acceptance
- [ ] Map centers on "duitama" when clicking "Mostrar mapa" after search
- [ ] Map drag, zoom, double-click work even when markers are clustered
- [ ] arrayan3 shows its pin after dashboard coordinates are saved
- [ ] `bun test` passes
- [ ] Mutation kill rate ≥ 80%
