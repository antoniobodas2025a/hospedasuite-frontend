import { getHotelDetailsBySlugAction, getReviewStatsAction } from '@/app/actions/ota';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { MapPin, ShieldCheck, Star, CheckCircle2, Calendar, X, Flame } from 'lucide-react';
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
import StickySubNav from '@/components/ota/StickySubNav';
import { SectionHeader } from '@/components/ui/glass';
import { Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { springSnappy, springGentle } from '@/lib/mac2026/spring';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

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
    <main className="min-h-screen bg-background text-foreground pb-24 font-sans selection:bg-brand-500/30">
      
      {/* SEO Structured Data */}
      <HotelJsonLd hotel={hotel} reviewStats={reviewStats ?? undefined} />

      {/* Componente Cliente (Modal) Aislado por Suspense */}
      <Suspense fallback={null}>
        <RoomShowcaseModal hotel={hotel} />
      </Suspense>

      {/* 🖼️ HERO GALLERY — Grid interactivo estilo Airbnb */}
      <HeroGallery images={hotelGalleryImages} hotelName={hotel.name} />

      {/* BREADCRUMB — Navegacion contextual (oculto temporalmente) */}
      {false && (
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
      )}

      {/* 📍 HEADER DE INFORMACIÓN */}
      <div className="max-w-6xl mx-auto px-6 pt-8">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div className="flex items-start gap-4">
            {/* Logo del hotel */}
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

      {/* STICKY SUB-NAV — Anchor links con Mac 2026 glassmorphism */}
      <div className="mt-8">
        <StickySubNav
          sections={[
            { id: 'amenities', label: 'Amenidades' },
            { id: 'rooms', label: 'Habitaciones' },
            { id: 'story', label: 'La Historia' },
            { id: 'reviews', label: 'Opiniones' },
            { id: 'location', label: 'Ubicacion' },
          ]}
        />
      </div>

      <div className="max-w-6xl mx-auto px-6 mt-8">
        
        {/* BARRA DE BÚSQUEDA INTERACTIVA */}
        <div id="search-bar" className={`transition-all duration-500 ${isSearchingDates ? 'mb-6' : 'mb-12'}`}>
          <AvailabilitySearchBar />
        </div>

        {/* MAC 2026 — Predictive UI: Dates Chip morph
            When dates are selected, a compact chip appears showing the range.
            This creates visual continuity between search and results. */}
        <AnimatePresence>
          {isSearchingDates && checkin && checkout && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={springSnappy()}
              className="flex items-center gap-3 mb-6"
            >
              <div className="glass-pill px-4 py-2 flex items-center gap-3">
                <Calendar size={14} className="text-brand-500" />
                <span className="text-sm font-bold text-foreground">
                  {format(parseISO(checkin), "dd MMM", { locale: es })} — {format(parseISO(checkout), "dd MMM", { locale: es })}
                </span>
                <span className="text-xs text-muted-foreground">
                  · {Math.ceil((parseISO(checkout).getTime() - parseISO(checkin).getTime()) / (1000 * 60 * 60 * 24))} noche{Math.ceil((parseISO(checkout).getTime() - parseISO(checkin).getTime()) / (1000 * 60 * 60 * 24)) !== 1 ? 's' : ''}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* MAC 2026 — Contextual Awareness: 
            When dates are selected, Amenities/Story move below rooms.
            Rooms section becomes the primary focus. */}
        <div className={`grid gap-[var(--space-pause)] transition-all duration-500 ${isSearchingDates ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1 lg:grid-cols-2'}`}>
          
          {/* LEFT: Main content */}
          <div className={`space-y-[var(--space-pause)] ${isSearchingDates ? 'lg:col-span-2' : ''}`}>
            
            {/* AMENIDADES DEL HOTEL — Lo que ofrece la propiedad */}
            {/* Moves below rooms when searching dates */}
            {hotel.hotel_amenities && hotel.hotel_amenities.length > 0 && !isSearchingDates && (
              <div id="amenities" className="glass-card p-6 md:p-8">
                <SectionHeader title={`Lo que ofrece ${hotel.name}`} className="mb-4" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {hotel.hotel_amenities.map((amenity: string) => {
                    const { icon: Icon, label } = getAmenityById(amenity);
                    return (
                      <div key={amenity} className="flex items-center gap-2.5 p-3 rounded-[var(--radius-squircle-lg)] bg-muted border border-border">
                        <Icon size={16} className="text-brand-500 shrink-0" />
                        <span className="text-xs font-medium text-foreground/80">{label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* SEPARADOR + HABITACIONES — El producto primero */}
            <div id="rooms" className="flex items-center gap-4 pt-4">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
              <Star size={14} className="text-warm-400 fill-warm-400" />
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pt-4">
              <h2 className="text-3xl font-black text-foreground tracking-tight">
                {isSearchingDates ? 'Inventario Disponible' : 'Nuestras Unidades'}
              </h2>
              {isSearchingDates && (
                <span className="text-xs font-bold text-success bg-success-muted border border-success-border px-4 py-1.5 rounded-full uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
                  <CheckCircle2 className="size-4" /> Fechas Confirmadas
                </span>
              )}
            </div>

            {/* ACTIVIDAD RECIENTE — Urgencia social (configurable desde dashboard) */}
            {isSearchingDates && hotel.show_recent_activity !== false && (
              <RecentActivity messages={hotel.recent_activity_messages} />
            )}

            {/* MAC 2026 — Contextual Urgency Banner
                When availability is critically low, show a prominent banner */}
            {isSearchingDates && availableRooms.length > 0 && availableRooms.length <= 2 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, ...springSnappy() }}
                className="glass-card p-4 border-destructive/20 bg-destructive/5"
              >
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                    <Flame size={16} className="text-destructive" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-destructive">
                      {availableRooms.length === 1 ? 'Solo queda 1 unidad disponible' : `Solo quedan ${availableRooms.length} unidades disponibles`}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Estas fechas tienen alta demanda. Te recomendamos reservar ahora.
                    </p>
                  </div>
                </div>
              </motion.div>
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

            {/* AMENIDADES DEL HOTEL — Moves here when searching dates */}
            {hotel.hotel_amenities && hotel.hotel_amenities.length > 0 && isSearchingDates && (
              <div id="amenities" className="glass-card p-6 md:p-8">
                <SectionHeader title={`Lo que ofrece ${hotel.name}`} className="mb-4" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {hotel.hotel_amenities.map((amenity: string) => {
                    const { icon: Icon, label } = getAmenityById(amenity);
                    return (
                      <div key={amenity} className="flex items-center gap-2.5 p-3 rounded-[var(--radius-squircle-lg)] bg-muted border border-border">
                        <Icon size={16} className="text-brand-500 shrink-0" />
                        <span className="text-xs font-medium text-foreground/80">{label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* LA HISTORIA — Narrativa emocional (despues del producto) */}
            <div id="story" className="glass-card p-8 md:p-10">
              <SectionHeader title={hotel.story_section_title || 'La Historia'} className="mb-4" />
              <p className="text-muted-foreground leading-relaxed text-base font-lora italic mb-6">
                {hotel.description || `Bienvenido a ${hotel.name}. Una joya en el corazon de ${hotel.location}.`}
              </p>
              {/* Micro-stats para generar confianza */}
              {hotel.show_trust_badges !== false && (
                <div className="flex flex-wrap gap-6 pt-6 border-t border-border/50">
                  <div className="flex items-center gap-2">
                    <div className="size-8 rounded-[var(--radius-squircle-md)] bg-success/10 border border-success/15 flex items-center justify-center">
                      <CheckCircle2 size={14} className="text-success" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">{hotel.trust_badge_1_title || 'Reserva Directa'}</p>
                      <p className="text-[10px] text-muted-foreground">{hotel.trust_badge_1_subtitle || 'Sin intermediarios'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="size-8 rounded-[var(--radius-squircle-md)] bg-trust-muted border border-trust-border flex items-center justify-center">
                      <ShieldCheck size={14} className="text-trust" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">{hotel.trust_badge_2_title || 'Confirmacion Inmediata'}</p>
                      <p className="text-[10px] text-muted-foreground">{hotel.trust_badge_2_subtitle || 'Bloqueo al instante'}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* REVIEWS — Opiniones de huespedes + Formulario */}
            <div id="reviews" className="space-y-[var(--space-breath)]">
              {/* Review summary — Social proof cuantificable arriba de las reviews */}
              {reviewStats && reviewStats.total > 0 && (
                <div className="glass-card p-6 md:p-8">
                  <SectionHeader title="Opiniones de Huespedes" className="mb-4" />
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <div className="text-5xl font-black text-foreground tracking-tight">{reviewStats.overall}</div>
                      <div className="flex items-center gap-1 mt-1 justify-center">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={16}
                            className={star <= Math.round(reviewStats.overall) ? 'fill-warm-400 text-warm-400' : 'text-muted-foreground/30'}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{reviewStats.total} opiniones</p>
                    </div>
                    <div className="flex-1 space-y-1.5">
                      {Object.entries(reviewStats.breakdown ?? {}).reverse().map(([score, count]) => {
                        const total = reviewStats.total;
                        const pct = total > 0 ? ((count as number) / total) * 100 : 0;
                        return (
                          <div key={score} className="flex items-center gap-2 text-xs">
                            <span className="w-3 text-right font-bold text-foreground">{score}</span>
                            <Star size={10} className="fill-warm-400 text-warm-400 shrink-0" />
                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-warm-400 rounded-full transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="w-6 text-right text-muted-foreground">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              <Suspense fallback={<div className="glass-card p-6 md:p-8 space-y-6"><ReviewSkeleton /><ReviewSkeleton /><ReviewSkeleton /></div>}>
                <ReviewsSection hotelId={hotel.id} hotelName={hotel.name} />
              </Suspense>
            </div>

            {/* REVIEW FORM — Submit a review */}
            <ReviewForm hotelId={hotel.id} hotelName={hotel.name} />

            {/* UBICACIÓN Y POLÍTICAS — Mapa, horarios, cancelación */}
            <Suspense fallback={<MapSkeleton />}>
              <div id="location">
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
              </div>
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
