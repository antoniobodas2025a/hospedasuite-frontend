# Proposal: Consume Multi-Size Image URLs and Blur Placeholders

## Intent

`uploadOptimizedImageAction` already generates 3 sizes (thumb/card/full) + blurDataURL per image, but the data is discarded — only `result.url` (full) is stored and consumed. Components render single-size images with no blur placeholders, wasting the upload work and degrading perceived performance on the OTA.

## Scope

### In Scope
- Store blurDataURL alongside existing URL columns (new JSONB column `image_blur_meta` on `hotels` table)
- Wire `getImageSizeUrl` into OTA components for responsive srcSet
- Add blur placeholder support to HeroGallery, HotelCard, HotelGallery, RoomCard, RoomGallery
- Unify RoomEditorModal upload pipeline to use `uploadOptimizedImageAction` instead of client-side canvas
- Add `buildSrcSet()` helper to `image-config.ts`

### Out of Scope
- Migrating existing images to multi-size (legacy images handled gracefully by getImageSizeUrl)
- Room image storage schema changes (room images stay as single URL strings)
- CDN-level responsive delivery (handled by Next.js Image + srcSet)

## Capabilities

### New Capabilities
- `image-multi-size`: Responsive image consumption with blur placeholders across OTA components

### Modified Capabilities
- None — existing image upload and storage capabilities unchanged

## Approach

1. **DB**: Add `image_blur_meta JSONB` column to `hotels` table. Stores `{ main_image_blur, cover_photo_blur, gallery_blurs: [{url, blur}] }`. Additive, zero breaking changes.
2. **SettingsPanel**: On upload, store `result.urls.full` in existing columns (backward compatible) AND persist `result.blurDataURL` into `image_blur_meta`.
3. **image-config.ts**: Add `buildSrcSet(baseUrl, sizes)` helper that returns `{ srcSet, blurDataURL }` for `<Image>` components.
4. **OTA components**: Replace direct URL usage with `getImageSizeUrl()` for srcSet. Add `placeholder="blur"` + `blurDataURL` to `<Image>`.
5. **RoomEditorModal**: Replace client-side canvas resize with `uploadOptimizedImageAction(folder='rooms')`. Store result URLs + blur in room image metadata.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `supabase/hotels` table | Modified | Add `image_blur_meta` JSONB column |
| `src/app/actions/settings.ts` | Modified | Accept + persist blur metadata alongside URLs |
| `src/components/dashboard/SettingsPanel.tsx` | Modified | Capture blurDataURL from upload result, save to meta column |
| `src/lib/image-config.ts` | Modified | Add `buildSrcSet()` helper |
| `src/components/ota/HeroGallery.tsx` | Modified | Use srcSet + blur placeholder |
| `src/components/ota/HotelCard.tsx` | Modified | Use card size + blur |
| `src/components/ota/HotelGallery.tsx` | Modified | Use srcSet + blur on hero |
| `src/components/ota/RoomCard.tsx` | Modified | Use card size + blur |
| `src/components/ota/RoomGallery.tsx` | Modified | Use srcSet + blur |
| `src/components/dashboard/RoomEditorModal.tsx` | Modified | Unify to uploadOptimizedImageAction |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Legacy images break with getImageSizeUrl | Low | getImageSizeUrl already handles legacy (returns original URL) |
| JSONB column adds query complexity | Low | Blur meta read-only at render time, no filtering needed |
| RoomEditorModal canvas removal breaks existing room images | Low | Existing room images remain valid; only new uploads change |
| Zod schema rejects new meta field | Med | Schema updated to accept optional `image_blur_meta` field |

## Rollback Plan

1. Revert all component changes — they fall back to single URL strings (existing behavior)
2. `image_blur_meta` column is additive; no data loss if ignored
3. RoomEditorModal canvas code preserved in git history for quick revert
4. No migration to roll back — column can be dropped safely if empty

## Dependencies

- Supabase migration: `ALTER TABLE hotels ADD COLUMN image_blur_meta JSONB DEFAULT '{}'::jsonb`
- `sharp` already installed (used by uploadOptimizedImageAction)

## Success Criteria

- [ ] SettingsPanel stores blurDataURL for every new upload
- [ ] HeroGallery renders with blur placeholder + responsive srcSet
- [ ] HotelCard uses card-size image with blur
- [ ] RoomEditorModal uploads via uploadOptimizedImageAction (3 sizes generated)
- [ ] Legacy images (no multi-size siblings) render without errors
- [ ] No regression in existing image display functionality
