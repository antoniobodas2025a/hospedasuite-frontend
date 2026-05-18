# Image Multi-Size Consumption Specification

## Purpose

Consume 3-size image variants and blur placeholders from `uploadOptimizedImageAction`. Unify room uploads to server pipeline.

## Requirements

### Requirement: Blur Metadata Storage

The system MUST store blurDataURL in `image_blur_meta JSONB DEFAULT '{}'::jsonb` on `hotels`. Schema: `{ main_image_blur, cover_photo_blur, gallery_blurs: [{ url, blur }] }`.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Main blur | No blur meta | Main image uploaded | `main_image_blur` stored from `blurDataURL` |
| Gallery append | `gallery_blurs` has 2 entries | New gallery upload | New `{url, blur}` appended |
| Legacy skip | Column missing | Component reads blur | Skips blur, renders full URL |

### Requirement: Responsive Size Resolution

`getImageSizeUrl(baseUrl, size)` derives thumb (256px), card (640px), full (1920px) URLs with legacy fallback. `buildSrcSet(fullUrl, sizes[])` returns `"url_thumb.webp 256w, url_card.webp 640w, url_full.webp 1920w"`.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Multi-size | URL is `image_full.webp` | `getImageSizeUrl(url, 'thumb')` | Returns `image_thumb.webp` |
| Legacy | URL is `image.webp` | `getImageSizeUrl(url, 'card')` | Returns `image_card.webp` |
| srcSet | Full URL + 3 sizes | `buildSrcSet(url, sizes)` | Returns `"url_thumb 256w, url_card 640w, url_full 1920w"` |

### Requirement: HeroGallery Responsive Sizing + Blur

Hero: full URL + blur. Grid thumbnails: thumb URL, no blur. Lightbox: full URL, quality=90.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Hero blur | `main_image_blur` exists | Hero renders | `placeholder="blur"` + `blurDataURL` |
| Grid thumbs | 4+ gallery images | Thumbnails render | src=thumb URL, no blur |
| Lightbox | Lightbox open | Slide renders | src=full URL, `quality={90}` |

### Requirement: HotelCard Card Size + Blur

src=`getImageSizeUrl(main_image_url, 'card')` + blur placeholder.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| With blur | `main_image_blur` exists | Card renders | src=card URL, blur applied |
| Without blur | No blur meta | Card renders | src=card URL, no placeholder |

### Requirement: HotelGallery Responsive Sizing + Blur

images[0]: full+blur. images[1]: card+blur. images[2+]: card, no blur.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Hero + secondary | 2+ `gallery_blurs` | Gallery renders | images[0]=full+blur, images[1]=card+blur |
| Below-fold | 4+ images | images[2+] render | src=card URL, no blur |

### Requirement: RoomCard Card Size + Blur

src=`getImageSizeUrl(room.gallery[0], 'card')` + blur.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Room card blur | gallery[0] + blur | Card renders | src=card URL, blur applied |

### Requirement: RoomGallery Responsive Sizing + Blur

Main: full+blur, sizes=100vw, quality=85, priority. Thumbs: thumb URL, sizes=80px, quality=50, lazy.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Main image | gallery + blur | Main renders | src=full, blur, priority |
| Thumbnails | 3+ images | Thumbnails render | src=thumb URL, lazy, quality=50 |

### Requirement: RoomGalleryLightbox Full Resolution

Slides: full URL, quality=90, sizes=80vw. Thumbs: thumb URL, quality=50.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Slide | Lightbox open | Slide renders | src=full, quality=90 |
| Nav thumbs | Lightbox open | Thumbnails render | src=thumb URL, quality=50 |

### Requirement: RoomEditorModal Unified Upload

Replace client-side canvas with `uploadOptimizedImageAction(folder='rooms')`. Action accepts `'rooms'`. Canvas code removed.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Server upload | Images selected | Upload triggered | Calls action with folder='rooms' |
| Folder validation | folder='rooms' | Validation runs | Accepts, uploads to `${hotelId}/rooms/` |
| Canvas removal | Code review | Modal inspected | No `optimizeImage`, no direct uploads |

### Requirement: DB Migration

Add `image_blur_meta JSONB DEFAULT '{}'::jsonb` to `hotels`. Additive only.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Add column | Hotels table with data | Migration runs | All rows have `image_blur_meta = '{}'` |
| Idempotent | Migration already applied | Migration runs again | No error, no duplicate column |
