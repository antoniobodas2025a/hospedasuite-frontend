# Booking Widget Specification (MODIFIED)

## Purpose

Update the sidebar booking widget to show correct total price with IVA, integrate date picker inline, and display scarcity signals.

## Requirements

### Requirement: Accurate Price Display

The sidebar MUST display the total price with IVA when dates are selected, not the base price per night.

#### Scenario: Sidebar shows total with dates
- GIVEN dates are selected (checkin/checkout) and room price is $200.000 with tax_rate=0.19
- WHEN the sidebar renders
- THEN it displays "$238.000 total" (not "$200.000/noche")

#### Scenario: Sidebar shows per-night without dates
- GIVEN no dates are selected
- WHEN the sidebar renders
- THEN it displays "Desde $200.000/noche" (minimum room price)

#### Scenario: Sidebar updates on date change
- GIVEN the user changes dates from 1 night to 2 nights
- WHEN the date picker updates
- THEN the sidebar price updates from "$238.000" to "$476.000" within 100ms

### Requirement: Scarcity Signals

The sidebar MUST display urgency badges when availability is low, using real data only.

#### Scenario: Only 1 room available
- GIVEN availableCount=1
- WHEN the sidebar renders
- THEN it displays a red badge "Solo 1 disponible"

#### Scenario: Only 2 rooms available
- GIVEN availableCount=2
- WHEN the sidebar renders
- THEN it displays an orange badge "Solo 2 disponibles"

#### Scenario: Scarcity tooltip
- GIVEN a scarcity badge is displayed
- WHEN the user hovers over the badge
- THEN a tooltip shows "Esta habitación se reserva rápido"

#### Scenario: No false scarcity
- GIVEN availableCount=5
- WHEN the sidebar renders
- THEN no scarcity badge is displayed

### Requirement: Inline Date Picker (Desktop)

The date picker MUST be integrated in the sidebar on desktop, not as a separate modal.

#### Scenario: Date picker visible in sidebar
- GIVEN the user is on desktop (≥1024px)
- WHEN the hotel page loads
- THEN the date picker is visible in the sidebar, ~300px height, below the price

#### Scenario: Collapsible date picker (3+ rooms)
- GIVEN the hotel has 3+ rooms
- WHEN the sidebar renders
- THEN the date picker is collapsible (expanded by default)

#### Scenario: Always expanded (1-2 rooms)
- GIVEN the hotel has 1-2 rooms
- WHEN the sidebar renders
- THEN the date picker is always expanded

### Requirement: Inline Date Picker (Mobile)

The date picker MUST be integrated in a sticky header on mobile, compact and accessible.

#### Scenario: Compact sticky header
- GIVEN the user is on mobile (<1024px)
- WHEN the hotel page loads
- THEN the date picker shows "Llegada — Salida" in a sticky header

#### Scenario: Expand on click
- GIVEN the mobile sticky header is showing
- WHEN the user clicks "Llegada — Salida"
- THEN the full calendar expands

### Requirement: Quick Dates

The date picker MUST provide quick date buttons for common selections.

#### Scenario: Quick date buttons
- GIVEN the date picker is visible
- WHEN it renders
- THEN it displays 3 buttons: "Este fin de semana", "Próxima semana", "Próximo mes"

#### Scenario: Quick date tooltip
- GIVEN a quick date button is displayed
- WHEN the user hovers over it
- THEN a tooltip shows "Selecciona fechas predefinidas para reservar más rápido"

#### Scenario: Quick date updates price
- GIVEN the user clicks "Este fin de semana"
- WHEN the dates are selected
- THEN the price updates within 100ms

### Requirement: Visual Availability

The calendar MUST show which dates are available vs occupied.

#### Scenario: Available dates in green
- GIVEN a date has available rooms
- WHEN the calendar renders
- THEN that date is highlighted in green

#### Scenario: Occupied dates in red
- GIVEN a date has no available rooms
- WHEN the calendar renders
- THEN that date is highlighted in red

### Requirement: Remove "Desde" Label

The sidebar MUST NOT use the misleading "Desde" label.

#### Scenario: No "Desde" in sidebar
- GIVEN the sidebar renders
- WHEN it displays the price
- THEN it does NOT show the word "Desde"

#### Scenario: Real price displayed
- GIVEN the sidebar renders
- WHEN it displays the price
- THEN it shows the actual price of the selected room or minimum room price
