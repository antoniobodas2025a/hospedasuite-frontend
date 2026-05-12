import { getHotelDetailsBySlugAction, getReviewStatsAction } from '@/app/actions/ota';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { MapPin, ShieldCheck, Star, CheckCircle2 } from 'lucide-react';
import { getAmenityById } from '@/lib/amenity-registry';
import type { Metadata } from 'next';
import { RoomShowcaseModal } from '@/components/ota/RoomShowcaseModal'; 
import AvailabilitySearchBar from '@/components/ota/AvailabilitySearchBar'; 
import RoomCard from '@/components/ota/RoomCard'; 
import HeroGallery from '@/components/ota/HeroGallery';
import BookingWidget from '@/components/ota/BookingWidget';
import ReviewsSection from '@/components/ota/ReviewsSection';
import ReviewForm from '@/components/ota/ReviewForm';
import HotelInfoSection from '@/components/ota/HotelInfoSection';
import MobileStickyCta from '@/components/ota/MobileStickyCta';
import RecentActivity from '@/components/ota/RecentActivity';
import RoomsListWithFilters from '@/components/ota/RoomsListWithFilters';
import HotelJsonLd from '@/components/seo/HotelJsonLd';
import RoomCardSkeleton from '@/components/ota/RoomCardSkeleton';
import ReviewSkeleton from '@/components/ota/ReviewSkeleton';
import MapSkeleton from '@/components/ota/MapSkeleton';
import { Suspense } from 'react';

// Mandato de renderizado dinámico para control de inventario en tiempo real
export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | undefined }>;
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
  // Resolución asíncrona de parámetros para compatibilidad con Next.js 15
  const { slug } = await params;

  // 🛡️ GUARDA TEMPRANA: slugs inválidos no llegan a la DB
  if (!slug || slug === 'null' || slug.length < 2) notFound();

  const resolvedSearchParams = await searchParams;
  
  const checkin = resolvedSearchParams?.checkin;
  const checkout = resolvedSearchParams?.checkout;
  const adults = resolvedSearchParams?.adults;
  const children = resolvedSearchParams?.children;
  
  // 1. Extracción y normalización de la demanda de ocupación
  const selectedAdults = Number(adults) || 1;
  const selectedChildren = Number(children) || 0;
  const totalRequiredGuests = selectedAdults + selectedChildren;

  // Consulta topológica a la BD
  const { success, hotel } = await getHotelDetailsBySlugAction(slug, checkin, checkout);

  if (!success || !hotel) notFound(); 

  // Fetch review stats for structured data (non-blocking)
  const reviewStatsResult = await getReviewStatsAction(hotel.id);
  const reviewStats = reviewStatsResult.success ? reviewStatsResult.data : null;

  // 2. Aplicacion del Filtro de Integridad Fisica (Filtro Pax)
  // Certificamos que la habitación solo sea visible si puede alojar al total de huéspedes.
  const availableRooms = (hotel.rooms || []).filter((room: any) => {
    const isActive = room.status === 'active';
    const hasCapacity = Number(room.capacity ?? 0) >= totalRequiredGuests;
    return isActive && hasCapacity;
  });

  const isSearchingDates = !!(checkin && checkout);
  const coverImage = hotel.main_image_url || 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb';

  // Galería del hotel — hero + secundaria + galería completa
  const hotelGalleryImages = [
    { url: coverImage, alt: hotel.name },
    ...(hotel.cover_photo_url && hotel.cover_photo_url !== coverImage
      ? [{ url: hotel.cover_photo_url, alt: `${hotel.name} — vista general` }]
      : []),
    ...(Array.isArray(hotel.gallery_urls)
      ? hotel.gallery_urls.map((url: string, i: number) => ({ url, alt: `${hotel.name} — foto ${i + 3}` }))
      : []),
  ];

  // Iconos de amenidades del hotel — fuente unica de verdad
  // Ver src/lib/amenity-registry.ts para el catalogo completo

  return (
    <main className="min-h-screen bg-background text-foreground pb-24 font-poppins selection:bg-brand-500/30">
      
      {/* SEO Structured Data */}
      <HotelJsonLd hotel={hotel} reviewStats={reviewStats ?? undefined} />

      {/* Componente Cliente (Modal) Aislado por Suspense */}
      <Suspense fallback={null}>
        <RoomShowcaseModal hotel={hotel} />
      </Suspense>

      {/* 🖼️ HERO GALLERY — Grid interactivo estilo Airbnb */}
      <HeroGallery images={hotelGalleryImages} hotelName={hotel.name} />

      {/* BREADCRUMB — Navegacion contextual */}
      <div className="max-w-6xl mx-auto px-6 pt-6">
        <nav className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link href="/" className="hover:text-foreground transition-colors">Inicio</Link>
          <span>/</span>
          {hotel.location && (
            <>
              <span className="text-muted-foreground">{hotel.location}</span>
              <span>/</span>
            </>
          )}
          <span className="text-foreground font-medium">{hotel.name}</span>
        </nav>
      </div>

      {/* 📍 HEADER DE INFORMACIÓN */}
      <div className="max-w-6xl mx-auto px-6 pt-8">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div className="flex items-start gap-4">
            {/* Logo del hotel */}
            {hotel.logo_url ? (
              <div className="size-16 md:size-20 rounded-2xl overflow-hidden border border-border bg-card shadow-sm shrink-0">
                <Image src={hotel.logo_url} alt={`${hotel.name} logo`} width={80} height={80} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="size-16 md:size-20 rounded-2xl bg-gradient-to-br from-brand-500 to-warm-600 flex items-center justify-center text-primary-foreground font-black text-2xl shadow-sm shrink-0">
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
          <div className="flex items-center gap-2">
            {hotel.category_badge && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold">
                <Star size={12} className="fill-amber-500" />
                {hotel.category_badge}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 mt-8">
        
        {/* BARRA DE BÚSQUEDA INTERACTIVA */}
        <div id="search-bar" className="mb-12">
          <AvailabilitySearchBar />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          
          <div className="lg:col-span-2 space-y-10">
            
            {/* AMENIDADES DEL HOTEL — Lo que ofrece la propiedad */}
            {hotel.hotel_amenities && hotel.hotel_amenities.length > 0 && (
              <div className="bg-card/60 backdrop-blur-xl p-6 md:p-8 rounded-[2rem] shadow-sm border border-border/40">
                <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-brand-400" />
                  Lo que ofrece {hotel.name}
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {hotel.hotel_amenities.map((amenity: string) => {
                    const { icon: Icon, label } = getAmenityById(amenity);
                    return (
                      <div key={amenity} className="flex items-center gap-2.5 p-3 rounded-xl bg-muted border border-border">
                        <Icon size={16} className="text-brand-500 shrink-0" />
                        <span className="text-xs font-medium text-foreground/80">{label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* LA HISTORIA — Narrativa emocional */}
            <div className="bg-white/40 backdrop-blur-xl p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-white/30">
              <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-warm-400" />
                {hotel.story_section_title || 'La Historia'}
              </h2>
              <p className="text-muted-foreground leading-relaxed text-base font-lora italic mb-6">
                {hotel.description || `Bienvenido a ${hotel.name}. Una joya en el corazon de ${hotel.location}.`}
              </p>
              {/* Micro-stats para generar confianza */}
              {hotel.show_trust_badges !== false && (
                <div className="flex flex-wrap gap-6 pt-6 border-t border-border/50">
                  <div className="flex items-center gap-2">
                    <div className="size-8 rounded-lg bg-emerald-500/10 border border-emerald-500/15 flex items-center justify-center">
                      <CheckCircle2 size={14} className="text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">{hotel.trust_badge_1_title || 'Reserva Directa'}</p>
                      <p className="text-[10px] text-muted-foreground">{hotel.trust_badge_1_subtitle || 'Sin intermediarios'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="size-8 rounded-lg bg-indigo-500/10 border border-indigo-500/15 flex items-center justify-center">
                      <ShieldCheck size={14} className="text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">{hotel.trust_badge_2_title || 'Confirmacion Inmediata'}</p>
                      <p className="text-[10px] text-muted-foreground">{hotel.trust_badge_2_subtitle || 'Bloqueo al instante'}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* SEPARADOR + HABITACIONES — El producto primero */}
            <div className="flex items-center gap-4 pt-4">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
              <Star size={14} className="text-warm-400 fill-warm-400" />
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pt-4">
              <h3 className="text-3xl font-black text-foreground tracking-tight">
                {isSearchingDates ? 'Inventario Disponible' : 'Nuestras Unidades'}
              </h3>
              {isSearchingDates && (
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-4 py-1.5 rounded-full uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
                  <CheckCircle2 className="size-4" /> Fechas Confirmadas
                </span>
              )}
            </div>

            {/* ACTIVIDAD RECIENTE — Urgencia social (configurable desde dashboard) */}
            {isSearchingDates && hotel.show_recent_activity !== false && (
              <RecentActivity messages={hotel.recent_activity_messages} />
            )}

            {/* FILTROS DE HABITACIONES + LISTADO */}
            <Suspense fallback={<div className="space-y-6"><RoomCardSkeleton /><RoomCardSkeleton /></div>}>
              <RoomsListWithFilters
                rooms={hotel.rooms || []}
                availableRooms={availableRooms}
                slug={slug}
                checkin={checkin}
                checkout={checkout}
                adults={adults}
                children={children}
                isSearchingDates={isSearchingDates}
              />
            </Suspense>

            {/* REVIEWS — Opiniones de huespedes + Formulario */}
            <Suspense fallback={<div className="bg-card/60 backdrop-blur-xl p-6 md:p-8 rounded-[2rem] shadow-sm border border-border/40 space-y-6"><ReviewSkeleton /><ReviewSkeleton /><ReviewSkeleton /></div>}>
              <ReviewsSection hotelId={hotel.id} hotelName={hotel.name} />
            </Suspense>

            {/* REVIEW FORM — Submit a review */}
            <ReviewForm hotelId={hotel.id} hotelName={hotel.name} />

            {/* UBICACIÓN Y POLÍTICAS — Mapa, horarios, cancelación */}
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

          {/* BOOKING WIDGET — Motor de conversión */}
          <div className="hidden lg:block relative z-10">
            <BookingWidget
              hotelName={hotel.name}
              rooms={hotel.rooms || []}
              checkIn={checkin}
              checkOut={checkout}
              adults={adults}
              children={children}
              cancellationPolicy={hotel.cancellation_policy}
              totalRooms={(hotel.rooms || []).length}
            />
          </div>

        </div>
      </div>

      {/* STICKY CTA MOBILE — Barra inferior con precio + reservar */}
      <MobileStickyCta
        minPrice={(() => {
          const active = (hotel.rooms || []).filter((r: any) => r.status === 'active');
          return active.length > 0 ? Math.min(...active.map((r: any) => r.price)) : 0;
        })()}
        availableCount={availableRooms.length}
        checkIn={checkin}
        checkOut={checkout}
      />
    </main>
  );
}