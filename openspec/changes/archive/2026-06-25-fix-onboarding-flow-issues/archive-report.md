# Archive Report

**Change**: `fix-onboarding-flow-issues`
**Archived at**: `openspec/changes/archive/2026-06-25-fix-onboarding-flow-issues/`
**Archived on**: 2026-06-25

## Change Summary

Fixed 7 onboarding flow issues:
1. **Lead capture label** — Changed "Alojamiento" → "Nombre de tu negocio" with appropriate placeholder
2. **WhatsApp removed from SettingsStep** — Removed WhatsApp input duplication from onboarding wizard
3. **localStorage persistence** — Added draft save/restore/clear to LeadCaptureModal
4. **TRIAL_DAYS constant** — Exported `TRIAL_DAYS = 30` from `saas-plans.ts`, eliminated hardcoded `90 * 86400000` across the codebase
5. **Step 7 back button** — Added "← Volver" button on PaymentReviewStep, nav guard extended to step 7
6. **WhatsApp pre-fill from URL** — Phone pre-fills from `?phone=` URL param, winning over localStorage
7. **Superadmin leads page** — New `/admin/leads` page with table, empty/error states, sidebar link

## Files Changed (Final List)

Based on the implementation and verification:

| File | Action |
|------|--------|
| `src/components/public/LeadCaptureModal.tsx` | Modified |
| `src/components/onboarding/SettingsStep.tsx` | Modified |
| `src/components/onboarding/PaymentReviewStep.tsx` | Modified |
| `src/app/software/onboarding/OnboardingClient.tsx` | Modified |
| `src/config/saas-plans.ts` | Modified |
| `src/app/actions/onboarding.ts` | Modified |
| `src/data/billing.ts` | Modified |
| `src/app/actions/hotel-admin.ts` | Modified |
| `src/app/(super-admin)/admin/leads/page.tsx` | Created |
| `src/app/(super-admin)/layout.tsx` | Modified |
| `src/__tests__/unit/onboarding-issues.test.ts` | Created (14 tests) |
| `src/__tests__/lib/public-lead.test.ts` | Created (1 test) |

## Delta Specs Synced to Main

All 7 delta specs were first-class (no prior main specs existed for these domains). They were copied to `openspec/specs/`:

| Domain | Action |
|--------|--------|
| `lead-capture-label` | Created |
| `lead-form-persistence` | Created |
| `settings-whatsapp-removal` | Created |
| `step7-back-button` | Created |
| `trial-days-constant` | Created |
| `whatsapp-roundtrip` | Created |
| `superadmin-leads-view` | Created |

## Verification Verdict

**PASS WITH WARNINGS**

- **17/17 tasks** complete
- **41/41 spec scenarios** compliant
- **14/14 change-specific tests** passing (+1 public-lead test)
- **0 hardcoded 90-day values** remaining
- **0 TypeScript errors** in changed files (4 pre-existing errors in unrelated test files)
- **0 lint errors** in changed files (581 pre-existing warnings across codebase)
- **Superadmin auth guard** verified: middleware enforces `/admin/*` protection
- **Coherence verified**: All design decisions followed (TRIAL_DAYS in saas-plants.ts, nav guard + PaymentReviewStep, URL pre-fill precedence, server component with supabaseAdmin, no DB schema changes)

## Commit Hash

```
acd683b fix(onboarding): fix 7 onboarding flow issues across 17 tasks
```

## Follow-Up Items

### Warnings (Pre-existing, not caused by this change)
1. 4 TypeScript errors in unrelated test files (`klaviyo-integration.test.ts`, `dark-funnel.test.ts`)
2. 13 pre-existing test failures in `readiness-validation.test.ts`

### Suggestions
1. **Leads page source column** — The design lists a `source` column but the current table derives it from `notes`. Consider extracting and displaying it explicitly.
2. **Remaining hardcoded trial-day values** — 3 files outside this change's scope still use `30 * 24 * 60 * 60 * 1000`:
   - `src/app/api/cron/process-renewals/route.ts:83`
   - `src/app/api/webhooks/wompi/subscription/route.ts:125`
   - `src/app/actions/ota.ts:618`
   A follow-up change could migrate these to `TRIAL_DAYS`.
3. **ESLint codebase cleanup** — 581 pre-existing warnings. A dedicated lint cleanup pass would improve signal quality.
