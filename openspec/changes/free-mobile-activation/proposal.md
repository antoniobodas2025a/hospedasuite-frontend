# Proposal: Free Mobile Activation with Duplicate Prevention

## Intent

Mobile users face friction completing the onboarding payment step (card entry, transfer screenshots). We need to allow mobile users to activate their hotel account **without paying upfront** via a "Activar gratis" button, while preventing duplicate hotel registrations through server-side fingerprint hashing.

## Scope

### In Scope
- Add `'free'` as a third payment method in `PaymentMethod` enum and schema
- Mobile-only "Activar gratis" button in PaymentStep (uses `useIsMobile` hook)
- `hotel_fingerprints` table with unique hash of `normalized_name + city + location + hotel_id`
- Server-side fingerprint check during provisioning (`executeOnboardingProvisioning`)
- Duplicate hotel created with `status: 'duplicate_review'` when fingerprint matches
- Super-admin page `/admin/hotels/duplicates` to review and resolve duplicate flags
- Free activation grants 30-day trial (`subscription_status: 'trialing'`)

### Out of Scope
- Desktop free activation (mobile-only for now)
- Automated duplicate resolution (manual admin review)
- Email notifications for duplicate detection
- Changes to existing Wompi or Manual payment flows
- Trial expiration logic (already exists in `hotels.trial_ends_at`)

## Capabilities

### New Capabilities
- `free-mobile-activation`: Mobile-only free onboarding path. Adds `'free'` payment method, conditional UI, 30-day trial provisioning without transaction.
- `duplicate-prevention`: Server-side hotel fingerprint hashing and duplicate detection. New `hotel_fingerprints` table, admin review workflow for flagged hotels.

### Modified Capabilities
- None — no existing spec-level behavior changes. Pure addition.

## Approach

1. **Schema + Store:** Add `'free'` to `paymentSchema.paymentMethod` enum. No new store state needed — `'free'` flows through existing `paymentMethod` field.
2. **Mobile UI:** In `PaymentStep.tsx`, add a third "Activar gratis" button rendered only when `useIsMobile()` returns `true`. Selecting it sets `paymentMethod = 'free'` and marks payment as done (no transaction needed).
3. **PaymentReviewStep:** Handle `paymentMethod === 'free'` as an immediate-activate path (similar to Wompi, no pending state).
4. **ProvisioningStep:** Skip the `hasPayment` guard when `paymentMethod === 'free'`. Pass through normally.
5. **Server action (`executeOnboardingProvisioning`):** Add `'free'` branch:
   - Compute fingerprint: `sha256(lowercase(name) + "|" + lowercase(city) + "|" + lowercase(location))`
   - Check `hotel_fingerprints` table for existing hash
   - If NOT found → insert fingerprint, activate hotel with `status: 'active'`, `subscription_status: 'trialing'`, 30-day trial
   - If FOUND → insert fingerprint (for tracking), create hotel with `status: 'duplicate_review'`, return `isDuplicate: true` to client
6. **Migration:** Create `hotel_fingerprints` table with `id`, `fingerprint_hash` (unique), `hotel_id`, `name`, `city`, `location`, `created_at`.
7. **Admin page:** New `/admin/hotels/duplicates` page listing hotels with `status: 'duplicate_review'`, with approve/reject actions (similar pattern to `/admin/payments/pending`).

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/lib/onboarding-schemas.ts` | Modified | Add `'free'` to `paymentMethod` enum |
| `src/store/useOnboardingStore.ts` | Modified | Typing update for `'free'` method |
| `src/components/onboarding/PaymentStep.tsx` | Modified | Add mobile-only "Activar gratis" button |
| `src/components/onboarding/PaymentReviewStep.tsx` | Modified | Handle free activation state |
| `src/components/onboarding/ProvisioningStep.tsx` | Modified | Skip payment guard for `'free'` |
| `src/app/actions/onboarding.ts` | Modified | Add `'free'` branch + fingerprint check |
| `supabase/migrations/027_hotel_fingerprints.sql` | New | `hotel_fingerprints` table |
| `src/app/(super-admin)/admin/hotels/duplicates/page.tsx` | New | Admin page for duplicate review |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Fingerprint collisions (legitimate hotels with same name+city+location) | Medium | Admin can approve duplicates manually. Fingerprint is a signal, not a hard block. |
| User bypasses mobile detection (desktop dev tools) | Low | Fingerprint check is server-side regardless. Worst case: free trial granted, admin reviews later. |
| `useIsMobile` hydration mismatch | Low | Hook returns `undefined` until mounted — button won't flash on SSR. |
| Migration conflicts with existing hotels | Low | Fingerprints only created for new activations. Backfill can be done later if needed. |

## Rollback Plan

1. **UI:** Remove the "Activar gratis" button from `PaymentStep.tsx` — reverts to 2-method flow.
2. **Server action:** Remove the `'free'` branch from `executeOnboardingProvisioning` — free activations fail gracefully (no transaction).
3. **Database:** Drop `hotel_fingerprints` table if needed. Hotels with `duplicate_review` status can be manually updated to `active` or `inactive`.
4. **Admin page:** Remove `/admin/hotels/duplicates` route.

## Dependencies

- Existing `useIsMobile` hook (`src/hooks/useIsMediaQuery.ts`)
- Existing admin layout at `(super-admin)/admin/`
- Supabase admin client (already used in onboarding action)

## Success Criteria

- [ ] Mobile users see "Activar gratis" button on payment step
- [ ] Desktop users do NOT see "Activar gratis" button
- [ ] Free activation creates hotel with `status: 'active'`, `subscription_status: 'trialing'`, 30-day trial
- [ ] Duplicate fingerprint detected server-side creates hotel with `status: 'duplicate_review'`
- [ ] `hotel_fingerprints` table stores unique hash per activation
- [ ] Admin page at `/admin/hotels/duplicates` lists flagged hotels
- [ ] Admin can approve or reject duplicate-flagged hotels
- [ ] Existing Wompi and Manual payment flows unchanged
