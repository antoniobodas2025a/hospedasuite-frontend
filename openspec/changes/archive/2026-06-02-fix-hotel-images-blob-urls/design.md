# Design: Fix Hotel Images Blob URLs

## Technical Approach

Defense in depth across 3 layers: Zod schema refinement (reject `blob:` at parse time), client-side guard (hard fail on upload failure instead of silent blob fallback), and server-side validation (last-resort check before DB insert). Plus a Supabase CLI repair script for existing data.

## Architecture Decisions

| Decision | Option A | Option B | Choice | Rationale |
|---|---|---|---|---|
| Validation utility | Shared `isValidImageUrl()` in a new `src/lib/url-utils.ts` | Inline `.refine()` in each schema field | **Inline** | Only 2 schema fields (`galleryImages`, `imageUrls`) + 1 server check. A 1-function util module adds indirection with zero reuse gain. Zod `.refine` is self-documenting inline. |
| Upload error UX | Step-level retry (existing "go back" button) | Inline retry per individual failed image | **Step-level retry** | The error state already has a button that navigates back. Adding per-file inline retry would require managing partial upload state for no clear benefit — the user re-uploads from the previous step anyway. |
| Data repair action | Null out blob URLs (Unsplash fallback) | Delete the affected hotel row | **Null out** | Less destructive. Hotel stays online with placeholder images. Owner can re-upload via dashboard at any time. |

## Data Flow

```
User picks images ──→ Gallery/Room steps (blob previews stored in Zustand)
                              │
                              ▼
                   ProvisioningStep: upload loop
                     compress → presign → uploadToR2
                              │
                    ┌─────────┴──────────┐
                    ▼                    ▼
              upload succeeds       upload fails
              (publicUrl from R2)   (rejected promise)
                    │                    │
                    ▼                    ▼
              galleryUrls array      entry is missing
              or roomUrlMap              │
                    │                    ▼
                    │         SET ERROR: "X of Y images failed"
                    │         → no fallback to blob previews
                    │         → user sees error screen + retry button
                    │
                    ▼
              Build wizardState with R2 URLs only
                    │
                    ▼
              fullWizardStateSchema.safeParse()
              → Zod .refine rejects any blob: URL
                    │
                    ▼
              executeOnboardingProvisioning()
              → DEFENSE IN DEPTH: scan galleryImages + room.imageUrls
              → reject if any string starts with "blob:"
                    │
                    ▼
              DB insert with validated URLs ✅
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/lib/onboarding-schemas.ts` | Modify | Add `.refine(url => !url.startsWith('blob:'), ...)` to `imageUrls` (roomDraftSchema L38) and `galleryImages` (fullWizardStateSchema L73) |
| `src/components/onboarding/ProvisioningStep.tsx` | Modify | Replace L120 fallback (`galleryUrls.length > 0 ? galleryUrls : galleryPreviews`) and L130 fallback (`roomUrlMap[r.id] \|\| r.imagePreviews`) with upload-failure detection that sets error status |
| `src/app/actions/onboarding.ts` | Modify | Add blob URL guard after auth check (before hotel insert) — scan `state.galleryImages` and all `room.imageUrls` |
| `scripts/fix-blob-image-urls.ts` | Create | Query hotels and rooms with blob URLs, null them out with `--fix` flag, report counts |
| `src/lib/__tests__/onboarding-schemas.test.ts` | Create | Unit tests for schema rejection + server action rejection |

## Interfaces / Contracts

**Zod refinements** (inline in `onboarding-schemas.ts`, no new exports):

```ts
// roomDraftSchema.imageUrls
imageUrls: z.array(
  z.string().refine(url => !url.startsWith('blob:'), 'Las URLs blob no son válidas')
).default([])

// fullWizardStateSchema.galleryImages
galleryImages: z.array(
  z.string().refine(url => !url.startsWith('blob:'), 'Las URLs blob no son válidas')
)
```

**Server action guard** (in `executeOnboardingProvisioning`, after auth + hotel creation, before the `hotelUpdateBase` construction):

```ts
// Reject blob URLs before they reach the database
const blobGallery = state.galleryImages.filter(u => u.startsWith('blob:'));
if (blobGallery.length > 0) {
  return { success: false, error: `${blobGallery.length} imágenes tienen URLs inválidas. Reintentá la carga.` };
}
for (const room of state.rooms) {
  const blobRoom = room.imageUrls.filter(u => u.startsWith('blob:'));
  if (blobRoom.length > 0) {
    return { success: false, error: `La habitación "${room.name}" tiene URLs de imagen inválidas.` };
  }
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Schema rejects blob URLs in gallery | `fullWizardStateSchema.safeParse()` with `galleryImages: ['blob:...']` → `!result.success` |
| Unit | Schema rejects blob URLs in room images | `roomDraftSchema.safeParse()` with `imageUrls: ['blob:...']` → `!result.success` |
| Unit | Schema accepts valid HTTPS URLs | Parse with `https://r2.dev/bucket/image.webp` → success |
| Unit | Server action rejects blob state | Mock `createClient` + `createAdminClient`, call with blob in `state.galleryImages` → `{ success: false }` |

Tests in `src/lib/__tests__/onboarding-schemas.test.ts` follow existing Vitest + Zod patterns from `src/lib/__tests__/event-types.test.ts`. Vitest auto-discovers via `src/lib/__tests__/**/*.test.ts` glob (configured in `vitest.config.ts`).

## Migration / Rollout

No DB migration required. Data repair script runs manually:

```
npx tsx scripts/fix-blob-image-urls.ts        # dry-run: reports affected hotels/rooms
npx tsx scripts/fix-blob-image-urls.ts --fix  # nulls out blob URLs
```

Script follows existing `scripts/fix-gallery-urls.ts` pattern (dotenv + service role key + Supabase client). Affected hotels will show Unsplash placeholder images until the owner re-uploads via dashboard.

## Open Questions

None — all design decisions resolved.
