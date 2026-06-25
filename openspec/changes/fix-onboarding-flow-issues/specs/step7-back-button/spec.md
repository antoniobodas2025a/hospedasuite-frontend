# Step 7 Back Button Specification

## Purpose

Add an explicit "Atrás" (back) button to step 7 (PaymentReviewStep) of the onboarding wizard. Currently, the entire navigation block is hidden on step 7 (`currentStep < 7`), leaving the user with no way to go back to review or modify their payment selection.

## Requirements

### Requirement: Back Navigation on Step 7

The system MUST display a "Atrás" button on step 7 (PaymentReviewStep) that allows the user to return to step 6 (PaymentStep). The navigation block in OnboardingClient MUST be modified to show back navigation even when `currentStep === 7`.

#### Scenario: Back button visible on step 7
- GIVEN the user is on step 7 (PaymentReviewStep)
- WHEN the step renders
- THEN a "Atrás" button is visible below the step content
- AND the button is styled consistently with other navigation buttons

#### Scenario: Back button returns to step 6
- GIVEN the user is on step 7
- WHEN they click "Atrás"
- THEN `currentStep` is set to 6
- AND the PaymentStep renders with all payment data preserved
- AND the user can modify their payment method or details

#### Scenario: Forward navigation still works
- GIVEN the user goes back to step 6 and modifies payment
- WHEN they click "Siguiente"
- THEN they return to step 7 (PaymentReviewStep)
- AND the review reflects the updated payment data

#### Scenario: Navigation block shows on step 7
- GIVEN the OnboardingClient renders
- WHEN `currentStep === 7`
- THEN the navigation block is NOT fully hidden
- AND at minimum the "Atrás" button is rendered (the "Activar" button lives inside PaymentReviewStep)

#### Scenario: Step indicator allows back navigation
- GIVEN the user is on step 7
- WHEN they click on any completed step dot in the StepIndicator
- THEN they navigate to that step
- AND their data is preserved (existing behavior, confirmed working)

#### Scenario: Provisioning state is not triggered by back
- GIVEN the user is on step 7 with payment confirmed
- WHEN they click "Atrás"
- THEN provisioning does NOT start
- AND the user is simply returned to step 6
- AND `startProvisioning()` is only called from the "Activar" button inside PaymentReviewStep
