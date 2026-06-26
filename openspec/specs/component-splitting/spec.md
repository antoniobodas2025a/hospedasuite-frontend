# Component Splitting Specification

## Purpose

Split the 271-line `TenantManager` monolith into focused, single-responsibility components. Improves maintainability and testability without changing any user-facing behavior.

## Requirements

### Requirement: TenantTable Extracted Component

The system MUST provide a `TenantTable` component at `src/components/super-admin/TenantTable.tsx` responsible solely for rendering the hotel table rows. It MUST accept `hotels` and `hqData` as props and render the table body with hotel name, status, owner/plan, debt, and action buttons.

#### Scenario: TenantTable renders hotel rows
- GIVEN `TenantTable` receives a list of hotels and hqData
- WHEN it renders
- THEN each hotel displays as a table row with name, status badge, owner email, plan, debt amount
- AND action buttons (seed, edit, god mode, delete) are rendered per row

#### Scenario: TenantTable is a client component
- GIVEN `TenantTable.tsx` source is inspected
- THEN it begins with `'use client'` directive
- AND it accepts props matching the previous `TenantManagerProps` interface

#### Scenario: TenantTable delegates actions via callbacks
- GIVEN action buttons are clicked in TenantTable
- WHEN the component renders
- THEN event handlers are received as props (onGodMode, onDelete, onEdit, onSeed)
- AND TenantTable does NOT contain server action imports directly

### Requirement: TenantEditModal Extracted Component

The system MUST provide a `TenantEditModal` component at `src/components/super-admin/TenantEditModal.tsx` responsible for the edit modal with commercial settings form and security zone (password change). It MUST handle the modal open/close state internally or via props.

#### Scenario: TenantEditModal shows commercial form
- GIVEN `TenantEditModal` is open with a hotel
- WHEN it renders
- THEN it displays fields for hotel name, status, and subscription plan
- AND a submit button triggers the update tenant action

#### Scenario: TenantEditModal shows security zone
- GIVEN `TenantEditModal` is open with a hotel that has an owner_id
- WHEN it renders
- THEN it displays a password change form with input and submit button
- AND the form calls the force change password server action

#### Scenario: TenantEditModal handles mock hotels
- GIVEN `TenantEditModal` is open with a hotel without owner_id
- WHEN it renders
- THEN it displays a warning that the hotel has no real auth user
- AND the password change form is NOT rendered

### Requirement: Original TenantManager Reduced

The original `TenantManager.tsx` MUST be reduced to under 100 lines by delegating rendering to `TenantTable` and `TenantEditModal`. It MUST serve as an orchestrator that wires callbacks between child components and server actions.

#### Scenario: TenantManager is under 100 lines
- GIVEN the refactor is complete
- WHEN `wc -l src/components/super-admin/TenantManager.tsx` is run
- THEN the line count is less than 100

#### Scenario: TenantManager orchestrates children
- GIVEN `TenantManager` renders
- THEN it renders `TenantTable` with hotel data and action callbacks
- AND it renders `TenantEditModal` when a hotel is being edited

### Requirement: No Visual or Behavioral Changes

The split components MUST produce identical DOM output and user interactions as the original `TenantManager`. No CSS classes, event handlers, or server action calls may change.

#### Scenario: Table rendering is identical
- GIVEN the original and refactored components are compared
- WHEN rendered with the same props
- THEN the table HTML structure, classes, and content are identical

#### Scenario: Modal behavior is identical
- GIVEN the original and refactored modal flows are compared
- WHEN edit, god mode, delete, seeding, and password change are performed
- THEN the same server actions are called with the same arguments
- AND the same user feedback (alerts, prompts) is shown

## Acceptance Criteria

| # | Criterion |
|---|-----------|
| 1 | `src/components/super-admin/TenantTable.tsx` exists |
| 2 | `src/components/super-admin/TenantEditModal.tsx` exists |
| 3 | `wc -l src/components/super-admin/TenantManager.tsx` returns < 100 |
| 4 | `TenantTable` accepts `hotels`, `hqData`, and callback props |
| 5 | `TenantEditModal` handles commercial form + security zone |
| 6 | No CSS class changes in any component |
| 7 | All 5 server actions (godMode, delete, updateTenant, changePassword, seed) still called |
