// ============================================================================
// HOTEL JSON-LD — Structured data para SEO de Google
//
// Genera el script JSON-LD con schema.org/Hotel para rich snippets.
// Esto ayuda a Google a mostrar precio, rating, amenities en los resultados.
// ============================================================================

interface HotelJsonLdProps {
  hotel: any;
  baseUrl?: string;
}

export default function HotelJsonLd({ hotel, baseUrl = 'https://hospedasuite.com' }: HotelJsonLdProps) {
  const rooms = hotel.rooms || [];
  const activeRooms = rooms.filter((r: any) => r.status === 'active');
  const minPrice = activeRooms.length > 0 ? Math.min(...activeRooms.map((r) => r.price_per_night || r.price || 0)) : 0;
  const maxPrice = activeRooms.length > 0 ? Math.max(...activeRooms.map((r) => r.price_per_night || r.price || 0)) : 0;

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Hotel',
    name: hotel.name,
    description: hotel.description || `Hotel en ${hotel.location}`,
    image: hotel.main_image_url || hotel.cover_photo_url,
    url: `${baseUrl}/hotel/${hotel.slug}`,
    telephone: hotel.whatsapp_number || hotel.phone,
    address: {
      '@type': 'PostalAddress',
      streetAddress: hotel.address || '',
      addressLocality: hotel.city || hotel.location || '',
      addressCountry: 'CO',
    },
    geo: hotel.google_maps_url
      ? {
          '@type': 'GeoCoordinates',
          // Extraer coordenadas del URL de Google Maps si es posible
          // Por ahora dejamos placeholder hasta tener lat/lng en DB
        }
      : undefined,
    priceRange: minPrice > 0 ? `$${minPrice.toLocaleString()} - $${maxPrice.toLocaleString()} COP` : undefined,
    amenityFeature: (hotel.hotel_amenities || []).map((amenity: string) => ({
      '@type': 'LocationFeatureSpecification',
      name: amenity,
    })),
    hasMap: hotel.google_maps_url,
    starRating: {
      '@type': 'Rating',
      ratingValue: '4', // Placeholder hasta tener rating real
    },
    offers: activeRooms.slice(0, 5).map((room) => ({
      '@type': 'Offer',
      name: room.name,
      description: room.description || '',
      price: room.price_per_night || room.price,
      priceCurrency: 'COP',
      availability: 'https://schema.org/InStock',
      url: `${baseUrl}/hotel/${hotel.slug}`,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}
