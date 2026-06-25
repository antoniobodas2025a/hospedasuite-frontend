# Design: Fix Onboarding Flow Issues

## Technical Approach

Seven isolated fixes across the onboarding funnel. No schema changes, no API contracts, no migrations. Each issue touches 1–3 files with minimal coupling. The strategy is: fix labels/states inline, add localStorage as a side effect, extract a constant to centralize trial math, and add a read-only admin page following existing superadmin patterns.

## Architecture Decisions

| Decision | Options | Tradeoffs | Choice |
|----------|---------|-----------|--------|
| TRIAL_DAYS location | `config/saas-plans.ts`, `lib/trial-check.ts`, new `lib/constants.ts` | saas-plans is already the single source of truth for SaaS config; trial-check is logic-only (no constants today). Adding to saas-plans keeps all config co-located. | `config/saas-plans.ts` |
| Step 7 back button style | Modify navigation block in OnboardingClient, or add button inside PaymentReviewStep | Inside OnboardingClient keeps navigation uniform; inside PaymentReviewStep isolates review concerns. Combining both: show the nav bar on step 7 with only the back button, keeping the "Activar" button inside PaymentReviewStep untouched. | Modify OnboardingClient to render nav on step 7, add back button inside PaymentReviewStep below the Activar button |
| Lead form URL pre-fill vs localStorage precedence | localStorage wins, URL wins, or merge | URL params represent explicit user intent (round-trip from wizard), localStorage is a convenience draft. URL SHOULD take precedence per `whatsapp-roundtrip` spec scenario. | URL `phone` param pre-fills phone field, overriding localStorage draft for that specific field |
| Superadmin leads fetch | Server component with supabaseAdmin (like PendingPaymentsPage), or client-side fetch | Server component avoids client-side auth complexity, matches existing pattern in `admin/payments/pending`. | Server component with supabaseAdmin, `force-dynamic` |

## Data Flow

### Issue 3 + 6: Lead form persistence + WhatsApp round-trip

```
User opens modal ──→ read URL params (if phone) ──→ override localStorage draft
                          │
                          ▼
                    render pre-filled form
                          │
                    user types ──→ useEffect ──→ localStorage.setItem("hospedasuite:lead-capture-draft")
                          │
                    user submits ──→ createPublicLeadAction() ──→ on success: localStorage.removeItem()
                          │
                    redirect to /software/onboarding?phone=...&name=...&hotelName=...
                          │
                    user navigates back, re-opens modal ──→ URL params still present ──→ pre-fill phone
```

### Issue 5: Step 7 back navigation

```
User on step 7 (PaymentReviewStep)
    │
    ├── clicks "← Volver" ──→ setCurrentStep(6) ──→ PaymentStep renders with preserved state
    │
    └── clicks "Activar" ──→ startProvisioning() ──→ ProvisioningStep (unchanged)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/components/public/LeadCaptureModal.tsx` | Modify | (Issues 1,3,6) Change label "Alojamiento"→"Nombre de tu negocio", placeholder "Glamping Sol"→"Ej: Glamping Sol". Add `useEffect` to save/restore from localStorage key `hospedasuite:lead-capture-draft` on every field change. Read `phone` from `useSearchParams` on mount, pre-fill if present (takes precedence over localStorage). Clear key on successful submission. Handle corrupted JSON gracefully. |
| `src/components/onboarding/SettingsStep.tsx` | Modify | (Issue 2) Remove WhatsApp input field (lines 66–69: label, input, placeholder) from "Horarios" section. `whatsappNumber` field remains in store schema and DB — no TypeScript changes. |
| `src/app/software/onboarding/OnboardingClient.tsx` | Modify | (Issue 5) Change navigation guard from `{currentStep < 7 && (` to `{currentStep >= 1 && (` so nav renders on step 7. When `currentStep === 7`, only show back button (no "Siguiente/Activar", that lives inside PaymentReviewStep). |
| `src/components/onboarding/PaymentReviewStep.tsx` | Modify | (Issue 5) Add a "← Volver" `motion.button` above the "Activar" button, calling `setCurrentStep(6)` from the store. Styled consistently with the existing wizard nav (border white/10, uppercase tracking-widest). |
| `src/config/saas-plans.ts` | Modify | (Issue 4) Export `TRIAL_DAYS = 30` constant alongside existing `SAAS_PLANS`. |
| `src/app/actions/onboarding.ts` | Modify | (Issue 4) Import `TRIAL_DAYS` from `@/config/saas-plans`. Replace `30 * 86400000` on lines 60, 220, 258 with `TRIAL_DAYS * 86400000`. Replace `90 * 86400000` on line 339 with `TRIAL_DAYS * 86400000` (was 90-day, now 30-day per policy). |
| `src/data/billing.ts` | Modify | (Issue 4) Import `TRIAL_DAYS`. Replace `30 * 24 * 60 * 60 * 1000` on lines 137, 293 with `TRIAL_DAYS * 24 * 60 * 60 * 1000`. |
| `src/app/actions/hotel-admin.ts` | Modify | (Issue 4) Import `TRIAL_DAYS`. Replace `30 * 86400000` on line 107 with `TRIAL_DAYS * 86400000`. |
| `src/app/(super-admin)/admin/leads/page.tsx` | Create | (Issue 7) Server component fetching `hunted_leads` system-wide (no `hotel_id` filter) via supabaseAdmin, ordered by `created_at` DESC. Renders a table with columns: `business_name`, `phone`, `city_search`, `status`, `notes`, `created_at`, `source`. Graceful empty state and error handling. Uses `force-dynamic`. |
| `src/app/(super-admin)/layout.tsx` | Modify | (Issue 7) Add `<Link href="/admin/leads">` to sidebar nav with `Users` icon, following existing link patterns. |

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `TRIAL_DAYS` constant value | New test or extend `saas-plans` test: assert `TRIAL_DAYS === 30`. |
| Unit | localStorage save/restore/clear logic in LeadCaptureModal | Vitest with `jsdom` environment. Mock `localStorage`. Test: save on change, restore on mount, clear on success, corrupted JSON fallback, URL param precedence over draft. |
| Unit | URL param pre-fill (phone) in LeadCaptureModal | Mock `useSearchParams`. Test: pre-fill when param present, empty when absent, partial value handling. |
| Unit | Back button dispatches `setCurrentStep(6)` | Test PaymentReviewStep: verify that clicking "Volver" calls `setCurrentStep(6)` from store mock. |
| Integration | Step 7 navigation renders back button | In OnboardingClient test: assert nav block renders when `currentStep=7` and shows only back button (no "Siguiente"). |
| Integration | Superadmin leads page renders without error | Server component test: query `hunted_leads`, assert table renders with data. Mock supabaseAdmin. |
| E2E | Full round-trip: lead form → wizard → back → pre-fill | Playwright: fill form, submit, navigate to wizard, click back to /software, reopen modal, verify phone pre-filled. |
| E2E | Step 7 back → step 6 → modify payment → step 7 | Playwright: navigate to step 7, click back, change payment method, advance to step 7, verify review reflects changes. |

## Migration / Rollout

**No migration required.** No database schema changes, no API version bumps, no feature flags. All changes are UI-level or constant refactors with identical runtime behavior.

Rollback per issue:
1. **Label**: Revert text strings in LeadCaptureModal.
2. **WhatsApp removal**: Re-add the 4 removed lines to SettingsStep.
3. **localStorage**: Remove useEffect blocks from LeadCaptureModal. Existing drafts become inert (graceful degradation).
4. **TRIAL_DAYS**: Inline constants back to `30 * 86400000` or revert line 339 to `90 * 86400000`.
5. **Step 7 nav**: Revert OnboardingClient guard to `currentStep < 7` and remove back button from PaymentReviewStep.
6. **WhatsApp pre-fill**: Remove `useSearchParams` read from LeadCaptureModal.
7. **Superadmin leads**: Delete `admin/leads/page.tsx` and remove nav link from layout.

## Open Questions

None — all issues are well-specified with clear technical approach documented in the proposal and specs.
