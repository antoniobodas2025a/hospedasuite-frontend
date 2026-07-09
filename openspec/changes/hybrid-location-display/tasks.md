# Tasks: Hybrid Location Display

## Phase 1: Create LocationCard Component

### Task 1.1: Create LocationCard.tsx
- [x] Create `src/components/ota/LocationCard.tsx`
- [x] Define LocationCardProps interface
- [x] Implement StaticMap subcomponent (Google Maps Static API)
- [x] Implement TextualCard subcomponent (fallback)
- [x] Implement ViewOnGoogleMapsButton subcomponent
- [x] Add conditional rendering logic (API key check)
- [x] Add responsive styles (Tailwind)
- [x] Add accessibility attributes (alt text, aria-label)
- [x] Export LocationCard as default

**Acceptance Criteria:**
- Component renders static map when API key available
- Component renders textual card when API key not available
- Button opens Google Maps in new tab
- Mobile-responsive design
- Accessible (alt text, aria-label)

### Task 1.2: Create unit tests for LocationCard
- [x] Create `src/components/ota/__tests__/LocationCard.test.tsx`
- [x] Test static map rendering with API key
- [x] Test textual fallback rendering without API key
- [x] Test "View on Google Maps" button behavior
- [x] Test responsive design at different viewports
- [x] Test accessibility attributes

**Acceptance Criteria:**
- All tests pass (14/14)
- Coverage > 80%

## Phase 2: Integrate LocationCard

### Task 2.1: Update HotelInfoSection.tsx
- [x] Import LocationCard
- [x] Remove import of HotelDetailMapWrapper
- [x] Replace map rendering logic with LocationCard
- [x] Pass correct props (hotelName, address, latitude, longitude)
- [x] Remove getMapPriorityUrl logic (if not used elsewhere)

**Acceptance Criteria:**
- HotelInfoSection renders LocationCard
- Props passed correctly
- No TypeScript errors

### Task 2.2: Create integration tests
- [x] Create `src/components/ota/__tests__/HotelInfoSection.test.tsx`
- [x] Test LocationCard is rendered
- [x] Test props are passed correctly
- [x] Test no React-Leaflet imports

**Acceptance Criteria:**
- All tests pass (6/6)
- No React-Leaflet in component tree

## Phase 3: Cleanup (after verification)

### Task 3.1: Remove old map components
- [x] Delete `src/components/ota/HotelDetailMap.tsx`
- [x] Delete `src/components/ota/HotelDetailMapWrapper.tsx`
- [x] Check if `src/lib/map-resolver.ts` is used elsewhere
- [x] If not used, delete `src/lib/map-resolver.ts`

**Acceptance Criteria:**
- No broken imports
- All tests still pass

### Task 3.2: Remove React-Leaflet dependency
- [ ] Remove `react-leaflet` from package.json
- [ ] Remove `leaflet` from package.json
- [ ] Remove `@types/leaflet` from package.json (if exists)
- [ ] Run `bun install`
- [ ] Run `bun run build` to verify

**Acceptance Criteria:**
- Bundle size reduced by ~100KB
- Build succeeds
- All tests pass

**STATUS: BLOCKED** — react-leaflet and leaflet are used in 10+ other components (OTADashboard, MapPicker, HotelMapView, MarkerClusterGroup, MarkerLifecycleManager, MapTransitionController, MapSearchSync, ClusteredMarkers, bounds-filter). Cannot remove without breaking those components. This is a significant deviation from the design that requires a separate change to migrate those components first.

## Phase 4: Environment Configuration

### Task 4.1: Add Google Maps API key support
- [x] Add `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` to `.env.example`
- [x] Document how to obtain API key
- [x] Document free tier limits ($200/month)
- [ ] Update README with configuration instructions

**Acceptance Criteria:**
- Documentation complete
- API key can be configured

## Phase 5: Verification

### Task 5.1: Run all tests
- [x] Run `bun run test` (component tests: 20/20 pass, pre-existing failures unrelated)
- [x] Run `bun run typecheck` (no errors in changed files, pre-existing webpack types issue)
- [x] Run `bun run lint` (0 errors, 737 pre-existing warnings)
- [ ] Run `bun run build` (blocked by missing native dependencies in environment)

**Acceptance Criteria:**
- All tests pass
- No TypeScript errors
- No lint errors
- Build succeeds

### Task 5.2: Manual testing
- [ ] Test on localhost without API key (textual fallback)
- [ ] Test on localhost with API key (static map)
- [ ] Test "View on Google Maps" button
- [ ] Test on mobile viewport
- [ ] Test on desktop viewport
- [ ] Test accessibility (keyboard navigation, screen reader)

**Acceptance Criteria:**
- All scenarios work correctly
- No visual regressions
- Accessible

### Task 5.3: Performance testing
- [ ] Run Lighthouse audit
- [ ] Compare bundle size before/after
- [ ] Compare load time before/after
- [ ] Document improvements

**Acceptance Criteria:**
- Bundle size reduced by ~100KB
- Load time improved
- Lighthouse score improved

## Phase 6: Deployment

### Task 6.1: Commit and push
- [ ] Commit changes with conventional commit message
- [ ] Push to GitHub
- [ ] Wait for Coolify deployment

**Acceptance Criteria:**
- Changes deployed to production

### Task 6.2: Production testing
- [ ] Test on production without API key
- [ ] Test on production with API key (if configured)
- [ ] Monitor error logs (Sentry)
- [ ] Monitor performance metrics

**Acceptance Criteria:**
- No errors in production
- Performance improved
- No user complaints

## Dependencies
- Task 1.1 must complete before Task 2.1
- Task 2.1 must complete before Task 3.1
- Task 3.1 must complete before Task 3.2
- Task 5.1 must complete before Task 6.1

## Estimated Time
- Phase 1: 2-3 hours
- Phase 2: 1 hour
- Phase 3: 30 minutes
- Phase 4: 30 minutes
- Phase 5: 1-2 hours
- Phase 6: 30 minutes
- **Total: 5-7 hours**

## Risk Mitigation
- If API key is not available, textual fallback always works
- If issues arise, can rollback immediately
- Tests ensure no regressions
- Gradual rollout (test locally first)
