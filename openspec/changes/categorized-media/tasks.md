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

## Phase 1: DB Foundation (CRÍTICA)

- [ ] 1.1 Create migration `030_hotel_images.sql` — ENUM, TABLE, composite indexes, RLS, data migration gallery_urls→hotel_images, blur metadata via LATERAL join
- [ ] 1.2 Add hotel_images types to `database.ts` — Row/Insert/Update with Supabase typegen parity
- [ ] 1.3 Export ImageCategory union + CategorizedImage interface in `types/index.ts`
- [ ] 1.4 [TDD] Write tests T13 (gallery_urls→hotel_images preserves all URLs) + T14 (blur metadata per-image via URL match)

Deps: none | Tests: T13, T14 | Files: supabase/migrations/030_hotel_images.sql, src/types/database.ts, src/types/index.ts | ~165L

## Phase 2: Schemas + Validators (ALTA)

- [ ] 2.1 Create `src/lib/image-category.ts` — ImageCategory union, CATEGORY_DISPLAY_ES, CATEGORY_PRIORITY array
- [ ] 2.2 Create `src/lib/jargon-guard.ts` + test — validateNoJargon() rejects OTA/Marketplace/Vitrina Digital (T12)
- [ ] 2.3 [RED] Failing tests T1-T4: T1 (8 valid categories pass), T2 (null/missing category rejects w/ "Categoría requerida"), T3 (fullWizardStateSchema still passes), T4 (category-null mutation-mindset: removing category makes test fail)
- [ ] 2.4 [GREEN] Add imageCategoryEnum + categorizedImageSchema to onboarding-schemas.ts; refactor propertyGallerySchema as z.array(categorizedImageSchema).min(3)

Deps: P1 | Tests: T1-T4, T12 | Files: src/lib/image-category.ts, src/lib/jargon-guard.ts, src/lib/onboarding-schemas.ts, src/lib/__tests__/onboarding-schemas.test.ts | ~165L

## Phase 3: Upload UI (ALTA)

- [ ] 3.1 [RED] Failing component test: CategorizedDropzone renders 8 per-category containers with labels (T5)
- [ ] 3.2 [GREEN] Create CategorizedDropzone.tsx — 8 react-dropzone zones, display names, per-category file state
- [ ] 3.3 Update useOnboardingStore.ts — add categorizedImages: CategorizedImage[] + addImage/removeImage/clearAll actions
- [ ] 3.4 [RED] Failing integration test: upload with category persists to hotel_images (T6)
- [ ] 3.5 [GREEN] Modify PropertyGalleryStep.tsx — replace flat dropzone with CategorizedDropzone, submit categorized images

Deps: P2 | Tests: T5, T6 | Files: src/components/onboarding/CategorizedDropzone.tsx, PropertyGalleryStep.tsx, src/store/useOnboardingStore.ts | ~250L

## Phase 4: Display (MEDIA)

- [ ] 4.1 [RED] Failing tests T7-T9: T7 (CategorizedHeroGallery groups by priority), T8 (mobile aspect-ratio no crop), T9 (mutation-mindset: category filter bypass kills compilation/assertion)
- [ ] 4.2 [GREEN] Create CategorizedHeroGallery.tsx — groups images by CATEGORY_PRIORITY; adapter yields flat {url, alt}[] for lightbox
- [ ] 4.3 Modify HeroGallery.tsx — accept optional `categories: CategorizedImage[]` prop; fallback to flat images when absent
- [ ] 4.4 Modify hotel/[slug]/page.tsx — query hotel_images via getHotelDetailsBySlugAction JOIN; buildCategorizedGallery(); fallback to legacy gallery_urls when empty

Deps: P1, P5 | Tests: T7-T9 | Files: src/components/ota/CategorizedHeroGallery.tsx, HeroGallery.tsx, src/app/(ota)/hotel/[slug]/page.tsx | ~260L

## Phase 5: Server Actions (ALTA)

- [ ] 5.1 [RED] Failing tests T10 (addHotelImageAction inserts correct row with auth guard) + T11 (updateHotelProfileAction backward compat with pre-migration hotel)
- [ ] 5.2 [GREEN] Create src/app/actions/hotel-images.ts — addHotelImageAction, deleteHotelImageAction, getHotelImagesAction with admin auth guard
- [ ] 5.3 Modify onboarding-upload.ts — add getPresignedCategoryUrlAction() using hotels/{hotelId}/{category}/ path pattern
- [ ] 5.4 Modify onboarding.ts — dual-write: insert into hotel_images + legacy gallery_urls; set main_image_url from first priority image
- [ ] 5.5 Modify settings.ts — updateHotelProfileAction reads/writes hotel_images; categorized support for gallery management

Deps: P1 | Tests: T10, T11 | Files: src/app/actions/hotel-images.ts, onboarding-upload.ts, onboarding.ts, settings.ts | ~235L

## Risks

- Phase 3 at ~250L (estimate) — if CategorizedDropzone requires extensive styling/internationalization headers, may push toward 300L. Still under 400L budget. Consider deferring i18n label headers to a follow-up if tight.
- Phase 4 depends on Phase 5 — introduces sequential dependency in an otherwise parallelizible pipeline. Mitigation: implement Phase 5.1-5.2 (CRUD actions) before Phase 4 even if Phase 5.3-5.5 are still WIP, since Phase 4 only needs the query layer.
- Phase 2 schema refactor (propertyGallerySchema changing from string[] to CategorizedImage[]) may break existing tests. Verify backward-compat via discriminated union or keep both schemas in parallel during migration.
