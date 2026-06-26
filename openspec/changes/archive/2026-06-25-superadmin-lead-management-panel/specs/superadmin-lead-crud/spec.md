# Superadmin Lead CRUD Specification

## Purpose

Define full create/update/delete/assign operations on `hunted_leads` from the superadmin panel. All operations MUST be guarded by `requireSuperAdmin()`.

## Requirements

### Requirement: Update Lead Status

The system MUST allow superadmins to change a lead's status through the values: `new`, `contacted`, `converted`, `lost`. The system MUST persist the change to `hunted_leads.status`.

#### Scenario: Status change succeeds

- GIVEN a lead with status `new`
- WHEN a superadmin changes status to `contacted` via the edit modal
- THEN the lead's `status` is updated in the database
- AND the table reflects the new status immediately

#### Scenario: Invalid status rejected

- GIVEN a superadmin attempts to set status to an invalid value
- WHEN the update is submitted
- THEN the operation fails with an error message
- AND the lead's status remains unchanged

#### Scenario: Unauthorized user cannot change status

- GIVEN a non-superadmin user
- WHEN they attempt to call the status update action
- THEN `requireSuperAdmin()` throws
- AND no database change occurs

### Requirement: Edit Lead Notes

The system MUST allow superadmins to edit a lead's `notes` field. The system MUST preserve the structured notes format (name, email, plan interest, room count, regional hub).

#### Scenario: Notes update succeeds

- GIVEN a lead with existing notes
- WHEN a superadmin edits and saves the notes
- THEN the `notes` field is updated in the database
- AND the table reflects the updated notes

#### Scenario: Empty notes allowed

- GIVEN a lead with notes
- WHEN a superadmin clears all notes and saves
- THEN the `notes` field is set to empty or null
- AND no validation error occurs

### Requirement: Assign Lead to Hotel

The system MUST allow superadmins to assign a lead to an existing hotel by setting `hotel_id`. The system MUST provide a searchable dropdown of active hotels.

#### Scenario: Assign lead to hotel

- GIVEN an unassigned lead (`hotel_id = null`)
- WHEN a superadmin selects a hotel from the dropdown and saves
- THEN the lead's `hotel_id` is set to the selected hotel's ID
- AND the table shows the hotel name

#### Scenario: Reassign lead to different hotel

- GIVEN a lead already assigned to Hotel A
- WHEN a superadmin selects Hotel B and saves
- THEN the lead's `hotel_id` is updated to Hotel B's ID

#### Scenario: Unassign lead from hotel

- GIVEN a lead assigned to a hotel
- WHEN a superadmin clears the hotel selection and saves
- THEN the lead's `hotel_id` is set to null
- AND the table shows "Unassigned"

#### Scenario: Hotel search in dropdown

- GIVEN 200+ hotels exist
- WHEN a superadmin types in the hotel dropdown
- THEN only hotels matching the search term are shown

### Requirement: Delete Lead

The system MUST allow superadmins to delete leads from `hunted_leads`. The system MUST require explicit confirmation displaying the lead's `business_name` before deletion.

#### Scenario: Delete lead with confirmation

- GIVEN a superadmin clicks "Delete" on a lead
- WHEN they confirm the deletion dialog showing the lead's `business_name`
- THEN the lead is removed from `hunted_leads`
- AND the table refreshes without that lead

#### Scenario: Cancel deletion

- GIVEN a superadmin opens the delete confirmation dialog
- WHEN they click "Cancel"
- THEN no deletion occurs
- AND the lead remains in the table

#### Scenario: Delete non-existent lead

- GIVEN a lead was already deleted by another user
- WHEN a superadmin attempts to delete the same lead
- THEN an error message indicates the lead no longer exists

### Requirement: Create Lead Manually

The system MUST allow superadmins to create new leads with all `hunted_leads` fields: `business_name`, `phone`, `city_search`, `status`, `notes`, `address`, `website`, `rating`, `ai_pitch`, `hotel_id`, `google_place_id`, `source`.

#### Scenario: Create lead with required fields

- GIVEN a superadmin opens the create lead modal
- WHEN they fill `business_name`, `phone`, `city_search`, and `status` and submit
- THEN a new lead is created in `hunted_leads`
- AND the table displays the new lead
- AND `created_at` is set to the current timestamp

#### Scenario: Create lead with all fields

- GIVEN a superadmin fills all available fields in the create form
- WHEN they submit the form
- THEN all provided values are persisted
- AND optional fields left blank are stored as null

#### Scenario: Required field validation

- GIVEN a superadmin leaves `business_name` empty
- WHEN they attempt to submit
- THEN a validation error is shown
- AND no lead is created

#### Scenario: Duplicate phone warning

- GIVEN a lead with phone "+5491112345678" already exists
- WHEN a superadmin creates a new lead with the same phone
- THEN a warning is displayed asking for confirmation
- AND the user may proceed or cancel

## Acceptance Criteria

| # | Criterion |
|---|-----------|
| 1 | `updateLeadStatusAction` exists and calls `requireSuperAdmin()` first |
| 2 | `updateLeadNotesAction` exists and calls `requireSuperAdmin()` first |
| 3 | `assignLeadToHotelAction` exists and calls `requireSuperAdmin()` first |
| 4 | `deleteLeadAction` exists and calls `requireSuperAdmin()` first |
| 5 | `createAdminLeadAction` exists and calls `requireSuperAdmin()` first |
| 6 | Delete confirmation dialog displays lead `business_name` |
| 7 | Hotel assignment dropdown supports search/filter |
| 8 | All 5 actions throw on non-superadmin callers |
| 9 | No regression on tenant-level CRM board operations |
