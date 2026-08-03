# Design: Booking Flow UX Redesign

## Technical Approach

Map 13 FRs to 4 implementation layers over the existing URL-driven architecture:

1. **Price Transparency Layer** — Extend `pricing.ts` with `tax_rate`-aware display helpers; thread `tax_rate` from hotel page → RoomCard → BookingWidget → PriceBreakdown. Replace `taxRegime` boolean with numeric `taxRate` in PriceBreakdown.
2. **Unified CTA Layer** — Replace conditional button text ("Explorar Unidad" / "Asegurar Refugio") with single "Reservar →" across RoomCard, BookingWidget, and RoomShowcaseModal. Add processing state with `useBookingFlow` hook (new: `src/hooks/useBookingFlow.ts`).
3. **Inline Date Picker Layer** — Extract `DayPicker` from `AvailabilitySearchBar` modal into reusable `InlineDatePicker` component. Render inline in BookingWidget (desktop) and sticky header (mobile). Add quick-date presets and availability coloring via Supabase query.
4. **Analytics + Motion Layer** — Add 6 PostHog events via `useBookingAnalytics` hook (extends existing `src/lib/analytics.ts`). Consolidate motion to Framer Motion only (remove CSS `animate-fade-in-up` in RoomsListWithFilters). Add `@tanstack/react-virtual` for 10+ rooms.

## Architecture Decisions

### Decision: State Management

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Zustand store | Adds bundle, duplicates URL state | ✗ |
| URL searchParams only | Already works, shareable, persistent | **✓ Primary** |
| Hybrid (URL + Zustand) | Over-engineering for this scope | ✗ |

**Rationale**: Codebase already drives all booking state from URL (`checkin`, `checkout`, `guests`, `showRoom`). Zustand is installed (`package.json:68`) but unused for booking. Adding a store creates dual-source-of-truth. Keep URL as SSR, and use `localStorage` only for cross-session date persistence (FR9).

### Decision: Date Picker Integration & Availability Strategy

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Keep modal-only | Breaks spec requirement for inline | ✗ |
| Inline in sidebar (desktop) + sticky (mobile) | Matches spec, uses existing `react-day-picker` | **✓** |
| Separate library | Adds bundle weight | ✗ |

**Rationale**: `react-day-picker` already integrated in `AvailabilitySearchBar.tsx:22`. Extract into `InlineDatePicker` component, reuse in BookingWidget. Collapsible when 3+ rooms (spec: booking-widget "Collapsible date picker").

**Availability Strategy** (RESOLVED): Hybrid approach:
1. **Initial load**: Use cached availability from `page.tsx` (revalidate=60s) — fast, no extra query
2. **On date selection**: Trigger optimistic UI update immediately, then validate against Supabase in background
3. **On conflict**: Show toast "Esta fecha acaba de ser reservada", reset date picker
4. **Rationale**: Balances speed (no 500ms delay on every interaction) with accuracy (catches conflicts before checkout)

### Decision: Virtualization Strategy & Cache

| Option | Tradeoff | Decision |
|--------|----------|----------|
| `@tanstack/react-virtual` | Headless, flexible, tree-shakeable | **✓** |
| `react-window` | Simpler API, less flexible |  |
| Custom IntersectionObserver | Maintenance burden |  |

**Rationale**: Proposal specifies `@tanstack/react-virtual`. Activate only for 10+ rooms to avoid overhead on small inventories. Wrap in `RoomsListWithFilters`.

**Cache Strategy** (ADDED):
- `React.memo` on `RoomCard` (prevents re-render when parent updates)
- `useCallback` for all callbacks passed to virtualized items (stable references)
- Key strategy: `room.id` (stable, no re-renders on data change)
- Virtualizer re-renders only visible items + overscan (default 5 items)

### Decision: Motion System

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Framer Motion only | Consistent, physics-based, existing `mac2026/spring.ts` | **✓** |
| CSS animations only | Lighter, but loses layout animations | ✗ |
| Hybrid | Double animation conflict (current bug) | ✗ |

**Rationale**: Codebase uses both (`framer-motion` + CSS `animate-fade-in-up` in `RoomsListWithFilters:132`). Remove CSS animation, use Framer Motion staggered entry (already partially done at line 126-131). Respect `prefers-reduced-motion` via `motion-safe:` prefix.

### Decision: Image Optimization

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Next.js Image (existing) | Already configured with blur placeholders | **✓ Enhance** |
| CDN-only | Lose automatic optimization | ✗ |

**Rationale**: `RoomGalleryGrid` and `RoomCard` already use Next.js `Image` with `getImageSizeUrl()`. Add `priority` prop for hero image, `loading="eager"` for above-fold. Add error boundary per image (spec: gallery error handling).

### Decision: Analytics Integration

| Option | Tradeoff | Decision |
|--------|----------|----------|
| PostHog (existing) | Already configured, CSP allowed, server+client | **✓** |
| Google Analytics | Spec mentions GA but PostHog is the actual stack | ✗ |
| Custom event bus | Reinventing wheels | ✗ |

**Rationale**: `src/lib/analytics.ts` already has `posthog.capture()`. CSP in `next.config.ts:80` allows `posthogDomain`. Extend with 6 booking-flow events. Server-side events via `analytics-server.ts` for checkout completion.

## Data Flow

```
URL searchParams ─→ page.tsx (RSC) ──→ props ──→ RoomsListWithFilters
       │                                              │
       │                                              ├──→ RoomCard (memo, price+IVA)
       │                                              │       │
       │                                              │       └──→ "Reservar" click
       │                                              │               │
       │◄── router.push(?showRoom=) ◄─────────────────┘               │
       │                                                               │
       ├──→ BookingWidget (inline date picker, scarcity)               │
       │       │                                                       │
       │       └──→ price updates (<100ms via useMemo)                 │
       │                                                               │
       └──→ RoomShowcaseModalWrapper                                   │
               │                                                       │
               └──→ RoomShowcaseModal ──→ onCheckout ──→ /book/checkout
                       │
                       └──→ PostHog events (view_room, click_reserve,
                            open_room_modal, close_room_modal,
                            complete_booking, abandon_booking)

tax_rate propagation (CRITICAL):
  page.tsx (hotel.tax_rate) ──→ BookingWidget ──→ PriceBreakdown
                            ──→ RoomCard ──→ PriceBreakdown
                            ──→ RoomShowcaseModal ──→ PriceBreakdown
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/hooks/useBookingAnalytics.ts` | Create | 6 PostHog events with IntersectionObserver for view_room |
| `src/hooks/useBookingFlow.ts` | Create | Processing state, button disable logic, modal open/close orchestration |
| `src/components/ota/InlineDatePicker.tsx` | Create | Extracted DayPicker with quick dates, availability coloring, collapsible |
| `src/app/(ota)/hotel/[slug]/page.tsx` | Modify | Thread `tax_rate` to all children, add `localStorage` date persistence |
| `src/components/ota/RoomCard.tsx` | Modify | React.memo, unified "Reservar →" button, price with IVA breakdown, useMemo for price calc |
| `src/components/ota/BookingWidget.tsx` | Modify | Inline date picker, real-time price with IVA, scarcity badges with tooltip, remove "Desde" |
| `src/components/ota/RoomShowcaseModal.tsx` | Modify | Content hierarchy (Gallery→Title→Price→Policies→Payment→CTA), sticky CTA, no redundant info |
| `src/components/ota/RoomInfoPanel.tsx` | Modify | Add cancellation policy, payment methods, help text |
| `src/components/ota/RoomsListWithFilters.tsx` | Modify | `@tanstack/react-virtual` for 10+ rooms, remove CSS animation |
| `src/components/ota/AvailabilitySearchBar.tsx` | Modify | Extract DayPicker to InlineDatePicker, keep modal for search bar context |
| `src/components/ota/RoomGalleryGrid.tsx` | Modify | Error boundary per image, lazy load with blur placeholder, mobile carousel |
| `src/components/ota/PriceBreakdown.tsx` | Modify | Accept `taxRate: number` prop instead of `taxRegime`, dynamic IVA label |
| `src/lib/pricing.ts` | Modify | Add `getTaxLabel(rate)`, `formatPriceWithTax(base, rate, nights)` |
| `src/lib/booking-context.ts` | Modify | Extend with `cancellationPolicy`, `paymentMethods`, `availableCount` |
| `src/types/index.ts` | Modify | Add `BookingAnalyticsEvent` union type, `QuickDatePreset` type |

## Interfaces / Contracts

```typescript
// New: Analytics events (src/types/index.ts)
type BookingAnalyticsEvent =
  | { event: 'view_room'; properties: { room_id: string; hotel_id: string; price: number; has_dates: boolean; tax_rate: number } }
  | { event: 'click_reserve'; properties: { room_id: string; hotel_id: string; price: number; nights: number; has_dates: boolean; tax_rate: number } }
  | { event: 'open_room_modal'; properties: { room_id: string; hotel_id: string; source: 'card' | 'sidebar' } }
  | { event: 'close_room_modal'; properties: { room_id: string; hotel_id: string; action: 'reserve' | 'back' | 'esc' } }
  | { event: 'complete_booking'; properties: { room_id: string; hotel_id: string; total_price: number; nights: number; guests: number; payment_method: string } }
  | { event: 'abandon_booking'; properties: { room_id: string; hotel_id: string; step: 'card' | 'modal' | 'checkout'; time_spent: number } };

// New: Quick date presets (src/components/ota/InlineDatePicker.tsx)
interface QuickDatePreset {
  label: string;        // "Este fin de semana"
  tooltip: string;      // "Selecciona fechas predefinidas..."
  getDates: () => { from: Date; to: Date };
}

// Modified: PriceBreakdown props
interface PriceBreakdownProps {
  pricePerNight: number;
  nights: number;
  taxRate: number;           // was: taxRegime: 'simplified' | 'responsible'
  showDetails?: boolean;
  className?: string;
}
```

## Error Boundary Strategy

- `RoomShowcaseModal` wrapped in existing `ErrorBoundary` component (from `src/components/ota/ErrorBoundary.tsx`)
- On error: close modal automatically, show toast "Error al cargar detalles de la habitación", log to PostHog (`modal_error`)
- Fallback: user can still book from RoomCard without modal (modal is optional enhancement)
- Image-level errors: handled by `RoomGalleryGrid` with per-image error boundary (shows placeholder, doesn't break entire gallery)

### Toast Component Strategy

**Decision**: Use `sonner` library (lightweight, beautiful, accessible)
- **Rationale**: No existing toast component in `src/components/ui/`. `sonner` is 3KB gzipped, has built-in animations, and matches our design system aesthetic.
- **Alternative considered**: `react-hot-toast` (similar size, less customizable) or custom component (more work, reinventing wheel)
- **Implementation**: Install `sonner`, add `<Toaster />` to root layout, use `toast()` function in error handlers

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `pricing.ts` — tax_rate=0, null, 0.19 edge cases; `formatPriceWithTax` | Vitest (existing runner, `strict_tdd: true`) |
| Unit | `InlineDatePicker` — quick dates, keyboard nav, availability coloring | Vitest + Testing Library (jsdom) |
| Unit | `tax_rate=null` specific test: MUST use `DEFAULT_TAX_RATE=0.19`, MUST NOT show warning, MUST log analytics event `tax_rate_fallback` | Vitest + mock console |
| Integration | RoomCard price display with/without dates, tax scenarios | Vitest + Testing Library |
| Integration | BookingWidget ↔ InlineDatePicker ↔ URL sync | Vitest + Testing Library |
| E2E | Full booking flow: select dates → click Reservar → modal → checkout | Playwright (existing, `e2e: playwright`) |
| Visual | Gallery layouts (desktop grid, mobile carousel), scarcity badges | Playwright screenshots |
| Performance | LCP <2.5s, TTI <3.5s, bundle <200KB | Lighthouse CI in CI pipeline |

## Migration / Rollout

**Breaking Change**: `PriceBreakdown` props changed from `taxRegime: 'simplified' | 'responsible'` to `taxRate: number`.

**Migration Steps**:
1. Search for all usages of `PriceBreakdown` with `taxRegime` prop: `grep -r "taxRegime" src/`
2. Update each usage to pass `taxRate` instead (numeric value from `hotel.tax_rate ?? DEFAULT_TAX_RATE`)
3. Add backward compatibility: support both props with deprecation warning for 30 days
4. Remove `taxRegime` support after 30 days

**Rollout Plan**: Deploy as 6 chained PRs per proposal:

- **PR 1** (~350 lines): Critical fixes (price transparency, unified CTA, inline date picker)
- **PR 2** (~150 lines): Unify button + remove repeated info
- **PR 2b** (~200 lines): Add policies + payment + gallery optimization
- **PR 3** (~150 lines): Polish, analytics, edge cases
- **PR 4** (~460 lines): Motion & Visual Design System
- **PR 5** (~440 lines): Performance Optimization

**Total**: 6 PRs, ~1750 lines, 15-18 days

**Feature Flag**: Not needed — changes fix UX bugs and add missing features. No risk of breaking existing functionality (all changes are additive or improve existing behavior).

## Resolved Questions

- ✅ **InlineDatePicker availability**: Hybrid approach — cache from page.tsx (60s) + background validation on selection
- ✅ **abandon_booking trigger**: Fire on modal close with 30s timeout (NOT `beforeunload` — unreliable on mobile). Track time_spent from modal open to close.
- ✅ **Quick date presets**: Global presets for MVP (not configurable per hotel). Add hotel-specific presets in Post-MVP if needed.
