# Delta for Superadmin Authorization

## ADDED Requirements

### Requirement: Dashboard Subscription Metrics

The system MUST display subscription-derived metric cards on the `/admin` dashboard page. The cards MUST show: count of trials expiring within 7 days, count of past_due subscriptions, and count of subscriptions cancelled in the last 30 days. Queries MUST run server-side on page load.

#### Scenario: Dashboard shows trial expiring count

- GIVEN subscriptions exist with `status = 'trial'` and `current_period_end` within 7 days
- WHEN a superadmin loads `/admin`
- THEN a card displays "Trial Expiring (7d)" with the correct count

#### Scenario: Dashboard shows past_due count

- GIVEN subscriptions exist with `status = 'past_due'`
- WHEN a superadmin loads `/admin`
- THEN a card displays "Past Due" with the correct count

#### Scenario: Dashboard shows cancelled count

- GIVEN subscriptions exist with `status = 'cancelled'` and cancelled within last 30 days
- WHEN a superadmin loads `/admin`
- THEN a card displays "Cancelled (30d)" with the correct count

#### Scenario: Zero counts display correctly

- GIVEN no subscriptions match any metric criteria
- WHEN a superadmin loads `/admin`
- THEN all three cards display "0"

### Requirement: Sidebar Navigation for New Pages

The system MUST add navigation links in the superadmin sidebar for "Subscriptions" (`/admin/subscriptions`) and "Users" (`/admin/users`). Links MUST be visible only to authenticated superadmin users.

#### Scenario: Sidebar shows Subscriptions link

- GIVEN a superadmin views any page within the `(super-admin)` layout
- WHEN the sidebar renders
- THEN a "Subscriptions" link pointing to `/admin/subscriptions` is visible

#### Scenario: Sidebar shows Users link

- GIVEN a superadmin views any page within the `(super-admin)` layout
- WHEN the sidebar renders
- THEN a "Users" link pointing to `/admin/users` is visible
