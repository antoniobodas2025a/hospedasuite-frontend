# Onboarding State Management Specification

## Purpose

Define state management for the onboarding wizard using Zustand store with DB persistence and recovery.

## Requirements

### Requirement: Zustand Store

The system MUST use the existing `useOnboardingStore` Zustand store for all wizard state. The store MUST hold: current step, hotel identity data, gallery images, property type, rooms array, settings, staff data, and upload progress.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Store init | Wizard page loads | Store initializes | All fields at default/empty state |
| Step update | User completes step 1 | Store updates | currentStep=2, step1 data persisted in store |
| Room add | User adds room from template | Store updates | Room appended to rooms array with pre-filled data |
| Room edit | User edits room name | Store updates | Room name updated in store |
| Image add | User uploads gallery image | Store updates | Image URL + blurDataURL added to gallery array |

### Requirement: DB Persistence

The system MUST persist wizard progress to `hotels.onboarding_step` (integer) and `hotels.config` (JSONB) on each step completion. Field-level changes MUST be debounced (500ms) before saving.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Step completion | User advances from step 1 to 2 | onboarding_step updated | DB row shows onboarding_step=2 |
| Config save | Step 5 completed | config updated | DB row shows config JSON with all settings |
| Debounced save | User types in name field rapidly | 500ms after last keystroke | Single DB update with final value |
| No save on invalid | Field has validation error | Debounce timer fires | No DB save (invalid data not persisted) |

### Requirement: State Recovery

On page load, the system MUST check `hotels.onboarding_step` and `hotels.config`. If partial onboarding exists, the system MUST restore wizard state from DB and navigate to the last saved step.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Fresh start | onboarding_step=NULL | Page loads | Wizard starts at step 1, empty state |
| Partial recovery | onboarding_step=3, config has data | Page loads | Steps 1-3 data restored, wizard opens at step 3 |
| Complete onboarding | is_onboarding_complete=true | Page loads | Redirects to /dashboard (no wizard access) |
| Corrupted config | config JSON invalid | Page loads | Falls back to step 1, logs error |

### Requirement: Onboarding Success Page

The system MUST provide a success page at `/software/onboarding/success` shown after provisioning completes. The page MUST display: "¡Tu propiedad está lista!" message, preview link, button to dashboard, button to OTA page.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Success display | Provisioning complete, redirected | Success page loads | Shows "¡Tu propiedad está lista!" with preview |
| Dashboard nav | Success page shown | User clicks "Ir al Dashboard" | Redirects to /dashboard |
| OTA nav | Success page shown | User clicks "Configurar OTAs" | Redirects to OTA configuration page |
