import DirectBookingWidget from '@/components/direct/DirectBookingWidget';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { MapPin, CalendarDays, KeyRound, Users, Star, ShieldCheck, Zap } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

interface HotelShowcasePageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function HotelShowcasePage({ params, searchParams }: HotelShowcasePageProps) {
  const { slug } = await params;
  const resolvedParams = await searchParams;

  const checkin = typeof resolvedParams.checkin === 'string' ? resolvedParams.checkin : null;
  const checkout = typeof resolvedParams.checkout === 'string' ? resolvedParams.checkout : null;

  const supabase = await createClient();

  const { data: hotel, error: hotelError } = await supabase
    .from('hotels')
    .select('id, name, primary_color, cancellation_policy, cover_photo_url, main_image_url, address, location, description, hotel_amenities')
    .eq('slug', slug)
    .single();

  if (hotelError) console.error("[AUDITORIA CHECKOUT] Error critico en Hotel:", hotelError);

  if (!hotel) {
    console.error(`[AUDITORIA CHECKOUT] Abortando: Hotel no encontrado para el slug "${slug}"`);
    notFound();
  }

  const { data: rooms, error: roomsError } = await supabase
    .from('rooms')
    .select('id, hotel_id, name, price, price_per_night, capacity, status, gallery, description')
    .eq('hotel_id', hotel.id)
    .eq('status', 'active')
    .order('price', { ascending: true });

  if (roomsError) {
    console.error("[CRITICAL] Error fetching rooms:", roomsError);
  }

  const hotelCoverImage = hotel.cover_photo_url || hotel.main_image_url;

  const todayISO = new Date().toISOString().split('T')[0];
  const tomorrowObj = new Date();
  tomorrowObj.setDate(tomorrowObj.getDate() + 1);
  const tomorrowISO = tomorrowObj.toISOString().split('T')[0];

  return (
    <div className="min-h-screen bg-background selection:bg-brand-200 selection:text-brand-900 pb-24">

      {/* SECCION 1: Hero & Cover Photo */}
      <div className="relative h-[40vh] md:h-[50vh] bg-foreground overflow-hidden">
        {hotelCoverImage ? (
          <Image
            src={hotelCoverImage}
            alt={hotel.name}
            fill
            className="object-cover opacity-60"
            priority
          />
        ) : (
          <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-foreground/80 to-foreground flex items-center justify-center">
             <Star size={48} className="text-muted-foreground/40" strokeWidth={1}/>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-foreground via-foreground/20 to-transparent" />

        <div className="absolute bottom-0 left-0 right-0 max-w-7xl mx-auto px-6 py-10 text-white">
          <div className="flex items-center gap-3 mb-3">
             <Zap size={20} className="text-secondary" />
             <span className="text-xs font-bold uppercase tracking-widest text-secondary/80">Reserva Directa</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold font-display leading-tight">{hotel.name}</h1>
          <div className="flex items-center gap-2 text-white/70 mt-4 text-sm">
            <MapPin size={16} className="text-brand-400" />
            <span>{hotel.address || hotel.location || 'Ubicacion centrica'}</span>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 grid grid-cols-1 lg:grid-cols-12 gap-12">

        {/* SECCION 2: Detalles del Hotel & Amenities */}
        <div className="lg:col-span-8 space-y-10">

          <section className="bg-card p-8 rounded-[var(--radius-squircle-3xl)] shadow-sm border border-border">
            <h2 className="text-2xl font-bold text-foreground mb-5">Sobre el Hotel</h2>
            <p className="text-muted-foreground leading-relaxed text-sm whitespace-pre-line">
              {hotel.description || `Bienvenido a ${hotel.name}, donde la comodidad y el servicio excepcional te esperan.`}
            </p>

            {hotel.hotel_amenities && hotel.hotel_amenities.length > 0 && (
              <div className="mt-8 pt-8 border-t border-border">
                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-5">Amenidades Destacadas</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {hotel.hotel_amenities.map((amenity: string, index: number) => (
                    <div key={index} className="flex items-center gap-3 bg-muted/50 p-4 rounded-[var(--radius-squircle-lg)] text-foreground/80 text-sm border border-border">
                      <ShieldCheck size={18} className="text-secondary shrink-0" />
                      <span className="font-medium">{amenity}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* SECCION 3: Lista de Habitaciones */}
          <section>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-extrabold text-foreground">Habitaciones Disponibles</h2>
              <span className="text-muted-foreground font-medium">{rooms?.length || 0} opciones encontradas</span>
            </div>

            <div className="space-y-6">
              {rooms && rooms.length > 0 ? (
                rooms.map(room => {
                  const pricePerNight = Number(room.price || room.price_per_night || 0);

                  return (
                    <div key={room.id} className="bg-card rounded-[var(--radius-squircle-3xl)] p-5 shadow-sm border border-border flex flex-col md:flex-row gap-6 group hover:border-brand-500/30 hover:shadow-lg transition-all duration-300">

                      {/* Imagen de la Habitacion */}
                      <div className="relative w-full md:w-64 h-48 rounded-[var(--radius-squircle-2xl)] overflow-hidden shrink-0 bg-muted">
                        {room.gallery && room.gallery.length > 0 ? (
                          <Image
                            src={room.gallery[0].url || room.gallery[0]}
                            alt={room.name}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-muted to-muted/80 flex items-center justify-center">
                            <KeyRound size={48} className="text-muted-foreground/40" strokeWidth={1} />
                            <span className="absolute bottom-4 text-muted-foreground/60 font-bold uppercase tracking-widest text-xs">Sin Foto</span>
                          </div>
                        )}
                      </div>

                      {/* Detalles & Precio */}
                      <div className="flex-grow flex flex-col justify-between py-1">
                        <div>
                          <h4 className="text-xl font-bold text-foreground group-hover:text-brand-700">{room.name}</h4>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2 mb-4">
                            <div className="flex items-center gap-1.5 bg-muted/50 px-3 py-1 rounded-full text-xs font-medium">
                              <Users size={14} /> {room.capacity || 2} personas
                            </div>
                          </div>
                          <p className="text-muted-foreground text-sm leading-relaxed line-clamp-2">{room.description || 'Una habitacion acogedora lista para tu estadia.'}</p>
                        </div>

                        <div className="flex items-end justify-between gap-4 mt-6 border-t border-border pt-5">
                          <div>
                            <p className="text-xs text-muted-foreground font-medium">Precio por noche</p>
                            <p className="text-3xl font-black text-foreground leading-none mt-1">
                                ${pricePerNight.toLocaleString('es-CO')} <span className="text-sm font-medium text-muted-foreground">COP</span>
                            </p>
                          </div>
                          <Link
                            href={`/book/${slug}/checkout?room=${room.id}&checkin=${checkin || todayISO}&checkout=${checkout || tomorrowISO}`}
                            style={{ backgroundColor: hotel.primary_color || '#0ea5e9' }}
                            className="px-8 py-4 rounded-[var(--radius-squircle-lg)] text-white font-bold flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-cta text-sm"
                          >
                             Reservar <CalendarDays size={18} />
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="bg-card rounded-[var(--radius-squircle-3xl)] p-16 text-center shadow-sm border border-border flex flex-col items-center">
                   <KeyRound size={56} className="text-muted-foreground/40 mb-6" strokeWidth={1}/>
                   <h3 className="text-xl font-bold text-foreground/80">No hay habitaciones disponibles</h3>
                   <p className="text-muted-foreground mt-2 text-sm max-w-sm">Lo sentimos, no encontramos inventario para este hotel en este momento.</p>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* SECCION 4: Sidebar/Widget de Busqueda */}
        <div className="lg:col-span-4 sticky top-10 h-fit space-y-6">
           <DirectBookingWidget
             hotelName={hotel.name}
             rooms={rooms || []}
             checkIn={checkin}
             checkOut={checkout}
             cancellationPolicy={hotel.cancellation_policy}
           />
        </div>

      </main>
    </div>
  );
}
