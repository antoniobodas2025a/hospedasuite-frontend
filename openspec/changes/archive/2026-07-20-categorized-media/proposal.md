# Proposal: Categorized Media Management

## Intent

Hotel images are stored in flat `gallery_urls[]` — no categories, no organization. Property managers spend ~45 min configuring visuals vs 15 min target. This drives low NPS (35), poor conversion (−25% visual ROI), and technical debt (redundancy, no type safety). Solution: normalize into a `hotel_images` table with categories across the full stack — DB → Upload → Display → Management.

## Scope

### In Scope
1. **DB Normalization**: New `hotel_images` table with FK, categories, blur_data, sort_order; migration of existing data; composite indexes
2. **Zod Schemas**: `imageCategoryEnum`, refactored `propertyGallerySchema` with category validation
3. **UI Upload**: `CategorizedDropzone` component, category-aware PropertyGalleryStep, Zustand store updates
4. **Frontend Display**: Category-grouped HeroGallery with priority ordering (exterior > lobby > amenities), backward-compatible interface
5. **Server Actions**: Dedicated `hotel-images.ts` CRUD actions, settings parity via `updateHotelProfileAction`, onboarding provisioning update

### Out of Scope
- Image drag-and-drop reordering — deferred to post-MVP
- Bulk image management dashboard — future feature
- Video media support — not in scope
- AI auto-categorization — future enhancement
- Public REST API for third-party access — not in scope

## Capabilities

### New Capabilities
- `hotel-media`: Categorized image management — upload, categorize, display, and manage hotel images across onboarding, settings, and public OTA gallery

### Modified Capabilities
None — no existing spec changes at the requirements level

## Approach

Normalize flat `gallery_urls[]` into `hotel_images` table across 5 phases:

```
Phase 1 (DB) ──→ Phase 2 (Schemas) ──→ Phase 3 (UI Upload)
                   ↓                         ↓
Phase 1 (DB) ──→ Phase 5 (Server Actions) ──→ Phase 4 (Frontend)
```

### Key Design Decisions

1. **Data model**: New `hotel_images` table (FK→hotels) over extending JSONB. Rationale: queryable by category, indexable, cleaner for future features (ordering, bulk ops). Composite index on `(hotel_id, category, sort_order)`.
2. **Migration**: `gallery_urls[]` → `hotel_images` with `category='otros'`; `main_image_url`/`cover_photo_url` stay on `hotels`; `image_blur_meta` migrates to per-image `blur_data` column in new table
3. **Settings parity**: `updateHotelProfileAction` gets full categorized support — existing hotels are not second-class citizens
4. **HeroGallery compatibility**: New `CategorizedImage[]` interface; adapter preserves backward-compatible flat rendering for lightbox
5. **R2 paths**: Migrate from `onboarding/{userId}/` to `hotels/{hotelId}/{category}/`; existing URLs preserved in migration, new uploads use new path

## Affected Areas

| Area | Impact | Priority |
|------|--------|----------|
| `supabase/migrations/030_hotel_images.sql` | New migration | Critical |
| `src/types/database.ts` | Add hotel_images table types | Critical |
| `src/lib/onboarding-schemas.ts` | Add imageCategoryEnum, refactor gallery schema | High |
| `src/components/onboarding/PropertyGalleryStep.tsx` | Category-aware dropzone | High |
| `src/components/ota/HeroGallery.tsx` | Category-grouped display | High |
| `src/app/(ota)/hotel/[slug]/page.tsx` | Query hotel_images instead of flat cols | High |
| `src/app/actions/settings.ts` | Categorized image management | High |
| `src/app/actions/hotel-images.ts` | NEW: CRUD actions | High |
| `src/store/useOnboardingStore.ts` | Category state in gallery previews | Medium |
| `src/app/actions/onboarding-upload.ts` | Category in presigned URL generation | Medium |
| `src/app/actions/onboarding.ts` | Provisioning writes to hotel_images | Medium |
| `src/lib/provisioning-guard.ts` | URL validation for new structure | Low |

## Risks

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Migration data loss | Low | Backup tables + transactional migration with ROLLBACK on failure |
| Breaking HeroGallery on live OTA | Medium | Adapter pattern: old flat interface still renders existing hotels |
| Settings page regression for existing hotels | Medium | Feature-flag behind hotel version; test against production dataset before rollout |
| R2 path change breaks external references | Low | Migration preserves original URLs; new uploads use hotelId paths |
| Performance regression from JOIN | Low | Composite index + selective column queries (no `SELECT *`) |

## Rollback Plan

1. **Revert migration**: `DROP TABLE hotel_images` — existing `hotels` columns untouched
2. **Revert code**: Git revert per-phase PRs (chained, granular per phase)
3. **Data rollback**: `UPDATE hotels SET gallery_urls = array_agg(url) FROM hotel_images WHERE hotel_id = id`
4. **Frontend fallback**: Feature flag restores old HeroGallery interface

## Dependencies

- Supabase project write access for migration execution
- R2 bucket path convention finalized before Phase 3
- `react-dropzone` availability confirm in `package.json`
- Phase 1 blocks all downstream phases; Phases 2+3 can parallelize with Phase 5

## Success Criteria

| Metric | Current | Target |
|--------|---------|--------|
| Time to configure visuals | 45 min | ≤15 min |
| NPS (media setup) | 35 | ≥60 |
| Conversion (complete media → booking) | baseline | +15% |
| Lighthouse Accessibility | 60 | ≥95 |
| Existing hotel rendering | — | Zero regression |
| Gallery URL migration coverage | 0% | 100% |
| Blur metadata migration coverage | 0% | 100% |
