/**
 * Carta Digital — Public Page
 *
 * Public-facing menu page accessible via QR code.
 * No authentication required.
 * Displays menu categories and items with bilingual support (ES/EN).
 *
 * URL: /carta/[slug]
 * QR data: https://hospedasuite.com/carta/{hotel-slug}?table=Mesa+1
 */

import { notFound } from 'next/navigation'
import { getActiveCategories, getActiveMenuItems, getFeaturedMenuItems, recordMenuView } from '@/data/carta-digital'
import { getHotelBySlug } from '@/data/hotels'
import { CartView } from './cart-view'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ table?: string; lang?: string }>
}

export default async function CartaPublicPage({ params, searchParams }: PageProps) {
  const { slug } = await params
  const { table, lang } = await searchParams
  const language = lang === 'en' ? 'en' : 'es'

  // Find hotel by slug
  const hotel = await getHotelBySlug(slug)
  if (!hotel) notFound()

  // Load menu data
  const [categories, items, featured] = await Promise.all([
    getActiveCategories(hotel.id),
    getActiveMenuItems(hotel.id),
    getFeaturedMenuItems(hotel.id),
  ])

  // Record view (fire and forget)
  recordMenuView(hotel.id, {
    tableNumber: table || undefined,
    language,
  }).catch(() => {})

  return (
    <CartView
      hotel={hotel}
      categories={categories}
      items={items}
      featured={featured}
      tableNumber={table || null}
      language={language}
    />
  )
}
