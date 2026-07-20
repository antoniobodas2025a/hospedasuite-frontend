# Hotel Media Specification — Categorized Image Management

## Purpose

Define the architecture and behavior for categorized hotel image management across the full stack: database normalization, validation schemas, category-aware upload UI, grouped public display, and server actions. Replaces the flat `gallery_urls[]` approach with structured `hotel_images` carrying mandatory category metadata, eliminating the generic "image dump" pattern while maintaining zero regression against the existing 1004+ test suite.

---

## Requirements

### R1: Image Category Enum

The system SHALL define a fixed enumeration of image categories for classifying hotel media. Every image stored in the system MUST belong to exactly one category.

| Enum Value    | Display Label (es)    | Display Label (en)    |
|---------------|-----------------------|-----------------------|
| `exterior`    | Exteriores            | Exterior / Grounds    |
| `lobby`       | Lobby / Recepción     | Lobby / Reception     |
| `habitacion`  | Habitaciones          | Rooms                 |
| `bano`        | Baños                 | Bathrooms             |
| `amenidades`  | Amenidades            | Amenities             |
| `restaurante` | Restaurante           | Restaurant            |
| `entorno`     | Entorno / Vistas      | Surroundings / Views  |
| `otros`       | Otros                 | Other                 |

#### Scenario: R1.1 — Recognizes all valid categories

- GIVEN the `imageCategoryEnum` schema
- WHEN `safeParse` is called with each of the 8 valid category strings
- THEN every parse MUST return `success: true`

#### Scenario: R1.2 — Rejects null/missing/empty category

- GIVEN the `imageCategoryEnum` schema
- WHEN `safeParse` is called with `null`, `undefined`, `""`, or `"invalid_category"`
- THEN parse MUST return `success: false`
- AND the error message MUST reference "Categoría requerida"

#### Scenario: R1.3 — Mutation guard (category null)

- GIVEN a mutation test that removes the category field from an image object
- WHEN the schema validation runs
- THEN the test MUST fail with a mutation kill

### R2: Categorized Image Object

The system MUST define a `CategorizedImage` type that pairs each image URL with its category, sort order within that category, and optional blur placeholder data.

```typescript
interface CategorizedImage {
  url: string;
  category: ImageCategory;
  alt?: string;
  sort_order: number;
  blur_data?: string | null;
}
```

The database SHALL store these in a normalized `hotel_images` table with a foreign key to `hotels`, composite index on `(hotel_id, category, sort_order)`, and a per-image `blur_data` column.

#### Scenario: R2.1 — Valid categorized image passes validation

- GIVEN a `CategorizedImage` object with a valid URL, a known category, and sort_order=0
- WHEN validated through the `categorizedImageSchema`
- THEN the result MUST be `success: true`

#### Scenario: R2.2 — Image without category is rejected

- GIVEN a `CategorizedImage` object missing the category field
- WHEN validated through the schema
- THEN the result MUST be `success: false`

#### Scenario: R2.3 — Flat gallery migration preserves all URLs

- GIVEN a hotel with `gallery_urls: ["https://r2.dev/a.webp", "https://r2.dev/b.webp"]`
- WHEN the migration script runs
- THEN both URLs MUST appear in `hotel_images` with `category: "otros"`
- AND `blur_data` from `image_blur_meta` MUST be assigned to the corresponding row

### R3: Segregated Upload Zones (Ley de Hick)

The Wizard (PropertyGalleryStep) and Settings (Dashboard) upload interfaces MUST present **category-segregated dropzones** instead of a single generic upload area. Each dropzone MUST be labeled with its category name and accept images only for that category.

#### Scenario: R3.1 — Wizard shows categorized dropzones

- GIVEN the hotel owner on the Property Gallery step of onboarding
- WHEN the upload interface renders
- THEN the UI MUST display N distinct dropzone containers, one per selected category
- AND each dropzone MUST be labeled with the category display name
- AND uploaded files MUST be stored with the corresponding category metadata

#### Scenario: R3.2 — Bulk upload still works across categories

- GIVEN the user has selected files for multiple categories
- WHEN the upload completes
- THEN all images MUST be stored in `hotel_images` with their respective categories
- AND the total count MUST equal the sum of per-category uploads

#### Scenario: R3.3 — At least 3 images across categories required

- GIVEN the user attempts to submit the gallery step
- WHEN total categorized images are fewer than 3
- THEN the system MUST reject submission with "Se requieren al menos 3 fotos"
- AND the error MUST NOT reference OTA or Marketplace terminology

### R4: Category-Grouped Public Display

The HeroGallery component and the OTA hotel detail page MUST render images grouped by logical category. The default display order SHALL be: exterior → lobby → habitacion → bano → amenidades → restaurante → entorno → otros.

#### Scenario: R4.1 — Desktop grid grouped by category

- GIVEN a guest viewing the hotel detail page
- WHEN the gallery renders with images from multiple categories
- THEN images MUST appear in groups separated by category labels
- AND the first group MUST be "Exteriores" if exterior images exist
- AND the gallery MUST render a fallback flat list when the hotel has no categorized images (legacy support)

#### Scenario: R4.2 — Category label visible to user

- GIVEN the gallery is displaying categorized images
- THEN each image group MUST display a visible heading with the category display name
- AND the heading MUST NOT contain the words "OTA" or "Marketplace"

#### Scenario: R4.3 — Mobile carousel preserves category context

- GIVEN a mobile user browsing the gallery
- WHEN swiping through images
- THEN the current category MUST be displayed as a badge or label
- AND images MUST use responsive `aspect-ratio` to prevent cropping

#### Scenario: R4.4 — Mutation guard: category filter bypass

- GIVEN a mutation that alters the gallery filter, allowing a "bano" image in the "exterior" group
- WHEN the compilation/test runs
- THEN the test MUST fail (compilation break or assertion failure)

### R5: Server Action Integrity

The system MUST provide dedicated CRUD actions for hotel images and MUST update existing settings actions to support categorized media without breaking their existing contracts.

#### Scenario: R5.1 — New CRUD actions for hotel_images

- GIVEN a hotel owner managing images from Settings
- WHEN they add a categorized image via the new `addHotelImageAction`
- THEN the image MUST be inserted into `hotel_images` with the correct hotel_id, category, URL, and sort_order
- AND the response MUST return the created row

#### Scenario: R5.2 — Settings backward compatibility

- GIVEN an existing hotel with `gallery_urls` populated (pre-migration)
- WHEN `updateHotelProfileAction` is called without gallery_urls changes
- THEN the existing `gallery_urls` MUST NOT be modified
- AND the hotel MUST still render correctly on the OTA page

#### Scenario: R5.3 — Onboarding writes to hotel_images

- GIVEN the onboarding provisioning step completes
- WHEN `executeOnboardingProvisioning` runs
- THEN gallery images MUST be inserted into `hotel_images` instead of `hotels.gallery_urls`
- AND `hotels.main_image_url` MUST be set from the first categorized image by priority order

### R6: Zero Regression & Mutation Proofing

Every change related to categorized media MUST preserve the existing test suite (1004+ tests) and MUST pass mutation testing on all new category logic.

#### Scenario: R6.1 — Existing test suite remains green

- GIVEN the current test suite with 1004+ passing tests
- WHEN the categorized-media implementation is applied
- THEN `vitest run` MUST report 0 failures
- AND the total test count MUST be >= 1004

#### Scenario: R6.2 — Mutation testing kills category-null mutation

- GIVEN a mutation that strips the category field from an image
- WHEN mutation testing executes
- THEN the mutation MUST be killed (test failure)

#### Scenario: R6.3 — Mutation testing kills jargon injection

- GIVEN a mutation that injects "OTA" or "Marketplace" into UI strings or metadata
- WHEN string validation runs
- THEN the validator MUST reject the string
- AND the mutation tester MUST report a kill

### R7: Language Contract — No Prohibited Jargon

All user-facing strings, metadata labels, and error messages in the categorized media feature MUST use empathetic-technical B2B language. The terms "OTA", "Marketplace", "Vitrina Digital" (when used as extractive-channel framing), and similar extractive marketplace terminology are STRICTLY PROHIBITED.

Preferred terminology:
- "Optimización de Vitrina Visual" instead of channel-specific framing
- "Galería del Hotel" instead of marketplace gallery
- "Fotos del Alojamiento" instead of inventory assets

#### Scenario: R7.1 — Forbidden terms rejected in schema

- GIVEN a UI string or metadata label containing "OTA"
- WHEN the jargon validator runs
- THEN the validator MUST reject the string

#### Scenario: R7.2 — Error messages use B2B language

- GIVEN a validation error during upload
- WHEN the error message is generated
- THEN the message MUST NOT contain words from the prohibited list
- AND MUST use terms like "propiedad", "alojamiento", "foto" instead of "asset", "listing", "inventory"

---

## Constraints

| Constraint | Value |
|------------|-------|
| Minimum test count | >= 1004 passing |
| Mutation kill rate on category logic | 100% |
| Migration rollback | `DROP TABLE hotel_images IF EXISTS;` — original `hotels` columns untouched |
| Max PR size | 400 lines per PR (chained PRs expected) |
| Disallowed terms | "OTA", "Marketplace", extractive marketplace framing |
| Minimum upload | 3 images across any categories |
| Image category default (legacy) | `otros` for existing flat `gallery_urls[]` |
| Display priority | exterior → lobby → habitacion → bano → amenidades → restaurante → entorno → otros |

---

## Test Contracts

Every implementation phase MUST produce tests covering at least these contract points:

| Contract | Phase | Test Type | Description |
|----------|-------|-----------|-------------|
| T1 | Schemas | Unit | Category enum rejects invalid values |
| T2 | Schemas | Unit | CategorizedImage object requires category |
| T3 | Schemas | Unit | Existing fullWizardStateSchema still passes with new structure |
| T4 | Schemas | Mutation | Category-null mutation dies |
| T5 | UI Upload | Component | CategorizedDropzone renders per-category containers |
| T6 | UI Upload | Integration | Upload with category metadata persists correctly |
| T7 | Display | Component | HeroGallery groups by category with correct priority |
| T8 | Display | Visual | Mobile aspect-ratio does not crop images |
| T9 | Display | Mutation | Category filter bypass kills compilation |
| T10 | Server Actions | Integration | addHotelImageAction inserts correct row |
| T11 | Server Actions | Integration | updateHotelProfileAction does not break existing hotels |
| T12 | Cross-cutting | String | No prohibited jargon in any new UI or metadata string |
| T13 | Migration | Integration | All gallery_urls migrate to hotel_images with category "otros" |
| T14 | Migration | Integration | Blur metadata migrates per-image |

---

## Affected Modules

| Module | Change Type | Phase |
|--------|-------------|-------|
| `supabase/migrations/030_hotel_images.sql` | CREATE | DB |
| `src/types/database.ts` | ADD `hotel_images` types | DB |
| `src/types/index.ts` | ADD `CategorizedImage` | DB |
| `src/lib/onboarding-schemas.ts` | MODIFY `propertyGallerySchema`, add `imageCategoryEnum` | Schemas |
| `src/lib/onboarding-schemas.test.ts` | ADD category validation tests | Schemas |
| `src/components/onboarding/CategorizedDropzone.tsx` | CREATE | UI Upload |
| `src/components/onboarding/PropertyGalleryStep.tsx` | MODIFY — categorized dropzones | UI Upload |
| `src/store/useOnboardingStore.ts` | MODIFY — category state | UI Upload |
| `src/components/ota/HeroGallery.tsx` | MODIFY — category-grouped display | Display |
| `src/app/(ota)/hotel/[slug]/page.tsx` | MODIFY — query hotel_images | Display |
| `src/app/actions/onboarding.ts` | MODIFY — write to hotel_images | Server Actions |
| `src/app/actions/onboarding-upload.ts` | MODIFY — category in presigned URL | Server Actions |
| `src/app/actions/settings.ts` | MODIFY — categorized image management | Server Actions |
| `src/app/actions/hotel-images.ts` | CREATE — CRUD actions | Server Actions |
| `src/lib/provisioning-guard.ts` | MODIFY — validate new structure | Server Actions |

---

## Phase Delivery Order

```
Phase 1 (DB) ──→ Phase 2 (Schemas) ──→ Phase 3 (UI Upload)
                                        │
Phase 1 (DB) ──→ Phase 5 (Server Actions) ──→ Phase 4 (Display)
```

Each phase MUST produce its own PR (chained), with Phase 1 blocking all others. Each PR <= 400 lines.
