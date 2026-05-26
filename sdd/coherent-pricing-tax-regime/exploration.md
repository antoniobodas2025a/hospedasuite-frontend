# Exploration: coherent-pricing-tax-regime

## Executive Summary

The codebase hardcodes a 19% IVA (`0.19`) multiplier in **6 distinct locations** across the OTA and checkout flows. The `hotels` table already has a `tax_rate` column in the database schema (`src/types/database.ts`), but the `Hotel` TypeScript interface (`src/types/index.ts`) does NOT include it. `saveSettingsAction` already accepts and persists `tax_rate`, and `useSettings` hook already defines it — but **SettingsPanel does not render the field**.

The fix requires: (1) creating a `src/lib/pricing.ts` single source of truth, (2) threading `tax_rate` through the OTA data flow from server action → page → components, (3) updating the checkout flow, (4) adding tax regime to onboarding SettingsStep, (5) adding tax regime selector to SettingsPanel, and (6) updating `createPendingBookingAction` verification logic. Estimated complexity: **Medium**.

---

## Current State

### Hardcoded 0.19 Tax References

| File | Line | Current Logic | Context |
|------|------|---------------|---------|
| `src/components/ota/RoomCard.tsx` | 50 | `const taxes = Math.round(displayPrice * 0.19);` | Displayed when searching dates |
| `src/components/ota/MobileStickyCta.tsx` | 78 | `const displayPrice = Math.round(minPrice * 1.19);` | Mobile sticky bottom bar |
| `src/components/ota/BookingWidget.tsx` | 76 | `const taxes = Math.round(subtotal * 0.19);` | Sidebar booking widget |
| `src/components/ota/RoomShowcaseModal.tsx` | 107 | `const taxes = Math.round(subtotal * 0.19);` | Room detail modal |
| `src/components/checkout/CheckoutForm.tsx` | 70 | `const taxes = Math.round(subtotal * 0.19);` | Checkout summary panel |
| `src/app/actions/bookings.ts` | 342-348 | `maxExpected = Math.round(baseRate * 1.25)` | Price verification guard |

### Data Flow — OTA Hotel Page

```
getHotelDetailsBySlugAction(slug, checkIn, checkOut)
  → selects `*` from hotels (includes tax_rate in DB response)
  → returns { hotel: { ..., rooms: [...] } }

OTAHotelDetailPage
  → BookingWidget(hotelName, rooms, checkIn, checkOut, ...)
  → RoomsListWithFilters(rooms, availableRooms, slug, ..., hotel={{ cancellation_policy }})
    → RoomCard(room, hotelSlug, ..., hotel={{ cancellation_policy }})
  → MobileStickyCta(minPrice, availableCount, ...)
  → RoomShowcaseModal(hotel={slug, rooms}) — NOTE: modal data is MINIMAL when closed
```

**Critical finding**: `RoomCard` receives `hotel?: { cancellation_policy?: string | null }` — it does NOT receive `tax_rate`. Neither does `BookingWidget`, `MobileStickyCta`, or `RoomShowcaseModal` (when closed, it only gets `{ slug, rooms: [] }`).

### Checkout Flow

```
checkout/page.tsx
  → fetches hotel (selects id, name, primary_color, cancellation_policy, location, main_image_url)
    → tax_rate NOT selected
  → fetches room (selects id, hotel_id, name, price, base_price, capacity, status, description, gallery)
  → calculates: basePrice = roomPrice * nights
  → passes basePrice to CheckoutForm
    → CheckoutForm calculates: taxes = Math.round(subtotal * 0.19)
```

### Onboarding Flow

```
OnboardingClient (8 steps)
  Step 1: HotelIdentityStep
  Step 2: PropertyGalleryStep
  Step 3: PropertyTypeStep
  Step 4: RoomTemplatesStep
  Step 5: SettingsStep ← AMENITIES, HOURS, POLICY (no tax)
  Step 6: PaymentEditStep
  Step 7: PaymentStep
  Step 8: PaymentReviewStep → ProvisioningStep

SettingsStep uses settingsSchema from onboarding-schemas.ts:
  - amenities, checkInTime, checkOutTime, cancellationPolicy, whatsappNumber, googleMapsUrl
  → NO tax_rate field

executeOnboardingProvisioning (onboarding.ts)
  → builds hotelUpdateBase from state.settings
  → does NOT set tax_rate (defaults to NULL in DB, which we'll treat as 0.19 for backward compat)
```

### Settings Panel

```
SettingsPanel tabs:
  - general: name, phone, email, wompi keys
  - ota: description, amenities, multimedia, trust badges, activity, hours, protocols, seo, category
  - staff: brand color, team
  - advanced: api keys, webhooks, clean slate

It uses react-hook-form with defaultValues = initialData.
The save action (onMasterSave) calls:
  - saveSettingsAction(data) for general/staff tabs
  - updateHotelProfileAction(hotelId, data) for ota tab

saveSettingsAction ALREADY accepts tax_rate and saves it.
But SettingsPanel does NOT render a tax_rate input.
```

---

## Findings per Requirement

### R1: Add tax regime step to onboarding wizard
- **Where**: Step 5 (SettingsStep) is the natural place, or create a dedicated step between PropertyType and Rooms.
- **Best approach**: Add to `SettingsStep` (step 5) since it already handles operational configuration (hours, policies, amenities). Adding a new step would require updating step counts in `OnboardingClient.tsx` (8 steps → 9 steps), `STEPS` array, `maxCompletedStep` logic, `useOnboardingStore`, and `DemoOnboardingClient.tsx`.
- **Files to touch**: `src/lib/onboarding-schemas.ts` (add `taxRate` to `settingsSchema`), `src/store/useOnboardingStore.ts` (add to `SettingsData`), `src/components/onboarding/SettingsStep.tsx` (add UI selector), `src/app/actions/onboarding.ts` (include in `hotelUpdateBase`).

### R2: Add tax regime selector to SettingsPanel
- **Where**: General tab (`activeTab === 'general'`) since it's a financial/business setting.
- **How**: Add a `<select>` or toggle for tax regime (simplified = 0%, standard = 19%). Register with `react-hook-form` via `{...register('tax_rate')}`.
- **Files**: `src/components/dashboard/SettingsPanel.tsx` (render selector), already supported by `saveSettingsAction`.

### R3-R7: Make all price displays use `tax_rate`
- **RoomCard**: Needs `hotel` prop extended to include `tax_rate`. Currently receives `hotel?: { cancellation_policy?: string | null }`.
- **MobileStickyCta**: Needs new prop `taxRate?: number`. Currently only receives `minPrice`, `availableCount`, `checkIn`, `checkOut`.
- **BookingWidget**: Needs new prop `taxRate?: number`. Currently only receives `hotelName`, `rooms`, `checkIn`, `checkOut`, etc.
- **RoomShowcaseModal**: Needs `hotel` prop extended. The modal receives `hotel: HotelForModal` which currently is `{ slug, name?, rooms? }`. Must include `tax_rate`. Note: when closed, the page passes `{ slug, rooms: [] }` — this minimal object won't have tax_rate, but the modal is hidden when closed anyway. When `showRoom` is set, the page should pass the full hotel.
- **CheckoutForm**: Needs `taxRate` prop or derive from `hotel`. Currently `hotel: Hotel` prop is passed but `Hotel` interface lacks `tax_rate`. Also, `checkout/page.tsx` doesn't select `tax_rate` from DB.

### R8: Update server actions to use `tax_rate`
- **`createPendingBookingAction`** (`src/app/actions/bookings.ts`, lines 342-348):
  - Currently verifies: `maxExpected = Math.round(baseRate * 1.25)` (base + 19% + buffer)
  - If `tax_rate` is 0, `maxExpected` should be `baseRate * 1.05` (just buffer)
  - Need to fetch hotel's `tax_rate` in this action.
- **`getHotelDetailsBySlugAction`** (`src/app/actions/ota.ts`):
  - Already selects `*` from hotels, so `tax_rate` IS included in the response.
  - But the returned `hotel` object is not typed, so TypeScript won't know about it.
- **`checkout/page.tsx`**:
  - Must add `tax_rate` to the hotel select query.

### `src/lib/pricing.ts` (Single Source of Truth)
Recommended exports:
```typescript
export const DEFAULT_TAX_RATE = 0.19;

export function calculateTaxAmount(subtotal: number, taxRate: number = DEFAULT_TAX_RATE): number {
  return Math.round(subtotal * taxRate);
}

export function calculateTotalWithTax(subtotal: number, taxRate: number = DEFAULT_TAX_RATE): number {
  return subtotal + calculateTaxAmount(subtotal, taxRate);
}

export function formatPrice(price: number): string {
  return `$${price.toLocaleString()}`;
}
```

---

## Affected Areas

- `src/lib/pricing.ts` — NEW: single source of truth for all price/tax calculations
- `src/types/index.ts` — ADD `tax_rate?: number` to `Hotel` interface
- `src/components/ota/RoomCard.tsx` — REPLACE hardcoded `0.19` with `tax_rate` from hotel prop
- `src/components/ota/MobileStickyCta.tsx` — REPLACE hardcoded `1.19` with dynamic multiplier
- `src/components/ota/BookingWidget.tsx` — REPLACE hardcoded `0.19` with `tax_rate` prop
- `src/components/ota/RoomShowcaseModal.tsx` — REPLACE hardcoded `0.19` with `tax_rate` from hotel
- `src/components/ota/RoomsListWithFilters.tsx` — EXTEND `hotel` prop type and pass `tax_rate` to `RoomCard`
- `src/components/ota/RoomComparison.tsx` — May need to display prices with/without tax clarity
- `src/components/checkout/CheckoutForm.tsx` — REPLACE hardcoded `0.19` with `taxRate` prop
- `src/app/(direct)/book/[slug]/checkout/page.tsx` — SELECT `tax_rate` from hotels table, pass to `CheckoutForm`
- `src/app/(ota)/hotel/[slug]/page.tsx` — Pass `tax_rate` through to all OTA components
- `src/app/actions/bookings.ts` — UPDATE `createPendingBookingAction` verification to use hotel's `tax_rate`
- `src/app/actions/ota.ts` — No change needed (already selects `*`), but type the return
- `src/app/actions/onboarding.ts` — ADD `tax_rate` to `hotelUpdateBase` from `state.settings`
- `src/app/actions/settings.ts` — Already supports `tax_rate` (no change)
- `src/lib/onboarding-schemas.ts` — ADD `taxRate` to `settingsSchema`
- `src/store/useOnboardingStore.ts` — ADD `taxRate` to `SettingsData` and default state
- `src/components/onboarding/SettingsStep.tsx` — ADD tax regime selector UI
- `src/components/dashboard/SettingsPanel.tsx` — ADD tax regime selector UI in general tab

---

## Approaches

### Approach A: Prop Drilling `tax_rate` Through Components
**Description**: Pass `taxRate` (or full `hotel` object with `tax_rate`) through every component in the tree.

- **Pros**: Explicit, easy to trace, no context needed
- **Cons**: Many prop changes across 6+ components; OTA page needs to pass it everywhere
- **Effort**: Medium

### Approach B: Pricing Utility + Centralized Data Fetch
**Description**: Create `src/lib/pricing.ts` with pure functions. Each component receives `taxRate` as a number prop. Server actions fetch `tax_rate` where needed.

- **Pros**: Clean separation, testable, explicit dependencies
- **Cons**: Still requires prop changes, but much cleaner
- **Effort**: Medium (recommended)

### Approach C: React Context for Hotel Config
**Description**: Create a `HotelConfigContext` at the OTA page level that provides `tax_rate`.

- **Pros**: No prop drilling, any component can access
- **Cons**: Adds a new pattern not used elsewhere; harder to trace; overkill for one value
- **Effort**: Medium-High

**Recommendation**: Approach B. It's the sweet spot — creates a testable pricing library, keeps components explicit about their dependencies, and doesn't introduce a new architectural pattern.

---

## Risks

1. **Backward Compatibility**: Existing hotels have `tax_rate = NULL` in DB. We must default to `0.19` (standard regime) when `tax_rate` is undefined/null.
2. **Data Flow Gap**: `OTAHotelDetailPage` currently passes a minimal `hotel` object to `RoomsListWithFilters` and a minimal `{ slug, rooms: [] }` to `RoomShowcaseModal` when closed. When open, it needs the full hotel with `tax_rate`. If not handled, the modal will crash or show wrong prices.
3. **Booking Verification Mismatch**: `createPendingBookingAction` verifies the client-sent amount against server-calculated expectations. If the client's tax calculation (using `tax_rate`) doesn't match the server's (using the same `tax_rate`), bookings will fail. Both must use `src/lib/pricing.ts`.
4. **Checkout Page Hotel Select**: `checkout/page.tsx` only selects `id, name, primary_color, cancellation_policy, location, main_image_url` — `tax_rate` is missing. Without it, checkout can't calculate the correct total.
5. **Onboarding Schema Cascade**: Adding `tax_rate` to onboarding requires touching schema → store → step component → provisioning action. Missing any breaks the wizard.
6. **Settings Panel Tab Split**: SettingsPanel has two different save paths (`saveSettingsAction` for general, `updateHotelProfileAction` for ota). Since tax is a business/financial setting, it belongs in the general tab which uses `saveSettingsAction` — that's already wired correctly.

---

## Recommended Approach

1. **Create `src/lib/pricing.ts`** with `calculateTaxAmount`, `calculateTotalWithTax`, `DEFAULT_TAX_RATE = 0.19`.
2. **Update `Hotel` interface** in `src/types/index.ts` to include `tax_rate?: number`.
3. **OTA Flow**:
   - In `OTAHotelDetailPage`, pass `tax_rate` to `BookingWidget`, `MobileStickyCta`, `RoomsListWithFilters`.
   - In `RoomsListWithFilters`, extend `hotel` prop to include `tax_rate` and pass to `RoomCard`.
   - In `RoomCard`, `MobileStickyCta`, `BookingWidget`, replace hardcoded `0.19` with `tax_rate ?? DEFAULT_TAX_RATE`.
   - In `RoomShowcaseModal`, ensure full hotel (with `tax_rate`) is passed when modal is open. Use `tax_rate ?? DEFAULT_TAX_RATE`.
4. **Checkout Flow**:
   - In `checkout/page.tsx`, add `tax_rate` to hotel DB select.
   - Pass `taxRate` to `CheckoutForm`.
   - Replace hardcoded `0.19` in `CheckoutForm`.
5. **Server Actions**:
   - In `createPendingBookingAction`, fetch `tax_rate` for the room's hotel and use it for verification.
6. **Onboarding**:
   - Add `taxRate: z.number().min(0).max(1).default(0.19)` to `settingsSchema`.
   - Add to `useOnboardingStore` default state.
   - Add selector UI to `SettingsStep`.
   - Include in `executeOnboardingProvisioning`.
7. **SettingsPanel**:
   - Add tax regime selector to general tab.

---

## Estimated Complexity

**Medium** — touches ~16 files but changes are mechanical (replace `0.19` with `taxRate` prop). The main cognitive load is threading `tax_rate` through the OTA component tree and ensuring the checkout page fetches it. No new libraries, no database migrations (column already exists).

---

## Ready for Proposal

**Yes** — The scope is clear, the files are identified, and the approach is straightforward. The orchestrator can proceed to create a proposal for this change.

