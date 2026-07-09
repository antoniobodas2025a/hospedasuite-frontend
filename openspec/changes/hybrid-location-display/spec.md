# Spec: Hybrid Location Display

## Overview
Replace interactive map with hybrid location display that shows static map image (when API key available) or textual card (fallback), with "View on Google Maps" button opening in new tab.

## Requirements

### REQ-1: Static Map Display (when API key available)
- Display Google Maps Static API image showing hotel location
- Image size: 600x300px (responsive)
- Include marker at hotel coordinates
- Alt text: "Ubicación de [hotel name] en [location]"
- Lazy loading enabled

### REQ-2: Textual Fallback (when API key not available)
- Display location card with:
  - Hotel address
  - Nearby points of interest with distances
  - Descriptive text ("Located in the heart of [city], [X] min from [landmark]")
- Clear, accessible design
- Mobile-responsive

### REQ-3: "View on Google Maps" Button
- Button text: "Ver en Google Maps ↗"
- Opens Google Maps in new tab (target="_blank", rel="noopener noreferrer")
- Uses hotel coordinates or address
- Accessible (aria-label)

### REQ-4: Performance
- Remove React-Leaflet dependency
- Reduce bundle size by ~100KB
- No JavaScript required for map display
- Lazy loading for images

### REQ-5: Accessibility
- Alt text for map image
- Semantic HTML structure
- Keyboard accessible button
- Screen reader friendly

### REQ-6: Responsive Design
- Mobile: Full width, stacked layout
- Desktop: Max width 600px, centered
- Touch-friendly button size (min 44x44px)

## Acceptance Criteria

### AC-1: Static Map Display
```gherkin
Given Google Maps API key is configured
When user visits hotel detail page
Then static map image is displayed
And image shows hotel location with marker
And alt text is descriptive
```

### AC-2: Textual Fallback
```gherkin
Given Google Maps API key is NOT configured
When user visits hotel detail page
Then textual location card is displayed
And card shows address and nearby points
And card is mobile-responsive
```

### AC-3: View on Google Maps
```gherkin
Given user is on hotel detail page
When user clicks "Ver en Google Maps"
Then Google Maps opens in new tab
And current page remains open
And user can continue booking process
```

### AC-4: Performance
```gherkin
Given hotel detail page loads
Then React-Leaflet is NOT loaded
Then bundle size is reduced by ~100KB
Then page load time is improved
```

## Test Scenarios

### Test 1: Static map renders with API key
- Mock Google Maps API key in environment
- Render LocationCard component
- Assert image src contains Google Maps Static API URL
- Assert alt text is correct

### Test 2: Textual fallback renders without API key
- Remove Google Maps API key from environment
- Render LocationCard component
- Assert textual card is displayed
- Assert address and nearby points are shown

### Test 3: Button opens Google Maps in new tab
- Render LocationCard component
- Click "Ver en Google Maps" button
- Assert window.open is called with correct URL
- Assert target="_blank" and rel="noopener noreferrer"

### Test 4: Responsive design
- Render LocationCard at mobile viewport (320px)
- Assert full width layout
- Render at desktop viewport (1200px)
- Assert max-width 600px

## Edge Cases
- Hotel has no coordinates (use address for Google Maps URL)
- Hotel has no address (use name for Google Maps URL)
- API key is invalid (fallback to textual card)
- Image fails to load (show fallback text)
