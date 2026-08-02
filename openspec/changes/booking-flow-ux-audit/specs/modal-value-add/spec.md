# Modal Value-Add Specification

## Purpose

Transform the room detail modal from redundant information display to a conversion tool with immersive gallery, policies, payment methods, and clear hierarchy.

## Requirements

### Requirement: Immersive Gallery Display

The system MUST display room photos in an immersive layout that showcases the property effectively.

#### Scenario: Desktop asymmetric grid
- GIVEN the modal opens on desktop (≥1024px)
- WHEN the gallery renders
- THEN it displays in asymmetric grid: hero image (50% width) + 5 detail images

#### Scenario: Mobile horizontal carousel
- GIVEN the modal opens on mobile (<1024px)
- WHEN the gallery renders
- THEN it displays as horizontal swipeable carousel with "Foto 1 de 6" counter

#### Scenario: Photo order
- GIVEN a room with 6+ photos
- WHEN the gallery renders
- THEN photos display in order: hero → bed → bathroom → view → amenities → details

#### Scenario: Minimum photo count
- GIVEN a room with 5+ photos
- WHEN the modal opens
- THEN all photos are displayed

#### Scenario: Lazy loading
- GIVEN the modal opens
- WHEN photos are below the fold
- THEN they load on demand with blur placeholder

### Requirement: Gallery Error Handling

The system MUST handle gallery loading failures gracefully without breaking the modal.

#### Scenario: Network failure loading gallery
- GIVEN the gallery fails to load due to network error
- WHEN the modal renders
- THEN it displays "Error al cargar fotos" with a "Reintentar" button

#### Scenario: Individual image fails
- GIVEN one image in the gallery fails to load
- WHEN the modal renders
- THEN that image shows a gray placeholder with broken image icon

#### Scenario: Slow connection (2G/3G)
- GIVEN the user is on a slow connection
- WHEN the gallery loads
- THEN thumbnails (400x300px) load first, then upgrade to high resolution

### Requirement: Cancellation Policy Display

The system MUST display the hotel's cancellation policy in the modal.

#### Scenario: Policy exists
- GIVEN the hotel has cancellation_policy="Cancela gratis hasta 24h antes"
- WHEN the modal renders
- THEN it displays "Política de cancelación: Cancela gratis hasta 24h antes" with help text "Cancela gratis hasta 24h antes del check-in"

#### Scenario: Policy is null
- GIVEN the hotel has cancellation_policy=null
- WHEN the modal renders
- THEN it displays "Política de cancelación: Consultar con el hotel"

### Requirement: Payment Methods Display

The system MUST display accepted payment methods to build trust.

#### Scenario: Wompi integration
- GIVEN the hotel uses Wompi
- WHEN the modal renders
- THEN it displays payment method icons: tarjetas, PSE, Nequi

### Requirement: Modal Information Hierarchy

The system MUST display modal content in a specific order to guide the user toward conversion.

#### Scenario: Vertical order
- GIVEN the modal is open
- WHEN content renders
- THEN the order is: Gallery → Title → Price → Policies → Payment Methods → CTA

#### Scenario: Price visual hierarchy
- GIVEN the modal is open
- WHEN the price section renders
- THEN the price has font-size 24px+, bold, secondary color

#### Scenario: Sticky CTA
- GIVEN the modal content is scrollable
- WHEN the user scrolls
- THEN the "Reservar" CTA remains sticky at the bottom, always visible

### Requirement: No Redundant Information

The system MUST NOT repeat information already visible on the room card.

#### Scenario: Description not repeated
- GIVEN the room card shows the room description
- WHEN the modal opens
- THEN the modal does NOT repeat the description

#### Scenario: Amenities not repeated in detail
- GIVEN the room card shows amenity badges
- WHEN the modal opens
- THEN the modal shows amenity details (not just badges)

### Requirement: Room Availability Handling

The system MUST handle cases where the room becomes unavailable while the user is viewing the modal.

#### Scenario: Room sold out during modal view
- GIVEN the user is viewing the modal
- WHEN the room becomes unavailable (availableCount=0)
- THEN the modal displays "Ya no disponible" and CTA changes to "Ver otras habitaciones"

### Requirement: Date Persistence

The system MUST preserve selected dates across modal open/close cycles.

#### Scenario: Dates persist after modal close
- GIVEN the user selected dates and opened the modal
- WHEN the user closes the modal
- THEN the dates remain in URL params and localStorage

#### Scenario: Dates persist across sessions
- GIVEN the user selected dates in a previous session
- WHEN the user returns to the hotel page
- THEN the dates load from localStorage automatically

### Requirement: Multiple Rooms Handling

The system MUST handle hotels with multiple rooms correctly.

#### Scenario: Each room shows its own price
- GIVEN a hotel with 3 rooms at different prices
- WHEN the room list renders
- THEN each room card displays its own price with IVA

#### Scenario: Sidebar shows selected room price
- GIVEN the user selects a specific room
- WHEN the sidebar updates
- THEN it displays the price of that specific room, not the minimum
