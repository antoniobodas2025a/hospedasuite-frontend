# Proposal: Fix Hotel Images Blob URLs

## Intent

New hotels created through the onboarding wizard have `blob:` URLs stored in the database as `main_image_url` and `gallery_urls`. These are client-side only URLs that become invalid after the session ends, causing broken images across the OTA. The root cause is a silent fallback in `ProvisioningStep.tsx` when R2 uploads fail, combined with zero server-side validation in `executeOnboardingProvisioning`.

## Scope

### In Scope
- Client-side: Remove silent blob URL fallback in `ProvisioningStep.tsx` — fail hard if R2 uploads don't succeed
- Client-side: Show actionable error with retry option when uploads fail
- Server-side: Add blob URL validation to `executeOnboardingProvisioning` via Zod schema refinement
- Server-side: Reject provisioning if any gallery/room image URL starts with `blob:`
- Data repair: Script to detect and fix existing hotels with blob URLs in DB
- Tests: Unit tests for schema validation + server action blob rejection

### Out of Scope
- Fixing the underlying R2 upload failure cause (async credentials in `r2-client.ts`) — tracked separately
- Migrating images to a different storage provider
- Changes to the Next.js Image `remotePatterns` config

## Capabilities

### New Capabilities
None

### Modified Capabilities
- `image-upload`: Add requirement that uploads MUST fail explicitly (no silent fallback to blob URLs); add server-side URL format validation
- `provisioning`: Add requirement that provisioning MUST reject blob URLs with clear error message

## Approach

**Layer 1 — Schema validation** (`onboarding-schemas.ts`):
- Add `z.string().refine(url => !url.startsWith('blob:'), 'Invalid image URL')` to `galleryImages` and `imageUrls` fields

**Layer 2 — Client-side guard** (`ProvisioningStep.tsx`):
- Replace `galleryUrls.length > 0 ? galleryUrls : galleryPreviews` with hard failure: if `galleryUrls.length < galleryFiles.length`, set error status with message "X of Y images failed to upload"
- Same pattern for room images
- Error state already has retry button → user goes back and retries

**Layer 3 — Server-side validation** (`onboarding.ts`):
- Add pre-insert validation that scans `state.galleryImages` and all `room.imageUrls` for `blob:` prefix
- Return `{ success: false, error: '...' }` if any blob URLs detected (defense in depth)

**Layer 4 — Data repair** (`scripts/fix-blob-image-urls.ts`):
- Query all hotels where `main_image_url LIKE 'blob:%'` OR any `gallery_urls` element starts with `blob:`
- Report count of affected hotels
- Option to null out blob URLs (images will show placeholder until re-uploaded via dashboard)

**Layer 5 — Tests** (`src/lib/__tests__/onboarding-schemas.test.ts`):
- Test that schema rejects blob URLs
- Test that schema accepts valid HTTPS URLs
- Test that `executeOnboardingProvisioning` rejects blob URLs (mock Supabase)

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/lib/onboarding-schemas.ts` | Modified | Add URL format refinement to galleryImages and imageUrls |
| `src/components/onboarding/ProvisioningStep.tsx` | Modified | Remove silent fallback, fail hard on upload errors |
| `src/app/actions/onboarding.ts` | Modified | Add blob URL validation before DB insert |
| `scripts/fix-blob-image-urls.ts` | New | Data repair script for existing affected hotels |
| `src/lib/__tests__/onboarding-schemas.test.ts` | New | Unit tests for schema validation |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Existing hotels with blob URLs remain broken | Low | Data repair script included in scope |
| Users with poor connectivity can't complete onboarding | Medium | Error message explains the issue; retry preserves all data |
| R2 upload failures increase if root cause not fixed | Medium | This fix makes failures visible instead of silent; root cause tracked separately |

## Rollback Plan

1. Revert the 3 modified source files to restore previous behavior (blob URLs silently accepted)
2. If data repair script already ran, affected hotels will have null image URLs — re-upload via dashboard or re-run with backup
3. No database schema changes, so no migration rollback needed

## Dependencies

- None — this change is self-contained

## Success Criteria

- [ ] Schema rejects any URL starting with `blob:`
- [ ] ProvisioningStep shows error (not silent fallback) when R2 uploads fail
- [ ] Server action rejects blob URLs even if client-side guard is bypassed
- [ ] Data repair script identifies and fixes all hotels with blob URLs
- [ ] Unit tests pass for schema validation + server action rejection
- [ ] No new hotels created with blob URLs in gallery_urls or main_image_url
