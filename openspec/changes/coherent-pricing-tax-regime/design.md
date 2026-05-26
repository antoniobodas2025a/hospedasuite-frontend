# Design: Tax Regime Pricing Coherence

## Technical Approach

Replace six hardcoded `0.19`/`1.19` literals with a single `src/lib/pricing.ts` SSOT. Thread `hotel.tax_rate` from DB through component props. Server-side verification adapts its tolerance buffer based on `tax_rate`. Onboarding and Settings gain a tax regime selector (Simplificado=0, Ordinario=0.19).

## Architecture Decisions

| # | Decision | Option A | Option B | Choice | Rationale |
|---|----------|----------|----------|--------|-----------|
| 1 | Tax calc SSOT | `src/lib/pricing.ts` (pure functions) | Inline per component | **pricing.ts** | Testable in isolation, zero duplication, grep-pable |
| 2 | Data flow | Prop threading | React Context | **Prop threading** | Single primitive field, context adds unnecessary complexity |
| 3 | NULL tax_rate fallback | `DEFAULT_TAX_RATE = 0.19` | Error if NULL | **Default 0.19** | Backward compat for existing hotels; matches `?? 0.19` pattern |
| 4 | Tax regime UI | Dropdown (2 options) | Free-text number input | **Dropdown** | Colombia only has these 2 regimes for lodging; prevents garbage values |
| 5 | Verification buffer | `1.25` with tax, `1.05` without | Fixed `1.25` always | **Adaptive buffer** | Prevents over-acceptance of inflated amounts under simplified regime |

## Data Flow

```
DB hotels.tax_rate ──→ Server Action (.select('*') | explicit .select)
                              │
              ┌───────────────┼──────────────────┐
              ▼               ▼                   ▼
    OTA page prop     Checkout page prop    Server verify
         │                  │                   │
    ┌────┼────────┐   CheckoutForm         calculateTaxAmount()
    ▼    ▼        ▼    │                   (from pricing.ts)
  RoomCard  BWidget  MSCta    │
         RoomShowcaseModal    │
          (reads full hotel)  │
```

All components call `calculateTotalWithTax(basePrice, taxRate)` from `src/lib/pricing.ts`.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/lib/pricing.ts` | **Create** | `calculateTaxAmount`, `calculateTotalWithTax`, `DEFAULT_TAX_RATE = 0.19` |
| `src/types/index.ts` | Modify | Add `tax_rate?: number` to `Hotel` |
| `src/lib/onboarding-schemas.ts` | Modify | Add `tax_rate: number` to `settingsSchema` (Zod) |
| `src/store/useOnboardingStore.ts` | Modify | `defaultSettings` gains `tax_rate: 0.19` |
| `src/components/onboarding/SettingsStep.tsx` | Modify | Tax regime selector (Simplificado/Ordinario), new section |
| `src/app/actions/onboarding.ts` | Modify | Persist `tax_rate` in `hotelUpdateBase` |
| `src/components/dashboard/SettingsPanel.tsx` | Modify | Tax regime selector in General section |
| `src/components/ota/RoomCard.tsx` | Modify | `displayPrice * taxRate` instead of `* 0.19`; `hotel` prop gains `tax_rate` |
| `src/components/ota/BookingWidget.tsx` | Modify | `subtotal * taxRate`; labels adapt (`IVA incluido` vs `Precio final`); `tax_rate` prop |
| `src/components/ota/MobileStickyCta.tsx` | Modify | `minPrice * (1 + taxRate)` instead of `* 1.19`; `tax_rate` prop |
| `src/components/ota/RoomShowcaseModal.tsx` | Modify | `subtotal * taxRate`; reads `hotel.tax_rate` (already has full object) |
| `src/components/ota/RoomsListWithFilters.tsx` | Modify | `hotel` prop gains `tax_rate` field, passes through to RoomCard |
| `src/components/checkout/CheckoutForm.tsx` | Modify | `calculateTaxAmount(basePrice, tax_rate)`; conditional IVA line when `tax_rate > 0` |
| `src/app/(ota)/hotel/[slug]/page.tsx` | Modify | Thread `hotel.tax_rate` to BookingWidget, MobileStickyCta, RoomsListWithFilters |
| `src/app/(direct)/book/[slug]/checkout/page.tsx` | Modify | Select `tax_rate` from hotels; pass to CheckoutForm |
| `src/app/actions/bookings.ts` | Modify | `createPendingBookingAction`: fetch `tax_rate` from DB, adaptive `maxExpected = rate * (1 + tax_rate) * 1.05` |
| `src/__tests__/unit/pricing.test.ts` | Modify | Add tests for `calculateTaxAmount`, `calculateTotalWithTax`, null fallback |

## Key Type Changes

```typescript
// src/types/index.ts — Hotel interface gains:
tax_rate?: number;  // 0 = simplificado, 0.19 = ordinario, undefined = default 0.19

// src/lib/pricing.ts — new file:
export const DEFAULT_TAX_RATE = 0.19;
export function calculateTaxAmount(basePrice: number, taxRate?: number): number;
export function calculateTotalWithTax(basePrice: number, taxRate?: number): number;

// src/components/ota/RoomCard.tsx — hotel prop gains:
hotel?: { cancellation_policy?: string | null; tax_rate?: number };

// src/components/checkout/CheckoutForm.tsx — prop gains:
taxRate?: number;
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `calculateTaxAmount`, `calculateTotalWithTax` | Edge cases: 0, 0.19, undefined, large numbers, float precision |
| Unit | Adaptive verification buffer | Two scenarios: minimum stays, cross-month stays |
| Integration | CheckoutForm conditional IVA line | `tax_rate=0` hides line; `tax_rate=0.19` shows it |
| Integration | Onboarding provisioning persists `tax_rate` | Verify DB column after wizard completion |
| Manual | Price coherence across all OTA displays | Same room displays same price in RoomCard, ShowcaseModal, BookingWidget, Checkout |

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| NULL tax_rate on legacy hotels | `?? DEFAULT_TAX_RATE` in every entry point; default is 0.19 (backward compat) |
| Amount mismatch client vs server | Adaptive buffer: `1.05` without tax, `1.05 * (1 + tax_rate)` with tax |
| Onboarding misses tax_rate | Schema default = `0.19`; provisioning always writes the field |
| Float precision | `Math.round()` on all final amounts, prices are always integers (COP cents not relevant) |

## Open Questions

- [ ] Should we add a DB migration to set `tax_rate = 0.19` for all existing hotels with NULL?
- [ ] Should the OTA page read `tax_rate` from search params for URL-shareable price correctness?
