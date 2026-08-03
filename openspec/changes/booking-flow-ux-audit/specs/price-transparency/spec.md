# Price Transparency Specification

## Purpose

Ensure users see total price with IVA from the start, with clear breakdown. Handle tax_rate=0 (régimen simplificado) and tax_rate=null (fallback) correctly.

## Requirements

### Requirement: Price Display with IVA

The system MUST display price with IVA breakdown from the moment the hotel page loads, regardless of whether dates are selected.

#### Scenario: Hotel with tax_rate=0.19, no dates selected
- GIVEN a hotel with tax_rate=0.19 and room price $200.000
- WHEN the hotel page loads without checkin/checkout params
- THEN the room card displays "$200.000 + IVA (19%): $38.000 | Total: $238.000"

#### Scenario: Hotel with tax_rate=0.19, dates selected (1 night)
- GIVEN a hotel with tax_rate=0.19, room price $200.000, and dates 2026-08-03 to 2026-08-04
- WHEN the hotel page loads with checkin/checkout params
- THEN the room card displays "$200.000 × 1 noche + IVA (19%): $38.000 | Total: $238.000"

#### Scenario: Hotel with tax_rate=0.19, dates selected (2+ nights)
- GIVEN a hotel with tax_rate=0.19, room price $200.000, and dates 2026-08-03 to 2026-08-05
- WHEN the hotel page loads
- THEN the room card displays "$200.000 × 2 noches = $400.000 + IVA (19%): $76.000 | Total: $476.000"

#### Scenario: Hotel with tax_rate=0 (régimen simplificado)
- GIVEN a hotel with tax_rate=0 and room price $200.000
- WHEN the hotel page loads
- THEN the room card displays "$200.000 (IVA incluido) | Total: $200.000"

#### Scenario: Hotel with tax_rate=null (fallback)
- GIVEN a hotel with tax_rate=null and room price $200.000
- WHEN the hotel page loads
- THEN the system uses DEFAULT_TAX_RATE=0.19 and displays "$200.000 + IVA (19%): $38.000 | Total: $238.000"

### Requirement: Dynamic Tax Label

The system MUST display the tax percentage dynamically based on hotel.tax_rate, not hardcoded.

#### Scenario: Tax label reflects actual rate
- GIVEN a hotel with tax_rate=0.19
- WHEN the price breakdown is displayed
- THEN the label shows "IVA (19%)"

#### Scenario: Zero tax label
- GIVEN a hotel with tax_rate=0
- WHEN the price breakdown is displayed
- THEN the label shows "IVA incluido"

### Requirement: Sidebar Price Consistency

The sidebar MUST display the same total price as the room card, updating in real-time when dates change.

#### Scenario: Sidebar shows correct total with dates
- GIVEN dates are selected and room price is $200.000 with tax_rate=0.19
- WHEN the sidebar renders
- THEN it displays "$238.000 total" (not "$200.000/noche")

#### Scenario: Sidebar updates when dates change
- GIVEN the user changes dates from 1 night to 2 nights
- WHEN the date picker updates
- THEN the sidebar price updates from "$238.000" to "$476.000" within 100ms
