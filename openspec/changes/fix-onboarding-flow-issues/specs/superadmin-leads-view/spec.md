# Superadmin Leads View Specification

## Purpose

Provide superadmin users with a system-wide read-only view of all `hunted_leads` records. Currently, leads are created by `createPublicLeadAction` and stored in the database, but there is no UI to view them. This page enables the team to track lead volume, source, and conversion status.

## Requirements

### Requirement: Leads Page at /admin/leads

The system MUST provide a page at `/admin/leads` within the super-admin layout that displays all `hunted_leads` records in a sortable table. The page MUST be accessible only to authenticated superadmin users (enforced by the existing `(super-admin)` route group auth guard).

#### Scenario: Page renders with leads data
- GIVEN a superadmin user is authenticated
- WHEN they navigate to `/admin/leads`
- THEN a table displays all `hunted_leads` records
- AND records are ordered by `created_at` descending (newest first)

#### Scenario: Table displays required columns
- GIVEN the leads page renders
- WHEN the table is displayed
- THEN the following columns are visible:
  - `business_name` — name of the prospect's property
  - `phone` — contact phone number
  - `city_search` — city/region searched
  - `status` — lead status (e.g., "activo", "waitlist_silenciosa")
  - `notes` — structured notes containing name, email, plan interest, room count, regional hub
  - `created_at` — timestamp of lead creation
  - `source` — derived from notes ("Fuente: Landing /software" or other source indicators)

#### Scenario: Empty state when no leads exist
- GIVEN the `hunted_leads` table has no records
- WHEN the superadmin visits `/admin/leads`
- THEN a friendly empty state message is displayed
- AND no error is shown

#### Scenario: Navigation link in sidebar
- GIVEN a superadmin views the admin sidebar
- WHEN the navigation menu renders
- THEN a "Leads" link is visible with an appropriate icon (e.g., Users or Target icon)
- AND clicking it navigates to `/admin/leads`

#### Scenario: Read-only access
- GIVEN the superadmin views the leads page
- WHEN they interact with the table
- THEN no edit, delete, or modify actions are available
- AND the page is strictly a read-only view

#### Scenario: Error handling on fetch failure
- GIVEN the database query fails
- WHEN the page attempts to load leads
- THEN an error message is displayed to the user
- AND the page does not crash (graceful degradation)

#### Scenario: Admin layout sidebar updated
- GIVEN the super-admin layout (`src/app/(super-admin)/layout.tsx`)
- WHEN the sidebar navigation renders
- THEN a new `<Link>` to `/admin/leads` exists alongside existing links
- AND it follows the same styling pattern as "Centro de Comando", "Pagos Pendientes", and "Hoteles Duplicados"
