# Tasks: Onboarding Wizard Redesign (Mac 2026)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~2090 (1380 added + 710 deleted/modified) |
| 400-line budget risk | **High** |
| Chained PRs recommended | **Yes** |
| Suggested split | PR 1 (Foundation) → PR 2 (Store + UI) → PR 3 (Integration) |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main |

Decision needed before apply: Yes (resolved: stacked-to-main, PR 2/3)
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Registry + validation + amenity update + actions | PR 1 | Foundation layer, zero UI, safe to merge independently |
| 2 | Store rewrite + all step components + StepIndicator | PR 2 | Core implementation, self-contained UI |
| 3 | Page orchestrator + provisioning action + success page | PR 3 | Integration layer, depends on PR 1 + PR 2 |

## Phase 1: Foundation

- [x] **1.1** Create `src/lib/room-templates.ts` — `ROOM_TEMPLATES: Record<PropertyType, RoomTemplate[]>` with 18 templates across 5 property types. Export `getTemplatesForProperty(type)` and `getTemplateById(type, id)`.
- [x] **1.2** Create `src/lib/onboarding-schemas.ts` — Zod schemas per step: `hotelIdentitySchema`, `gallerySchema`, `roomDraftSchema`, `roomsListSchema`, `settingsSchema`, `paymentSchema`, `fullWizardStateSchema`. (Path changed from `validations/onboarding.ts` to `onboarding-schemas.ts` per orchestrator.)
- [ ] **1.3** Modify `src/lib/amenity-registry.ts` — Add `category: string` field to `AmenityDefinition` and `RoomAmenityDefinition`. Group into categories ("Conectividad", "Comodidades", etc.).

## Phase 2: State Management

- [x] **2.1** Rewrite `src/store/useOnboardingStore.ts` — Full wizard shape: `currentStep`, `maxCompletedStep`, `hotelId`, `hotelIdentity`, `gallery`, `propertyType`, `rooms[]`, `settings`, `staff`, `payment`, `isSubmitting`, `error`. Add `setField()`, `goToStep()`, `saveDraft()` (debounced 500ms), `recoverFromDB()`. Use Zod for validation.

## Phase 3: UI Components

- [x] **3.1** Create `src/components/onboarding/StepIndicator.tsx` — 6-step progress bar. Completed steps = checkmark, current = highlighted, future = dimmed. Click completed to navigate back. Accept `currentStep, maxCompletedStep, onStepClick`.
- [x] **3.2** Create `src/components/onboarding/HotelIdentityStep.tsx` — Step 1: name/city/location (required), address/phone/email behind "Más detalles" accordion. Logo + cover upload via `uploadOptimizedImageAction(folder='covers'|'hero')`. Real-time Zod validation.
- [x] **3.3** Create `src/components/onboarding/PropertyGalleryStep.tsx` — Step 2: 3-8 photos, drag-and-drop reorder (`@dnd-kit/sortable`), upload via `uploadOptimizedImageAction(folder='gallery')`. Preview grid with blur placeholders. Min 3 validation.
- [x] **3.4** Create `src/components/onboarding/PropertyTypeStep.tsx` — Step 3: 5 property type badges (Hotel/Glamping/Cabañas/Hostal/Apartamento). Selection drives Step 4 templates. Changing type clears existing rooms.
- [x] **3.5** Create `src/components/onboarding/RoomTemplatesStep.tsx` — Step 4: template selector filtered by propertyType + room list. "Agregar personalizada" for custom rooms. Validation: ≥1 room with name + price > 0. Room list with inline expand/collapse.
- [x] **3.6** Create `src/components/onboarding/RoomDetailStep.tsx` — Step 4b: inline editor for name/price/description/capacity, amenities toggles (`ROOM_AMENITY_REGISTRY`), gallery (max 5 via `uploadOptimizedImageAction(folder='rooms')`), DayPicker availability range.
- [x] **3.7** Create `src/components/onboarding/SettingsStep.tsx` — Step 5: hotel amenities toggle (`AMENITY_REGISTRY`), check-in/out time, WhatsApp, Google Maps, cancellation. Advanced accordion (SEO, trust badges, reception hours). Staff editor pre-filled from DB.
- [x] **3.8** Create `src/components/onboarding/PaymentStep.tsx` — Step 6: summary of all data. `WompiButton` with amount from `?price=` (default 89900). On success → calls `executeProvisioningAction`. Error state with retry.
- [ ] **3.9** Create `src/components/onboarding/ProvisioningStep.tsx` — Loading overlay with 3 progress stages ("Subiendo imágenes", "Guardando datos", "Configurando unidades"). Navigation lock. Error state with retry button.

## Phase 4: Integration

- [ ] **4.1** Modify `src/app/actions/onboarding.ts` — ✅ `executeOnboardingProvisioning(state)` done (Phase 1). ⬜ `saveOnboardingDraftAction(hotelId, step, config)` pending. ⬜ `recoverOnboardingAction()` pending.
- [ ] **4.2** Rewrite `src/app/software/onboarding/page.tsx` — Thin orchestrator (~80 LOC): step machine with `AnimatePresence`, store sync (`recoverFromDB` on mount), route to correct step component. No inline forms.
- [ ] **4.3** Create `src/app/software/onboarding/success/page.tsx` — Post-provisioning success: "¡Tu propiedad está lista!" message, preview link, dashboard link, OTA config link.
