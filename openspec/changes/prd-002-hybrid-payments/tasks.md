# Tasks: PRD-002 Hybrid Payments

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~650–700 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (DB + backend) → PR 2 (onboarding UI) → PR 3 (admin + dashboard) |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | DB migration + server actions + schema types | PR 1 | Foundation: blocks everything else |
| 2 | Onboarding UI (PaymentReviewStep + ManualPaymentCard + store + provisioning) | PR 2 | Depends on PR 1 |
| 3 | Super Admin page + Hotelier dashboard banner + e2e tests | PR 3 | Depends on PR 2 |

## Phase 1: Foundation — DB & Backend

- [x] 1.1 Create `supabase/migrations/024_manual_payments.sql`: `manual_payments` table (id, hotel_id, user_id, amount, method, status, receipt_url, rejection_reason, created_at, approved_at, approved_by) + indexes on hotel_id and status
- [x] 1.2 Add `pending_approval` to `hotels.subscription_status` CHECK constraint (DROP + recreate, same pattern as migration 011)
- [x] 1.3 Create storage bucket `manual-payment-receipts` with RLS (authenticated upload to own folder, admin read all)
- [x] 1.4 Add RLS policies on `manual_payments`: authenticated users INSERT/SELECT own, admin all via service role
- [x] 1.5 Create `src/app/actions/manual-payments.ts`: `uploadManualPaymentReceipt`, `createManualPayment`, `approveManualPayment`, `rejectManualPayment`, `getPendingManualPayments`
- [x] 1.6 Update `src/types/database.ts`: add `ManualPayment` Row/Insert/Update types + `pending_approval` to hotels enums

## Phase 2: Onboarding UI

- [x] 2.1 Extend `useOnboardingStore`: add `paymentMethod: 'wompi' \| 'manual' \| null`, `manualReceiptUrl`, `setPaymentMethod`, `setManualReceiptUrl`
- [x] 2.2 Update `src/lib/onboarding-schemas.ts`: add `paymentMethod` and `manualReceiptUrl` to `paymentSchema` and `FullWizardState`
- [x] 2.3 Create `src/components/onboarding/ManualPaymentCard.tsx`: Nequi `3213795015` / Daviplata `3213795015` display + file upload with preview + upload button calling `uploadManualPaymentReceipt`
- [x] 2.4 Update `PaymentReviewStep.tsx`: add method selector (tab/radio Wompi vs Manual), conditionally render WompiButton or ManualPaymentCard, set paymentMethod on selection
- [x] 2.5 Wire `OnboardingClient.tsx` to include `paymentMethod` and `manualReceiptUrl` in the `FullWizardState` passed to provisioning
- [x] 2.6 Update `executeOnboardingProvisioning` in `onboarding.ts`: branch on payment method — Wompi → `status: 'active'`, `subscription_status: 'trialing'`; Manual → `status: 'draft'`, `subscription_status: 'pending_approval'`, create manual_payments record

## Phase 3: Admin & Dashboard

- [x] 3.1 Create `src/app/(super-admin)/admin/payments/pending/page.tsx` — RSC fetching pending/approved/rejected manual_payments with hotel name join
- [x] 3.2 Create `src/components/super-admin/ManualPaymentRow.tsx` — per-payment row with hotel name, amount, method, receipt thumbnail preview modal, approve/reject actions
- [x] 3.3 Add tabs (Pending / Approved / Rejected) to the super admin payments page with status filtering
- [x] 3.4 Add "pending approval" status banner in `src/app/(admin)/dashboard/page.tsx` when `hotel.subscription_status === 'pending_approval'`

## Phase 4: Testing & Cleanup

- [ ] 4.1 Test: Manual selection → receipt upload → `createManualPayment` inserts pending record
- [ ] 4.2 Test: `approveManualPayment` → hotel transitions to `active` + `subscription_status` to `trialing` + trial_ends_at set
- [ ] 4.3 Test: `rejectManualPayment` → manual_payments status = 'rejected' with rejection_reason stored
- [ ] 4.4 Test: Super admin page loads correct tab-based filtered data
- [ ] 4.5 Verify demo bypass works for Wompi flow, zero regression
