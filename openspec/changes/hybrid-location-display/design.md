# Design: Hybrid Location Display

## Architecture

### Component Structure
```
HotelInfoSection.tsx
  └─ LocationCard.tsx (NEW)
       ├─ StaticMap (when API key available)
       │   └─ <img src={googleMapsStaticUrl} />
       └─ TextualCard (fallback)
           ├─ Address section
           ├─ Nearby points section
           └─ "View on Google Maps" button
```

### Data Flow
```
HotelInfoSection
  │
  ├─ Receives: hotel.name, hotel.address, hotel.latitude, hotel.longitude
  │
  └─ Passes to LocationCard:
       ├─ hotelName
       ├─ address
       ├─ coordinates (lat, lng)
       └─ nearbyPoints (optional)
```

## Implementation Details

### LocationCard.tsx

**Props:**
```typescript
interface LocationCardProps {
  hotelName: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  nearbyPoints?: Array<{ name: string; distance: string }>;
}
```

**Logic:**
1. Check if `GOOGLE_MAPS_API_KEY` environment variable exists
2. If yes AND coordinates available → render StaticMap
3. If no OR no coordinates → render TextualCard
4. Both include "View on Google Maps" button

**StaticMap Component:**
```typescript
function StaticMap({ lat, lng, hotelName }: { lat: number; lng: number; hotelName: string }) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const mapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=15&size=600x300&markers=color:red%7C${lat},${lng}&key=${apiKey}`;
  
  return (
    <img 
      src={mapUrl} 
      alt={`Ubicación de ${hotelName}`}
      className="w-full h-auto rounded-xl"
      loading="lazy"
    />
  );
}
```

**TextualCard Component:**
```typescript
function TextualCard({ address, nearbyPoints }: { address: string; nearbyPoints?: Array<{name: string; distance: string}> }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-bold">Dirección</h3>
        <p>{address}</p>
      </div>
      {nearbyPoints && (
        <div>
          <h3 className="font-bold">Puntos de interés cercanos</h3>
          <ul>
            {nearbyPoints.map(point => (
              <li key={point.name}>{point.name}: {point.distance}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

**View on Google Maps Button:**
```typescript
function ViewOnGoogleMapsButton({ lat, lng, address }: { lat?: number; lng?: number; address?: string }) {
  const googleMapsUrl = lat && lng 
    ? `https://www.google.com/maps?q=${lat},${lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address || '')}`;
  
  return (
    <button
      onClick={() => window.open(googleMapsUrl, '_blank', 'noopener,noreferrer')}
      className="w-full py-3 px-4 bg-brand-500 text-white rounded-xl font-bold hover:bg-brand-600 transition-colors"
      aria-label="Ver ubicación en Google Maps (abre en nueva pestaña)"
    >
      Ver en Google Maps ↗
    </button>
  );
}
```

### HotelInfoSection.tsx Changes

**Before:**
```typescript
import HotelDetailMap from './HotelDetailMapWrapper';
// ...
{mapResolution.type === 'leaflet' && (
  <HotelDetailMap latitude={latitude!} longitude={longitude!} hotelName={hotelName} location={location} />
)}
```

**After:**
```typescript
import LocationCard from './LocationCard';
// ...
<LocationCard
  hotelName={hotelName}
  address={address}
  latitude={latitude}
  longitude={longitude}
/>
```

### Files to Remove (after verification)
- `src/components/ota/HotelDetailMap.tsx`
- `src/components/ota/HotelDetailMapWrapper.tsx`
- `src/lib/map-resolver.ts` (if not used elsewhere)

### Dependencies to Remove (after verification)
- `react-leaflet`
- `leaflet`

## Testing Strategy

### Unit Tests
1. **LocationCard renders static map when API key available**
   - Mock `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
   - Render with coordinates
   - Assert image src contains Google Maps URL

2. **LocationCard renders textual fallback when no API key**
   - Remove API key from environment
   - Render with address
   - Assert textual card is displayed

3. **View on Google Maps button opens new tab**
   - Render component
   - Click button
   - Assert window.open called with correct params

4. **Responsive design**
   - Render at mobile viewport
   - Assert full width
   - Render at desktop viewport
   - Assert max-width 600px

### Integration Tests
1. **HotelInfoSection uses LocationCard**
   - Render HotelInfoSection
   - Assert LocationCard is rendered
   - Assert correct props passed

### E2E Tests
1. **User sees location information**
   - Navigate to hotel detail page
   - Assert location card is visible
   - Assert "View on Google Maps" button is visible

2. **User opens Google Maps in new tab**
   - Click "View on Google Maps"
   - Assert new tab opens with Google Maps
   - Assert current tab remains on hotel page

## Performance Metrics

### Before
- Bundle size: ~100KB (React-Leaflet)
- Load time: Multiple tile requests
- JavaScript: Required for map

### After
- Bundle size: ~0KB (no map library)
- Load time: Single image request (or zero for textual)
- JavaScript: Not required for display

### Expected Improvement
- Bundle size reduction: ~100KB
- Load time improvement: ~200-500ms
- Lighthouse score improvement: +5-10 points

## Rollback Plan
If issues arise:
1. Revert commit
2. Redeploy previous version
3. Investigate root cause
4. Fix and redeploy

## Future Enhancements
- Add map image caching (reduce API calls)
- Add more nearby points of interest (from database)
- Add walking/driving time estimates
- Add public transport information
