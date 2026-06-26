# Trial Days Constant Specification

## Purpose

Unify all trial period references to 30 days and extract a `TRIAL_DAYS` constant to eliminate magic numbers. Currently, one code path uses 90 days when the feature flag `FEATURES.WIZARD_WOMPI_SUBSCRIPTION` is enabled — this is inconsistent with the business policy and all other references.

## Requirements

### Requirement: TRIAL_DAYS Constant

The system MUST define a single constant `TRIAL_DAYS = 30` that is used for all trial period calculations. All inline expressions of `30 * 86400000`, `30 * 24 * 60 * 60 * 1000`, or similar MUST be replaced with `TRIAL_DAYS * 86400000`.

#### Scenario: Constant is defined and exported
- GIVEN the codebase has a constants or config module
- WHEN `TRIAL_DAYS` is imported
- THEN its value is `30`
- AND it is exported for use across the codebase

#### Scenario: Provisioning uses constant for new hotels
- GIVEN a new hotel is created during provisioning
- WHEN `trial_ends_at` is computed
- THEN the calculation uses `TRIAL_DAYS * 86400000`
- AND the trial period is exactly 30 days from now

#### Scenario: Provisioning uses constant for free activation
- GIVEN a user activates via the free mobile path
- WHEN `trial_ends_at` is set on the hotel
- THEN the calculation uses `TRIAL_DAYS * 86400000`
- AND the trial period is exactly 30 days from now

#### Scenario: Wompi subscription path uses constant
- GIVEN `FEATURES.WIZARD_WOMPI_SUBSCRIPTION` is enabled
- WHEN a `saas_subscriptions` record is created
- THEN `trialEnd` is computed as `now + TRIAL_DAYS * 86400000`
- AND the value is 30 days (NOT 90 days)

#### Scenario: billing.ts uses constant
- GIVEN billing calculations reference trial duration
- WHEN `getTrialEndDate` or similar functions compute trial end
- THEN they use `TRIAL_DAYS * 86400000`
- AND no inline `30 * 24 * 60 * 60 * 1000` expressions remain

#### Scenario: hotel-admin action uses constant
- GIVEN the hotel-admin server action sets trial periods
- WHEN `trial_ends_at` is computed
- THEN it uses `TRIAL_DAYS * 86400000`
- AND no inline `30 * 86400000` expressions remain

#### Scenario: No 90-day references remain
- GIVEN the entire codebase is searched
- WHEN looking for `90 * 86400000` or `90 * 24 * 60 * 60 * 1000`
- THEN zero matches are found
- AND all trial calculations reference `TRIAL_DAYS`
