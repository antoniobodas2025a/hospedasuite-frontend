# WhatsApp Round-Trip Specification

## Purpose

Ensure WhatsApp phone number persists bidirectionally between the LeadCaptureModal and the onboarding wizard. Currently, WhatsApp IS hydrated from URL params into the wizard store, but if the user navigates back to `/software` and reopens the lead form, the form does NOT pre-fill with the phone they already entered.

## Requirements

### Requirement: Pre-fill WhatsApp from URL Params in LeadCaptureModal

The system MUST read the `phone` URL parameter on LeadCaptureModal mount and pre-fill the WhatsApp field if present. This ensures that if a user starts the wizard, navigates back to the landing page, and reopens the modal, their phone number is already filled in.

#### Scenario: WhatsApp pre-fills from URL params
- GIVEN the user previously submitted the lead form with phone "+57 300 123 4567"
- AND they navigated back to `/software`
- WHEN LeadCaptureModal opens
- THEN the phone field is pre-filled with "+57 300 123 4567"
- AND the user can edit or keep the value

#### Scenario: No URL param, no pre-fill
- GIVEN the user visits `/software` directly (no lead form interaction)
- WHEN LeadCaptureModal opens
- THEN the phone field is empty (default state)
- AND no pre-fill occurs

#### Scenario: URL param with partial phone
- GIVEN the URL contains `phone=+57`
- WHEN LeadCaptureModal opens
- THEN the phone field is pre-filled with "+57"
- AND the user can continue typing the rest

#### Scenario: Pre-fill works with localStorage draft
- GIVEN a localStorage draft exists with phone "+57 300 999 8888"
- AND the URL contains `phone=+57 300 123 4567`
- WHEN LeadCaptureModal opens
- THEN the phone field is pre-filled with the URL param value "+57 300 123 4567"
- AND URL params take precedence over localStorage draft (explicit intent wins)

#### Scenario: Phone survives round-trip through wizard
- GIVEN the user fills the lead form with phone "+57 300 123 4567"
- AND they proceed to the onboarding wizard
- AND `settings.whatsappNumber` is hydrated to "+57 300 123 4567"
- WHEN they navigate back to `/software` and reopen the modal
- THEN the phone field shows "+57 300 123 4567"
- AND the round-trip data flow is complete (form → wizard → form)
