# Room Card Specification (MODIFIED)

## Purpose

Update the room card to display price with IVA from the start, use unified "Reservar" button, and integrate with the new booking flow.

## Requirements

### Requirement: Price Display with IVA

The room card MUST display price with IVA breakdown from the moment the page loads.

#### Scenario: Price with IVA, no dates
- GIVEN a room with price $200.000 and hotel tax_rate=0.19
- WHEN the card renders without dates selected
- THEN it displays "$200.000 + IVA (19%): $38.000 | Total: $238.000"

#### Scenario: Price with IVA, dates selected
- GIVEN a room with price $200.000, tax_rate=0.19, and 1 night selected
- WHEN the card renders
- THEN it displays "$200.000 × 1 noche + IVA (19%): $38.000 | Total: $238.000"

#### Scenario: Zero tax rate
- GIVEN a room with price $200.000 and hotel tax_rate=0
- WHEN the card renders
- THEN it displays "$200.000 (IVA incluido) | Total: $200.000"

### Requirement: Unified Button Text

The room card button MUST say "Reservar" in all states.

#### Scenario: Button without dates
- GIVEN the card renders without dates selected
- WHEN the button renders
- THEN it displays "Reservar →"

#### Scenario: Button with dates
- GIVEN the card renders with dates selected
- WHEN the button renders
- THEN it displays "Reservar →"

### Requirement: Click Behavior

The room card button MUST open the room detail modal when clicked.

#### Scenario: Click opens modal
- GIVEN the user clicks "Reservar"
- WHEN the click is registered
- THEN the room detail modal opens with the selected room

#### Scenario: Click with dates
- GIVEN dates are selected and user clicks "Reservar"
- WHEN the click is registered
- THEN the modal opens with dates pre-filled

### Requirement: Gallery Integration

The room card MUST display a cover image that links to the full gallery in the modal.

#### Scenario: Cover image display
- GIVEN a room with 5+ photos
- WHEN the card renders
- THEN it displays the first photo as cover image with blur placeholder

#### Scenario: Click on image opens modal
- GIVEN the user clicks on the cover image
- WHEN the click is registered
- THEN the modal opens showing the full gallery

### Requirement: Responsive Layout

The room card MUST adapt to different screen sizes.

#### Scenario: Desktop layout
- GIVEN the screen is ≥768px
- WHEN the card renders
- THEN it displays in horizontal layout: image left, content right

#### Scenario: Mobile layout
- GIVEN the screen is <768px
- WHEN the card renders
- THEN it displays in vertical layout: image top, content bottom

### Requirement: Scarcity Badge on Card

The room card MUST display scarcity badges when availability is low.

#### Scenario: Only 1 available
- GIVEN availableCount=1
- WHEN the card renders
- THEN it displays a red badge "Solo 1 disponible" on the image

#### Scenario: Only 2 available
- GIVEN availableCount=2
- WHEN the card renders
- THEN it displays an orange badge "Solo 2 disponibles" on the image
