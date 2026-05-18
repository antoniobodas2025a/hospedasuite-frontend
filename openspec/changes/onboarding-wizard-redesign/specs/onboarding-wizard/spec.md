# Onboarding Wizard Specification

## Purpose

Define the 6-step onboarding wizard for existing tenants who already have auth + staff row + hotel_id. Replaces the current single-page onboarding that violates 10 Nielsen heuristics.

## Requirements

### Requirement: 6-Step Wizard Flow

The system MUST present a 6-step wizard: (1) Identidad, (2) Galería del Property, (3) Tipo de Propiedad, (4) Unidades, (5) Configuración, (6) Pago + Launch. Each step MUST enforce its own validation before allowing progression.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Step navigation | User on step 2 | Clicks "Siguiente" with valid data | Advances to step 3 |
| Step blocked | User on step 1, name empty | Clicks "Siguiente" | Stays on step 1, shows inline error |
| Back navigation | User on step 4 | Clicks completed step 2 dot | Returns to step 2 with state preserved |
| First load | Existing tenant, no partial data | Opens wizard | Starts at step 1 |
| Resume | Tenant with saved step=3 | Opens wizard | Restores to step 3 with saved data |

### Requirement: Step 1 — Hotel Identity

The system MUST collect: name (required, ≥3 chars), city (required), location (required), address (optional), phone (optional), email (optional), description (optional). Logo and cover photo uploads via `uploadOptimizedImageAction`. Address/phone/email MUST be hidden behind "Más detalles" accordion (progressive disclosure).

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Required valid | name="Hotel Sol", city="Bariloche", location="Río Negro" | Step validation runs | Passes, can proceed |
| Name too short | name="Ho" | Step validation runs | Fails, shows "Mínimo 3 caracteres" |
| City missing | name="Hotel Sol", city="" | Step validation runs | Fails, shows "Campo requerido" |
| Logo upload | User selects image file | Upload completes | Stored via action(folder='covers'), blurDataURL saved |
| Cover upload | User selects image file | Upload completes | Stored via action(folder='hero'), blurDataURL saved |
| Accordion closed | Step 1 renders | User views form | Only name, city, location, description visible |
| Accordion open | Accordion closed | User clicks "Más detalles" | Address, phone, email expand with spring animation |

### Requirement: Step 2 — Property Gallery

The system MUST accept 3-8 property photos via `uploadOptimizedImageAction(folder='gallery')`. Users MUST be able to drag-and-drop reorder, preview in grid, and remove individual images. Minimum 3 photos required to proceed.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Minimum met | 3 photos uploaded | Step validation runs | Passes |
| Below minimum | 2 photos uploaded | Step validation runs | Fails, shows "Mínimo 3 fotos" |
| Above maximum | 8 photos uploaded | User tries to add 9th | Upload rejected or disabled |
| Reorder | 5 photos in grid | User drags photo 5 to position 2 | Order updates, state persists |
| Remove | 4 photos in grid | User removes photo 3 | 3 photos remain, validation re-runs |
| Preview | Photo uploaded | Grid renders | Shows optimized preview with blur placeholder |

### Requirement: Step 3 — Property Type

The system MUST present 5 property type options: Hotel, Glamping, Cabañas, Hostal, Apartamento. Selection determines which room templates appear in Step 4.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Select Hotel | Step 3 renders | User clicks "Hotel" | Badge highlighted, templates for Hotel loaded |
| Select Glamping | Step 3 renders | User clicks "Glamping" | Badge highlighted, templates for Glamping loaded |
| Change type | Hotel selected | User changes to Cabañas | Previous room selections cleared, new templates shown |
| No selection | Step 3 renders, no selection | Clicks "Siguiente" | Fails, shows "Seleccioná un tipo" |

### Requirement: Step 4 — Rooms with Templates

The system MUST show room templates from ROOM_TEMPLATES registry filtered by property type. Each template pre-fills name, suggested amenities, default capacity, suggested price range. User can add multiple rooms from templates. Per room: name (required), price (required, >0), description, capacity, amenities (toggle from AMENITY_REGISTRY), gallery (up to 5 images via uploadOptimizedImageAction(folder='rooms')), availability range (DayPicker). At least 1 room with name and price > 0 required.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Template select | Property type=Hotel, Step 4 | User clicks "Habitación Estándar" | Room added with pre-filled name, amenities, capacity |
| Custom room | Templates shown | User clicks "Agregar personalizada" | Empty room form opens |
| Room valid | Room name="Suite", price=15000 | Validation runs | Passes |
| Room invalid name | Room name="" | Validation runs | Fails, shows inline error |
| Room invalid price | Room name="Suite", price=0 | Validation runs | Fails, shows "Precio debe ser mayor a 0" |
| Room gallery | Room has 0 images | User uploads 3 images | Stored via action(folder='rooms'), max 5 enforced |
| Room amenities | Room form open | User toggles amenities | Selected amenities saved to room state |
| Room availability | Room form open | User selects date range via DayPicker | Availability range saved |
| Multiple rooms | 1 room configured | User adds another from template | 2 rooms in list, both editable |
| Remove room | 2 rooms configured | User removes room 1 | 1 room remains, validation re-runs |
| No rooms | 0 rooms | Clicks "Siguiente" | Fails, shows "Agregá al menos 1 unidad" |

### Requirement: Step 5 — Settings + Staff

The system MUST collect: hotel amenities (toggle from AMENITY_REGISTRY), check-in time, check-out time, cancellation policy (textarea), WhatsApp number, Google Maps URL. Advanced settings (SEO, trust badges, reception hours) hidden behind accordion. Staff name and pin_code MUST be editable with current values pre-filled.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Amenities toggle | Step 5 renders | User toggles WiFi, Pool | Amenities saved to state |
| Check-in/out | Default times shown | User changes to 15:00/10:00 | Times saved |
| WhatsApp | Empty field | User enters "+5492944123456" | Saved with validation |
| Advanced hidden | Step 5 renders | User views form | Only basic fields visible |
| Advanced shown | Accordion closed | User clicks "Configuración avanzada" | SEO, trust badges, reception hours expand |
| Staff edit | Staff row exists | User views staff section | Current name and pin_code pre-filled, editable |
| Staff update | Staff name="Juan" | User changes to "María" | New name saved to state |

### Requirement: Step 6 — Payment + Launch

The system MUST display summary of all configured data. WompiButton for payment with amount from `?price=` query param (default 89900). On payment success: execute provisioning, redirect to /dashboard. Loading state with progress indicators MUST be shown during provisioning.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Summary display | Step 6 renders | User views summary | All steps' data shown in readable format |
| Price from URL | URL has `?price=99900` | WompiButton renders | Amount=99900 |
| Default price | URL has no price param | WompiButton renders | Amount=89900 |
| Payment success | User completes Wompi payment | Payment confirmed | executeProvisioning runs, progress shown |
| Payment failed | Payment declined | User sees result | Error displayed, data preserved, retry available |
| Provisioning progress | Provisioning started | User waits | Progress indicators show upload/save stages |
| Provisioning complete | All data saved | Provisioning finishes | Redirects to /dashboard |
| Provisioning error | Network failure during provisioning | Error occurs | Error state shown with retry button, all data preserved |

### Requirement: Progress Indicator

The system MUST display a visual step indicator at the top: 6 dots/circles with labels. Completed steps show checkmark. Current step highlighted. Clicking completed steps allows navigation back.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Initial state | Step 1 active | Indicator renders | Step 1 highlighted, steps 2-6 dimmed |
| Progress | Steps 1-2 completed, step 3 active | Indicator renders | Steps 1-2 show checkmarks, step 3 highlighted |
| Back click | Steps 1-3 completed, step 4 active | User clicks step 2 dot | Navigates to step 2, state restored |
| Forward blocked | Step 1 active | User clicks step 3 dot | No navigation (incomplete steps in between) |

### Requirement: Real-Time Validation

The system MUST validate fields in real-time as user types, not only at step transition. Invalid fields MUST show red border + inline error message. Step cannot be completed until all required fields are valid.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Field valid | name="Hotel Sol" (≥3 chars) | User types | Green border or no error shown |
| Field invalid | name="Ho" (<3 chars) | User types then blurs | Red border + "Mínimo 3 caracteres" |
| Required empty | city="" | User blurs field | Red border + "Campo requerido" |
| Step gate | Step has 1 invalid field | User clicks "Siguiente" | Stays on step, highlights invalid field |
| Auto-fix | name="Ho" → user types "tel" → "Hotel" | Validation re-runs | Error clears, border returns to normal |

### Requirement: No Alert Calls

The system MUST NOT use `alert()` anywhere. All errors MUST be displayed inline with GlassTooltip or red text. Network errors MUST show toast with retry option.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Validation error | Field invalid | Error displays | Inline red text, no alert |
| Network error | Upload fails | Error occurs | Toast notification with retry button |
| Provisioning error | Server error during save | Error occurs | Inline error state with retry button |

### Requirement: Draft Auto-Save

The system MUST automatically save draft on each field change with debounce. Progress MUST be persisted to `hotels.onboarding_step` and `hotels.config` on each step completion.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Field change | User edits name field | 500ms passes | Draft saved to DB |
| Step complete | User completes step 2 | Advances to step 3 | `onboarding_step` updated to 3, config saved |
| Rapid edits | User types quickly | Multiple changes in 1s | Only final state saved (debounced) |
