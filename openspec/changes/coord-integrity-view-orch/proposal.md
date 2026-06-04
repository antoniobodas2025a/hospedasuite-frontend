# Proposal: Coordinate Integrity & View Orchestration

**Change**: `coord-integrity-view-orch`
**Pipeline**: Uncle Bob 5-phase

## Problem

1. **NaN crashes**: Hotels with NaN coordinates in ota_catalog or hotel_locations reach the frontend and crash Leaflet (`Invalid LatLng object: (NaN, NaN)`). Frontend guards exist but the root cause — sending NaN from server — is unfixed.

2. **Map visible without search**: The split-view layout renders on homepage even before any search. PRD-014 intended cards-only on homepage, map only after search.

3. **Map Toggle visibility**: The "Mostrar mapa" button should only appear when there's an active search with results.

## Solution

### Server-side sanitization (root cause fix)
In `fetchOTAHotelsAction`, filter out NaN coordinates before returning hotel data. Strategy: **discard** (no marker), keep hotel in cards list.

### View orchestration
- Homepage: no MapContainer, no toggle
- After search: cards + toggle button
- Toggle click: split-view with map

### Defense in depth
- Sanitize `initialCenter` in HotelMapView (belt)
- Sanitize `initialZoom` in HotelMapView (belt)
- Server-side NaN filter in ota.ts (suspenders)

## Files
- `src/app/actions/ota.ts` — NaN filter in coordinate enrichment
- `src/components/ota/HotelMapView.tsx` — NaN guards on initialCenter/Zoom
- `src/components/ota/OTADashboard.tsx` — view orchestration (already mostly done)

## Acceptance
- [ ] No NaN errors in browser console
- [ ] Homepage: cards only, no map, no toggle
- [ ] Search "duitama" → cards + toggle visible
- [ ] Hotel with NaN coords: in cards list, no marker on map
- [ ] bun test passes
- [ ] Mutation kill rate ≥ 80%
