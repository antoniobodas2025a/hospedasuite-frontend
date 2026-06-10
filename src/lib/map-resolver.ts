/**
 * Map Resolver — Pure utility for geographic data resolution.
 * 
 * Implements a priority chain for map rendering:
 * 1. Direct Google Maps Embed URL (iframe)
 * 2. Latitude/Longitude (Leaflet/OpenStreetMap)
 * 3. Address (Google Maps Search Link)
 * 4. Hotel Name (Google Maps Search Link)
 * 
 * Usage:
 *   const mapData = getMapPriorityUrl(hotel);
 *   if (mapData.type === 'iframe') { ... } else { ... }
 */

export interface MapResolution {
  type: 'iframe' | 'leaflet' | 'link' | 'none';
  url: string;
  label?: string;
}

interface HotelGeoData {
  googleMapsUrl?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  name: string;
}

export function getMapPriorityUrl(hotel: HotelGeoData): MapResolution {
  // Priority 1: Direct Embed URL
  if (hotel.googleMapsUrl) {
    // Normalize sharing links to embed format if possible, otherwise return as is
    const url = hotel.googleMapsUrl.includes('/embed') 
      ? hotel.googleMapsUrl 
      : hotel.googleMapsUrl.replace('/view?usp=sharing', '/embed?pb=');
    
    return { type: 'iframe', url };
  }

  // Priority 2: Coordinates (Leaflet)
  if (hotel.latitude != null && hotel.longitude != null) {
    return { 
      type: 'leaflet', 
      url: '', // Coordinates are passed separately to the map component
      label: `${hotel.latitude},${hotel.longitude}`
    };
  }

  // Priority 3: Address (Google Maps Search)
  if (hotel.address) {
    const query = encodeURIComponent(hotel.address);
    return { 
      type: 'link', 
      url: `https://www.google.com/maps/search/?api=1&query=${query}`,
      label: `Buscar "${hotel.address}" en Google Maps`
    };
  }

  // Priority 4: Hotel Name (Google Maps Search)
  if (hotel.name) {
    const query = encodeURIComponent(hotel.name);
    return { 
      type: 'link', 
      url: `https://www.google.com/maps/search/?api=1&query=${query}`,
      label: `Buscar "${hotel.name}" en Google Maps`
    };
  }

  // Fallback: No data
  return { type: 'none', url: '' };
}
