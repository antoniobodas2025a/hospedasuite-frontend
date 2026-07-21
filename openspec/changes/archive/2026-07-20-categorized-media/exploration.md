# Exploration: Categorized Media Management

## Current State

Images are stored as a flat `gallery_urls` (text[]) column in the `hotels` table with **NO categorization**. The OTA channel page (`hotel/[slug]/page.tsx`) builds a gallery by deduplicating `main_image_url`, `cover_photo_url`, and `gallery_urls[]` into a flat `{url, alt}[]` array for `HeroGallery`.

### Current data model (database `hotels` table)
- `main_image_url`: text (single hero image)
- `cover_photo_url`: text (secondary image)
- `gallery_urls`: text[] (flat array of URLs — no categories)
- `image_blur_meta`: jsonb (stored on hotels for next/image blur placeholders)

### Upload pipeline
- **Client-side**: `upload-utils.ts` → compress → presigned URL → direct R2 upload → blur generation
- **Server actions**: `onboarding-upload.ts` generates presigned URLs with `onboarding/{userId}/` prefix
- **Existing hotels**: `settings.ts` `updateHotelProfileAction` manages gallery_urls via Zod validation
- **R2**: Manual AWS Signature V4 (`r2-client.ts` for presigned, `r2-upload.ts` for server-side)

### Onboarding flow (PropertyGalleryStep)
Files → blob previews → Zustand store → provisioning writes to `hotels.gallery_urls` as a flat array. No category selection during upload.

---

## Approach: 5 Phases

### Phase 1 — DB Migration (CRITICAL)
Create `hotel_images` table with foreign key to `hotels`, category enum, sort_order, blur_data, and composite indexes. Migrate existing `gallery_urls[]` data with default category `otros`.

### Phase 2 — Zod Schemas (HIGH)
Add `imageCategoryEnum` with 8 categories. Refactor `propertyGallerySchema` to validate categorized image arrays.

### Phase 3 — UI Upload (HIGH)
Create `CategorizedDropzone` with category selector per batch. Refactor `PropertyGalleryStep` and `useOnboardingStore` to carry category data.

### Phase 4 — Frontend Display (MEDIUM)
Refactor `HeroGallery` to accept and render categorized images grouped by category with priority ordering (exterior > lobby > amenities). Update hotel page gallery-building logic to query `hotel_images`.

### Phase 5 — Server Actions (HIGH)
Create dedicated `hotel-images.ts` server actions for CRUD. Update onboarding provisioning and settings actions. Add category-aware upload path (`hotels/{hotelId}/{category}/`).

---

## Affected Files

### Phase 1
| File | Change |
|------|--------|
| `supabase/migrations/030_hotel_images.sql` | **NEW** — Create table, indexes, RLS, migration of existing data |
| `src/types/database.ts` | Add `hotel_images` table types |

### Phase 2
| File | Change |
|------|--------|
| `src/lib/onboarding-schemas.ts` | Add `imageCategoryEnum`, refactor `propertyGallerySchema` |
| `src/lib/__tests__/onboarding-schemas.test.ts` | Add category validation tests |

### Phase 3
| File | Change |
|------|--------|
| `src/components/onboarding/PropertyGalleryStep.tsx` | Refactor to use CategorizedDropzone |
| `src/components/onboarding/CategorizedDropzone.tsx` | **NEW** — Category-aware dropzone |
| `src/store/useOnboardingStore.ts` | Add category state per gallery image |

### Phase 4
| File | Change |
|------|--------|
| `src/components/ota/HeroGallery.tsx` | Group by category, priority ordering |
| `src/app/(ota)/hotel/[slug]/page.tsx` | Query `hotel_images` instead of building flat gallery |
| `src/app/actions/ota.ts` | Join hotel_images in getHotelDetailsBySlugAction |
| `src/types/index.ts` | Update `Hotel` type if gallery structure changes |

### Phase 5
| File | Change |
|------|--------|
| `src/app/actions/onboarding-upload.ts` | Extend for category-aware paths |
| `src/app/actions/onboarding.ts` | Write to `hotel_images` instead of `gallery_urls` |
| `src/app/actions/settings.ts` | `updateHotelProfileAction` — handle categorized images |
| `src/app/actions/hotel-images.ts` | **NEW** — Dedicated CRUD for hotel images |

### Other affected
| File | Change |
|------|--------|
| `src/lib/image-config.ts` | Category-aware URL resolution |
| `src/lib/provisioning-guard.ts` | Update validation for new structure |
| `src/lib/upload-utils.ts` | Category metadata during upload |
| `scripts/fix-hotels-photos.ts` | Migration support |
| `scripts/check-hotel-images.ts` | Validation support |

---

## Dependencies

```
Phase 1 (DB) ──→ Phase 2 (Schemas) ──→ Phase 3 (UI Upload)
                  │                        │
                  │                        └──→ Phase 4 (Frontend)
                  │
Phase 1 (DB) ──→ Phase 5 (Server Actions)
```

- **Phase 1** blocks everything (no table = nothing works)
- **Phase 2** blocks Phase 3 (schemas drive UI validation and data integrity)
- **Phase 5** depends on Phase 1, can run parallel to Phase 2/3
- **Phase 4** is leaf dependency — can start after Phase 1 when new query layer is available
- Phase 3 and Phase 4 can be partially parallelized if the data model is agreed upon

---

## Risks & Gaps

### 1. Data model mismatch (ARCHITECTURAL)
The plan proposes a new `hotel_images` table. Current model stores images inline as `gallery_urls[]`. Two options:

| Aspect | Option A: New table | Option B: Extend JSONB |
|--------|--------------------|------------------------|
| Normalization | ✅ Full | ❌ Denormalized |
| Query simplicity | ❌ JOIN everywhere | ✅ Single table query |
| Migration effort | ❌ Higher | ✅ Lower |
| Indexing | ✅ Composite indexes | ⚠️ GIN indexes |
| Scalability | ✅ Better at scale | ⚠️ Column bloat |

**Recommendation**: Option A is correct, but the plan must account for the JOIN performance impact on the OTA page (`select * from hotels` → `select + join hotel_images`).

### 2. Missing migration strategy for existing data
- All existing `gallery_urls[]` entries must migrate to `hotel_images` with `category = 'otros'`
- `main_image_url` and `cover_photo_url` are separate columns — do they also move? If not, HeroGallery reads from 3 sources.
- `image_blur_meta` JSONB must be migrated to per-image blur column in new table.

### 3. Backward compatibility of HeroGallery
Current `HeroGalleryProps` accepts flat `images: { url: string; alt?: string }[]`. Phase 4 adds category grouping with priority. This is a non-trivial interface change that affects the hotel page, the component itself, and any other consumers.

### 4. Missing blurDataURL handling
Blur metadata (`ImageBlurMeta`) currently stored on `hotels.image_blur_meta`. Moving to `hotel_images` means per-image blur storage. The `uploadImage` pipeline already generates blur at upload time — this data must be persisted to the new table.

### 5. Settings page (existing hotels) parallel path
The plan focuses on onboarding, but production hotels manage images via `dashboard/settings` → `updateHotelProfileAction`. This action currently sends `gallery_urls` as `z.array(z.string().url())`. Needs a parallel migration for categorized management.

### 6. Storage path convention
Current uploads go to `onboarding/{userId}/`. Categorized images should use `hotels/{hotelId}/{category}/` for logical organization. This requires updating the presigned URL generation and managing the path transition.

---

## Recommendations

**Proceed with adjustments:**

| Phase | Verdict | Adjustment |
|-------|---------|------------|
| 1 (DB) | ✅ Go | Add composite index `(hotel_id, category, sort_order)`. Migration SQL for existing data. |
| 2 (Schemas) | ✅ Go | Add `imageCategoryEnum`. Schema includes `{url, category, blur}` per image. |
| 3 (UI Upload) | ⚠️ Adjust | Integrate with existing `batchUpload`/`uploadImage` pipeline. Category selector per batch. Store carries category + URL. |
| 4 (Frontend) | ⚠️ Adjust | New HeroGallery interface for categorized images. Backward-compatible lightbox. Page queries `hotel_images`. |
| 5 (Server Actions) | ⚠️ Adjust | Add CRUD for hotel_images. Update `settings.ts` for existing hotels. Upload path: `hotels/{hotelId}/{category}/`. |

### Key design decisions to formalize in proposal
1. Do `main_image_url` and `cover_photo_url` migrate to `hotel_images` or remain separate?
2. Category priority order for display
3. Sort order strategy (manual drag-drop or automatic by upload time within category)
4. R2 storage path convention for categorized uploads
5. Whether to keep backward compatibility in HeroGallery or break the interface

### Ready for Proposal
**Yes** — proceed to sdd-propose.

---

## Verification Points

- [ ] `hotel_images` table has composite index on `(hotel_id, category, sort_order)`
- [ ] Migration covers all existing `gallery_urls[]` data
- [ ] `image_blur_meta` is migrated per-image
- [ ] Onboarding store carries category with each image
- [ ] Settings page has categorized gallery management for existing hotels
- [ ] R2 upload path updates to `hotels/{hotelId}/{category}/`
- [ ] HeroGallery renders categories with correct priority
- [ ] OTA page query joins `hotel_images` efficiently
- [ ] Tests cover migration, schema validation, categorized upload, and categorized display
- [ ] Rollback plan: migration DOWN script restores `gallery_urls[]` from `hotel_images`
