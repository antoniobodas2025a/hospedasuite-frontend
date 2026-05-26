# Proposal: Geolocalized OTA Search

## Intent

REQ-004: Users cannot search or filter hotels by city or location. AvailabilitySearchBar only accepts dates + guests; OTADashboard relies on free-text name/location search via pagination. Adding a location input enables users to narrow results by city before browsing.

## Scope

### In Scope
- Add inline text location/city input to AvailabilitySearchBar (free-text, no autocomplete)
- Pass location as URL query param (`?location=...`) to search results
- Update `fetchOTAHotelsAction` to filter by city/location using existing `.or(name.ilike, location.ilike)` pattern
- Update OTADashboard to respect location filter from URL params

### Out of Scope
- Autocomplete/Combobox UI (requires `cmdk` dependency, Radix Popover primitives)
- Geocoordinates / map-based search
- City slug routing or SEO-friendly URLs
- Hotel model migration (city, location, address, city_slug remain free-text)

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- `ota-room-search`: Add location/city as a first-class filter dimension alongside dates and guests

## Approach

**UI:** Add text input to AvailabilitySearchBar for city/location. On submit, navigate with `?location=<value>` appended to existing date/guest params. Plain `<input>`, no dropdown.

**Server:** `fetchOTAHotelsAction` already uses `.or(name.ilike, location.ilike)`. Extend to accept explicit `location` param and apply `.or(city.ilike, location.ilike, address.ilike)` when present, combined with existing date/guest filters.

**Dashboard:** OTADashboard reads `searchParams.location` and pre-fills the filter. Pagination unchanged.

**Phase 2 (deferred):** Combobox/Command palette using `cmdk` + Radix Popover for city autocomplete.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/components/ota/AvailabilitySearchBar.tsx` | Modified | Add location text input, include in search params |
| `src/app/(ota)/actions.ts` (or equivalent) | Modified | Update `fetchOTAHotelsAction` to accept and filter by location |
| `src/app/(ota)/dashboard/page.tsx` | Modified | Read location from searchParams, pass to search action |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Fuzzy city matching returns irrelevant results | Medium | Use `ilike` with `%term%` pattern |
| Input conflicts with existing free-text search | Low | Location param is additive; name search still works |

## Rollback Plan

Remove location input from AvailabilitySearchBar. Server action ignores `location` param (no-op). No data migration. Revert via git.

## Dependencies

- `ota-search-simplification` change (dates + guest flow)
- Existing `fetchOTAHotelsAction` pagination infrastructure

## Success Criteria

- [ ] AvailabilitySearchBar displays location input alongside dates + guests
- [ ] Submitting search appends `?location=...` to URL
- [ ] Results filtered by city/location via case-insensitive partial match
- [ ] OTADashboard respects location filter from URL params
- [ ] TypeScript compiles cleanly, zero errors
- [ ] No new dependencies added
