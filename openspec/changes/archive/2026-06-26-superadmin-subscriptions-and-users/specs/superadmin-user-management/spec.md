# Superadmin User Management Specification

## Purpose

Provide superadmins with visibility into all `user_roles` and the ability to grant/revoke the `superadmin` role, including creating new superadmins — all from the admin panel.

## Requirements

### Requirement: User List Page

The system MUST provide a page at `/admin/users` within the `(super-admin)` route group. The page MUST display a table of all `user_roles` joined with `auth.users` (email, created_at) and `hotels` (if role is owner). The page MUST be accessible only to authenticated superadmin users.

#### Scenario: Page renders user table

- GIVEN a superadmin navigates to `/admin/users`
- WHEN the page loads
- THEN a table displays all user_roles with columns: email, role, created_at, associated hotel name (if owner)
- AND rows are ordered by `created_at` descending

#### Scenario: Unauthorized access blocked

- GIVEN a non-superadmin user navigates to `/admin/users`
- WHEN the page loads
- THEN the `(super-admin)` route guard blocks access

#### Scenario: Owner row shows associated hotel

- GIVEN a user with `role = 'owner'` has a linked hotel
- WHEN the superadmin views the user table
- THEN the associated hotel name is displayed in the hotel column

#### Scenario: Non-owner row shows no hotel

- GIVEN a user with `role = 'superadmin'` has no linked hotel
- WHEN the superadmin views the user table
- THEN the hotel column displays "—" or empty

### Requirement: Grant Superadmin Role

The system MUST allow superadmins to grant the `superadmin` role to any user by inserting a row into `user_roles`. The action MUST be guarded by `requireSuperAdmin()` and MUST call `logAuditEvent()` on success.

#### Scenario: Grant superadmin to existing user

- GIVEN a user exists in `auth.users` with no `superadmin` role
- WHEN a superadmin enters their email, clicks "Grant Superadmin", and confirms
- THEN a new row is inserted into `user_roles` with `role = 'superadmin'`
- AND the user appears with the superadmin role in the table
- AND an audit event is logged with `action: 'role_granted'`, `entity_type: 'user'`, `new_value: { role: 'superadmin' }`

#### Scenario: Grant superadmin to non-existent user blocked

- GIVEN no user exists with the provided email
- WHEN a superadmin attempts to grant superadmin
- THEN an error is displayed: "User not found"
- AND no row is inserted

#### Scenario: Grant superadmin to existing superadmin blocked

- GIVEN a user already has `role = 'superadmin'` in `user_roles`
- WHEN a superadmin attempts to grant superadmin
- THEN the action is disabled or shows "Already superadmin"

### Requirement: Revoke Superadmin Role

The system MUST allow superadmins to revoke the `superadmin` role by deleting the corresponding row from `user_roles`. The action MUST be guarded by `requireSuperAdmin()` and MUST call `logAuditEvent()` on success.

#### Scenario: Revoke superadmin from user

- GIVEN a user has `role = 'superadmin'` in `user_roles`
- WHEN a superadmin clicks "Revoke" on that user and confirms
- THEN the row is deleted from `user_roles`
- AND the user no longer appears with superadmin role
- AND an audit event is logged with `action: 'role_revoked'`, `entity_type: 'user'`, `old_value: { role: 'superadmin' }`

#### Scenario: Cannot revoke own role

- GIVEN a superadmin attempts to revoke their own superadmin role
- WHEN they click "Revoke" on their own row
- THEN the action is disabled with tooltip: "Cannot revoke your own role"
- AND no row is deleted

#### Scenario: Cannot revoke last superadmin

- GIVEN only one user has `role = 'superadmin'` in `user_roles`
- WHEN a superadmin attempts to revoke that last superadmin's role
- THEN the action is blocked with error: "Cannot revoke the last superadmin"
- AND no row is deleted

### Requirement: Create New Superadmin

The system MUST allow superadmins to create a brand new superadmin user by providing an email and password. The action MUST create the user in `auth.users` AND insert a `superadmin` role in `user_roles`. The action MUST be guarded by `requireSuperAdmin()` and MUST call `logAuditEvent()` on success.

#### Scenario: Create new superadmin user

- GIVEN a superadmin enters a new email and password in "Create Superadmin" form
- WHEN they submit and confirm
- THEN a new user is created in `auth.users`
- AND a `user_roles` row is inserted with `role = 'superadmin'`
- AND the new user appears in the table
- AND an audit event is logged with `action: 'superadmin_created'`, `entity_type: 'user'`

#### Scenario: Create superadmin with existing email blocked

- GIVEN a user already exists with the provided email
- WHEN a superadmin attempts to create a new superadmin with that email
- THEN an error is displayed: "User already exists"
- AND no new user or role is created

### Requirement: Confirmation Dialogs

All destructive actions (revoke role, create superadmin) MUST display a confirmation dialog before execution. The dialog MUST clearly describe the action being taken.

#### Scenario: Revoke confirmation dialog

- GIVEN a superadmin clicks "Revoke" on a user's superadmin role
- WHEN the confirmation dialog appears
- THEN it displays the user's email and warns that superadmin access will be removed
- AND the action only proceeds if the superadmin confirms

#### Scenario: Create superadmin confirmation dialog

- GIVEN a superadmin fills the "Create Superadmin" form
- WHEN they click submit
- THEN a confirmation dialog displays the email being created
- AND the user is only created if confirmed

## Acceptance Criteria

| # | Criterion |
|---|-----------|
| 1 | `/admin/users` page exists within `(super-admin)` route group |
| 2 | Table columns: email, role, created_at, associated hotel (if owner) |
| 3 | Grant superadmin inserts into `user_roles` with `role = 'superadmin'` |
| 4 | Revoke superadmin deletes from `user_roles` |
| 5 | Cannot revoke own role — action disabled |
| 6 | Cannot revoke last superadmin — guard blocks if count === 1 |
| 7 | Create superadmin creates in `auth.users` AND `user_roles` |
| 8 | All actions call `requireSuperAdmin()` and `logAuditEvent()` |
| 9 | Confirmation dialogs for revoke and create actions |
| 10 | TypeScript compilation passes with no errors |
