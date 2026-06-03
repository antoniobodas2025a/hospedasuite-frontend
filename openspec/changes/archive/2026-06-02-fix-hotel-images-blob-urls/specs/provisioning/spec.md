# Provisioning Specification

## Purpose

Ensure the onboarding provisioning process rejects invalid image data and that existing hotels with blob URLs can be detected and repaired.

## Requirements

### Requirement: Provisioning Rejects Blob URLs

The system MUST reject provisioning requests that contain blob or data URLs in any image field, even if client-side validation is bypassed.

#### Scenario: Server rejects blob URL in gallery

- GIVEN a provisioning request with `galleryImages` containing a `blob:` URL
- WHEN `executeOnboardingProvisioning` is called
- THEN the function returns `{ success: false, error: '...' }`
- AND no hotel record is created or updated
- AND no room records are created

#### Scenario: Server rejects blob URL in room images

- GIVEN a provisioning request with any room's `imageUrls` containing a `blob:` URL
- WHEN `executeOnboardingProvisioning` is called
- THEN the function returns `{ success: false, error: '...' }`
- AND no hotel record is created or updated
- AND no room records are created

#### Scenario: Server rejects data URL in any image field

- GIVEN a provisioning request with any image field containing a `data:` URL
- WHEN `executeOnboardingProvisioning` is called
- THEN the function returns `{ success: false, error: '...' }`

#### Scenario: Valid provisioning succeeds

- GIVEN a provisioning request with all valid HTTPS URLs
- WHEN `executeOnboardingProvisioning` is called
- THEN the hotel is created/updated successfully
- AND rooms are inserted with their image URLs
- AND the function returns `{ success: true }`

### Requirement: Data Repair Script Identifies and Fixes Blob URLs

The system MUST provide a script to detect and repair existing hotels that have blob URLs stored in the database.

#### Scenario: Script detects affected hotels

- GIVEN hotels exist with `main_image_url` starting with `blob:`
- OR hotels exist with any element in `gallery_urls` starting with `blob:`
- WHEN the repair script runs in report mode
- THEN it outputs the count of affected hotels
- AND it lists each affected hotel with its slug and affected fields

#### Scenario: Script repairs blob URLs

- GIVEN hotels exist with blob URLs in image fields
- WHEN the repair script runs in repair mode
- THEN affected `main_image_url` fields are set to NULL
- AND blob entries are removed from `gallery_urls` arrays
- AND the script outputs a summary of changes made

#### Scenario: Script handles hotels with no blob URLs

- GIVEN no hotels have blob URLs in any image field
- WHEN the repair script runs
- THEN it reports zero affected hotels
- AND no database modifications are made

#### Scenario: Script preserves valid URLs

- GIVEN a hotel has a mix of valid HTTPS URLs and blob URLs in `gallery_urls`
- WHEN the repair script runs in repair mode
- THEN only blob URL entries are removed from the array
- AND valid HTTPS URLs remain unchanged
- AND `main_image_url` is set to NULL only if it was a blob URL
