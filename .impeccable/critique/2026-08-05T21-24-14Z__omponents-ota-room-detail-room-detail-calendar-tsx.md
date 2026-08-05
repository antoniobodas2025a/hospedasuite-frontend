---
target: Room Detail Page calendar_first state
total_score: 20
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 2
timestamp: 2026-08-05T21-24-14Z
slug: omponents-ota-room-detail-room-detail-calendar-tsx
---
# Critique: Room Detail Page — `calendar_first` State

**Target**: `src/components/ota/room-detail/room-detail-calendar.tsx`
**Mode**: Operate (booking flow — user completes a task)
**Date**: 2026-08-05

---

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | State transitions are clear internally, but the user has NO visibility into what the room actually looks like — the most critical piece of information is invisible |
| 2 | Match Between System and Real World | 2 | Reverses the universal mental model: in real life you SEE a room before checking its calendar. Every OTA (Airbnb, Booking.com, Expedia) leads with photos. This leads with a date picker |
| 3 | User Control and Freedom | 2 | No escape hatch to see the room without selecting dates. The user is funneled through a 3-step gate (select dates → confirm → see photos) with no shortcut |
| 4 | Consistency and Standards | 2 | Breaks the dominant OTA pattern (photos first, dates second). Breadcrumb and pricing UI are internally consistent, but the overall flow contradicts category expectations |
| 5 | Error Prevention | 3 | Calendar prevents invalid date selection; booked dates are visible. Flow naturally prevents booking without dates. Solid |
| 6 | Recognition Rather Than Recall | 1 | The user must RECALL what the room looked like from the listing page. No photo, no description, no amenities — nothing to recognize. The page asks the user to commit to dates for a product they can't see |
| 7 | Flexibility and Efficiency | 1 | One rigid path: dates → confirm → see room. No skipping ahead. No keyboard shortcuts. Power users who already know the room can't bypass the calendar |
| 8 | Aesthetic and Minimalist Design | 3 | Clean and uncluttered — but TOO minimal. It's minimal by omission of critical information, not by intentional design. Every visible element earns its pixel, but the wrong elements are visible |
| 9 | Error Recovery | 3 | Error state exists. CLEAR_DATES returns to initial state. CHANGE_DATES from detail returns to calendar. Recovery paths are adequate |
| 10 | Help and Documentation | 1 | No help text, no tooltips, no guidance beyond "select dates to continue." No explanation of what comes next or what the user will see after confirming |
| **Total** | | **20/40** | **Acceptable — significant improvements needed** |

---

## Design Specificity Verdict

**This feels like a calendar widget that accidentally ended up in a hotel app.**

The composition is category-interchangeable in the worst way: it could be a SaaS scheduling tool, a doctor's appointment picker, or a car rental date selector. Nothing about the visual identity says "this is a room you're going to sleep in." The room name appears as text, but there's zero visual connection to the physical space.

The data to fix this IS available — `output.gallery[0].url` and `output.coverImage` are both populated by the view model regardless of state. The hero image just isn't rendered.

**Deterministic scan**: The detector found 1 finding — a broken image tag in a test file (`__tests__/room-detail-reducer.test.tsx:81`). This is a false positive for this critique (test fixture, not production UI). No production issues detected mechanically.

---

## Overall Impression

The page opens like a form, not like a destination. A user clicking on a room from the hotel listing expects to see the room — its photos, its space, its character. Instead they see a calendar grid and a price tag. It's the digital equivalent of being handed a invoice before being shown the product.

The single biggest opportunity: **the cover photo already exists in the data layer.** Adding a hero image above the calendar costs almost nothing in implementation and transforms the page from "abstract scheduling tool" to "this is the room you could sleep in."

---

## What's Working

1. **State machine architecture is clean.** The `calendar_first` → `calendar_active` → `detail` progression is well-structured. The reducer is pure, testable, and handles edge cases (sold_out, error). This is solid engineering.

2. **Price teaser is well-designed.** The `GlassCard` with "FROM $X / night" and weekend price breakdown gives the user enough pricing context to decide whether to proceed. Weekday/weekend split in the active summary is excellent transparency.

3. **Motion design is purposeful.** `AnimatePresence` with `mode="wait"` prevents layout jank during state transitions. The summary bar's spring animation (`springSnappy()`) provides satisfying feedback when dates are selected. This is tasteful, not decorative.

---

## Priority Issues

### [P0] No Visual Identity on First Load — Page Feels Dead

**What**: The `calendar_first` state shows zero imagery. The user sees breadcrumb text, a room name, a calendar grid, and a price card. There is no visual anchor — no photo, no illustration, no color beyond the brand accent.

**Why it matters**: A room detail page without a single image of the room fails the most basic expectation of the product category. Users book with their eyes first. The page feels like an administrative interface, not an aspirational travel experience. Airbnb's research shows that listing photos are the #1 factor in booking decisions.

**Fix**: Add a hero banner using `output.gallery[0].url` (or `output.coverImage`) above the calendar. Full-width on mobile, left-column on desktop (matching the gallery state's layout). Even a single image transforms the page from "form" to "destination."

**Suggested command**: `/impeccable shape` (for the hero image integration into the state machine) + `/impeccable bolder` (for visual impact)

---

### [P1] Three-Step Gate Before Seeing Any Room Photo

**What**: The user must: (1) select dates on the calendar, (2) see the summary bar appear, (3) click "Ver detalle" — only then does the gallery render. That's 3 interactions and a minimum of ~8 seconds before seeing a single photo of the room they're considering.

**Why it matters**: Every step before showing the product is a step where the user can abandon. The user doesn't know what they're selecting dates FOR. They're committing time and cognitive effort to a product they haven't evaluated visually. This is backwards — show the product first, then ask for commitment.

**Fix**: Show at minimum the cover image and room description in `calendar_first`. Ideally, show a condensed version of the info panel (capacity, beds, key amenities) alongside the calendar. The "Ver detalle" button can remain for the full gallery, but the initial view should answer "what am I booking?"

**Suggested command**: `/impeccable distill` (restructure information hierarchy) + `/impeccable layout` (reorganize the grid)

---

### [P1] Breaks Universal OTA Pattern — Photos First, Dates Second

**What**: Every major OTA (Airbnb, Booking.com, Expedia, Hotels.com, VRBO) shows the property photos as the primary content, with the date picker as a secondary panel or sticky sidebar. This page inverts that pattern entirely.

**Why it matters**: Users bring learned behavior from other platforms. When the pattern is inverted, users experience cognitive dissonance — "am I in the right place? Where are the photos? Is this the actual booking page or a intermediate step?" This erodes trust.

**Fix**: At minimum, add the hero image. Ideally, restructure the `calendar_first` layout to mirror the OTA standard: visual content (photo + key info) as the protagonist, calendar as the supporting actor. The calendar doesn't need to be demoted — it can be a sticky sidebar on desktop — but it shouldn't be the ONLY thing on the page.

**Suggested command**: `/impeccable shape` (rethink the page architecture)

---

### [P2] No Room Context Until Step 3

**What**: Description, capacity, bed type, amenities, cancellation policy — none of these are visible until the user reaches the `detail` state. The user is selecting dates for a room they know nothing about beyond its name and price.

**Why it matters**: The user can't make an informed decision about whether this room fits their needs. A family of 4 needs to know the capacity BEFORE selecting dates. A business traveler needs to know about the desk and WiFi. All of this is hidden.

**Fix**: Show a condensed info strip in `calendar_first`: capacity badge, bed type, 2-3 key amenities. The full `RoomInfoPanel` can remain in `detail`, but the basics should be visible from the start.

**Suggested command**: `/impeccable layout` (add info strip to the calendar grid)

---

### [P2] "Ver detalle" Label Implies Current View Isn't the Detail Page

**What**: The CTA button says "Ver detalle" (View detail), which implies the current page is NOT the detail view. But the URL is `/hotel/[slug]/room/[id]` — this IS the room detail page. The naming creates a mental model mismatch.

**Why it matters**: Users may think "I'm not on the detail page yet? What page am I on?" This creates confusion about where they are in the flow and what to expect next.

**Fix**: Rename to "Continuar" (Continue), "Ver disponibilidad" (See availability), or "Reservar" (Reserve) — something that indicates forward progress rather than implying the current view is incomplete.

**Suggested command**: `/impeccable clarify` (fix UX copy)

---

## Persona Red Flags

### Alex (Impatient Power User)

- **No keyboard shortcuts** for date selection. Must click each date individually on the calendar.
- **Cannot skip the calendar** if they already know their dates. No text input for dates.
- **Cannot see the room** without going through the full 3-step flow. If they've seen this room before on another platform, they're wasting time.
- **One rigid path**: dates → confirm → see room → reserve. No batch operations, no shortcuts.
- **Abandonment risk**: HIGH. Alex will leave for Airbnb before completing step 2.

### Jordan (Confused First-Timer)

- **No photos on first load** — Jordan doesn't know what they're looking at. Is this a scheduling tool? A pricing calculator?
- **"Ver detalle" is ambiguous** — Jordan thinks "I'm already on the room page, why does it say view detail? Am I in the wrong place?"
- **No contextual help** anywhere. No tooltips explaining what the calendar shows, what the price includes, or what happens after clicking "Ver detalle."
- **No visible indication** that photos, room info, and the actual booking button exist further in the flow. Jordan has no reason to believe clicking will reveal anything useful.
- **Abandonment risk**: HIGH. Jordan will bounce at step 1 because the page doesn't look like a hotel room.

### Casey (Distracted Mobile User)

- **Calendar dominates the entire mobile viewport**. On a phone, the user sees: breadcrumb (tiny), room name, "select dates" text, and a massive calendar grid. The price teaser is pushed below the fold.
- **No image whatsoever on mobile** — the most important context for a distracted user scrolling on their phone is completely absent.
- **No state persistence visible** — if Casey gets interrupted and returns, it's unclear whether the calendar remembers their selection (the reducer handles this, but there's no visual reassurance).
- **Thumb zone**: The "Ver detalle" button only appears after selecting dates AND the summary bar renders. On mobile, this button may be below the fold depending on the calendar's height.
- **Abandonment risk**: MEDIUM-HIGH. Casey will switch apps before scrolling past the calendar.

---

## Minor Observations

- The `output.coverImage` field exists in the view model but is never used in any of the three audited components. It's dead data.
- The breadcrumb is duplicated between `calendar_first` and `detail` states with slightly different styling (10px vs 12px text, different mobile handling). Not a bug, but inconsistent.
- The `GlassCard` and `GlassPill` components provide a cohesive glass-morphism language across states — this is a strength worth preserving.
- The weekday/weekend price breakdown in the summary bar is excellent detail that most OTAs don't show. This is a differentiator buried in step 2.
- The `springSnappy()` transition on the summary bar is satisfying. Motion design is a strength of this codebase.

---

## Questions to Consider

- **What if the calendar were a sidebar instead of the protagonist?** On desktop, the photo could take 60% of the width with the calendar as a sticky right panel — matching Airbnb's layout.
- **Does the user need to select dates to see the room, or does the room sell itself first?** The current flow assumes dates are the primary decision. But for a room detail page, the room IS the product.
- **What would Airbnb's version of this exact data model look like?** The `output.gallery`, `output.description`, `output.capacity`, `output.amenities` are all available at `calendar_first` time. The data layer already supports a photo-first layout.
- **Is the 3-step gate intentional (to qualify leads) or accidental (an artifact of the state machine)?** If intentional, it's the wrong qualification mechanism — users qualify themselves by looking at photos and prices.
- **Could the cover image double as a progress indicator?** A hero image with a subtle "1 of 3" step indicator (Dates → Room → Reserve) would give the user context about where they are and what's coming.
