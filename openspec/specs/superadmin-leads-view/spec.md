# Superadmin Leads View Specification

## Purpose

Provide superadmin users with a system-wide interactive view of all `hunted_leads` records with search, filter, pagination, and CRUD capabilities. This page enables the team to manage lead volume, track conversion status, assign leads to hotels, and export data.

## Requirements

### Requirement: Leads Page at /admin/leads

The system MUST provide a page at `/admin/leads` within the super-admin layout that displays all `hunted_leads` records in an interactive management table. The page MUST be accessible only to authenticated superadmin users (enforced by the existing `(super-admin)` route group auth guard). The page MUST support search, filter, pagination, and CRUD actions.

#### Scenario: Page renders with leads data

- GIVEN a superadmin user is authenticated
- WHEN they navigate to `/admin/leads`
- THEN an interactive table displays leads ordered by `created_at` descending (newest first)
- AND search, filter, and pagination controls are visible

#### Scenario: Empty state when no leads exist

- GIVEN the `hunted_leads` table has no records
- WHEN the superadmin visits `/admin/leads`
- THEN a friendly empty state message is displayed
- AND a "Create Lead" button is visible

#### Scenario: Navigation link in sidebar

- GIVEN a superadmin views the admin sidebar
- WHEN the navigation menu renders
- THEN a "Leads" link is visible with an appropriate icon
- AND clicking it navigates to `/admin/leads`

### Requirement: Search and Filter

The system MUST provide search and filter controls above the leads table. The system MUST support:
- Text search by `business_name` and `phone`
- Status filter dropdown (all, new, contacted, converted, lost)
- Date range filter by `created_at`

#### Scenario: Search by business name

- GIVEN leads exist with various business names
- WHEN the user types "Hotel Sol" in the search input
- THEN only leads whose `business_name` contains "Hotel Sol" are displayed

#### Scenario: Search by phone number

- GIVEN leads exist with various phone numbers
- WHEN the user types a partial phone number
- THEN only leads whose `phone` contains the typed digits are displayed

#### Scenario: Filter by status

- GIVEN leads with mixed statuses exist
- WHEN the user selects "converted" from the status dropdown
- THEN only leads with `status = 'converted'` are displayed

#### Scenario: Filter by date range

- GIVEN leads created on different dates exist
- WHEN the user sets a start date and end date
- THEN only leads with `created_at` within the range are displayed

#### Scenario: Combined search and filter

- GIVEN leads with various names, statuses, and dates exist
- WHEN the user types a search term AND selects a status filter
- THEN only leads matching BOTH criteria are displayed

#### Scenario: Clear all filters

- GIVEN active filters are applied
- WHEN the user clicks "Clear filters"
- THEN all filters reset and the full lead list is displayed

### Requirement: Server-Side Pagination

The system MUST paginate leads server-side when the total count exceeds 50. The system MUST display page controls with previous/next navigation and page numbers.

#### Scenario: First page loads

- GIVEN 120 leads exist in the database
- WHEN the superadmin navigates to `/admin/leads`
- THEN the first 50 leads (ordered by `created_at` desc) are displayed
- AND pagination controls show "Page 1 of 3"

#### Scenario: Navigate to next page

- GIVEN the user is on page 1 of paginated results
- WHEN the user clicks "Next"
- THEN leads 51-100 are displayed
- AND pagination controls update to "Page 2 of 3"

#### Scenario: Pagination respects active filters

- GIVEN a status filter for "converted" returns 75 leads
- WHEN the user navigates to page 2
- THEN leads 51-75 matching the filter are displayed
- AND pagination shows "Page 2 of 2"

### Requirement: Expanded Table Columns

The system MUST display additional columns beyond the original read-only set. The table MUST include: `address`, `website`, `rating`, `ai_pitch`, and `hotel_id` (displayed as hotel name if assigned, "Unassigned" otherwise).

#### Scenario: Assigned hotel displays name

- GIVEN a lead has `hotel_id` set to an existing hotel
- WHEN the table renders
- THEN the hotel column shows the hotel's `business_name`

#### Scenario: Unassigned lead shows placeholder

- GIVEN a lead has `hotel_id = null`
- WHEN the table renders
- THEN the hotel column shows "Unassigned"

### Requirement: Action Buttons Per Row

The system MUST display action buttons on each lead row: Edit, Delete. The Edit button opens the LeadEditModal. The Delete button triggers a confirmation dialog.

#### Scenario: Edit button opens modal

- GIVEN a lead row is displayed
- WHEN the user clicks "Edit"
- THEN the LeadEditModal opens pre-filled with the lead's current data

#### Scenario: Delete button triggers confirmation

- GIVEN a lead row is displayed
- WHEN the user clicks "Delete"
- THEN a confirmation dialog shows the lead's `business_name` and asks for confirmation

### Requirement: Read-only access (SUPERSEDED — now CRUD operations)

The system MUST allow superadmins to perform CRUD operations on leads. The page MUST provide: edit (notes, status, hotel assignment), delete (with confirmation), and create (full field form). All operations MUST be guarded by `requireSuperAdmin()`.
(Previously: No edit, delete, or modify actions were available — page was strictly read-only.)

#### Scenario: Edit lead opens modal

- GIVEN a superadmin views the leads table
- WHEN they click "Edit" on a lead row
- THEN a modal opens with editable fields for notes, status, and hotel assignment

#### Scenario: Delete lead requires confirmation

- GIVEN a superadmin clicks "Delete" on a lead
- WHEN the confirmation dialog appears
- THEN the lead's `business_name` is displayed
- AND the user must confirm before deletion proceeds

#### Scenario: Create lead opens form

- GIVEN a superadmin views the leads page
- WHEN they click "Create Lead"
- THEN a modal opens with a form for all `hunted_leads` fields

#### Scenario: Error handling on fetch failure

- GIVEN the database query fails
- WHEN the page attempts to load leads
- THEN an error message is displayed to the user
- AND the page does not crash (graceful degradation)

## Acceptance Criteria

| # | Criterion |
|---|-----------|
| 1 | Table displays at `/admin/leads` within superadmin layout |
| 2 | Search by `business_name` and `phone` works |
| 3 | Status filter dropdown supports all/n/contacted/converted/lost |
| 4 | Server-side pagination with page 1 of N display |
| 5 | Expanded columns: address, website, rating, ai_pitch, hotel name |
| 6 | Edit button opens modal with notes/status/hotel fields |
| 7 | Delete triggers confirmation dialog with business_name |
| 8 | Empty state with "Create Lead" button |
| 9 | Sidebar has "Leads" link with icon |
| 10 | Error state on fetch failure (graceful degradation) |
