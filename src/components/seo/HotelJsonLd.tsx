// ============================================================================
// HOTEL JSON-LD — Structured data para SEO de Google
//
// Genera el script JSON-LD con schema.org/Hotel para rich snippets.
// Usa datos reales de la DB: reviews, amenities, horarios, categoria.
// ============================================================================

import { getAmenityLabel } from '@/lib/amenity-registry';

interface HotelJsonLdProps {
  hotel: any;
  reviewStats?: { overall: number; total: number };
  baseUrl?: string;
}

export default function HotelJsonLd({ hotel, reviewStats, baseUrl = 'https://hospedasuite.com' }: HotelJsonLdProps) {
  const rooms = hotel.rooms || [];
  const activeRooms = rooms.filter((r: any) => r.status === 'active');
  const minPrice = activeRooms.length > 0 ? Math.min(...activeRooms.map((r: any) => r.price_per_night || r.price || 0)) : 0;
  const maxPrice = activeRooms.length > 0 ? Math.max(...activeRooms.map((r: any) => r.price_per_night || r.price || 0)) : 0;

  const structuredData: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': 'Hotel',
    name: hotel.name,
    description: hotel.description || `Hotel en ${hotel.location}`,
    image: hotel.seo_og_image_url || hotel.main_image_url || hotel.cover_photo_url,
    url: hotel.seo_canonical_url || `${baseUrl}/hotel/${hotel.slug}`,
    telephone: hotel.whatsapp_number || hotel.phone,
    address: {
      '@type': 'PostalAddress',
      streetAddress: hotel.address || '',
      addressLocality: hotel.city || hotel.location || '',
      addressCountry: 'CO',
    },
    amenityFeature: (hotel.hotel_amenities || []).map((amenity: string) => ({
      '@type': 'LocationFeatureSpecification',
      name: getAmenityLabel(amenity),
    })),
    hasMap: hotel.google_maps_url,
    checkinTime: hotel.check_in_time || '15:00',
    checkoutTime: hotel.check_out_time || '13:00',
    petsAllowed: false,
  };

  // Precio solo si hay habitaciones activas
  if (minPrice > 0) {
    structuredData.priceRange = `$${minPrice.toLocaleString()} - $${maxPrice.toLocaleString()} COP`;
  }

  // Rating de categoria (badge) si existe
  if (hotel.category_badge) {
    structuredData.starRating = {
      '@type': 'Rating',
      ratingValue: hotel.category_badge.toLowerCase().includes('premium') ? '5' : '4',
    };
  }

  // Review aggregation si hay stats reales
  if (reviewStats && reviewStats.total > 0) {
    structuredData.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: reviewStats.overall,
      reviewCount: reviewStats.total,
      bestRating: 5,
      worstRating: 1,
    };
  }

  // Ofertas de habitaciones
  if (activeRooms.length > 0) {
    structuredData.offers = {
      '@type': 'AggregateOffer',
      priceCurrency: 'COP',
      lowPrice: minPrice,
      highPrice: maxPrice,
      offerCount: activeRooms.length,
      offers: activeRooms.slice(0, 5).map((room: any) => ({
        '@type': 'Offer',
        name: room.name,
        description: room.description || '',
        price: room.price_per_night || room.price,
        priceCurrency: 'COP',
        availability: 'https://schema.org/InStock',
        url: hotel.seo_canonical_url || `${baseUrl}/hotel/${hotel.slug}`,
      })),
    };
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}
