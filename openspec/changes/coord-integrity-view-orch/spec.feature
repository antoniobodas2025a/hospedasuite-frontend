Feature: Coordinate Integrity and View Orchestration
  As a guest browsing the OTA
  I want a clean homepage without map clutter, reliable map rendering
  without crashes, and hotels with missing coordinates to appear in
  the list even if they have no marker
  So that the experience feels polished and never breaks

  Background:
    Given the OTA page is loaded
    And hotels are fetched from the server

  # ─── S1: Homepage has no map ────────────────────────────────────────────

  Scenario: Homepage shows only cards without map instance (S1)
    Given the user is on the homepage
    And no location search has been performed
    Then no map component should be rendered
    And no "Mostrar mapa" toggle should be visible
    And hotel cards should display in a full-width grid

  # ─── S2: Map toggle appears after search with results ───────────────────

  Scenario: Map toggle visible after location search (S2)
    Given the user has searched for "duitama"
    And the search returns at least one hotel
    Then the "Mostrar mapa" toggle should be visible below the card grid
    And clicking the toggle should display the map in split-view mode

  Scenario: Map toggle hidden when search has no results (S2-edge)
    Given the user has searched for a location with no hotels
    Then the "Mostrar mapa" toggle should not be visible

  # ─── S3: NaN coordinates are filtered, hotel stays in list ──────────────

  Scenario: Hotel with invalid coordinates has no marker (S3)
    Given the hotel "corrupt-hotel" has NaN latitude in its coordinate data
    When the map renders hotel markers
    Then no marker should be created for "corrupt-hotel"
    And "corrupt-hotel" should still appear in the search result list

  Scenario: All hotels with valid coordinates render markers (S3-edge)
    Given 5 hotels all have valid numeric coordinates
    When the map renders hotel markers
    Then exactly 5 markers should appear on the map
