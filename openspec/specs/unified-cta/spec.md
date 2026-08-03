# Unified CTA Specification

## Purpose

Unify all booking buttons to say "Reservar" throughout the flow, with consistent micro-interactions and keyboard shortcuts.

## Requirements

### Requirement: Unified Button Text

The system MUST display "Reservar" as the button text in all states of the booking flow, eliminating "Explorar Unidad" and "Asegurar Refugio".

#### Scenario: Room card without dates
- GIVEN a room card on the hotel page without checkin/checkout params
- WHEN the card renders
- THEN the button displays "Reservar →"

#### Scenario: Room card with dates
- GIVEN a room card with checkin/checkout params selected
- WHEN the card renders
- THEN the button displays "Reservar →"

#### Scenario: Modal detail view
- GIVEN the room detail modal is open
- WHEN the modal renders
- THEN the CTA button displays "Reservar →"

### Requirement: Button Micro-interactions

The system MUST provide visual feedback when the user clicks "Reservar" to prevent double-clicks and confirm action.

#### Scenario: Click feedback with spinner
- GIVEN the user clicks "Reservar"
- WHEN the click is registered
- THEN the button displays "Procesando..." with a spinner for 300ms

#### Scenario: Button disabled during processing
- GIVEN the user clicks "Reservar"
- WHEN the button is in processing state
- THEN the button is disabled and ignores additional clicks

#### Scenario: Scale animation on click
- GIVEN the user clicks "Reservar"
- WHEN the click occurs
- THEN the button scales down to 0.96, then scales up when modal opens

### Requirement: Keyboard Shortcuts

The system MUST support keyboard navigation for power users to complete the booking flow efficiently.

#### Scenario: ESC closes modal
- GIVEN the room detail modal is open
- WHEN the user presses ESC
- THEN the modal closes and focus returns to the room card

#### Scenario: ENTER confirms reservation
- GIVEN the "Reservar" button has focus
- WHEN the user presses ENTER
- THEN the button triggers the same action as a click

#### Scenario: Calendar navigation with arrows
- GIVEN the date picker is focused
- WHEN the user presses ← or →
- THEN the calendar navigates to previous/next month

#### Scenario: Calendar week navigation
- GIVEN the date picker is focused
- WHEN the user presses ↑ or ↓
- THEN the calendar navigates to previous/next week
