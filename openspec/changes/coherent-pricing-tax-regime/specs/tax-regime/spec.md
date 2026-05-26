# Tax Regime Specification

## Purpose

Defines how hotels declare and manage their tax regime (simplified vs. ordinary), persisting `tax_rate` through onboarding and settings.

## Requirements

### Requirement: Tax Regime Declaration in Onboarding

The system MUST allow hotels to select their tax regime during the onboarding wizard. The selection SHALL persist to `hotels.tax_rate`.

| Option | Label | `tax_rate` Value |
|--------|-------|-----------------|
| Simplificado | Régimen Simplificado | `0` |
| Ordinario | Régimen Ordinario | `0.19` |

#### Scenario: Hotel selects simplified regime during onboarding

- GIVEN the hotel is on step 5 (Settings) of the onboarding wizard
- WHEN the user selects "Régimen Simplificado"
- THEN `tax_rate` is set to `0` in the onboarding state
- AND the value is persisted to `hotels.tax_rate` upon provisioning

#### Scenario: Hotel selects ordinary regime during onboarding

- GIVEN the hotel is on step 5 (Settings) of the onboarding wizard
- WHEN the user selects "Régimen Ordinario"
- THEN `tax_rate` is set to `0.19` in the onboarding state
- AND the value is persisted to `hotels.tax_rate` upon provisioning

#### Scenario: Onboarding defaults to ordinary regime

- GIVEN the hotel opens the Settings step for the first time
- WHEN no tax regime has been selected
- THEN "Régimen Ordinario" is pre-selected (default `0.19`)

#### Scenario: Existing hotel with NULL tax_rate

- GIVEN a hotel was onboarded before this feature existed
- AND `hotels.tax_rate` is `NULL`
- WHEN any price calculation uses `tax_rate`
- THEN the system defaults to `0.19` for backward compatibility

### Requirement: Editable Tax Regime in Settings

The system MUST allow hotels to change their tax regime after onboarding via the Settings panel. Changes SHALL be persisted via `saveSettingsAction`.

#### Scenario: Hotel changes tax regime in settings

- GIVEN the hotel is viewing the Settings panel (general tab)
- WHEN the user changes the tax regime selector and saves
- THEN `saveSettingsAction` persists the new `tax_rate`
- AND all OTA and checkout displays reflect the new rate immediately

#### Scenario: Settings displays current tax regime

- GIVEN the hotel has `tax_rate = 0` in the database
- WHEN the Settings panel loads
- THEN the selector shows "Régimen Simplificado" as the active option
