# Server-Client Boundary Specification

## Purpose

Standardize all superadmin pages to follow the pattern: server component fetches data → client table receives props. Eliminates mixed server/client concerns within single components.

## Requirements

### Requirement: Server Component Data Fetching

Every superadmin page MUST be a server component (no `'use client'` directive) that fetches its initial data during server-side rendering. Data fetching MUST happen before the JSX return statement.

#### Scenario: admin/page.tsx is a server component
- GIVEN `src/app/(super-admin)/admin/page.tsx` is inspected
- THEN it does NOT contain `'use client'`
- AND it contains `async function` or `await` for data fetching

#### Scenario: duplicates/page.tsx is a server component
- GIVEN `src/app/(super-admin)/admin/hotels/duplicates/page.tsx` is inspected
- THEN it does NOT contain `'use client'`
- AND it fetches duplicate hotels data before rendering

#### Scenario: pending/page.tsx is a server component
- GIVEN `src/app/(super-admin)/admin/payments/pending/page.tsx` is inspected
- THEN it does NOT contain `'use client'`
- AND it fetches pending payments data before rendering

#### Scenario: audit-logs/page.tsx is a server component
- GIVEN `src/app/(super-admin)/admin/audit-logs/page.tsx` is inspected
- THEN it does NOT contain `'use client'`
- AND it fetches audit logs with filters before rendering

### Requirement: Client Table Receives Props

Interactive table components MUST be client components (`'use client'`) that receive their initial data as props from the server component. They MUST NOT fetch data directly from the database.

#### Scenario: TenantTable receives props
- GIVEN `TenantTable` is rendered
- THEN it receives `hotels` and `hqData` as props
- AND it does NOT call Supabase directly

#### Scenario: DuplicatesTable receives props
- GIVEN `DuplicatesTable` is rendered
- THEN it receives `hotels` and pagination metadata as props
- AND it does NOT call Supabase directly

#### Scenario: PendingPaymentsTable receives props
- GIVEN `PendingPaymentsTable` is rendered
- THEN it receives `payments` and pagination metadata as props
- AND it does NOT call Supabase directly

#### Scenario: AuditLogsTable receives props
- GIVEN `AuditLogsTable` is rendered
- THEN it receives `logs`, `totalPages`, `currentPage`, `totalCount`, and filter options as props
- AND it does NOT call Supabase directly

### Requirement: Force Dynamic Rendering

All superadmin pages MUST declare `export const dynamic = 'force-dynamic'` to prevent Next.js from caching responses. This ensures data is always fresh on page load.

#### Scenario: All pages declare force-dynamic
- GIVEN all superadmin page files are inspected
- THEN each contains `export const dynamic = 'force-dynamic'`
- AND no page relies on static generation or revalidation

### Requirement: Error Handling at Server Level

Server components MUST handle query errors gracefully by passing error messages to client components as props. Client components MUST display error states when an error prop is present.

#### Scenario: Query error passed to table
- GIVEN a database query fails in a server component
- WHEN the page renders
- THEN the error message is passed to the client table via an `error` prop
- AND the table displays an error state to the user

#### Scenario: No crash on empty data
- GIVEN a query returns zero results (not an error)
- WHEN the page renders
- THEN the client table receives an empty array
- AND it displays an appropriate empty state

## Acceptance Criteria

| # | Criterion |
|---|-----------|
| 1 | No superadmin page component contains `'use client'` |
| 2 | All table components (`TenantTable`, `DuplicatesTable`, `PendingPaymentsTable`, `AuditLogsTable`) contain `'use client'` |
| 3 | All pages declare `export const dynamic = 'force-dynamic'` |
| 4 | `grep "from 'server-only'" src/data/superadmin.ts` returns a match |
| 5 | Table components accept data via props, not direct DB calls |
| 6 | Error messages flow from server components to client tables via props |
