# Lead Export CSV Specification

## Purpose

Define CSV export of leads from the superadmin panel, supporting both full export and filtered export based on active search/filter criteria.

## Requirements

### Requirement: Export All Leads to CSV

The system MUST provide a button to export all leads to a CSV file. The CSV MUST include all lead columns: `business_name`, `phone`, `city_search`, `status`, `notes`, `address`, `website`, `rating`, `ai_pitch`, `hotel_id`, `created_at`, `source`.

#### Scenario: Export triggers download

- GIVEN leads exist in the database
- WHEN a superadmin clicks "Export to CSV"
- THEN a CSV file downloads with all leads as rows
- AND the file is named `leads-export-{YYYY-MM-DD}.csv`

#### Scenario: CSV column headers

- GIVEN a CSV export is generated
- WHEN the file is opened
- THEN the first row contains column headers matching the lead fields

#### Scenario: Empty export

- GIVEN no leads exist
- WHEN a superadmin clicks "Export to CSV"
- THEN a CSV file downloads with only the header row
- AND no error is shown

### Requirement: Export Filtered Leads

The system MUST respect active search and filter criteria when exporting. Only leads matching the current filters MUST be included in the CSV.

#### Scenario: Export with status filter active

- GIVEN a status filter for "converted" is active showing 30 leads
- WHEN the user clicks "Export to CSV"
- THEN the CSV contains only the 30 filtered leads
- AND the file name includes the filter: `leads-export-converted-{YYYY-MM-DD}.csv`

#### Scenario: Export with search term active

- GIVEN a search for "Hotel" is active showing 15 leads
- WHEN the user clicks "Export to CSV"
- THEN the CSV contains only leads matching the search term

#### Scenario: Export with date range filter

- GIVEN a date range filter is active
- WHEN the user clicks "Export to CSV"
- THEN only leads within the date range are included

### Requirement: CSV Format

The system MUST generate valid CSV with proper escaping. Fields containing commas, quotes, or newlines MUST be properly quoted per RFC 4180.

#### Scenario: Notes with commas are escaped

- GIVEN a lead has notes containing commas
- WHEN exported to CSV
- THEN the notes field is wrapped in double quotes
- AND the CSV parses correctly

#### Scenario: Special characters in business name

- GIVEN a lead has `business_name` with double quotes
- WHEN exported to CSV
- THEN the quotes are escaped per RFC 4180 (doubled)

## Acceptance Criteria

| # | Criterion |
|---|-----------|
| 1 | `exportLeadsToCSV` utility exists in `src/lib/export-leads-csv.ts` |
| 2 | Export button visible on `/admin/leads` page header |
| 3 | CSV includes all 12 lead columns as headers |
| 4 | Filtered export respects active search, status, and date filters |
| 5 | File naming includes date and active filter context |
| 6 | CSV is RFC 4180 compliant (proper escaping) |
| 7 | Export works client-side using Blob + URL.createObjectURL |
