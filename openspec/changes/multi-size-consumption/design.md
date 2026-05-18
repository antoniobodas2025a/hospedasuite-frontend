# Design: Multi-Size Image Consumption & Blur Placeholders

## Technical Approach

The upload pipeline (`uploadOptimizedImageAction`) already generates 3 sizes (thumb 256px, card 640px, full 1920px) + `blurDataURL` per image — but the data is discarded at storage time. Components render single full-size URLs with no blur placeholders. This change wires the pipeline end-to-end: persist blur metadata in a new JSONB column, resolve multi-size URLs via convention, add blur placeholders to all 6 OTA components, and unify the RoomEditorModal upload pipeline.

## Architecture Decisions

| # | Decision | Options | Choice | Rationale |
|---|----------|---------|--------|-----------|
| 1 | Blur storage strategy | A. New JSONB column `image_blur_meta` on `hotels` | **A** | Additive, zero breaking changes. No migration of existing string columns. JSONB is schemaless — future-proof for gallery blurs array. |
| 2 | Multi-size URL resolution | A. Store all 3 URLs per image in DB columns | **C** | Deterministic convention: `getImageSizeUrl` derives `_thumb.webp`, `_card.webp`, `_full.webp` from the full URL string. No new DB columns for URLs. Already handles legacy images (no suffix → returns original). |
| | | B. Inline URLs inside JSONB alongside blur | | |
| | | **C. Convention-based (`getImageSizeUrl`)** | | |
| 3 | RoomEditorModal unification | A. Keep client-side canvas, add multi-size separately | **B** | Removes 73 lines of canvas code. Single upload pipeline. Gets blur + multi-size for free. `folder='rooms'` extends the existing action's union type. Room gallery images become consistent with hotel images. |
| | | **B. Replace canvas with `uploadOptimizedImageAction(folder='rooms')`** | | |
| 4 | Component prop strategy | A. Wrap URLs + blurs in `ImageAsset` objects | **B** | Minimal prop changes. Components receive optional `blurImage?: string` or `blurs?: ImageBlurMeta` prop. String URL props unchanged — 100% backward compatible. Grace degradation when blur is absent (legacy images). |

## Data Flow

```
Upload (SettingsPanel / RoomEditorModal)
  │
  ├─ FormData(file) ──→ uploadOptimizedImageAction(folder)
  │
  └─ Result: { url, urls:{thumb,card,full}, blurDataURL }
       │
       ├─ .url (full) ──→ DB: hotels.main_image_url (unchanged, string)
       │                   DB: hotels.gallery_urls[i]  (unchanged, string[])
       │
       └─ .blurDataURL ──→ DB: hotels.image_blur_meta (JSONB)
            └─ { main_image_blur, cover_photo_blur, gallery_blurs: [{url, blur}] }

Render (OTA Components)
  │
  ├─ src ← hotel.main_image_url (full-size string, legacy compat)
  ├─ getImageSizeUrl(src, 'card') ──→ card-size URL for cards/thumbnails
  ├─ buildSrcSet(src) ──→ "url_thumb.webp 256w, url_card.webp 640w, url_full.webp 1920w"
  └─ image_blur_meta?.main_image_blur ──→ blurDataURL (optional, graceful degradation)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/lib/image-config.ts` | Modify | Add `buildSrcSet(baseUrl): string` helper and `ImageBlurMeta` type |
| `src/app/actions/settings.ts` | Modify | Extend `folder` union to include `'rooms'`; update `updateHotelProfileAction` schema + query to persist `image_blur_meta` |
| `src/components/dashboard/SettingsPanel.tsx` | Modify | Capture `result.blurDataURL` from uploads; build `image_blur_meta` object; pass to save action |
| `src/components/dashboard/RoomEditorModal.tsx` | Modify | Remove `optimizeImage()` (73 lines) and `createClient` import; call `uploadOptimizedImageAction(formData, 'rooms')`; store result.urls + blurDataURL |
| `src/components/ota/HeroGallery.tsx` | Modify | Accept `blurs?: ImageBlurMeta` prop; use `getImageSizeUrl()` for thumbnails; add `placeholder="blur"` + `blurDataURL` to `<Image>` |
| `src/components/ota/HotelCard.tsx` | Modify | Accept `main_image_blur?: string` on Hotel interface; use `getImageSizeUrl(src, 'card')` + blur |
| `src/components/ota/HotelGallery.tsx` | Modify | Accept `blurs?: ImageBlurMeta` prop; multi-size URLs + blur for hero and thumbnails |
| `src/components/ota/RoomCard.tsx` | Modify | Accept `cover_image_blur?: string` on room prop; use `getImageSizeUrl(src, 'card')` + blur |
| `src/components/ota/RoomGallery.tsx` | Modify | Accept optional blur prop; add `placeholder="blur"` support |
| `src/components/ota/RoomGalleryLightbox.tsx` | Modify | Accept optional `blurDataURL` per slide for `renderSlide` |

## Interfaces / Contracts

```typescript
// ── New: src/lib/image-config.ts ───────────────────────────

type ImageBlurMeta = {
  main_image_blur?: string;
  cover_photo_blur?: string;
  gallery_blurs?: { url: string; blur: string }[];
};

/**
 * Builds explicit srcSet string for pre-generated multi-size images.
 * Next.js Image auto-srcSet doesn't work with Supabase Storage
 * (no on-the-fly resizing). We pre-generate 3 sizes at upload time
 * and resolve them via convention.
 *
 * Returns: "url_thumb.webp 256w, url_card.webp 640w, url_full.webp 1920w"
 */
function buildSrcSet(baseUrl: string): string;

// ── Component prop additions (all additive, all optional) ──

// HeroGallery.tsx
interface HeroGalleryProps {
  images: { url: string; alt?: string }[];
  hotelName: string;
  blurs?: ImageBlurMeta;           // ← NEW
}

// HotelCard.tsx
interface Hotel {
  id: string;
  name: string;
  main_image_url: string;
  main_image_blur?: string;        // ← NEW
  // ...
}

// HotelGallery.tsx
interface HotelGalleryProps {
  images: { url: string; alt?: string }[];
  hotelName: string;
  location: string;
  blurs?: ImageBlurMeta;           // ← NEW
}

// RoomCard.tsx (room object)
cover_image_blur?: string;         // ← NEW on room data

// RoomGallery.tsx
blurDataURL?: string;              // ← NEW prop on component

// RoomGalleryLightbox.tsx (slides)
{ src: string; alt: string; blurDataURL?: string } // ← NEW field
```

## Backward Compatibility Strategy

- **`getImageSizeUrl` legacy handling**: Already built. URLs without `_size.webp` suffix return the original URL unchanged. Next.js Image provides its own optimization as fallback.
- **`blurDataURL` is optional everywhere**: Components check `if (blurDataURL)` before applying `placeholder="blur"`. Legacy images (no blur in DB) render identically to current behavior.
- **Existing string columns untouched**: `main_image_url`, `cover_photo_url`, `gallery_urls` remain plain strings. `image_blur_meta` is a separate additive column.
- **RoomEditorModal**: Existing room images in `gallery` bucket remain valid. Only new uploads go through the unified pipeline. Old canvas code preserved in git history.

## Migration Plan

```sql
-- Non-blocking, zero-downtime column addition
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS image_blur_meta JSONB DEFAULT '{}'::jsonb;
```

- Default `{}` — no backfill needed. Existing rows continue working.
- Rollback: `ALTER TABLE hotels DROP COLUMN IF EXISTS image_blur_meta;` — all existing data preserved.
- Supabase migration applied via dashboard SQL editor or CLI.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `buildSrcSet()` and `getImageSizeUrl()` with legacy/new URLs | `vitest` — verify srcSet generation and suffix replacement |
| Unit | `ImageBlurMeta` type safety | TypeScript compilation — optional fields, no runtime errors |
| Integration | SettingsPanel upload → blur persisted → OTA renders | Manual — upload image, verify blur in DB, verify blurred render |
| Integration | Legacy images (no blur) render without errors | Manual — browse existing hotel pages |
| Regression | RoomEditorModal upload still works | Manual — create room, upload image, verify multi-size files in storage |
