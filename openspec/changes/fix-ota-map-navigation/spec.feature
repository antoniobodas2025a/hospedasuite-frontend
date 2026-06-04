Feature: OTA Map Navigation
  As a guest browsing hotels on the OTA
  I want the map to center on my search location, respond reliably to gestures,
  and show hotel markers from configured coordinates
  So that I can explore accommodations visually without friction

  Background:
    Given the OTA page is loaded with a map component
    And the map displays hotels from the catalog

  # ─── Issue 1: Map centering on search location ──────────────────────────────

  Scenario: Map centers on searched city after clicking "Mostrar mapa" (S1)
    Given the user has searched for "duitama"
    And the geocoding service resolves "duitama" to coordinates [5.8245, -73.0323]
    When the user clicks "Mostrar mapa"
    Then the map should fly to coordinates [5.8245, -73.0323]
    And the map center should display within 0.01 degrees of the target location

  Scenario: Map shows user feedback when geocoding fails (S2)
    Given the user has searched for "nonexistent-place"
    And the geocoding service returns an error for "nonexistent-place"
    When the user clicks "Mostrar mapa"
    Then the map should remain at the default center
    And a user-facing message should indicate the location could not be determined

  Scenario: Map centers on searched city from geocoding cache (S3)
    Given the user has previously searched for "duitama"
    And the geocoding result for "duitama" is cached
    When the user searches for "duitama" again
    And clicks "Mostrar mapa"
    Then the map should fly to coordinates [5.8245, -73.0323]
    And the transition should complete using cached coordinates within 100ms

  Scenario: Map updates center when changing search location (S4)
    Given the user is viewing the map centered on "duitama"
    When the user searches for "bogotá"
    And clicks "Mostrar mapa"
    Then the map should fly to Bogotá coordinates [4.6097, -74.0817]

  # ─── Issue 2: Map gestures with clustered markers ───────────────────────────

  Scenario: Map drag works over clustered marker areas (S5)
    Given the map displays 30+ hotel markers in the viewport
    And the markers are grouped in clusters at zoom level 10
    When the user clicks and drags the map over a cluster
    Then the map should pan smoothly without being interrupted by the cluster
    And the drag end event should fire with the updated center coordinates

  Scenario: Map zoom works when markers are clustered (S6)
    Given the map displays clustered hotel markers
    When the user double-clicks on a cluster
    Then the map should zoom in by one level
    And the cluster should re-render as smaller groups or individual markers

  Scenario: Scroll-wheel zoom functions over dense marker areas (S7)
    Given the map displays clustered hotel markers
    When the user scrolls the mouse wheel over a dense cluster
    Then the map should zoom in or out accordingly
    And the viewport should not freeze or stutter

  Scenario: Marker clusters break apart at the configured zoom threshold (S8)
    Given the map has a clustering threshold of zoom level 11
    When the user zooms in to zoom level 11
    Then individual markers should appear instead of clusters
    And each marker should be clickable independently

  # ─── Issue 3: Hotel markers from dashboard coordinates ──────────────────────

  Scenario: Hotel with coordinates in secondary data appears as marker (S9)
    Given the hotel "arrayan3" has coordinates in its secondary location data
    And the primary catalog entry for "arrayan3" has no coordinates
    When the map loads hotel data
    Then the map should display a marker for "arrayan3" at its secondary location coordinates

  Scenario: Hotel with coordinates in both sources uses primary catalog (S10)
    Given the hotel "arrayan3" has coordinates in its primary catalog data
    And the hotel "arrayan3" also has coordinates in its secondary location data
    When the map loads hotel data
    Then the marker position should use primary catalog coordinates
    And the marker should appear at the expected location

  Scenario: Hotel with no coordinates in either table shows no marker (S11)
    Given the hotel "no-coords-hotel" has no coordinates in any location source
    When the map loads hotel data
    Then no marker should be rendered for "no-coords-hotel"
    And the hotel should still appear in the search result list

  Scenario: Map renders all markers from mixed coordinate sources (S12)
    Given 5 hotels have coordinates in the primary catalog
    And 3 hotels have coordinates only in the secondary location data
    And 2 hotels have no coordinates
    When the map loads the full hotel set
    Then exactly 8 markers should appear on the map
    And markers from the secondary source should include a precision indicator
