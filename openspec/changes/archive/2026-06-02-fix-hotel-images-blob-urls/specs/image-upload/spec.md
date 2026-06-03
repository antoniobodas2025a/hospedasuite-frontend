# Image Upload Specification

## Purpose

Ensure all image URLs stored in the system are valid, persistent, and renderable. Blob URLs (`blob:`) and data URLs (`data:`) are client-side only and MUST NOT be persisted to the database.

## Requirements

### Requirement: Upload Failure Must Be Explicit

The system MUST fail explicitly when R2 image uploads do not succeed. Silent fallback to client-side preview URLs (blob/data URLs) is prohibited.

#### Scenario: All uploads succeed

- GIVEN a user completes the onboarding wizard with N image files
- WHEN all N files are uploaded to R2 successfully
- THEN the provisioning flow continues with N public R2 URLs
- AND no blob or data URLs are included in the wizard state

#### Scenario: Partial upload failure

- GIVEN a user completes the onboarding wizard with N image files
- WHEN K of N uploads fail (K > 0)
- THEN the provisioning flow halts with error status
- AND the error message states "K of N images failed to upload"
- AND the user is offered a retry option that preserves all entered data

#### Scenario: All uploads fail

- GIVEN a user completes the onboarding wizard with image files
- WHEN zero uploads succeed
- THEN the provisioning flow halts with error status
- AND the error message states that no images could be uploaded
- AND the user is offered a retry option

#### Scenario: Empty upload list

- GIVEN a user completes the onboarding wizard with no image files
- WHEN the upload phase runs
- THEN the flow proceeds with an empty gallery URL array
- AND no error is raised for zero images at upload time

### Requirement: Schema Validation Rejects Invalid URL Formats

The system MUST reject any image URL that uses a non-persistent scheme before it reaches the database.

#### Scenario: Schema rejects blob URL

- GIVEN a galleryImages or imageUrls array containing a URL starting with `blob:`
- WHEN the fullWizardStateSchema parses the state
- THEN validation fails with message "Invalid image URL format"

#### Scenario: Schema rejects data URL

- GIVEN a galleryImages or imageUrls array containing a URL starting with `data:`
- WHEN the fullWizardStateSchema parses the state
- THEN validation fails with message "Invalid image URL format"

#### Scenario: Schema rejects javascript URL

- GIVEN a galleryImages or imageUrls array containing a URL starting with `javascript:`
- WHEN the fullWizardStateSchema parses the state
- THEN validation fails with message "Invalid image URL format"

#### Scenario: Schema accepts valid HTTPS URL

- GIVEN a galleryImages or imageUrls array containing URLs starting with `https://`
- WHEN the fullWizardStateSchema parses the state
- THEN validation passes for those fields

#### Scenario: Schema accepts valid R2 public URL

- GIVEN a galleryImages or imageUrls array containing URLs matching the R2 public bucket pattern
- WHEN the fullWizardStateSchema parses the state
- THEN validation passes for those fields

#### Scenario: Schema rejects mixed valid and invalid URLs

- GIVEN a galleryImages array with one valid HTTPS URL and one blob URL
- WHEN the fullWizardStateSchema parses the state
- THEN validation fails and reports the invalid entry
