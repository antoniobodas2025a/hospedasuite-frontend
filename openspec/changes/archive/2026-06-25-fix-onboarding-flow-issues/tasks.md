# Tasks: Fix Onboarding Flow Issues

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~280–350 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

---

## Issue 1: "Alojamiento" → "Nombre de tu negocio" (LeadCaptureModal)

- [x] **1.1** Change label from "Alojamiento" to "Nombre de tu negocio" and placeholder from "Glamping Sol" to "Ej: Glamping Sol" in `src/components/public/LeadCaptureModal.tsx`. `business_name` field unchanged. **[XS]**
  - *Verification: Label reads "Nombre de tu negocio", placeholder "Ej: Glamping Sol".*

## Issue 2: Remove WhatsApp from SettingsStep

- [x] **2.1** Remove WhatsApp input (label + input + placeholder) from "Horarios y contacto" section in `src/components/onboarding/SettingsStep.tsx`. `settings.whatsappNumber` stays in store/DB. **[XS]**
  - *Verification: SettingsStep has no WhatsApp field; `updateSettings({ whatsappNumber })` still works.*

## Issue 3: localStorage Persistence for LeadCaptureModal

- [x] **3.1** Add `useEffect` to save formData to `localStorage` key `hospedasuite:lead-capture-draft` on every change, restore on mount, clear on successful `createPublicLeadAction`, handle corrupted JSON gracefully. Doesn't collide with wizard key `hospedasuite:wizard-memory`. **[S]**
- [x] **3.2** Unit tests: save on change, restore on mount, clear on success, corrupted JSON fallback, no key collision. **[S]**
  - *Verification: Refresh preserves draft, submission clears it, invalid JSON ignored.*

## Issue 4: TRIAL_DAYS Constant (30 días)

- [x] **4.1** Export `TRIAL_DAYS = 30` from `src/config/saas-plans.ts`. **[XS]**
- [x] **4.2** Replace `30 * 86400000` (×3) and `90 * 86400000` (×1) with `TRIAL_DAYS * 86400000` in `src/app/actions/onboarding.ts`. **[XS]**
- [x] **4.3** Replace `30 * 24 * 60 * 60 * 1000` (×2) with `TRIAL_DAYS * 24 * 60 * 60 * 1000` in `src/data/billing.ts`. **[XS]**
- [x] **4.4** Replace `30 * 86400000` with `TRIAL_DAYS * 86400000` in `src/app/actions/hotel-admin.ts`. **[XS]**
- [x] **4.5** Test: assert `TRIAL_DAYS === 30` and all files import from `@/config/saas-plans`. **[XS]**
  - *Verification: grep for `90 * 86400000` returns zero matches.*

## Issue 5: Step 7 Back Button (PaymentReviewStep)

- [x] **5.1** Change nav guard in `src/app/software/onboarding/OnboardingClient.tsx` from `currentStep < 7` to render nav on step 7, showing only back button when `currentStep === 7`. **[S]**
- [x] **5.2** Add "← Volver" `motion.button` in `src/components/onboarding/PaymentReviewStep.tsx` calling `setCurrentStep(6)`, consistently styled. **[S]**
- [x] **5.3** Tests: back button renders on step 7, dispatches `setCurrentStep(6)`, provisioning not triggered on back. **[S]**
  - *Verification: Step 7 shows "← Volver", returns to step 6 with preserved payment state.*

## Issue 6: WhatsApp Pre-fill from URL Params

- [x] **6.1** In `LeadCaptureModal.tsx`, read `phone` from `useSearchParams()` on mount, pre-fill phone field if param present. URL value takes precedence over localStorage draft. **[XS]**
- [x] **6.2** Tests: pre-fill from URL param, empty when absent, partial value, URL wins over localStorage. **[S]**
  - *Verification: `/software?phone=%2B57%20300%20123%204567` → phone field pre-filled.*

## Issue 7: Superadmin Leads Page (/admin/leads)

- [x] **7.1** Create `src/app/(super-admin)/admin/leads/page.tsx` — server component with `supabaseAdmin`, `force-dynamic`, query `hunted_leads` system-wide ordered by `created_at DESC`, table with columns: `business_name`, `phone`, `city_search`, `status`, `notes`, `created_at`, `source`. Empty state + error handling. **[M]**
- [x] **7.2** Add `<Link href="/admin/leads">` with `Users` icon to sidebar nav in `src/app/(super-admin)/layout.tsx`. **[XS]**
- [x] **7.3** Tests: renders with data, empty state, error state, read-only (no edit actions). **[S]**
  - *Verification: Superadmin sees all leads at `/admin/leads` with no edit buttons.*

---

## Dependency Map

```
Issue 4 (TRIAL_DAYS) ── independent, but foundation for consistency
Issues 1, 3, 6 ──────── same file (LeadCaptureModal) — apply together to avoid conflicts
Issues 2, 5 ─────────── independent wizard components
Issue 7 ─────────────── independent new page
```

All issues are logically independent. Recommended order: 4 → 1+3+6 → 2 → 5 → 7. Parallel execution possible for Issues 4, 2, 5, 7 after LeadCaptureModal changes are done.
