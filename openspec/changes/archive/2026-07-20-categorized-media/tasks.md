# Tasks: Categorized Media Management

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Total est. lines | ~1075 (5 phases × ~165-260 each) |
| 400-line risk | Low — each phase fits independently |
| Chained PRs | Yes — 1 per phase |
| Split | PR1 (DB) → PR2 (Schemas) → PR3 (UI) → PR5 (Actions) → PR4 (Display) |
| Strategy | ask-on-risk |
| Chain | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: Low

### Work Units

| Unit | Goal | PR | Base |
|------|------|----|------|
| 1 | DB normalization + migration tests | PR 1 | main |
| 2 | Zod schemas + validators (image-category, jargon-guard) | PR 2 | main |
| 3 | Upload UI (CategorizedDropzone, store, gallery step) | PR 3 | main |
| 4 | Display (CategorizedHeroGallery, adapter, OTA page) | PR 4 | main |
| 5 | Server Actions (CRUD, onboarding wiring, settings) | PR 5 | main |

## Phase 1: DB Foundation (CRÍTICA) ✅ COMPLETE

- [x] 1.1 Create migration `030_hotel_images.sql` — ENUM, TABLE, composite indexes, RLS, data migration gallery_urls→hotel_images, blur metadata via LATERAL join
- [x] 1.2 Add hotel_images types to `database.ts` — Row/Insert/Update with Supabase typegen parity
- [x] 1.3 Export ImageCategory union + CategorizedImage interface in `types/index.ts`
- [x] 1.4 [TDD] Write tests T13 (gallery_urls→hotel_images preserves all URLs) + T14 (blur metadata per-image via URL match)

**Commit**: `8d296cb` — feat: add hotel_images table with category constraints
**Tests**: 26 new tests passing
**Deps**: none | Tests: T13, T14 | Files: supabase/migrations/030_hotel_images.sql, src/types/database.ts, src/types/index.ts | ~165L

## Phase 2: Schemas + Validators (ALTA) ✅ COMPLETE

- [x] 2.1 Create `src/lib/image-category.ts` — ImageCategory union, CATEGORY_DISPLAY_ES, CATEGORY_PRIORITY array
- [x] 2.2 Create `src/lib/jargon-guard.ts` + test — validateNoJargon() rejects OTA/Marketplace/Vitrina Digital (T12)
- [x] 2.3 [RED] Failing tests T1-T4: T1 (8 valid categories pass), T2 (null/missing category rejects w/ "Categoría requerida"), T3 (fullWizardStateSchema still passes), T4 (category-null mutation-mindset: removing category makes test fail)
- [x] 2.4 [GREEN] Add imageCategoryEnum + categorizedImageSchema to onboarding-schemas.ts; refactor propertyGallerySchema as z.array(categorizedImageSchema).min(3)

**Commit**: `ff3297a` — feat: add Zod schemas for categorized images
**Tests**: 27 new tests passing (T1-T4, T12)
**Deps**: P1 | Tests: T1-T4, T12 | Files: src/lib/image-category.ts, src/lib/jargon-guard.ts, src/lib/onboarding-schemas.ts, src/lib/__tests__/onboarding-schemas.test.ts | ~106L

## Phase 3: Upload UI (ALTA) ✅ COMPLETE

- [x] 3.1 [RED] Failing tests: 32 tests written first (store: 16, CategorizedDropzone: 10, PropertyGalleryStep: 6)
- [x] 3.2 [GREEN] Create `src/store/useHotelImagesStore.ts` — Zustand store with categorized image management
- [x] 3.3 [GREEN] Create `src/components/onboarding/CategorizedDropzone.tsx` — 8 per-category react-dropzone zones
- [x] 3.4 [GREEN] Refactor `PropertyGalleryStep.tsx` — integrated CategorizedDropzone + store
- [x] 3.5 Install react-dropzone@19.0.2

**Commit**: `5b263b7` (feat) / `ea947a6` (fix: store previews) / `6c3952a` (feat: upload UI)
**Tests**: 32 new tests passing (T5, T6)
**Deps**: P2 | Tests: T5, T6 | Files: src/components/onboarding/CategorizedDropzone.tsx, PropertyGalleryStep.tsx, src/store/useHotelImagesStore.ts | ~220L

## Phase 4: Display (MEDIA) ✅ COMPLETE

- [x] 4.1 [RED] 17 failing tests: T7 (CategorizedHeroGallery: 7), T8 (responsive: 3), T9 (adapter: 7)
- [x] 4.2 [GREEN] Create `src/components/ota/CategorizedHeroGallery.tsx` — groups by CATEGORY_PRIORITY, Spanish labels, responsive grid (1/2/3 cols), lightbox with keyboard nav
- [x] 4.3 [GREEN] Create `src/lib/adapters/legacy-gallery-adapter.ts` — converts flat URLs to CategorizedImage[] with default 'otros'
- [x] 4.4 [GREEN] Create feature flag in `src/lib/flags.ts`; modify `getHotelDetailsBySlugAction` to JOIN hotel_images; OTA page conditional rendering

**Commit**: `779983a` — feat: add CategorizedHeroGallery with adapter pattern and feature flag
**Tests**: 17 new tests passing (T7-T9)
**Deps**: P1, P5 | Tests: T7-T9 | Files: src/components/ota/CategorizedHeroGallery.tsx, src/lib/adapters/legacy-gallery-adapter.ts, src/lib/flags.ts, src/app/(ota)/hotel/[slug]/page.tsx, src/app/actions/ota.ts | ~260L

## Phase 5: Server Actions (ALTA) ✅ COMPLETE

### Read Layer (5.1-5.3) ✅ COMPLETE
- [x] 5.1 [RED] 10 failing tests: T10 (getHotelImagesAction: 5 tests) + T11 (getPresignedUrlAction: 5 tests)
- [x] 5.2 [GREEN] Create `src/app/actions/hotel-images.ts` — getHotelImagesAction + getPresignedUrlAction
- [x] 5.3 Add `getPresignedReadUrl` to `src/lib/r2-client.ts` — manual AWS Signature V4 for GET (1h expiry)

**Commit**: `f94929d` — feat: add read-only server actions for hotel images
**Tests**: 10 new tests passing (T10+T11 read layer)

### Write Layer (5.4-5.9) ✅ COMPLETE
- [x] 5.4 [RED] 18 failing tests: T10 extend (uploadHotelImageAction: 5) + T11 extend (getPresignedCategoryUrlAction: 7) + T12 (jargon-guard: 6)
- [x] 5.5 [GREEN] Create `getPresignedCategoryUrlAction` — category-aware presigned PUT URLs
- [x] 5.6 [GREEN] Create `uploadHotelImageAction` — inserts into hotel_images with auth guard + validation
- [x] 5.7 [GREEN] Modify `executeOnboardingProvisioning` — dual-write to hotel_images + gallery_urls
- [x] 5.8 [GREEN] Modify `updateHotelProfileAction` — categorized_images support + backward compat
- [x] 5.9 Install server-only@0.0.1 (dev dependency for test mocks)

**Commit**: `dc70f19` — feat: add write server actions for hotel images with dual-write
**Tests**: 18 new tests passing (T10+T11+T12 write layer)
**Deps**: P1 | Tests: T10, T11, T12 | Files: src/app/actions/hotel-images.ts, onboarding.ts, settings.ts | ~217L

## Risks

- Phase 3 at ~250L (estimate) — if CategorizedDropzone requires extensive styling/internationalization headers, may push toward 300L. Still under 400L budget. Consider deferring i18n label headers to a follow-up if tight.
- Phase 4 depends on Phase 5 — introduces sequential dependency in an otherwise parallelizible pipeline. Mitigation: implement Phase 5.1-5.2 (CRUD actions) before Phase 4 even if Phase 5.3-5.5 are still WIP, since Phase 4 only needs the query layer.
- Phase 2 schema refactor (propertyGallerySchema changing from string[] to CategorizedImage[]) may break existing tests. Verify backward-compat via discriminated union or keep both schemas in parallel during migration.
