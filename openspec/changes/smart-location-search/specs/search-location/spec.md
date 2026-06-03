# Spec: Smart Location Search

## search-location-indexing
The search autocomplete MUST index both `city` and `location` columns from the hotels table.

### Scenario: User searches for a vereda
- GIVEN a hotel with `city = "Salento"` and `location = "Vereda Boquía"`
- WHEN the user types "Boquía" in the search bar
- THEN the autocomplete shows "Vereda Boquía" as a suggestion

### Scenario: User searches for a city (unchanged behavior)
- GIVEN hotels in "Medellín"
- WHEN the user types "Mede"
- THEN the autocomplete shows "Medellín" with hotel count

## location-field-required
The `location` field in the onboarding schema MUST be required.

### Scenario: Hotelier creates a glamping
- GIVEN the onboarding wizard Step 1
- WHEN the hotelier fills "Salento" as city and leaves location empty
- THEN validation fails with "La zona o vereda es requerida"

## fuzzy-search-location
The typo-correction fallback MUST search in both city and location fields.

### Scenario: User types "boquio" instead of "Boquía"
- GIVEN fuzzy search fallback is active
- WHEN the user types "boquio"
- THEN fuzzy results include hotels with location containing "Boquía"
