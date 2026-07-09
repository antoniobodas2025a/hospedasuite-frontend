# Proposal: Hybrid Location Display (Static Map + Textual Fallback)

## Problem
The current interactive map (React-Leaflet) in the hotel detail page causes:
1. **Traffic leakage**: Users can interact with the map and navigate away to Google Maps, seeing competitors
2. **Cognitive overload**: Interactive map requires mental effort vs clear textual information
3. **Performance issues**: React-Leaflet adds ~100KB to bundle + multiple tile requests
4. **Conversion risk**: Users get distracted exploring the area instead of focusing on booking

## Solution
Implement a **hybrid location display** that combines:
- **Primary**: Google Maps Static API (image) when API key is available
- **Fallback**: Textual location card when API key is not configured
- **Both**: "View on Google Maps" button that opens in new tab (target="_blank")

## Success Criteria
- Zero traffic leakage to Google Maps (unless user explicitly clicks button)
- Page load time improvement (remove React-Leaflet dependency)
- Clear, accessible location information
- Works with or without Google Maps API key
- Mobile-responsive design

## Scope
- Replace `HotelDetailMap.tsx` and `HotelDetailMapWrapper.tsx` with new `LocationCard.tsx`
- Update `HotelInfoSection.tsx` to use new component
- Remove React-Leaflet dependency (optional, after verification)
- Add Google Maps Static API integration (optional, when API key available)

## Non-Goals
- Keep interactive map functionality
- Support map customization beyond static image
- Implement map caching (future optimization)

## Risks
- Google Maps Static API requires API key (mitigated by textual fallback)
- API costs after free tier (mitigated by fallback)
- Users may prefer visual map (mitigated by hybrid approach)

## Dependencies
- Google Maps Static API (optional)
- Existing hotel data: latitude, longitude, address, name
