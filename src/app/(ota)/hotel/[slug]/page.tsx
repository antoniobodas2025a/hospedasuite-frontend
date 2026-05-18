import { getHotelDetailsBySlugAction, getReviewStatsAction } from '@/app/actions/ota';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { MapPin, Star } from 'lucide-react';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { RoomShowcaseModal } from '@/components/ota/RoomShowcaseModal';
import AvailabilitySearchBar from '@/components/ota/AvailabilitySearchBar';
import HeroGallery from '@/components/ota/HeroGallery';
import BookingWidget from '@/components/ota/BookingWidget';
import ReviewsSection from '@/components/ota/ReviewsSection';
import HotelInfoSection from '@/components/ota/HotelInfoSection';
import MobileStickyCta from '@/components/ota/MobileStickyCta';
import RoomsListWithFilters from '@/components/ota/RoomsListWithFilters';
import HotelJsonLd from '@/components/seo/HotelJsonLd';
import ReviewSkeleton from '@/components/ota/ReviewSkeleton';
import MapSkeleton from '@/components/ota/MapSkeleton';
import { SectionHeader } from '@/components/ui/glass';
import { ErrorBoundary } from '@/components/ota/ErrorBoundary';

// Incremental Static Regeneration — 60s cache for inventory balance
export const revalidate = 60;
export const dynamicParams = true;

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  if (!slug || slug === 'null' || slug.length < 2) return { title: 'Propiedad no encontrada' };

  const { success, hotel } = await getHotelDetailsBySlugAction(slug);

  if (!success || !hotel) return { title: 'Propiedad no encontrada' };

  return {
    title: hotel.seo_meta_title || `${hotel.name} | Reserva Oficial | HospedaSuite`,
    description: hotel.seo_meta_description || `Descubre la experiencia en ${hotel.name} ubicado en ${hotel.location}. Reserva directa al mejor precio garantizado.`,
    openGraph: {
      images: [hotel.seo_og_image_url || hotel.main_image_url || 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb'],
      title: hotel.seo_meta_title || `${hotel.name} | Experiencia de Lujo`,
      description: hotel.seo_meta_description || `Descubre la experiencia en ${hotel.name} ubicado en ${hotel.location}. Reserva directa al mejor precio garantizado.`,
    },
    alternates: hotel.seo_canonical_url ? { canonical: hotel.seo_canonical_url } : undefined,
  };
}

export default async function OTAHotelDetailPage({ params, searchParams }: PageProps) {
  const { slug } = await params;

  if (!slug || slug === 'null' || slug.length < 2) notFound();

  const resolvedSearchParams = await searchParams;
  const checkin = resolvedSearchParams?.checkin as string | undefined;
  const checkout = resolvedSearchParams?.checkout as string | undefined;
  const adults = resolvedSearchParams?.adults as string | undefined;
  const children = resolvedSearchParams?.children as string | undefined;
  const showRoom = resolvedSearchParams?.showRoom as string | undefined;

  const { success, hotel } = await getHotelDetailsBySlugAction(slug, checkin, checkout);

  if (!success || !hotel) notFound();

  const reviewStatsResult = await getReviewStatsAction(hotel.id);
  const reviewStats = reviewStatsResult.success ? reviewStatsResult.data : null;

  const availableRooms = (hotel.rooms || []).filter((room: any) => {
    const isActive = room.status === 'active';
    const hasCapacity = Number(room.capacity ?? 0) >= (Number(adults) || 1) + (Number(children) || 0);
    return isActive && hasCapacity;
  });

  const isSearchingDates = !!(checkin && checkout);
  const coverImage = hotel.main_image_url || 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb';

  const hotelGalleryImages = [
    { url: coverImage, alt: hotel.name },
    ...(hotel.cover_photo_url && hotel.cover_photo_url !== coverImage
      ? [{ url: hotel.cover_photo_url, alt: `${hotel.name} — vista general` }]
      : []),
    ...(Array.isArray(hotel.gallery_urls)
      ? hotel.gallery_urls.map((url: string, i: number) => ({ url, alt: `${hotel.name} — foto ${i + 3}` }))
      : []),
  ];

  // StickySubNav sections
  const navSections = [
    { id: 'rooms-section', label: 'Habitaciones' },
    { id: 'reviews-section', label: 'Opiniones' },
    { id: 'info-section', label: 'Ubicacion' },
  ];

  // Modal data optimization: pass minimal data when closed
  const modalHotelData = showRoom
    ? hotel
    : { slug: hotel.slug, rooms: [] };

  // Min price for MobileStickyCta
  const allActiveRooms = (hotel.rooms || []).filter((r: any) => r.status === 'active');
  const minPrice = allActiveRooms.length > 0
    ? Math.min(...allActiveRooms.map((r: any) => r.price_per_night || r.price || 0))
    : 0;

  return (
    <main className="min-h-screen bg-background text-foreground pb-24 font-sans selection:bg-brand-500/30">

      {/* SEO Structured Data */}
      <HotelJsonLd hotel={hotel} reviewStats={reviewStats ?? undefined} />

      {/* Room Showcase Modal — lazy data when closed */}
      <Suspense fallback={null}>
        <ErrorBoundary name="RoomShowcaseModal">
          <RoomShowcaseModal hotel={modalHotelData} />
        </ErrorBoundary>
      </Suspense>

      {/* Hero Gallery */}
      <ErrorBoundary name="HeroGallery">
        <HeroGallery
          images={hotelGalleryImages}
          hotelName={hotel.name}
          activityMessages={hotel.recent_activity_messages ?? null}
        />
      </ErrorBoundary>

      {/* Hotel Header */}
      <div className="max-w-6xl mx-auto px-6 pt-8">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div className="flex items-start gap-4">
            {hotel.logo_url ? (
              <div className="size-16 md:size-20 rounded-[var(--radius-squircle-2xl)] overflow-hidden border border-border bg-card shadow-sm shrink-0">
                <Image src={hotel.logo_url} alt={`${hotel.name} logo`} width={80} height={80} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="size-16 md:size-20 rounded-[var(--radius-squircle-2xl)] bg-gradient-to-br from-brand-500 to-warm-600 flex items-center justify-center text-primary-foreground font-black text-2xl shadow-sm shrink-0">
                {hotel.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-3xl md:text-4xl font-black text-foreground tracking-tight mb-2">
                {hotel.name}
              </h1>
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <MapPin size={16} className="text-brand-500" />
                {hotel.location}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {reviewStats && reviewStats.total > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-success-muted border border-success-border text-success text-xs font-bold">
                <Star size={12} className="fill-success text-success" />
                {reviewStats.overall} ({reviewStats.total})
              </span>
            )}
            {hotel.category_badge && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-warning-muted border border-warning-border text-warning text-xs font-bold">
                <Star size={12} className="fill-warning" />
                {hotel.category_badge}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Unified Sticky Search Bar + Nav — Full Width */}
      <div className="sticky top-0 z-[var(--z-sticky)] bg-background/80 backdrop-blur-sm border-b border-border/30">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-2">
          <AvailabilitySearchBar 
            sticky 
            rooms={hotel.rooms || []} 
            navSections={navSections}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 pt-8">

        {/* Two-column layout: main + sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Main column */}
          <div className="lg:col-span-2 space-y-8">

            {/* Rooms List */}
            <div id="rooms-section">
              <SectionHeader
                title="Habitaciones Disponibles"
                subtitle={isSearchingDates
                  ? `${availableRooms.length} de ${(hotel.rooms || []).length} unidades para tus fechas`
                  : `Explora nuestras ${(hotel.rooms || []).length} unidades`}
              />
              <div className="mt-6">
                <RoomsListWithFilters
                  rooms={hotel.rooms || []}
                  availableRooms={availableRooms}
                  slug={slug}
                  checkin={checkin ?? null}
                  checkout={checkout ?? null}
                  adults={adults ?? null}
                  children={children ?? null}
                  isSearchingDates={isSearchingDates}
                  hotel={{ cancellation_policy: hotel.cancellation_policy }}
                />
              </div>
            </div>

            {/* Reviews Section */}
            <div id="reviews-section">
              <Suspense fallback={<ReviewSkeleton />}>
                <ReviewsSection hotelId={hotel.id} hotelName={hotel.name} />
              </Suspense>
            </div>

            {/* Hotel Info Section */}
            <div id="info-section">
              <Suspense fallback={<MapSkeleton />}>
                <HotelInfoSection
                  hotelName={hotel.name}
                  location={hotel.location}
                  address={hotel.address}
                  phone={hotel.phone}
                  googleMapsUrl={hotel.google_maps_url}
                  cancellationPolicy={hotel.cancellation_policy}
                  checkInTime={hotel.check_in_time}
                  checkOutTime={hotel.check_out_time}
                  receptionHours={hotel.reception_hours}
                />
              </Suspense>
            </div>
          </div>

          {/* Sidebar — Booking Widget (desktop only) */}
          <aside className="hidden lg:block">
            <BookingWidget
              hotelName={hotel.name}
              rooms={hotel.rooms || []}
              checkIn={checkin ?? null}
              checkOut={checkout ?? null}
              adults={adults ?? null}
              children={children ?? null}
              cancellationPolicy={hotel.cancellation_policy}
              totalRooms={(hotel.rooms || []).length}
            />
          </aside>
        </div>
      </div>

      {/* Mobile Sticky CTA */}
      <MobileStickyCta
        minPrice={minPrice}
        availableCount={availableRooms.length}
        checkIn={checkin ?? null}
        checkOut={checkout ?? null}
      />
    </main>
  );
}
