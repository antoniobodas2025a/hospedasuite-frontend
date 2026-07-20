# Exploration: Onboarding Photo Duplication & Data Flow Audit

## Current State

### Architecture

The onboarding wizard has 7 steps. Steps 2-3 handle property and room photos:

**Step 2 (PropertyGalleryStep)** — Categorized property gallery (uses `useHotelImagesStore`)
```
PropertyGalleryStep
  └─ CategorizedDropzone
       └─ 8 CategoryZones
            ├─ exterior
            ├─ lobby
            ├─ habitacion  ← OVERLAP with Step 3
            ├─ bano
            ├─ amenidades
            ├─ restaurante
            ├─ entorno
            └─ otros
```

Step 2 stores images in **`useHotelImagesStore.categorizedImages`** as:
```ts
Record<ImageCategory, CategorizedImageEntry[]>
// CategorizedImageEntry = { file: File, preview: string, sort_order: number }
```

**Step 3 (RoomTemplatesStep → RoomDetailStep)** — Per-room detail editor
```
RoomTemplatesStep
  └─ Room card 1 (collapsible)
       └─ RoomDetailStep
            ├─ Name, Price, Capacity, Beds, BedType
            ├─ Bathroom section (collapsible)
            └─ Details section (collapsible)
                 ├─ Description + AI Assistant
                 ├─ PHOTOS (up to 5 per room, drag & drop)  ← OVERLAP with Step 2
                 └─ Amenities
```

Step 3 stores images in **`useOnboardingStore.rooms[].imageFiles`** and **`imagePreviews[]`** as flat arrays.

### Data Flow (current, broken)

```
Step 2 User uploads
       │
       ▼
useHotelImagesStore.addImage(category, file, preview)
  └─ categorizedImages: { "habitacion": [{file, preview, sort_order}] }
       │
       │   ← NO BRIDGE EXISTS
       │
       ▼  (empty!)
useOnboardingStore.galleryFiles = []  ← NEVER populated by Step 2
       │
       ▼
ProvisioningStep reads galleryFiles (ALWAYS EMPTY → DATA LOSS)
  └─ Builds galleryUrls: [] (empty!)
  └─ Builds FullWizardState.galleryImages: [] (empty!)
       │
       ▼
executeOnboardingProvisioning()
  └─ hotel_images insert: nothing (empty array)
  └─ hotels.gallery_urls: [] (empty)
  └─ hotels.main_image_url: null
```

### Database Model

```sql
-- hotel_images (from migration 030)
CREATE TYPE image_category AS ENUM (
  'exterior', 'lobby', 'habitacion', 'bano',
  'amenidades', 'restaurante', 'entorno', 'otros'
);

CREATE TABLE hotel_images (
  id UUID PRIMARY KEY,
  hotel_id UUID REFERENCES hotels(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  category image_category NOT NULL,
  blur_data TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- rooms.gallery (JSON array, from migration 022)
-- Stored as: [{"url": "https://r2.dev/room-photo.webp"}]
-- No category, no sort_order, no blur data
```

### Pain Points Identified

1. **CRITICAL BUG — Complete data loss**: Step 2 images NEVER reach provisioning. The `useHotelImagesStore` (where Step 2 writes) is never read by `ProvisioningStep` (which reads `useOnboardingStore.galleryFiles`). Every new hotel onboarding loses ALL gallery photos.

2. **CRITICAL BUG — Category metadata loss**: Even if images were piped correctly, line 141 of `src/app/actions/onboarding.ts` hardcodes `category: 'otros'` for all `hotel_images` inserts, discarding the exact category data users just selected.

3. **UX confusion — Duplicate upload prompt**: The "Habitaciones" category in Step 2 invites users to upload room photos there. Then Step 3 asks again for per-room photos. Users feel tricked into doing the same work twice.

4. **Inconsistent storage models**: Hotel images use a normalized table (`hotel_images`) with categories. Room images use a JSON column (`rooms.gallery`). Different query patterns, different sort capabilities, no blur data for room images.

5. **No blur data for room images**: `rooms.gallery` stores only `{ url }`, missing `blur_data` that `hotel_images` has. This means room images can't use `next/image placeholder="blur"`.

6. **Validation reads wrong store**: `useOnboardingStore.validateStep(2)` reads from `useHotelImagesStore` (correct for display), but the validation in `OnboardingClient` checks this before provisioning (which reads `useOnboardingStore.galleryFiles` — creating a false positive: validation passes but provisioning still loses data).

## Industry Patterns

### Booking.com
- **Property photos**: 24+ photos across categories (exterior, interior, room, bathroom, food, amenities, surroundings)
- **Room-specific photos**: Per room type, uploaded under that room type in the extranet
- **Distinction**: Clear separation — property-level photos are for the hotel page hero/gallery, room photos appear only on the room type page
- **Categories managed by OTA**: Booking mandates specific categories; properties don't invent them

### Airbnb
- **Listing photos**: Single flat set of photos for the entire listing
- **Room-by-room photo tour**: Optional "photo tour" feature where you assign photos to rooms (bedroom, bathroom, kitchen, living room)
- **No mandatory categorization**: Photos are primarily ordered by host preference
- **Key insight**: For individual hosts (1-3 listings), flat photo sets work. The "photo tour" is progressive disclosure — optional, not required at listing creation

### Expedia
- **Property photos**: 5+ categories (exterior, interior, room, food, pool/amenities, surroundings)
- **Room photos**: Required per room type, minimum 2 per type
- **Strict separation**: Property gallery ≠ room photos. Each has its own minimum requirement
- **Enforcement**: Expedia rejects listings without complete photo requirements per category

### Industry Standard Summary

| Platform | Property Photos | Room Photos | Separation |
|----------|----------------|-------------|------------|
| Booking.com | 24+, categorized | Per room type | STRICT |
| Airbnb | Flat set, no category | Optional photo tour | OPTIONAL |
| Expedia | 5+ categories | 2+ per room type | STRICT |

**The industry standard for hotel platforms (Booking, Expedia) is STRICT SEPARATION** between property-level photos and per-room photos. Airbnb's flat model works because they serve individual hosts with 1-3 units — fundamentally different from hotels with 10-100 rooms.

## Option Analysis

### Option 1: Keep Separation (Current Architecture, Fixed)

**Fix the data flow so it actually works.**

- Bridge `useHotelImagesStore` → `useOnboardingStore.galleryFiles` so provisioning finds the files
- Pass category metadata through provisioning so `hotel_images.category` is correct
- Remove "Habitaciones" from Step 2 categories (since rooms get their own step)
- Clarify Step 2 label: "Fotos de la propiedad" not "Galería del hotel"

**Pros:**
- Industry standard (Booking.com, Expedia pattern)
- Supports hotels with VERY different room types (e.g., beachfront suite ≠ interior standard)
- Room photos are semantically tied to their room type
- The normalized `hotel_images` table is already designed for this

**Cons:**
- Small hotels with identical rooms must upload room photos twice (gallery + per-room)
- Requires fixing the data pipeline (bugs 1 & 2)
- Step 3 needs a copy-from-gallery option for small hotels

**When to use:** Hotels with distinct room types, boutique hotels, resorts with differentiated units

**Production examples:** Booking.com, Expedia, Hotels.com

### Option 2: Unify Photos

**Single flat photo set in Step 2. Rooms inherit from the shared pool.**

- Step 2 becomes "Upload all photos" (flat, no categories for habitacion)
- Rooms display the shared pool
- Optionally let users mark photos as "featured" for a specific room
- Remove per-room photo upload from Step 3 entirely

**Pros:**
- Zero duplication, less friction
- Simpler UX ("upload once, use everywhere")
- Faster onboarding for small hotels

**Cons:**
- Can't show room-type-specific interiors (standard vs. suite)
- Loses differentiation in booking widget (guests see same photos for all room types)
- Reduces conversion — guests want to see THE EXACT room they're booking
- Against industry standard for hotel platforms
- The `rooms.gallery` JSON column becomes vestigial

**When to use:** Single-property vacation rentals, glamping with one unit type, hostels

**Production examples:** Airbnb (individual hosts with 1-3 units), VRBO

### Option 3: Clarify UI Only

**Keep the current architecture but improve labels and guidance.**

- Rename "Habitaciones" category to "Interiores de la propiedad" (less confusing)
- Add a "Ya subí estas fotos en el paso 2" checkbox in Step 3 room photos
- Fix the data flow bugs (1 & 2)

**Pros:**
- Minimal code changes beyond bug fixes
- Full flexibility preserved
- Clearer guidance reduces confusion

**Cons:**
- Still requires duplicate uploads for hotels with identical room types
- Doesn't fix the root problem — just masks it with better labels
- The checkbox pattern adds complexity without solving duplication

**When to use:** As a quick fix while planning a more comprehensive solution

**Production examples:** Many early-stage platforms that haven't addressed the issue yet

## Recommended Solution

### Recommendation: Option 1 (Fixed) + Progressive Disclosure

Fix the keep-separation model but add a **"copy from gallery"** shortcut for hotels with identical rooms.

**Why:**
1. **Industry standard**: Hotel guests expect to see the EXACT room they book. If Standard and Suite share photos, guest is disappointed on arrival. This directly impacts reviews and repeat bookings.
2. **80/20 rule**: 80% of hotels have 2+ room types with meaningful differences. Even a 5-room budget hotel has single, double, and triple — each showing different furniture layouts. The 20% (glamping, tiny homes) can use the copy shortcut.
3. **Data model already supports it**: `rooms.gallery` JSON column and `hotel_images` table are both designed for separation. The legacy `gallery_urls` column on `hotels` exists for backward compatibility.
4. **Future-proof**: When HospedaSuite adds OTA distribution (Booking.com channel manager), the strict separation maps 1:1 to OTA requirements.

### UX Flow (Proposed)

```
Step 2: Fotos de la propiedad
  ├─ Exteriores
  ├─ Lobby / Recepción  
  ├─ Zonas comunes (removed "Habitaciones")
  ├─ Baños comunes
  ├─ Amenidades
  ├─ Restaurante
  ├─ Entorno / Vistas
  └─ Otros
  
  [No more "Habitaciones" category — clean separation]

Step 3: Habitaciones
  ├─ Room Type 1 (Standard)
  │   ├─ Info fields...
  │   └─ Fotos
  │       ├─ [Upload from device]
  │       └─ [Copiar de galería del paso 2]  ← NEW
  │           └─ Shows gallery photos from Step 2
  │              user selects which to use for this room
  │
  ├─ Room Type 2 (Suite)
  │   ├─ Info fields...
  │   └─ Fotos
  │       ├─ [Upload from device]
  │       └─ [Copiar de galería del paso 2]  ← NEW
  │
  └─ [+] Add more room types
```

### Data Model Changes

**No schema changes needed.** The database already supports the clean separation:

- `hotel_images` → property-level categorized photos (from Step 2)
- `rooms.gallery` → per-room photos (from Step 3)

**What needs to change:**

1. **Fix the provisioning data pipeline** (see bugs 1 & 2 above)
2. **Pass category metadata through provisioning** so `hotel_images.category` is correct
3. **Add `blur_data` support to `rooms.gallery`** — extend the schema from `[{"url": string}]` to `[{"url": string, "blur_data": string|null}]`
4. **Add a "copy from gallery" UI in RoomDetailStep** for users who want to reuse property photos

### Implementation Plan

**Phase 1 — Fix Data Loss (1-2 days, BLOCKER):**
- Create a bridge/hook that syncs `useHotelImagesStore` → `useOnboardingStore` gallery state before provisioning
- OR refactor `ProvisioningStep` to read from `useHotelImagesStore` directly
- Pass category data through the provisioning pipeline so `hotel_images.category` is correct

**Phase 2 — Remove "Habitaciones" Category (0.5 day):**
- Remove `habitacion` from `IMAGE_CATEGORIES` in `src/lib/image-category.ts`
- Remove `'habitacion'` from the `image_category` DB enum (requires migration)
- Update UI labels to clarify "property photos" vs "room photos"

**Phase 3 — Add "Copy from Gallery" Feature (2-3 days):**
- Add a button/checkbox in `RoomDetailStep` to copy photos from Step 2 gallery
- Implement photo selection UI (which gallery photos → which room)
- Handle edge cases: gallery photos already assigned to multiple rooms, deduplication

**Phase 4 — Room Photo Blur Data (1 day):**
- Extend `rooms.gallery` JSON schema to include `blur_data`
- Generate blur placeholders during upload (same pipeline as `hotel_images`)
- Update the OTA display components to use `placeholder="blur"` for room photos

### Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Existing hotels have `habitacion` category photos | High | Medium | Migration script to create `hotel_images` entries categorized as `habitacion` for existing data |
| Users who already uploaded room photos in Step 2 lose them when `habitacion` removed | High | Medium | Show migration notice: "Tus fotos de habitaciones están guardadas. En el nuevo flujo, las agregás por tipo de habitación." |
| OTA channel manager (future) expects `habitacion` category in `hotel_images` | Low | Medium | The `image_category` enum can retain `habitacion` for backward compatibility even if the UI doesn't show it |
| Hotels with identical rooms resist per-room photo upload | Medium | Low | The "copy from gallery" shortcut addresses this directly |

### Success Metrics

- **Provisioning success rate**: Should be 100% — no more silent data loss of gallery images
- **Step 2 → Step 3 navigation**: No user reports of "I already uploaded these"
- **Per-room photo completion**: >80% of rooms have at least 2 unique photos (not copies from gallery)
- **Time to complete onboarding**: Should not increase (target: <15 min total)

## Ready for Implementation

Yes. Phase 1 is a BLOCKER — the data loss bug needs immediate fixing. Phases 2-4 can be done in sequence.
