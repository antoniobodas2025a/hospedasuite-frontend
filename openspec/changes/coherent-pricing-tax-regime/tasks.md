# Tasks: Tax Regime Pricing Coherence

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~200 (17 files: 1 new, 16 modified) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Foundation + all UI + Checkout | PR 1 | Single PR; all tasks depend on Phase 1. DAG fans out after pricing.ts is done. |

---

## Phase 1: Foundation — pricing.ts + Types

- [ ] **1.1** Create `src/lib/pricing.ts` with `DEFAULT_TAX_RATE = 0.19`, `calculateTaxAmount(basePrice, taxRate?)`, `calculateTotalWithTax(basePrice, taxRate?)`. Pure functions, no side effects. **[S]**
- [ ] **1.2** Add `tax_rate?: number` to `Hotel` in `src/types/index.ts`. **[XS]**
  - *Verification: `calculateTaxAmount(100000, 0.19)` → 19000; `calculateTotalWithTax(100000)` → 119000 (default fallback).*

## Phase 2: Data — Onboarding + Settings Persistence

- [ ] **2.1** Add `tax_rate: z.number().min(0).max(0.19)` to `settingsSchema` in `src/lib/onboarding-schemas.ts`. **[XS]**
- [ ] **2.2** Add `tax_rate: 0.19` to `defaultSettings` in `src/store/useOnboardingStore.ts`. **[XS]**
- [ ] **2.3** Add tax regime selector (dropdown: Simplificado=0, Ordinario=0.19) to `src/components/onboarding/SettingsStep.tsx`. New form section below existing settings. **[M]**
- [ ] **2.4** Persist `tax_rate` in `hotelUpdateBase` in `src/app/actions/onboarding.ts`. **[XS]**
- [ ] **2.5** Add tax regime selector to General section in `src/components/dashboard/SettingsPanel.tsx`. **[M]**
  - *Verification: Onboarding wizard with "Simplificado" → writes `tax_rate=0`; Settings panel saves and reloads correct value.*

## Phase 3: UI Cascade — OTA Display Components

- [ ] **3.1** Thread `tax_rate` through `RoomsListWithFilters.tsx`: pass `hotel.tax_rate` to RoomCard. **[XS]**
- [ ] **3.2** Update `RoomCard.tsx`: replace `Math.round(displayPrice * 0.19)` with `calculateTotalWithTax(displayPrice, hotel.tax_rate)`. Update Hotel type in props. **[S]**
- [ ] **3.3** Update `MobileStickyCta.tsx`: add `taxRate` prop, replace `minPrice * 1.19` with `calculateTotalWithTax(minPrice, taxRate)`. **[S]**
- [ ] **3.4** Update `BookingWidget.tsx`: replace `Math.round(subtotal * 0.19)` with `calculateTotalWithTax`. Adapt labels: "Precio final (IVA incluido)" when `taxRate > 0`, "Precio final" when `== 0`. **[M]**
- [ ] **3.5** Update `RoomShowcaseModal.tsx`: replace `Math.round(subtotal * 0.19)` with `calculateTotalWithTax(subtotal, hotel.tax_rate)`. HotelForModal inherits `tax_rate` from Hotel. **[S]**
- [ ] **3.6** Thread `tax_rate` from hotel data to `BookingWidget`, `MobileStickyCta`, `RoomsListWithFilters` in `src/app/(ota)/hotel/[slug]/page.tsx`. **[S]**
  - *Verification: Same room shows identical $final price across RoomCard, ShowcaseModal, BookingWidget, MobileStickyCta for both regimes.*

## Phase 4: Checkout Integration

- [ ] **4.1** Select `tax_rate` from hotels in `src/app/(direct)/book/[slug]/checkout/page.tsx`. Pass `taxRate` prop to CheckoutForm. **[S]**
- [ ] **4.2** Update `CheckoutForm.tsx`: add `taxRate` prop, compute `calculateTaxAmount(basePrice, taxRate)`, show conditional IVA line when `taxRate > 0`. **[M]**
  - *Verification: `taxRate=0.19` shows Subtotal + IVA $X + Total; `taxRate=0` shows only Total.*

## Phase 5: Server-Side Booking Verification

- [ ] **5.1** Update `createPendingBookingAction` in `src/app/actions/bookings.ts`: query hotel `tax_rate` via room→hotel join, compute `maxExpected = Math.round(baseRate * (1 + taxRate) * 1.05)` (adaptive buffer), `minExpected = Math.round(baseRate * 0.95)`. Default `taxRate = DEFAULT_TAX_RATE` when NULL. **[M]**
  - *Verification: `taxRate=0` → buffer = 1.05× baseRate; `taxRate=0.19` → buffer = 1.25× baseRate; NULL → 0.19 fallback.*

## Phase 6: Testing

- [ ] **6.1** Add tests to `src/__tests__/unit/pricing.test.ts`: `calculateTaxAmount` (0, 0.19, undefined, large numbers, float precision), `calculateTotalWithTax` (same edge cases), `DEFAULT_TAX_RATE` value, adaptive buffer scenarios. **[M]**
  - *Verification: All tests pass. Coverage validates NULL→0.19 default, Math.round precision, boundary values.*

---

## Dependency Map

```
Phase 1 ─┬─→ Phase 2 (Onboarding/Settings)
          ├─→ Phase 3 (OTA UI)
          ├─→ Phase 4 (Checkout)
          ├─→ Phase 5 (Server Verify)
          └─→ Phase 6 (Tests)
```

Phases 2–6 are independent after Phase 1 is complete. Recommended execution: 1 → 2+3 (parallel) → 4 → 5 → 6.
