# Design: Free Mobile Activation with Duplicate Prevention

## Technical Approach

Add `'free'` as a third `paymentMethod`, render the "Activar gratis" button only when `useIsMobile() === true`, skip the payment guard in provisioning for free activations, compute a SHA-256 fingerprint server-side, insert into a new `hotel_fingerprints` table with a UNIQUE constraint, and flag duplicate hotels with `status: 'duplicate_review'`. Admin reviews duplicates at `/admin/hotels/duplicates`.

## Architecture Decisions

| # | Decision | Options | Choice | Rationale |
|---|----------|---------|--------|-----------|
| 1 | Fingerprint storage | A. New table `hotel_fingerprints` with UNIQUE(fingerprint_hash) | **A** | Separate table allows history per activation, multiple fingerprints per hotel if needed later. No migration to existing `hotels` table. |
| | | B. Columns on `hotels` table | | |
| 2 | Hash algorithm | `crypto.createHash('sha256')` (Node.js built-in) | **SHA-256** | Zero dependencies. Fingerprint input: `${name.trim().toLowerCase()}\|${city.trim().toLowerCase()}\|${location.trim().toLowerCase()}` |
| 3 | Mobile detection | `useIsMobile()` from `src/hooks/useIsMediaQuery.ts` | **Existing hook** | Returns `undefined` during SSR, `boolean` after hydration — no flash. Single source of truth for viewport detection. |
| 4 | Duplicate flow | Create hotel with `status: 'duplicate_review'`, insert fingerprint, notify user | **Soft block** | User sees success; hotel exists but unpublished. Admin resolves manually. Fingerprint is a signal, not a hard rejection. |
| 5 | Migration naming | Date-based: `20260615_hotel_fingerprints.sql` | **Date-based** | Matches `20260530_hotel_locations.sql` and `20260603_add_wompi_events_secret.sql` patterns. |

## Data Flow

```
PaymentStep ──→ [selects 'free'] ──→ Store: paymentMethod = 'free'
                                         │
PaymentReviewStep ──→ [free: immediate activate] ──→ startProvisioning()
                                         │
ProvisioningStep ──→ hasPayment? ──→ YES (free bypasses guard)
                         │
              executeOnboardingProvisioning(state)
                         │
              paymentMethod === 'free' ──→ computeFingerprint(name, city, location)
                         │                               │
                    ┌────┴────┐              INSERT INTO hotel_fingerprints
                    ▼         ▼                    (UNIQUE constraint)
              NOT found    FOUND
                    │         │
              status:'active'  status:'duplicate_review'
              trial 30 days    friendly message to user
                         │
                    ┌────┴────┐
                    ▼         ▼
              Success page   Success page (with verification note)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/lib/onboarding-schemas.ts` | Modify | Add `'free'` to `paymentMethod` enum |
| `src/store/useOnboardingStore.ts` | Modify | Type widening for `'free'` payment method |
| `src/components/onboarding/PaymentStep.tsx` | Modify | Add mobile-only "Activar gratis" button with `useIsMobile()` guard |
| `src/components/onboarding/PaymentReviewStep.tsx` | Modify | Handle `paymentMethod === 'free'` as immediate-activate path |
| `src/components/onboarding/ProvisioningStep.tsx` | Modify | Bypass `hasPayment` guard for `'free'`; pass `paymentMethod` in wizard state |
| `src/app/actions/onboarding.ts` | Modify | Add `'free'` branch: compute fingerprint, check duplicates, insert fingerprint, set hotel status |
| `supabase/migrations/20260615_hotel_fingerprints.sql` | Create | `hotel_fingerprints` table + UNIQUE index + RLS |
| `src/app/(super-admin)/admin/hotels/duplicates/page.tsx` | Create | Admin page listing `duplicate_review` hotels with approve/reject |
| `src/app/actions/hotel-admin.ts` | Create | `approveDuplicateHotel`, `rejectDuplicateHotel` server actions |

## Migration: `hotel_fingerprints`

```sql
CREATE TABLE hotel_fingerprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fingerprint_hash TEXT NOT NULL UNIQUE,
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  location TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX idx_fingerprint_hash ON hotel_fingerprints(fingerprint_hash);

ALTER TABLE hotel_fingerprints ENABLE ROW LEVEL SECURITY;
-- Super-admin access via service_role bypass (no user RLS needed)

-- Add 'duplicate_review' to hotels.status (if CHECK constraint exists)
ALTER TABLE hotels DROP CONSTRAINT IF EXISTS hotels_status_check;
ALTER TABLE hotels ADD CONSTRAINT hotels_status_check
  CHECK (status IN ('draft', 'active', 'inactive', 'suspended', 'duplicate_review'));
```

## Interfaces / Contracts

```typescript
// src/lib/onboarding-schemas.ts
paymentMethod: z.enum(["wompi", "manual", "free"]).nullable();

// src/app/actions/onboarding.ts — new function
function computeHotelFingerprint(name: string, city: string, location: string): string {
  const crypto = require('crypto');
  const normalized = [name, city, location]
    .map(s => s.trim().toLowerCase())
    .join('|');
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

// src/app/actions/hotel-admin.ts
export async function approveDuplicateHotel(hotelId: string):
  Promise<{ success: boolean; error?: string }>;
export async function rejectDuplicateHotel(hotelId: string):
  Promise<{ success: boolean; error?: string }>;

// Execution flow contract
// Return type expanded:
// executeOnboardingProvisioning → { success, error?, isDuplicate?: true }
// Client reads isDuplicate to show "Tu hotel está en verificación. Te contactaremos en menos de 24h."
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `computeHotelFingerprint` deterministic output | Same inputs → same hash; whitespace/case normalization |
| Unit | PaymentMethod type accepts `'free'` | `tsc --noEmit` — type check |
| Integration | Free activation creates active hotel | E2E: complete wizard with `free` method → verify `hotels.status = 'active'`, `subscription_status = 'trialing'` |
| Integration | Duplicate fingerprint flags hotel | E2E: submit identical hotel name+city+location twice → second gets `duplicate_review` |
| Integration | Desktop does NOT show free button | Vitest: render PaymentStep at 1440px → no "Activar gratis" button |
| Manual | Admin approve/reject flow | Visit `/admin/hotels/duplicates`, approve → hotel becomes `active`; reject → becomes `inactive` |

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Legitimate fingerprint collision (same name+city+location, different hotels) | Admin approves duplicates manually. Fingerprint is a signal, not an absolute block. Hotel still created. |
| `crypto` module not available in Edge runtime | `executeOnboardingProvisioning` runs in Node.js runtime. Declare `export const runtime = 'nodejs'` if not already set. |
| User bypasses mobile detection via dev tools | Fingerprint check is server-side regardless. Worst case: free trial granted — admin catches duplicate later. |
| `useIsMobile` hydration mismatch | Hook returns `undefined` until mounted. Button hidden during SSR, revealed after hydration on mobile — no layout shift (hidden → shown on mobile is acceptable). |

## Open Questions

- [ ] Should the admin page use the same `user_roles.role = 'super_admin'` guard pattern as `approveManualPayment`?
- [ ] Should we add a DB trigger to prevent `duplicate_review` hotels from appearing in `ota_catalog` materialized view? (current WHERE clause: `h.status = 'active'` — already excluded)
