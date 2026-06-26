# Settings WhatsApp Removal Specification

## Purpose

Eliminate the redundant WhatsApp input field from the SettingsStep of the onboarding wizard. WhatsApp is already captured upstream in the LeadCaptureModal and hydrated into the wizard store via URL params. Asking for it again creates confusion and duplicate effort.

## Requirements

### Requirement: Remove WhatsApp Input from SettingsStep

The system MUST NOT display a WhatsApp input field in the "Horarios y contacto" section of SettingsStep (step 4 of the wizard). The `settings.whatsappNumber` field MUST remain in the store schema and database — it is still editable from the dashboard settings after onboarding.

#### Scenario: WhatsApp field is absent from SettingsStep
- GIVEN the user is on step 4 (Configuración) of the onboarding wizard
- WHEN the "Horarios y contacto" section is expanded
- THEN check-in and check-out time inputs are visible
- AND no WhatsApp input field is rendered

#### Scenario: WhatsApp data from lead form is preserved
- GIVEN the user came through LeadCaptureModal with phone "+57 300 123 4567"
- WHEN the wizard hydrates from URL params
- THEN `settings.whatsappNumber` is set to "+57 300 123 4567"
- AND the value persists through provisioning to `hotels.whatsapp_number`

#### Scenario: Users who skip lead form can set WhatsApp later
- GIVEN a user starts the wizard directly (no lead form)
- WHEN they complete onboarding
- THEN `settings.whatsappNumber` remains null or empty
- AND they can configure it later from the dashboard settings page

#### Scenario: Store schema unchanged
- GIVEN the onboarding store is initialized
- WHEN `updateSettings({ whatsappNumber: value })` is called
- THEN the value is stored in state normally
- AND no TypeScript errors occur (field still exists in schema)

#### Scenario: Provisioning still saves WhatsApp
- GIVEN the wizard completes with a non-empty `whatsappNumber`
- WHEN `executeOnboardingProvisioning` runs
- THEN `whatsapp_number` is included in the hotel update payload
- AND the value is persisted to the database
