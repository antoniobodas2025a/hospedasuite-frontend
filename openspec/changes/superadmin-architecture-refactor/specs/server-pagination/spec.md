# Server-Side Pagination Specification

## Purpose

Add server-side pagination to the duplicate hotels and pending payments tables, matching the existing pattern used in leads, subscriptions, and audit-logs pages.

## Requirements

### Requirement: Duplicate Hotels Server-Side Pagination

The `/admin/hotels/duplicates` page MUST implement server-side pagination with a configurable page size (default 50). The page MUST read `page` from searchParams and pass it to the DAL query. Pagination controls MUST be displayed in the table component.

#### Scenario: First page loads with limited results
- GIVEN more than 50 duplicate hotels exist
- WHEN a superadmin navigates to `/admin/hotels/duplicates`
- THEN only the first 50 duplicates are fetched and displayed
- AND pagination controls show "Page 1 of N"

#### Scenario: Navigate to next page
- GIVEN the user is on page 1
- WHEN the user clicks "Next" or a page number
- THEN the page re-renders with results for page 2
- AND the URL reflects `?page=2`

#### Scenario: Pagination respects query constraints
- GIVEN the duplicates query filters by `subscription_status = 'duplicate_review'`
- WHEN pagination is applied
- THEN only matching duplicates are counted and paginated
- AND the total count reflects only filtered results

#### Scenario: Last page shows remaining results
- GIVEN 120 duplicate hotels exist (3 pages of 50)
- WHEN the user navigates to page 3
- THEN exactly 20 results are displayed
- AND "Next" button is disabled or hidden

### Requirement: Pending Payments Server-Side Pagination

The `/admin/payments/pending` page MUST implement server-side pagination with a configurable page size (default 50). The page MUST read `page` from searchParams and pass it to the DAL query. Pagination controls MUST be displayed in the table component.

#### Scenario: First page loads with limited results
- GIVEN more than 50 manual payment records exist
- WHEN a superadmin navigates to `/admin/payments/pending`
- THEN only the first 50 payments are fetched and displayed
- AND pagination controls show "Page 1 of N"

#### Scenario: Navigate to next page
- GIVEN the user is on page 1
- WHEN the user clicks "Next" or a page number
- THEN the page re-renders with results for page 2
- AND the URL reflects `?page=2`

#### Scenario: Pagination uses count: exact
- GIVEN the DAL query runs
- WHEN fetching payments
- THEN the query uses `{ count: 'exact' }` to get total count
- AND `totalPages` is calculated as `Math.ceil(count / pageSize)`

### Requirement: Pagination Pattern Matches Existing Pages

The pagination implementation MUST follow the same pattern as `/admin/leads`, `/admin/subscriptions`, and `/admin/audit-logs`: server component reads searchParams → passes page to query → passes pagination metadata to client table.

#### Scenario: Consistent page size constant
- GIVEN all paginated superadmin pages are inspected
- THEN each defines a `PAGE_SIZE` or `DEFAULT_PAGE_SIZE` constant of 50
- AND uses `(page - 1) * pageSize` for the `from` offset

#### Scenario: Consistent searchParams handling
- GIVEN a paginated page component is inspected
- THEN it destructures `page` from `searchParams` with `parseInt(params.page, 10) || 1`
- AND `searchParams` is typed as `Promise<{ [key: string]: string | string[] | undefined }>`

## Acceptance Criteria

| # | Criterion |
|---|-----------|
| 1 | `/admin/hotels/duplicates` page reads `page` from searchParams |
| 2 | `/admin/payments/pending` page reads `page` from searchParams |
| 3 | Both pages use `{ count: 'exact' }` in their queries |
| 4 | Both pages pass `totalPages`, `currentPage`, `totalCount` to their table components |
| 5 | Table components render pagination controls |
| 6 | `grep "PAGE_SIZE\|pageSize" src/app/\(super-admin\)/admin/hotels/duplicates/page.tsx` returns a match |
| 7 | `grep "PAGE_SIZE\|pageSize" src/app/\(super-admin\)/admin/payments/pending/page.tsx` returns a match |
