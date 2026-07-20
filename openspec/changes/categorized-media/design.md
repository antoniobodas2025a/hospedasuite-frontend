# Design: Categorized Media Management

## Technical Approach

Normalize flat `gallery_urls[]` into a `hotel_images` table with mandatory category metadata across the full stack. The approach uses an **adapter-first strategy**: new code reads from `hotel_images` with fallback to legacy columns, ensuring zero regression on the OTA page. Upload pipeline gains category-aware presigned URLs; display layer groups by category with priority ordering. All changes are backward-compatible via the existing `main_image_url`/`cover_photo_url`/`gallery_urls` columns (preserved, not dropped).

## Architecture Decisions

### Decision: Normalized `hotel_images` table over JSONB

| Option | Tradeoff | Decision |
|--------|----------|----------|
| New table `hotel_images` | JOIN cost, migration effort | ✅ **Chosen** — queryable by category, composite indexable, clean FK |
| JSONB column on `hotels` | No JOIN, but GIN index bloat | ❌ Rejected — poor sort_order support, no FK integrity |

**Rationale**: Category-based queries (`WHERE category = 'exterior' ORDER BY sort_order`) are O(1) with composite index vs. JSONB path extraction. Future features (bulk ops, per-image analytics) benefit from row-level access.

### Decision: Legacy columns preserved (not dropped)

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Drop `gallery_urls`, `main_image_url` | Clean break, but breaks OTA | ❌ Rejected |
| Keep legacy columns as fallback | Dual-read during transition | ✅ **Chosen** — zero regression guarantee |

**Rationale**: `main_image_url` is referenced by 10+ components (HotelCard, FeaturedCard, MarkerLifecycleManager, bio page, book page). Dropping it is a breaking change. We write to BOTH `hotel_images` and legacy columns during transition; read priority is `hotel_images` → legacy fallback.

### Decision: Adapter pattern for HeroGallery

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Break HeroGallery interface | Clean code, but risky | ❌ Rejected |
| Adapter: `CategorizedImage[]` → flat `{url, alt}[]` | Extra layer, but safe | ✅ **Chosen** |

**Rationale**: HeroGallery's current `images: { url; alt }[]` interface is consumed by the OTA page. The adapter converts categorized data to flat format for lightbox, while the page-level gallery builder handles category grouping externally.

### Decision: R2 path convention

| Path Pattern | Use Case |
|-------------|----------|
| `onboarding/{userId}/{timestamp}-{filename}` | Legacy (preserved) |
| `hotels/{hotelId}/{category}/{timestamp}-{filename}` | New categorized uploads |

**Rationale**: Category in path enables R2 lifecycle rules per category (e.g., auto-archive `otros` after 2 years). Existing `onboarding/` URLs remain valid — no migration needed for stored URLs.

## Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        UPLOAD FLOW                               │
│                                                                   │
│  Client                    Server                    R2           │
│  ──────                    ──────                    ──           │
│  CategorizedDropzone ──→ getPresignedCategoryUrl ──→ presign     │
│       │                   (hotelId, category)         │           │
│       │                                                 │           │
│       └── PUT file ──────────────────────────────────→ store     │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Zustand store: categorizedImages[]                      │   │
│  │  [{url, category, blur_data, sort_order}]                │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                       DISPLAY FLOW                               │
│                                                                   │
│  OTA Page                  Server Action           DB             │
│  ────────                  ─────────────           ──             │
│  hotel/[slug] ──→ getHotelDetailsBySlug ──→ SELECT hotels        │
│       │                              │    + JOIN hotel_images    │
│       │                              │    WHERE hotel_id = $1    │
│       │                              │    ORDER BY category,     │
│       │                              │             sort_order    │
│       │                              │                           │
│       └── buildCategorizedGallery() ─┘                           │
│           │                                                       │
│           ├── CategorizedHeroGallery (grouped display)           │
│           └── Adapter → flat images[] (lightbox fallback)        │
└─────────────────────────────────────────────────────────────────┘
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/030_hotel_images.sql` | Create | Table, indexes, RLS, data migration |
| `src/types/database.ts` | Modify | Add `hotel_images` Row/Insert/Update types |
| `src/types/index.ts` | Modify | Add `CategorizedImage` interface |
| `src/lib/onboarding-schemas.ts` | Modify | Add `imageCategoryEnum`, refactor `propertyGallerySchema` |
| `src/lib/__tests__/onboarding-schemas.test.ts` | Create | T1-T4: category validation + mutation guards |
| `src/lib/image-category.ts` | Create | Category enum, display labels, priority order |
| `src/lib/jargon-guard.ts` | Create | T12: forbidden term validator |
| `src/components/onboarding/CategorizedDropzone.tsx` | Create | T5: per-category upload zones |
| `src/components/onboarding/PropertyGalleryStep.tsx` | Modify | Integrate CategorizedDropzone |
| `src/store/useOnboardingStore.ts` | Modify | Add `categorizedImages` state |
| `src/components/ota/CategorizedHeroGallery.tsx` | Create | T7: category-grouped display |
| `src/components/ota/HeroGallery.tsx` | Modify | Accept optional `categories` prop (backward-compatible) |
| `src/app/(ota)/hotel/[slug]/page.tsx` | Modify | Query `hotel_images`, build categorized gallery |
| `src/app/actions/hotel-images.ts` | Create | T10: CRUD actions for `hotel_images` |
| `src/app/actions/onboarding-upload.ts` | Modify | Category-aware presigned URL generation |
| `src/app/actions/onboarding.ts` | Modify | Write to `hotel_images` + legacy columns |
| `src/app/actions/settings.ts` | Modify | T11: `updateHotelProfileAction` categorized support |
| `src/app/actions/ota.ts` | Modify | JOIN `hotel_images` in `getHotelDetailsBySlugAction` |
| `src/lib/provisioning-guard.ts` | Modify | Validate categorized image URLs |

## Interfaces / Contracts

### Database Schema

```sql
-- supabase/migrations/030_hotel_images.sql
CREATE TYPE image_category AS ENUM (
  'exterior', 'lobby', 'habitacion', 'bano',
  'amenidades', 'restaurante', 'entorno', 'otros'
);

CREATE TABLE hotel_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  category image_category NOT NULL,
  blur_data TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_url_not_blob CHECK (
    url NOT LIKE 'blob:%'
    AND url NOT LIKE 'data:%'
    AND url NOT LIKE 'javascript:%'
  )
);

-- Composite index for category-grouped display queries
CREATE INDEX idx_hotel_images_category_sort
  ON hotel_images (hotel_id, category, sort_order);

-- Index for migration/backfill queries
CREATE INDEX idx_hotel_images_hotel ON hotel_images (hotel_id);

-- RLS
ALTER TABLE hotel_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_hotel_images" ON hotel_images
  FOR SELECT USING (true);

CREATE POLICY "owner_write_hotel_images" ON hotel_images
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE staff.hotel_id = hotel_images.hotel_id
        AND staff.user_id = auth.uid()
        AND staff.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff
      WHERE staff.hotel_id = hotel_images.hotel_id
        AND staff.user_id = auth.uid()
        AND staff.role = 'admin'
    )
  );

-- Data migration: existing gallery_urls → hotel_images
INSERT INTO hotel_images (hotel_id, url, category, blur_data, sort_order)
SELECT
  h.id,
  unnest(h.gallery_urls) AS url,
  'otros'::image_category,
  NULL,
  generate_subscripts(h.gallery_urls, 1) - 1
FROM hotels h
WHERE h.gallery_urls IS NOT NULL
  AND array_length(h.gallery_urls, 1) > 0;

-- Migrate blur metadata per-image (best-effort match by URL)
-- image_blur_meta.gallery_blurs is [{url, blur}]
UPDATE hotel_images hi
SET blur_data = gb.blur
FROM hotels h,
  LATERAL jsonb_array_elements(h.image_blur_meta->'gallery_blurs') AS gb
WHERE hi.hotel_id = h.id
  AND hi.url = gb->>'url'
  AND hi.blur_data IS NULL
  AND h.image_blur_meta IS NOT NULL;
```

### TypeScript Types

```typescript
// src/types/index.ts
export type ImageCategory =
  | 'exterior' | 'lobby' | 'habitacion' | 'bano'
  | 'amenidades' | 'restaurante' | 'entorno' | 'otros';

export interface CategorizedImage {
  url: string;
  category: ImageCategory;
  alt?: string;
  sort_order: number;
  blur_data?: string | null;
}

// src/lib/image-category.ts
export const IMAGE_CATEGORIES: ImageCategory[] = [
  'exterior', 'lobby', 'habitacion', 'bano',
  'amenidades', 'restaurante', 'entorno', 'otros'
];

export const CATEGORY_DISPLAY_ES: Record<ImageCategory, string> = {
  exterior: 'Exteriores',
  lobby: 'Lobby / Recepción',
  habitacion: 'Habitaciones',
  bano: 'Baños',
  amenidades: 'Amenidades',
  restaurante: 'Restaurante',
  entorno: 'Entorno / Vistas',
  otros: 'Otros',
};

export const CATEGORY_PRIORITY: ImageCategory[] = [
  'exterior', 'lobby', 'habitacion', 'bano',
  'amenidades', 'restaurante', 'entorno', 'otros'
];
```

### Zod Schema Evolution

```typescript
// src/lib/onboarding-schemas.ts
export const imageCategoryEnum = z.enum([
  'exterior', 'lobby', 'habitacion', 'bano',
  'amenidades', 'restaurante', 'entorno', 'otros',
], { required_error: 'Categoría requerida' });

export const categorizedImageSchema = z.object({
  url: z.string().url().refine(
    url => !url.startsWith('blob:') && !url.startsWith('data:') && !url.startsWith('javascript:'),
    'URL de imagen inválida'
  ),
  category: imageCategoryEnum,
  alt: z.string().optional(),
  sort_order: z.number().int().min(0).default(0),
  blur_data: z.string().nullable().optional(),
});

// Refactored propertyGallerySchema — accepts categorized array
export const propertyGallerySchema = z.object({
  images: z.array(categorizedImageSchema).min(3, 'Se requieren al menos 3 fotos'),
});
```

### Server Actions Contracts

```typescript
// src/app/actions/hotel-images.ts
export async function addHotelImageAction(
  hotelId: string,
  image: { url: string; category: ImageCategory; blur_data?: string }
): Promise<{ success: boolean; data?: CategorizedImage; error?: string }>

export async function deleteHotelImageAction(
  hotelId: string,
  imageId: string
): Promise<{ success: boolean; error?: string }>

export async function getHotelImagesAction(
  hotelId: string
): Promise<{ success: boolean; data?: CategorizedImage[] }>

// src/app/actions/onboarding-upload.ts — extended
export async function getPresignedCategoryUrlAction(
  fileName: string,
  category: ImageCategory,
  contentType?: string
): Promise<{ success: boolean; uploadUrl?: string; publicUrl?: string; error?: string }>
// Path: hotels/{hotelId}/{category}/{timestamp}-{filename}
```

### Jargon Guard

```typescript
// src/lib/jargon-guard.ts
const FORBIDDEN_TERMS = ['OTA', 'Marketplace', 'vitrina digital'];

export function validateNoJargon(text: string): string | null {
  const lower = text.toLowerCase();
  for (const term of FORBIDDEN_TERMS) {
    if (lower.includes(term.toLowerCase())) {
      return `Término prohibido detectado: "${term}". Use lenguaje B2B empático.`;
    }
  }
  return null;
}
```

## Testing Strategy

| Layer | What to Test | Approach | Contracts |
|-------|-------------|----------|-----------|
| **Unit** | `imageCategoryEnum` rejects invalid/null/empty | Vitest `safeParse` | T1, T2 |
| **Unit** | `fullWizardStateSchema` passes with new structure | Vitest parse | T3 |
| **Mutation** | Category-null mutation kills test | Vitest + Stryker | T4 |
| **Component** | `CategorizedDropzone` renders per-category containers | Vitest + jsdom | T5 |
| **Integration** | Upload with category persists to `hotel_images` | Vitest + Supabase mock | T6 |
| **Component** | `CategorizedHeroGallery` groups by priority | Vitest + jsdom | T7 |
| **Visual** | Mobile `aspect-ratio` no crop | Playwright screenshot | T8 |
| **Mutation** | Category filter bypass kills compilation | TypeScript strict + test | T9 |
| **Integration** | `addHotelImageAction` inserts correct row | Vitest + admin client | T10 |
| **Integration** | `updateHotelProfileAction` backward compat | Vitest + existing hotel fixture | T11 |
| **String** | No jargon in new UI/error strings | Vitest `validateNoJargon` | T12 |
| **Integration** | Migration: all `gallery_urls` → `hotel_images` | SQL assertion script | T13 |
| **Integration** | Migration: blur per-image | SQL assertion + unit | T14 |

**Mutation testing approach**: Stryker JS configured to mutate `imageCategoryEnum` (remove category field), category filter logic, and jargon strings. Target: 100% kill rate on category logic (R6.2, R6.3).

## Migration / Rollout

### Phase 1 — Database (blocks all)
1. Run migration `030_hotel_images.sql` transactionally
2. Verify row count: `SELECT COUNT(*) FROM hotel_images` = total unnested `gallery_urls`
3. Verify blur migration: spot-check 5 hotels with `image_blur_meta`
4. Rollback: `DROP TABLE hotel_images IF EXISTS;` — legacy columns untouched

### Phase 2 — Schemas (parallel with Phase 5)
1. Add `imageCategoryEnum` + `categorizedImageSchema`
2. Keep `propertyGallerySchema` backward-compatible: accept both `string[]` (legacy) and `CategorizedImage[]` (new)
3. Tests: T1-T4

### Phase 3 — UI Upload (depends on Phase 2)
1. `CategorizedDropzone` renders one zone per category
2. Zustand store gains `categorizedImages: CategorizedImage[]`
3. On submit, write to `hotel_images` via new server action

### Phase 4 — Display (depends on Phase 1 + 5)
1. `getHotelDetailsBySlugAction` JOINs `hotel_images`
2. `CategorizedHeroGallery` groups by `CATEGORY_PRIORITY`
3. Adapter converts to flat `images[]` for lightbox
4. Fallback: if `hotel_images` empty, use legacy `gallery_urls`

### Phase 5 — Server Actions (depends on Phase 1)
1. `hotel-images.ts` CRUD actions
2. `onboarding.ts` dual-write to `hotel_images` + legacy columns
3. `settings.ts` `updateHotelProfileAction` reads/writes `hotel_images`

### Rollback Plan
1. `DROP TABLE hotel_images IF EXISTS;` — original columns untouched
2. Git revert per-phase PRs (chained)
3. Feature flag: `categorized_media_enabled` → false restores legacy HeroGallery

## Open Questions

- [ ] Should `main_image_url` be auto-derived from `hotel_images` (first `exterior` image) or remain independently settable?
- [ ] Is Stryker mutation testing already configured in CI, or does it need setup as part of this change?
