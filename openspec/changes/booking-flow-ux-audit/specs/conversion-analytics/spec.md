# Conversion Analytics Specification

## Purpose

Track user behavior throughout the booking flow to measure conversion rate, identify drop-off points, and optimize the funnel.

## Requirements

### Requirement: Analytics Events

The system MUST fire analytics events at key moments in the booking flow with relevant properties.

#### Scenario: view_room event
- GIVEN a room card is 50%+ visible in the viewport
- WHEN the card enters the viewport
- THEN the system fires `view_room` with properties: room_id, hotel_id, price, has_dates, tax_rate

#### Scenario: click_reserve event
- GIVEN the user clicks "Reservar" button
- WHEN the click is registered
- THEN the system fires `click_reserve` with properties: room_id, hotel_id, price, nights, has_dates, tax_rate

#### Scenario: open_room_modal event
- GIVEN the user clicks "Reservar" and modal opens
- WHEN the modal opens
- THEN the system fires `open_room_modal` with properties: room_id, hotel_id, source (card/sidebar)

#### Scenario: close_room_modal event
- GIVEN the user closes the modal
- WHEN the modal closes
- THEN the system fires `close_room_modal` with properties: room_id, hotel_id, action (reserve/back/esc)

#### Scenario: complete_booking event
- GIVEN the user completes payment successfully
- WHEN the booking is confirmed
- THEN the system fires `complete_booking` with properties: room_id, hotel_id, total_price, nights, guests, payment_method

#### Scenario: abandon_booking event
- GIVEN the user leaves the booking flow without completing
- WHEN the user navigates away or closes the modal
- THEN the system fires `abandon_booking` with properties: room_id, hotel_id, step (card/modal/checkout), time_spent

### Requirement: Event Delivery

All analytics events MUST reach Google Analytics/Tag Manager successfully.

#### Scenario: Events arrive at GA
- GIVEN an analytics event is fired
- WHEN the event is processed
- THEN it arrives at Google Analytics/Tag Manager within 1 second

#### Scenario: Event validation
- GIVEN the system is in development mode
- WHEN an event is fired
- THEN it can be validated with GA Debugger browser extension
