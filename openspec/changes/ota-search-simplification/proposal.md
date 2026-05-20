# Proposal: OTA Search Simplification — Universal Booking Flow

## Intent

The current AvailabilitySearchBar presents 5+ simultaneous filter dimensions (dates, price, capacity, beds, 12 amenities) that create cognitive overload and choice paralysis. Users — whether solo travelers, couples with a baby, families, or groups of 20 — cannot quickly express their needs. We need a radically simplified search experience that guides any group size to the right room in ≤ 2 interactions.

## Scope

### In Scope
- Replace current AvailabilitySearchBar with unified "Dates + Guests" primary bar (≤3 controls)
- Guest selector: single dropdown/pill supporting 1-20+ guests with context-aware presets (Solo, Pareja, Familia, Grupo)
- Progressive disclosure: price filter appears after dates/guests set; beds/amenities hidden behind deliberate "Refinar" action
- Server-side filtering aligned: only dates + guest_count used for initial room query
- Clean dead params/adults references in RoomShowcaseModal checkout URL

### Out of Scope
- Checkout flow redesign (separate change)
- Admin dashboard filter changes
- Mobile app changes
- Accessibility audit (separate change)

## Capabilities

### New Capabilities
- `universal-guest-selector`: Single control expressing any group size (1–20+) with presets eliminating setup friction
- `progressive-filter-disclosure`: Contextual reveal of refinement options after primary intent is captured

### Modified Capabilities
- `ota-room-search`: Replace multi-dimensional filter bar with staged discovery (dates → guests → results → optional refinement)

## Approach

**Stage 1 — Primary Bar (Miller's Law: ≤3 elements):** Dates range picker + Guest selector + Search CTA. No filters visible. Squircle geometry with glassmorphic backdrop blur (20px).

**Stage 2 — Guest Selection (Hick's Law: presets eliminate paralysis):** Single tap opens dropdown with presets — Solo (1), Pareja (2), Familia (3-6), Grupo (7-20+). Free-form counter always available. Spring physics on open/close (mass: 0.8, stiffness: 180, damping: 14).

**Stage 3 — Progressive Disclosure:** After dates + guests set, results load. Price slider appears contextually. Beds/amenities only behind "Refinar" button — deliberate interaction required.

**Stage 4 — Server-Side:** Initial query uses only dates + guest_count. Client-side handles post-discovery refinement. Dead `adults` param removed from checkout URL.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/components/ota/AvailabilitySearchBar.tsx` | Rewrite | Primary target — new staged search bar with universal guest selector |
| `src/app/(ota)/hotel/[slug]/page.tsx` | Modified | Server-side uses guest_count instead of min_capacity for pre-filtering |
| `src/components/ota/RoomShowcaseModal.tsx` | Modified | Remove dead adults param write to checkout |
| `src/components/ota/RoomsListWithFilters.tsx` | Simplified | Client-side filtering reduced to post-discovery refinement only |
| `src/components/ui/guest-selector.tsx` | New | Reusable component for guest count with presets and spring animations |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Large groups (15+) may not understand preset system | Low | Free-form counter always available alongside presets |
| Users who relied on amenity filters won't find them | Medium | "Refinar" button prominently placed after results load |
| Breaking URL param compatibility (min_beds removal) | Low | Redirect old URLs to equivalent new params during transition |

## Rollback Plan

Revert commits. Previous filter architecture preserved in git history. Feature flag via env toggle if needed.

## Dependencies

- Existing mac2026 spring physics library (`@/lib/mac2026/spring`) — already installed
- GlassPanel/GlassCard components — already implemented

## Success Criteria

- [ ] Search bar displays ≤ 3 interactive elements before user engages with any input (Miller's Law satisfied)
- [ ] Guest selection achievable in ≤ 2 taps/clicks from landing page to results (Hick's Law satisfied)
- [ ] Zero visible filters until user explicitly requests "Refinar" after seeing results
- [ ] TypeScript compiles cleanly, zero errors
- [ ] All existing room data flows work for solo through 20-person groups
