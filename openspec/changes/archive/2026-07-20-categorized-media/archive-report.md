# Archive Report: categorized-media

**Archived at**: 2026-07-20
**Status**: ✅ COMPLETE — implemented, verified, deployed to staging

## Summary

Categorized hotel image management across the full stack: database normalization (`hotel_images` table replacing flat `gallery_urls[]`), Zod validation schemas with 8-image categories, category-aware upload UI with per-category dropzones, grouped public display with category priority ordering, and full CRUD server actions with dual-write pattern for backward compatibility.

## Engram Artifact Traceability

| Artifact | Observation ID | Topic Key |
|----------|---------------|-----------|
| Spec | #34 | `sdd/categorized-media/spec` |
| Design | #36 | `sdd/categorized-media/design` |
| Tasks | #38 | `sdd/categorized-media/tasks` |
| Apply Progress | #39 | `sdd/categorized-media/apply-progress` |
| Verify Report | #53 | `sdd/categorized-media/verify-report` |
| Archive Report | This entry | `sdd/categorized-media/archive-report` |

## Stale Checkbox Reconciliation

The filesystem `tasks.md` at archive time had all tasks marked `- [ ]` (unchecked), while:
- Engram tasks observation (#38) had all tasks `- [x]` (checked)
- Apply-progress (#39) confirmed all 5 phases complete with RED/GREEN evidence
- Verify-report (#53) confirmed 132 new tests passing, 14/14 test contracts satisfied
- 8 commits totalling 1107 lines of production code were present on the branch

**Reconciliation**: All checkboxes were marked complete in the archived `tasks.md` per the exception rule in sdd-archive skill (stale checkboxes backed by apply-progress and verify-report proof). Orchestrator had full context of completion when instructing archive.

## Change Metrics

| Metric | Value |
|--------|-------|
| Total production code | 1,107 lines |
| Total test code | ~1,500 lines |
| New tests | 132 passing |
| Total test suite | 1,145 passing (baseline 1,004+ maintained) |
| Commits | 8 |
| PRs | 5 (chained stacked-to-main) |
| Phases | 5 (DB → Schemas → UI Upload → Display → Server Actions) |
| Test contracts | 14/14 (T1-T14) satisfied |

## Commit History

| Commit | Description | Phase |
|--------|-------------|-------|
| `8d296cb` | feat: add hotel_images table with category constraints | Phase 1 — DB |
| `ff3297a` | feat: add Zod schemas for categorized images | Phase 2 — Schemas |
| `6c3952a` | feat: add categorized upload UI with dropzones | Phase 3 — UI Upload |
| `ea947a6` | fix: connect store previews to CategorizedDropzone | Phase 3 — Bug fix |
| `5b263b7` | fix: update step 2 validation to use useHotelImagesStore | Phase 3 — Bug fix |
| `779983a` | feat: add CategorizedHeroGallery with adapter pattern and feature flag | Phase 4 — Display |
| `f94929d` | feat: add read-only server actions for hotel images | Phase 5 — Server Actions (read) |
| `dc70f19` | feat: add write server actions for hotel images with dual-write | Phase 5 — Server Actions (write) |

## Key Decisions (Recorded in Design #36)

1. **Normalized `hotel_images` table** over JSONB — composite indexable, FK integrity, queryable by category
2. **Legacy columns preserved** — dual-read during transition, zero regression guarantee
3. **Adapter pattern for HeroGallery** — `CategorizedImage[]` → flat `{url, alt}[]` for lightbox fallback
4. **R2 category path convention** — `hotels/{hotelId}/{category}/{timestamp}-{filename}` enables lifecycle rules
5. **Feature flag** `categorized-gallery` — Strangler Fig pattern for rollout

## Deviations from Design (Recorded in Apply)

1. **Phase 4 integration**: Modified `getHotelDetailsBySlugAction` to JOIN hotel_images (design approach) instead of using `getHotelImagesAction` (which requires auth, unsuitable for public OTA page)
2. **Feature flag location**: Created at `src/lib/flags.ts` per user instruction, not at `src/flags/pricing.ts` (existing pattern)
3. **Onboarding dual-write**: `FullWizardState` has flat `galleryImages: string[]`, not categorized. Wrote to `hotel_images` with default category `otros`. Future enhancement: extend `FullWizardState` to include `categorizedImages`

## Post-MVP Follow-ups (Design Open Questions)

1. **`main_image_url`**: Originally set from first categorized image by priority order. Should be auto-derived from `hotel_images` (Strangler Fig pattern) — follow-up needed.
2. **Stryker mutation testing**: Not configured in this change (scope management). Post-MVP follow-up needed.
3. **Onboarding FullWizardState**: Extend to support `categorizedImages` field instead of flat `galleryImages`.

## Specs Synced

| Domain | Action | Details |
|--------|--------|---------|
| `hotel-media` | No sync needed | New domain — main spec at `openspec/specs/hotel-media/spec.md` was written directly as source of truth. Delta spec declared no merge needed. |

## Archive Contents

- `proposal.md` ✅
- `exploration.md` ✅
- `specs/hotel-media/spec.md` ✅ (delta — already synced to main)
- `design.md` ✅
- `tasks.md` ✅ (14/14 tasks complete, reconciled from stale state)
- `verify-report.md` ✅
- `archive-report.md` ✅ (this file)

## Source of Truth Updated

The following main spec reflects the new behavior:
- `openspec/specs/hotel-media/spec.md` (278 lines, 7 requirements, 14 test contracts, 14 scenarios)

## Lessons Learned

1. **Task artifact discipline**: The filesystem `tasks.md` was never updated during apply, only the Engram observation. For hybrid workflows, ensure both artifacts are updated in lockstep to avoid stale-checkbox reconciliation at archive time.
2. **Dual-write complexity**: Writing to both `hotel_images` and legacy `gallery_urls` during onboarding was necessary for backward compatibility but adds cognitive load. The flat `FullWizardState` losing category info was a hidden impedance mismatch discovered during Phase 5.
3. **Feature flag placement**: The `categorized-gallery` flag at page level (Strangler Fig) worked well for rollout safety but means the flag check happens before rendering, not at the component level. This is fine for the initial cut but limits fine-grained A/B testing.
4. **Adapter pattern value**: The `legacyGalleryToCategorized()` adapter made Phase 4 safe by providing a clean fallback path. Hotels with no categorized images still render correctly — a pattern worth reusing for future migrations.
5. **Read-before-write layering**: Implementing read actions (Phase 5.1-5.3) before the display layer (Phase 4) unblocked the dependency chain effectively. This pipelining approach saved ~1 day vs. serial execution.

## SDD Cycle Complete

The categorized-media change has been fully planned, explored, implemented, verified, and archived. Ready for post-MVP follow-ups and rollout of the `categorized-gallery` feature flag to production.
