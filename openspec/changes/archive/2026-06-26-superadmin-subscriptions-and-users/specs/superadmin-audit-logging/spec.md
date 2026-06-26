# Delta for Superadmin Audit Logging

## ADDED Requirements

### Requirement: Audit Logging for Subscription Mutations

All subscription mutation server actions in `src/app/actions/super-admin.ts` MUST call `logAuditEvent()` on their success path. The following actions MUST be covered: cancel subscription, reactivate subscription, extend trial, change plan. Each call MUST capture the entity as `entity_type: 'subscription'`.

#### Scenario: Cancel subscription logs audit event

- GIVEN a superadmin cancels a subscription successfully
- WHEN the cancel action completes
- THEN `logAuditEvent()` is called with `action: 'subscription_cancelled'`, `entity_type: 'subscription'`, `new_value: { cancel_at_period_end: true }`

#### Scenario: Reactivate subscription logs audit event

- GIVEN a superadmin reactivates a cancelled subscription
- WHEN the reactivate action completes
- THEN `logAuditEvent()` is called with `action: 'subscription_reactivated'`, `entity_type: 'subscription'`, `new_value: { cancel_at_period_end: false }`

#### Scenario: Extend trial logs audit event

- GIVEN a superadmin extends a trial by N days
- WHEN the extend action completes
- THEN `logAuditEvent()` is called with `action: 'trial_extended'`, `entity_type: 'subscription'`, `new_value: { days_added: N }`

#### Scenario: Change plan logs old and new values

- GIVEN a superadmin changes a subscription's plan
- WHEN the change plan action completes
- THEN `logAuditEvent()` is called with `action: 'plan_changed'`, `entity_type: 'subscription'`, `old_value` = previous plan_key, `new_value` = new plan_key

### Requirement: Audit Logging for Role Mutations

All role mutation server actions in `src/app/actions/super-admin.ts` MUST call `logAuditEvent()` on their success path. The following actions MUST be covered: grant superadmin, revoke superadmin, create superadmin. Each call MUST capture the entity as `entity_type: 'user'`.

#### Scenario: Grant role logs audit event

- GIVEN a superadmin grants superadmin role to a user
- WHEN the grant action completes
- THEN `logAuditEvent()` is called with `action: 'role_granted'`, `entity_type: 'user'`, `new_value: { role: 'superadmin', target_email: string }`

#### Scenario: Revoke role logs audit event

- GIVEN a superadmin revokes superadmin role from a user
- WHEN the revoke action completes
- THEN `logAuditEvent()` is called with `action: 'role_revoked'`, `entity_type: 'user'`, `old_value: { role: 'superadmin', target_email: string }`

#### Scenario: Create superadmin logs audit event

- GIVEN a superadmin creates a new superadmin user
- WHEN the create action completes
- THEN `logAuditEvent()` is called with `action: 'superadmin_created'`, `entity_type: 'user'`, `new_value: { email: string }`
