# Provisioning Specification

## Purpose

Define the executeProvisioning flow that saves all wizard data, uploads all images, inserts rooms, and marks onboarding as complete.

## Requirements

### Requirement: Provisioning Execution

The system MUST execute provisioning on payment success. The flow MUST: (1) upload all pending images via `uploadOptimizedImageAction`, (2) save hotel data to `hotels` table, (3) insert rooms with gallery/amenities/availability, (4) set `hotels.is_onboarding_complete = true`, (5) redirect to `/dashboard`.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Full provisioning | All 6 steps completed, payment success | executeProvisioning called | All images uploaded, hotel saved, rooms inserted, redirect to /dashboard |
| Partial images | Some images uploaded during wizard, some pending | executeProvisioning called | Only pending images uploaded, existing URLs reused |
| No rooms | 0 rooms configured | executeProvisioning called | Fails, validation error (should be blocked by step 4) |
| Hotel data save | Hotel name, city, location filled | executeProvisioning runs | hotels table updated with all fields |
| Room insert | 2 rooms with amenities, gallery, availability | executeProvisioning runs | 2 room rows inserted with all data |
| Onboarding flag | Provisioning starts | After all saves complete | `is_onboarding_complete` set to true |

### Requirement: Provisioning Progress Feedback

The system MUST show loading state with progress indicators during provisioning. Users MUST NOT be able to navigate away during provisioning.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Progress stages | Provisioning started | User views screen | Shows: "Subiendo imágenes...", "Guardando datos...", "Configurando unidades..." |
| Navigation lock | Provisioning in progress | User clicks back button | Navigation blocked |
| Complete | All stages done | Provisioning finishes | Redirects to /dashboard |

### Requirement: Provisioning Error Recovery

If provisioning fails, the system MUST show an error state with retry button. All wizard data MUST be preserved so user can retry without re-entering data.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Network failure | Server unreachable during provisioning | Error occurs | Error state shown with "Reintentar" button |
| Partial save | Hotel saved but rooms failed | Error occurs | Error shown, retry completes remaining operations |
| Retry success | User clicks retry after failure | Retry executes | Provisioning resumes from failed point |
| Data preserved | Provisioning fails | User views wizard | All previously entered data still present |

### Requirement: Image Deduplication

The system MUST NOT re-upload images that were already uploaded during the wizard steps. Only pending (not yet uploaded) images should be uploaded during provisioning.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Already uploaded | Logo uploaded in step 1 | Provisioning runs | Logo URL reused, no re-upload |
| Pending upload | Room images selected but not uploaded | Provisioning runs | Room images uploaded during provisioning |
| All uploaded | All images uploaded during wizard | Provisioning runs | No image uploads needed, only DB saves |
