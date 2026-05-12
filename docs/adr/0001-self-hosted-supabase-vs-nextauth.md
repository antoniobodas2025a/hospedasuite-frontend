# ADR-0001: Self-hosted Supabase vs NextAuth.js for Authentication

- **Date**: 2026-05-08
- **Status**: accepted
- **Deciders**: anto (owner), opencode (architect)

## Context

HospedaSuite needs authentication for hotel staff (admin, recepcionistas) and future guests. The project currently uses Supabase Auth (Gotrue) via `@supabase/supabase-js`. During the infrastructure migration from Vercel+Supabase (managed) to Coolify+VPS+self-hosted Supabase, we needed to decide whether to keep Supabase Auth (self-hosted) or replace it with NextAuth.js.

The decision was triggered by the migration plan: if we self-host Supabase, we get Gotrue (Supabase Auth) included. But NextAuth.js is a popular alternative that decouples auth from the database layer.

Key constraint: **97 direct Supabase calls** across the codebase (`from('table')`, `.rpc()`, etc.). Changing the auth layer would cascade across all of them.

## Options Considered

| Option | Pros | Cons |
|--------|------|------|
| **Self-hosted Supabase (Gotrue)** | 0 code changes in 97 Supabase calls; Gotrue includes email/password, magic links, OAuth; single stack to maintain; auth sessions stored in same DB → consistent backups | Tied to Supabase ecosystem; less mainstream community than NextAuth; migration requires self-hosting the full Supabase stack |
| **NextAuth.js (now Auth.js)** | Framework-agnostic (v5); huge community; supports 100+ providers; decoupled from DB layer; mature session management | 97 Supabase calls need refactoring → 2-3 days of changes; would need to configure database adapter; introduces second abstraction layer; session inconsistency risk during migration |
| **Third-party auth (Clerk, Auth0)** | Zero maintenance; enterprise features (MFA, SSO); fast setup | Vendor lock-in; monthly cost at scale; data privacy concerns for hotel guest data; migration complexity same as NextAuth |

## Decision

We chose **self-hosted Supabase (Gotrue)** as part of the self-hosted Supabase stack.

## Consequences

- **Positive**: Zero code changes for auth. All 97 Supabase calls continue working. The migration is infrastructure-only — the application code does not change.
- **Positive**: Gotrue is battle-tested (used by thousands of Supabase projects). Self-hosting gives us full control over user data.
- **Negative**: Tied to the Supabase ecosystem. If we ever want to migrate away from Supabase entirely, we'll need to either extract auth or rewrite.
- **Negative**: Self-hosting Gotrue requires running a Go binary + PostgreSQL — more operational overhead than a serverless auth provider.

## Y-Statement

> In the context of migrating from managed Supabase to self-hosted infrastructure, facing 97 existing Supabase calls in the codebase, we decided for self-hosted Supabase (Gotrue) over NextAuth.js to achieve zero code changes during migration, accepting tight coupling to the Supabase ecosystem.

## Links

- Related: ADR-0003 (Hetzner VPS provider decision)
