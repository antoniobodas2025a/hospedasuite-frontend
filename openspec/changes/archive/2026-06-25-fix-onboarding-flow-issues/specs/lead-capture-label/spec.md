# Lead Capture Label Specification

## Purpose

Fix the confusing "Alojamiento" label in the public lead capture form. The label does not clearly communicate that the user should enter the **name** of their property, not select a type or category.

## Requirements

### Requirement: Business Name Label Clarity

The system MUST display a clear label for the business name field in `LeadCaptureModal`. The label SHALL read "Nombre de tu negocio" and the placeholder SHALL include an "Ej:" prefix to signal it is an example value. The underlying field `business_name` MUST NOT change — this is a UI-only fix.

#### Scenario: Label displays correct text
- GIVEN the user opens the LeadCaptureModal on `/software`
- WHEN the form renders
- THEN the label for the business name field reads "Nombre de tu negocio"
- AND the placeholder reads "Ej: Glamping Sol"

#### Scenario: Placeholder guides user input
- GIVEN the business name field is empty
- WHEN the user views the field
- THEN the placeholder shows "Ej: Glamping Sol" (with "Ej:" prefix)
- AND the placeholder text is visually distinct from entered text (standard browser behavior)

#### Scenario: Validation message remains accurate
- GIVEN the user submits the form with an empty business name
- WHEN validation runs
- THEN the error message displays "Requerido" (unchanged)
- AND the field `business_name` is still validated as required

#### Scenario: No backend changes required
- GIVEN the form is submitted with valid data
- WHEN `createPublicLeadAction` receives the payload
- THEN the `business_name` field is passed unchanged
- AND no database schema modifications are needed
