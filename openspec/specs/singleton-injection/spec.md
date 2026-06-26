# Singleton Injection Specification

## Purpose

Eliminate duplicate `createClient(process.env...)` calls across superadmin page components by importing the singleton `supabaseAdmin` from `@/lib/supabase-admin`. Reduces code duplication and ensures consistent client configuration.

## Requirements

### Requirement: No Inline Admin Client Creation in Pages

Superadmin page components MUST NOT create Supabase admin clients inline using `createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)`. All pages MUST import the singleton from `@/lib/supabase-admin`.

#### Scenario: admin/page.tsx uses singleton
- GIVEN `src/app/(super-admin)/admin/page.tsx` is inspected after refactor
- THEN it contains `import { supabaseAdmin } from '@/lib/supabase-admin'`
- AND it does NOT contain `createClient(` anywhere in the file

#### Scenario: duplicates/page.tsx uses singleton
- GIVEN `src/app/(super-admin)/admin/hotels/duplicates/page.tsx` is inspected after refactor
- THEN it contains `import { supabaseAdmin } from '@/lib/supabase-admin'`
- AND it does NOT contain `createClient(` anywhere in the file

#### Scenario: pending/page.tsx uses singleton
- GIVEN `src/app/(super-admin)/admin/payments/pending/page.tsx` is inspected after refactor
- THEN it contains `import { supabaseAdmin } from '@/lib/supabase-admin'`
- AND it does NOT contain `createClient(` anywhere in the file

### Requirement: Singleton Has Correct Configuration

The singleton at `@/lib/supabase-admin` MUST be configured with `persistSession: false` and `autoRefreshToken: false` for server-side usage. It MUST handle build-time missing env vars gracefully.

#### Scenario: Singleton config is correct
- GIVEN `src/lib/supabase-admin.ts` is inspected
- THEN `auth.persistSession` is `false`
- AND `auth.autoRefreshToken` is `false`

#### Scenario: Build-time safety preserved
- GIVEN environment variables are not set during build
- WHEN the module is imported
- THEN it does not throw
- AND uses dummy values that are safe at build time

### Requirement: All Superadmin Pages Use Consistent Import

Every superadmin page that needs admin-level database access MUST use the same import pattern: `import { supabaseAdmin } from '@/lib/supabase-admin'`. No page may use a different method to obtain an admin client.

#### Scenario: grep confirms consistent usage
- WHEN `grep -r "createClient(process.env" src/app/\(super-admin\)/` is run
- THEN zero matches are found in page component files
- AND `grep -r "supabaseAdmin" src/app/\(super-admin\)/` matches in all pages that query the database

## Acceptance Criteria

| # | Criterion |
|---|-----------|
| 1 | Zero `createClient(process.env` calls in superadmin page components |
| 2 | `grep -r "from '@/lib/supabase-admin'" src/app/\(super-admin\)/` matches in admin/page.tsx, duplicates/page.tsx, pending/page.tsx |
| 3 | `grep -r "createClient(process.env" src/app/\(super-admin\)/` returns zero matches |
| 4 | `src/lib/supabase-admin.ts` exports `supabaseAdmin` singleton |
| 5 | TypeScript compilation passes with no errors |
