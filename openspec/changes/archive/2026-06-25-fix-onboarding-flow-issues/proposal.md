# Proposal: Fix Onboarding Flow Issues

## Intent

The onboarding flow has 7 UX/data consistency issues identified by the user: confusing field labels, redundant WhatsApp capture, missing localStorage persistence on the lead form, inconsistent trial duration (30 vs 90 days), missing back button on step 7, WhatsApp not persisting between form and wizard round-trips, and no superadmin view for system-wide leads.

## Scope

### In Scope
- Rename "Alojamiento" → "Nombre de tu negocio" in LeadCaptureModal with accurate placeholder
- Remove WhatsApp field from SettingsStep (already captured in lead form, travels via URL)
- Add localStorage persistence to LeadCaptureModal (separate key from wizard store)
- Audit and unify all trial period references to 30 days; remove 90-day Wompi subscription path or align it
- Add explicit "Atrás" button on step 7 (PaymentReviewStep) navigation
- Persist WhatsApp bidirectionally: lead form → wizard AND wizard → URL params on revisit
- Add `/admin/leads` page for superadmin to view all `hunted_leads` system-wide

### Out of Scope
- Changing trial duration policy (30 days stays; if business wants 90, that's a separate decision)
- Refactoring the entire lead capture architecture
- Adding CRM features beyond a read-only leads table
- Modifying Wompi payment integration logic

## Capabilities

### New Capabilities
- `lead-form-persistence`: localStorage save/restore for the public lead capture form. Survives page refresh.
- `superadmin-leads-view`: System-wide read-only view of all `hunted_leads` for superadmin role.

### Modified Capabilities
- `onboarding-wizard`: Step 7 navigation (back button), SettingsStep WhatsApp removal, trial period consistency
- `free-mobile-activation`: Trial period references must align with 30-day standard

## Approach

### Issue 1: "Alojamiento" label confuso
**File:** `src/components/public/LeadCaptureModal.tsx`
- Change label from "Alojamiento" to "Nombre de tu negocio"
- Change placeholder from "Glamping Sol" to "Ej: Glamping Sol" (add "Ej:" prefix for clarity)
- The underlying field `business_name` stays the same — no DB changes

### Issue 2: WhatsApp duplicado
**File:** `src/components/onboarding/SettingsStep.tsx`
- Remove the WhatsApp input field from the "Horarios y contacto" section
- WhatsApp is already captured in LeadCaptureModal and hydrated into the store via URL params in OnboardingClient.tsx (line 129-131)
- The `settings.whatsappNumber` field remains in schema/store for editability from dashboard later

### Issue 3: Lead form sin persistencia
**File:** `src/components/public/LeadCaptureModal.tsx`
- Add localStorage key `hospedasuite:lead-capture-draft`
- Save formData on every change (with debounce or on blur)
- Restore on mount if key exists
- Clear on successful submission
- Does NOT reuse the wizard's `hospedasuite:wizard-memory` key — separate concern

### Issue 4: 30 vs 90 días inconsistencia
**Audit findings:**
- `src/app/actions/onboarding.ts` lines 60, 220, 258: `30 * 86400000` — consistent ✓
- `src/app/actions/onboarding.ts` line 339: `90 * 86400000` — ONLY when `FEATURES.WIZARD_WOMPI_SUBSCRIPTION` is true (it's false by default)
- `src/data/billing.ts` line 137: `30 * 24 * 60 * 60 * 1000` — consistent ✓
- `src/data/billing.ts` line 293: `30 * 24 * 60 * 60 * 1000` — consistent ✓
- `src/app/actions/hotel-admin.ts` line 107: `30 * 86400000` — consistent ✓
- All UI text says "30 días" — consistent ✓
- `src/lib/trial-check.ts` comments say "30 días" — consistent ✓

**Fix:** The 90-day path in onboarding.ts line 339 is feature-flagged OFF by default (`FEATURE_WIZARD_WOMPI_SUBSCRIPTION` env var). Change it to 30 days for consistency when the flag is eventually enabled. Add a `TRIAL_DAYS` constant to avoid magic numbers.

### Issue 5: Paso 7 sin botón "Atrás"
**File:** `src/app/software/onboarding/OnboardingClient.tsx`
- Line 310: `{currentStep < 7 && (...)}` hides entire navigation block on step 7
- The PaymentReviewStep has its own "Activar" button but no back navigation
- Add a "← Volver" link/button inside PaymentReviewStep or show a minimal nav bar on step 7

### Issue 6: WhatsApp no persistido entre form y wizard
**File:** `src/app/software/onboarding/OnboardingClient.tsx`
- WhatsApp IS hydrated from URL params (line 129-131): `updateSettings({ whatsappNumber: leadPhone })`
- The issue is that if the user navigates BACK to `/software` and reopens the modal, the form doesn't pre-fill
- Fix: In LeadCaptureModal, read URL params on mount and pre-fill formData if present
- This pairs with Issue 3 (localStorage) — both ensure data survives navigation

### Issue 7: Superadmin no tiene vista de leads
**File:** New `src/app/(super-admin)/admin/leads/page.tsx`
- Query `hunted_leads` without `hotel_id` filter (system-wide)
- Simple table: business_name, phone, notes, city_search, created_at, source
- Reuse existing CRMBoard component or build a simpler read-only table
- Add nav link in super-admin layout sidebar

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/components/public/LeadCaptureModal.tsx` | Modified | Label fix, localStorage persistence, URL param pre-fill |
| `src/components/onboarding/SettingsStep.tsx` | Modified | Remove WhatsApp input field |
| `src/app/software/onboarding/OnboardingClient.tsx` | Modified | Step 7 back button navigation |
| `src/components/onboarding/PaymentReviewStep.tsx` | Modified | Add back button or wrapper with nav |
| `src/app/actions/onboarding.ts` | Modified | Change 90→30 days, add TRIAL_DAYS constant |
| `src/app/(super-admin)/layout.tsx` | Modified | Add "Leads" nav link |
| `src/app/(super-admin)/admin/leads/page.tsx` | New | Superadmin leads view |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Removing WhatsApp from SettingsStep breaks existing users who didn't come through lead form | Low | Those users can set WhatsApp from dashboard settings later. The field still exists in the DB schema. |
| localStorage key collision with wizard memory | Low | Using separate key `hospedasuite:lead-capture-draft` |
| 90→30 day change affects Wompi subscription users when flag is enabled | Low | Flag is OFF in production. When enabled, 30 days is the correct business policy. |
| Superadmin leads page exposes PII | Medium | Leads already exist in system. Page is behind super-admin auth. Add note about data handling. |
| Step 7 back button allows user to modify payment after review | Low | Back button goes to step 6 (PaymentStep). Payment state is preserved in store. User can re-review. |

## Rollback Plan

1. **Label:** Revert label text in LeadCaptureModal — trivial revert
2. **WhatsApp:** Re-add the input field to SettingsStep — one component section
3. **localStorage:** Remove localStorage read/write from LeadCaptureModal — no data loss (graceful degradation)
4. **Trial days:** Revert constant back to inline `90 * 86400000` — only affects future Wompi flag users
5. **Step 7 nav:** Remove back button from PaymentReviewStep — restore original behavior
6. **Superadmin leads:** Remove the `/admin/leads` route and nav link — no DB changes

## Dependencies

- Existing `hunted_leads` table (already populated by `createLeadAction`)
- Existing super-admin layout and auth guard
- Existing URL param passing from LeadCaptureModal → OnboardingClient

## Success Criteria

- [ ] LeadCaptureModal label reads "Nombre de tu negocio" with clear placeholder
- [ ] SettingsStep no longer shows WhatsApp input (already captured upstream)
- [ ] LeadCaptureModal survives page refresh with formData preserved
- [ ] All trial period references use 30 days (constant `TRIAL_DAYS = 30`)
- [ ] Step 7 (PaymentReview) has visible "Atrás" button to return to step 6
- [ ] WhatsApp pre-fills in LeadCaptureModal when user returns from wizard via URL params
- [ ] Superadmin can view all system leads at `/admin/leads`
