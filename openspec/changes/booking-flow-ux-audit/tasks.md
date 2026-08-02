# Tasks: Booking Flow UX Redesign

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1750 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | 6 PRs (per proposal) |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Price transparency + date picker integration | PR 1 | Foundation; ~350 lines |
| 2 | Unified CTA + modal content cleanup | PR 2 | Core UX; ~150 lines |
| 3 | Modal redesign (policies, payment, gallery) | PR 2b | Core UX; ~200 lines |
| 4 | Analytics + edge cases | PR 3 | Polish; ~150 lines |
| 5 | Motion & Visual Design System | PR 4 | Design system; ~460 lines |
| 6 | Performance optimization | PR 5 | Performance; ~440 lines |

## Phase 1: Foundation (PR 1 - Critical Fixes)

- [x] 1.1 Create `src/types/index.ts` additions: `BookingAnalyticsEvent` union type, `QuickDatePreset` interface
- [x] 1.2 Modify `src/lib/pricing.ts`: Add `getTaxLabel(rate: number)` and `formatPriceWithTax(base, rate, nights)` functions
- [x] 1.3 Create `src/hooks/useBookingFlow.ts`: Processing state, button disable logic, modal orchestration
- [x] 1.4 Create `src/components/ota/InlineDatePicker.tsx`: Extract DayPicker with quick dates, availability coloring, collapsible behavior
- [x] 1.5 Modify `src/app/(ota)/hotel/[slug]/page.tsx`: Thread `hotel.tax_rate` to all children (RoomCard, BookingWidget, RoomShowcaseModal)
- [x] 1.6 Modify `src/components/ota/RoomCard.tsx`: Add `React.memo`, unified "Reservar →" button, price with IVA breakdown using `formatPriceWithTax`, `useMemo` for price calculations
- [x] 1.7 Modify `src/components/ota/BookingWidget.tsx`: Integrate `InlineDatePicker`, real-time price updates with IVA, scarcity badges with tooltip, remove "Desde" label
- [x] 1.8 Modify `src/components/ota/PriceBreakdown.tsx`: Change props from `taxRegime` to `taxRate: number`, dynamic IVA label using `getTaxLabel`
- [x] 1.9 Add backward compatibility to `PriceBreakdown`: Support both `taxRegime` and `taxRate` props with deprecation warning

## Phase 2: Core UX (PR 2 - Unified CTA)

- [x] 2.1 Modify `src/components/ota/RoomCard.tsx`: Remove conditional button text ("Explorar Unidad" / "Asegurar Refugio"), always show "Reservar →"
- [x] 2.2 Modify `src/components/ota/BookingWidget.tsx`: Unify button text to "Reservar →" in all states
- [x] 2.3 Modify `src/components/ota/RoomShowcaseModal.tsx`: Button text should be "Reservar" — verify it's consistent
- [x] 2.4 Modify `src/components/ota/RoomShowcaseModal.tsx`: Remove redundant room description (already shown in RoomCard)

## Phase 3: Modal Redesign (PR 2b - Value Add)

- [x] 3.1 Modify `src/components/ota/RoomShowcaseModal.tsx`: Implement content hierarchy (Gallery → Title → Price → Policies → Payment → CTA)
- [x] 3.2 Modify `src/components/ota/RoomShowcaseModal.tsx`: Make CTA sticky at bottom during scroll
- [x] 3.3 Modify `src/components/ota/RoomInfoPanel.tsx`: Add cancellation policy display using `hotel.cancellation_policy`
- [x] 3.4 Modify `src/components/ota/RoomInfoPanel.tsx`: Add payment methods display (Wompi: tarjetas, PSE, Nequi)
- [x] 3.5 Modify `src/components/ota/RoomInfoPanel.tsx`: Add help text for cancellation policy
- [x] 3.6 Modify `src/components/ota/RoomGalleryGrid.tsx`: Implement error boundary per image with placeholder
- [x] 3.7 Modify `src/components/ota/RoomGalleryGrid.tsx`: Add mobile carousel with "Foto 1 de 6" counter

## Phase 4: Analytics & Polish (PR 3)

- [x] 4.1 Create `src/hooks/useBookingAnalytics.ts`: 6 PostHog events with IntersectionObserver for `view_room`
- [x] 4.2 Modify `src/lib/analytics.ts`: Extend with booking flow events
- [x] 4.3 Modify `src/components/ota/RoomCard.tsx`: Integrate `useBookingAnalytics` for `view_room` and `click_reserve`
- [x] 4.4 Modify `src/components/ota/RoomShowcaseModal.tsx`: Fire `open_room_modal`, `close_room_modal`, `abandon_booking` events
- [x] 4.5 Modify `src/components/ota/RoomsListWithFilters.tsx`: Remove CSS `animate-fade-in-up` (use Framer Motion only)
- [x] 4.6 Add `tax_rate=null` specific test: MUST use `DEFAULT_TAX_RATE=0.19`, MUST NOT show warning, MUST log `tax_rate_fallback` analytics event

## Phase 5: Motion & Visual Design (PR 4)

- [ ] 5.1 Create `src/lib/motion-tokens.ts`: Centralized motion tokens (duration: fast/normal/slow, easing: ease-out/ease-in-out)
- [ ] 5.2 Create `src/components/ui/SkeletonLoader.tsx`: Reusable skeleton loader with shimmer effect
- [ ] 5.3 Modify `src/components/ota/RoomCard.tsx`: Add skeleton loader for loading state
- [ ] 5.4 Modify `src/components/ota/BookingWidget.tsx`: Add skeleton loader for loading state
- [ ] 5.5 Modify `src/components/ota/RoomCard.tsx`: Add micro-animations (hover lift + shadow, active scale 0.96, focus outline)
- [ ] 5.6 Modify `src/components/ota/RoomsListWithFilters.tsx`: Add staggered animation (50ms delay between cards)
- [ ] 5.7 Modify `src/components/ota/RoomShowcaseModal.tsx`: Add modal transition (scale 0.95→1 + fade + backdrop blur, 200ms)
- [ ] 5.8 Create `src/components/ui/ProgressIndicator.tsx`: Checkout progress indicator (3 steps: Datos → Pago → Confirmación)
- [ ] 5.9 Create `src/components/ui/CelebrationAnimation.tsx`: Confetti + checkmark animation on booking complete
- [ ] 5.10 Create `src/styles/motion.css`: Global motion styles, `prefers-reduced-motion` support
- [ ] 5.11 Modify all interactive elements: Add visible hover states and focus states (2px solid outline)

## Phase 6: Performance Optimization (PR 5)

- [ ] 6.1 Modify `src/components/ota/RoomCard.tsx`: Wrap in `React.memo`, add `useMemo` for allPrices/minPrice/avgPrice calculations
- [ ] 6.2 Modify `src/components/ota/RoomsListWithFilters.tsx`: Move `useSearchParams()` to parent, pass as prop to RoomCard
- [ ] 6.3 Modify `src/components/ota/RoomsListWithFilters.tsx`: Integrate `@tanstack/react-virtual` for 10+ rooms
- [ ] 6.4 Modify `src/components/ota/RoomCard.tsx`: Add `priority` prop to hero image, `loading="eager"` for above-fold images
- [ ] 6.5 Modify `src/app/(ota)/hotel/[slug]/page.tsx`: Add `priority` to hotel hero image
- [ ] 6.6 Modify `src/components/ota/RoomComparison.tsx`: Wrap with `next/dynamic` for code splitting
- [ ] 6.7 Modify `src/components/ota/ReviewsSection.tsx`: Wrap with `next/dynamic` for code splitting
- [ ] 6.8 Modify `src/components/ota/RoomsListWithFilters.tsx`: Remove `layout` prop from AnimatePresence (causes reflows)
- [ ] 6.9 Modify `src/components/ota/RoomCard.tsx`: Memoize date calculations with `useMemo`
- [ ] 6.10 Add `content-visibility: auto` to cards outside initial viewport
- [ ] 6.11 Implement `IntersectionObserver` for lazy loading heavy components
- [ ] 6.12 Add font preloading with `<link rel="preload">` in layout

## Testing Tasks

- [x] T.1 Write unit tests for `pricing.ts`: tax_rate=0, null, 0.19 edge cases
- [x] T.2 Write unit tests for `InlineDatePicker`: quick dates, keyboard nav, availability coloring
- [ ] T.3 Write integration tests for RoomCard price display with/without dates
- [ ] T.4 Write integration tests for BookingWidget ↔ InlineDatePicker ↔ URL sync
- [ ] T.5 Write E2E test: Full booking flow (select dates → click Reservar → modal → checkout)
- [ ] T.6 Write visual regression tests: Gallery layouts (desktop grid, mobile carousel), scarcity badges
- [ ] T.7 Run Lighthouse CI: Verify LCP <2.5s, TTI <3.5s, bundle <200KB

## Migration Tasks

- [ ] M.1 Search for all usages of `PriceBreakdown` with `taxRegime` prop: `grep -r "taxRegime" src/`
- [ ] M.2 Update each usage to pass `taxRate` instead
- [ ] M.3 Add deprecation warning for `taxRegime` prop (30-day sunset)
- [ ] M.4 Remove `taxRegime` support after 30 days
