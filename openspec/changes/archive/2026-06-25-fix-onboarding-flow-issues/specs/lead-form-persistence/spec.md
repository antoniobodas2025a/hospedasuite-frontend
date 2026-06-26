# Lead Form Persistence Specification

## Purpose

Add localStorage persistence to the public LeadCaptureModal so that user input survives page refresh, accidental navigation, or browser crashes. This is a separate concern from the wizard's own localStorage store (`hospedasuite:wizard-memory`) and uses its own key.

## Requirements

### Requirement: localStorage Draft Save/Restore

The system MUST save the LeadCaptureModal form data to localStorage under the key `hospedasuite:lead-capture-draft`. Data MUST be restored on mount if a draft exists. The draft MUST be cleared on successful submission.

#### Scenario: Form data saves on change
- GIVEN the user types into any field in LeadCaptureModal
- WHEN the field value changes
- THEN the current formData is saved to localStorage under `hospedasuite:lead-capture-draft`
- AND all fields (name, email, phone, business_name, city) are included

#### Scenario: Draft restores on mount
- GIVEN a draft exists in localStorage from a previous session
- WHEN LeadCaptureModal opens
- THEN all previously entered values are restored to the form fields
- AND the user can continue editing without re-entering data

#### Scenario: Draft clears on successful submission
- GIVEN the user has a draft saved
- WHEN `createPublicLeadAction` returns `success: true`
- THEN the localStorage key `hospedasuite:lead-capture-draft` is deleted
- AND the form resets to empty state before redirect

#### Scenario: No draft on first use
- GIVEN no localStorage key exists
- WHEN LeadCaptureModal opens for the first time
- THEN all fields render with their default/empty values
- AND no errors occur from missing data

#### Scenario: Draft does not collide with wizard memory
- GIVEN both LeadCaptureModal and the onboarding wizard use localStorage
- WHEN either component reads/writes its data
- THEN LeadCaptureModal uses key `hospedasuite:lead-capture-draft`
- AND the wizard uses key `hospedasuite:wizard-memory`
- AND neither overwrites the other's data

#### Scenario: handleClose clears form but preserves draft
- GIVEN the user has typed data and a draft exists
- WHEN the user closes the modal via the X button or backdrop click
- THEN the form state resets to defaults (current behavior preserved)
- AND the localStorage draft remains intact for next open

#### Scenario: Corrupted draft is handled gracefully
- GIVEN the localStorage key contains invalid JSON
- WHEN LeadCaptureModal attempts to restore
- THEN the corrupted data is ignored
- AND the form renders with default/empty values
- AND no runtime error is thrown
