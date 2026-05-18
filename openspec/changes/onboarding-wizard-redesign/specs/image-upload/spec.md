# Image Upload Specification

## Purpose

Define optimized image upload behavior for the onboarding wizard. All images MUST use `uploadOptimizedImageAction` server action with Sharp optimization (3 sizes + blur).

## Requirements

### Requirement: Optimized Upload Pipeline

The system MUST use `uploadOptimizedImageAction` for ALL image uploads in the wizard. Direct Supabase uploads are PROHIBITED. The action MUST generate 3 sizes (thumb=256px, card=640px, full=1920px) and a blurDataURL.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Logo upload | User selects logo | Upload triggered | action(folder='covers') called, 3 sizes + blur generated |
| Cover upload | User selects cover photo | Upload triggered | action(folder='hero') called, 3 sizes + blur generated |
| Gallery upload | User selects 5 photos | Upload triggered | action(folder='gallery') called for each, 3 sizes + blur per image |
| Room image upload | User selects room photo | Upload triggered | action(folder='rooms') called, 3 sizes + blur generated |
| Wrong folder | Code calls with folder='invalid' | Validation runs | Action rejects with error |

### Requirement: Upload Progress

The system MUST show per-image upload progress during upload. Users MUST see which images are uploading, completed, or failed.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Single upload | User uploads 1 image | Upload starts | Progress indicator shows 0-100% |
| Multiple upload | User uploads 4 images | Upload starts | Each image shows individual progress |
| Upload complete | All images uploaded | Progress reaches 100% | Progress indicator replaced with preview |
| Upload failed | Network error during upload | Upload fails | Error shown on that image, retry available |

### Requirement: Blur Preview

The system MUST store and use blurDataURL for image previews. Thumbnails MUST render with blur placeholder while full image loads.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Logo preview | Logo uploaded | Preview renders | Shows blurDataURL as placeholder |
| Gallery preview | Gallery images uploaded | Grid renders | Each thumbnail shows blur placeholder |
| Room image preview | Room image uploaded | Room card renders | Shows blur placeholder |

### Requirement: Image Limits

The system MUST enforce image count limits per section: gallery 3-8 photos, room gallery up to 5 photos per room.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Gallery min | 2 gallery photos | User tries to proceed | Blocked, shows "Mínimo 3 fotos" |
| Gallery max | 8 gallery photos | User tries to add 9th | Upload button disabled |
| Room max | Room has 5 images | User tries to add 6th | Upload button disabled |
