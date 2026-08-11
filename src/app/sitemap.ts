import type { MetadataRoute } from 'next';
import { supabaseAdmin } from '@/lib/supabase-admin';

const BASE_URL = 'https://hospedasuite.com';

// Static marketing pages — high priority
const STATIC_PAGES: MetadataRoute.Sitemap = [
  { url: BASE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
  { url: `${BASE_URL}/software`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
  { url: `${BASE_URL}/software/privacy`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
  { url: `${BASE_URL}/software/terms`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
  { url: `${BASE_URL}/support`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
];

// Programmatic city SEO pages
const CITY_SLUGS = ['paipa', 'villa-de-leyva', 'tunja', 'sogamoso', 'duitama'];
const CITY_PAGES: MetadataRoute.Sitemap = CITY_SLUGS.map((city) => ({
  url: `${BASE_URL}/recursos/ciudad/${city}`,
  lastModified: new Date(),
  changeFrequency: 'weekly' as const,
  priority: 0.7,
}));

// Resources pages
const RESOURCE_SLUGS = [
  'que-hacer-caida-plataformas-reservas',
  'rescate-operativo-boyaca',
  'analitica-dark-funnel',
  'automatizacion-sire-tra-boyaca',
];
const RESOURCE_PAGES: MetadataRoute.Sitemap = RESOURCE_SLUGS.map((slug) => ({
  url: `${BASE_URL}/recursos/${slug}`,
  lastModified: new Date(),
  changeFrequency: 'monthly' as const,
  priority: 0.6,
}));

async function getHotelPages(): Promise<MetadataRoute.Sitemap> {
  try {
    const { data: hotels, error } = await supabaseAdmin
      .from('hotels')
      .select('slug, updated_at')
      .eq('status', 'active')
      .eq('go_live', true)
      .not('subscription_status', 'eq', 'cancelled')
      .order('updated_at', { ascending: false })
      .limit(5000);

    if (error || !hotels) return [];

    return hotels.map((hotel) => ({
      url: `${BASE_URL}/hotel/${hotel.slug}`,
      lastModified: hotel.updated_at ? new Date(hotel.updated_at) : new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.8,
    }));
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const hotelPages = await getHotelPages();

  return [
    ...STATIC_PAGES,
    ...hotelPages,
    ...CITY_PAGES,
    ...RESOURCE_PAGES,
  ];
}
