import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { notFound as nextNotFound } from 'next/navigation';
import { MapPin, CalendarDays, KeyRound, Users, Star, ShieldCheck, Zap } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

interface HotelShowcasePageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

const isValidDateISO = (dateStr: string) => /^\d{4}-\d{2}-\d{2}$/.test(dateStr);

export default async function HotelShowcasePage({ params, searchParams }: HotelShowcasePageProps) {
  const { slug } = await params;
  const resolvedParams = await searchParams;

  const checkin = typeof resolvedParams.checkin === 'string' ? resolvedParams.checkin : null;
  const checkout = typeof resolvedParams.checkout === 'string' ? resolvedParams.checkout : null;

  // 1. Instanciación segura del cliente de Supabase (Lado Servidor)
  const supabase = await createClient();

  // --- INICIO DEL BLOQUE INSTRUMENTADO ---
  const { data: hotel, error: hotelError } = await supabase
    .from('hotels')
    .select('id, name, primary_color, cancellation_policy')
    .eq('slug', slug)
    .single();

  if (hotelError) console.error("[AUDITORIA CHECKOUT] Error crítico en Hotel:", hotelError);
  
  if (!hotel) {
    console.error(`[AUDITORIA CHECKOUT] Abortando: Hotel no encontrado para el slug "${slug}"`);
    notFound();
  }

  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select('id, name, price')
    .eq('id', roomId)
    .eq('hotel_id', hotel.id)
    .single();

  if (roomError) console.error("[AUDITORIA CHECKOUT] Error crítico en Habitación:", roomError);
  
  if (!room) {
    console.error(`[AUDITORIA CHECKOUT] Abortando: Habitación no encontrada para id "${roomId}"`);
    notFound();
  }
  // --- FIN DEL BLOQUE INSTRUMENTADO ---

  // 3. Consulta 2: Obtener Habitaciones disponibles del Hotel
  const { data: rooms, error: roomsError } = await supabase
    .from('rooms')
    .select('id, hotel_id, name, price, capacity, status, gallery, description')
    .eq('hotel_id', hotel.id)
    .eq('status', 'active') // Alineado con el esquema real de la BD
    .order('price', { ascending: true }); // Ordenar por precio más bajo

  if (roomsError) {
    console.error("[CRITICAL] Error fetching rooms:", roomsError);
  }

  // 🛡️ AUDITORÍA DE DEUDA TÉCNICA: Unsplash 404 erradicado. Usamos UI vectorial como respaldo.
  const hotelCoverImage = hotel.cover_photo_url || hotel.main_image_url;

  // Configuración de fechas Happy Path para el botón de reserva (Hoy y Mañana)
  const todayISO = new Date().toISOString().split('T')[0];
  const tomorrowObj = new Date();
  tomorrowObj.setDate(tomorrowObj.getDate() + 1);
  const tomorrowISO = tomorrowObj.toISOString().split('T')[0];

  return (
    <div className="min-h-screen bg-slate-50 selection:bg-hospeda-200 selection:text-hospeda-900 pb-24">
      
      {/* SECCIÓN 1: Hero & Cover Photo */}
      <div className="relative h-[40vh] md:h-[50vh] bg-slate-900 overflow-hidden">
        {hotelCoverImage ? (
          <Image 
            src={hotelCoverImage} 
            alt={hotel.name} 
            fill 
            className="object-cover opacity-60" 
            priority
          />
        ) : (
          // 🛡️ UI Vectorial: Reemplaza Unsplash externo roto por degradado local.
          <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center">
             <Star size={48} className="text-slate-500" strokeWidth={1}/>
          </div>
        )}
        
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
        
        <div className="absolute bottom-0 left-0 right-0 max-w-7xl mx-auto px-6 py-10 text-white">
          <div className="flex items-center gap-3 mb-3">
             <Zap size={20} className="text-emerald-400" />
             <span className="text-xs font-bold uppercase tracking-widest text-emerald-300">Reserva Directa</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold font-display leading-tight">{hotel.name}</h1>
          <div className="flex items-center gap-2 text-slate-300 mt-4 text-sm">
            <MapPin size={16} className="text-hospeda-400" />
            <span>{hotel.address || hotel.location || 'Ubicación céntrica'}</span>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 grid grid-cols-1 lg:grid-cols-12 gap-12">
        
        {/* SECCIÓN 2: Detalles del Hotel & Amenities (col-span-8) */}
        <div className="lg:col-span-8 space-y-10">
          
          <section className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
            <h2 className="text-2xl font-bold text-slate-800 mb-5">Sobre el Hotel</h2>
            <p className="text-slate-600 leading-relaxed text-sm whitespace-pre-line">
              {hotel.description || `Bienvenido a ${hotel.name}, donde la comodidad y el servicio excepcional te esperan.`}
            </p>
            
            {hotel.hotel_amenities && hotel.hotel_amenities.length > 0 && (
              <div className="mt-8 pt-8 border-t border-slate-100">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-5">Amenidades Destacadas</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {hotel.hotel_amenities.map((amenity: string, index: number) => (
                    <div key={index} className="flex items-center gap-3 bg-slate-50 p-4 rounded-xl text-slate-700 text-sm border border-slate-100">
                      <ShieldCheck size={18} className="text-emerald-500 shrink-0" />
                      <span className="font-medium">{amenity}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* SECCIÓN 3: Lista de Habitaciones Disponibles */}
          <section>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-extrabold text-slate-900">Habitaciones Disponibles</h2>
              <span className="text-slate-500 font-medium">{rooms?.length || 0} opciones encontradas</span>
            </div>

            <div className="space-y-6">
              {rooms && rooms.length > 0 ? (
                rooms.map(room => {
                  
                  // 🛡️ BLINDAJE DE PRECIOS: Recálculo Server-Side con fallback tolerante.
                  const pricePerNight = Number(room.price || room.price_per_night || 0);

                  return (
                    <div key={room.id} className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col md:flex-row gap-6 group hover:border-slate-200 hover:shadow-lg transition-all duration-300">
                      
                      {/* Imagen de la Habitación (con Fallback Vectorial 404) */}
                      <div className="relative w-full md:w-64 h-48 rounded-2xl overflow-hidden shrink-0 bg-slate-100">
                        {room.gallery && room.gallery.length > 0 ? (
                          <Image
                            src={room.gallery[0].url || room.gallery[0]} // Soporte para array de objetos o strings
                            alt={room.name}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          // 🛡️ UI Vectorial Seguro: Erradica Unsplash externo roto. Latencia de red 0ms.
                          <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center">
                            <KeyRound size={48} className="text-slate-400" strokeWidth={1} />
                            <span className="absolute bottom-4 text-slate-400 font-bold uppercase tracking-widest text-xs">Sin Foto</span>
                          </div>
                        )}
                      </div>

                      {/* Detalles & Precio */}
                      <div className="flex-grow flex flex-col justify-between py-1">
                        <div>
                          <h4 className="text-xl font-bold text-slate-800 group-hover:text-hospeda-700">{room.name}</h4>
                          <div className="flex items-center gap-4 text-sm text-slate-500 mt-2 mb-4">
                            <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1 rounded-full text-xs font-medium">
                              <Users size={14} /> {room.capacity || 2} personas
                            </div>
                          </div>
                          <p className="text-slate-600 text-sm leading-relaxed line-clamp-2">{room.description || 'Una habitación acogedora lista para tu estadía.'}</p>
                        </div>
                        
                        <div className="flex items-end justify-between gap-4 mt-6 border-t border-slate-100 pt-5">
                          <div>
                            <p className="text-xs text-slate-400 font-medium">Precio por noche</p>
                            <p className="text-3xl font-black text-slate-900 leading-none mt-1">
                                ${pricePerNight.toLocaleString('es-CO')} <span className="text-sm font-medium text-slate-500">COP</span>
                            </p>
                          </div>
                          <Link 
                            // ⚡ Happy Path: Reserva con fechas por defecto si no hay searchParams.
                            href={`/book/${slug}/checkout?room=${room.id}&checkin=${checkin || todayISO}&checkout=${checkout || tomorrowISO}`}
                            style={{ backgroundColor: hotel.primary_color || '#0ea5e9' }}
                            className="px-8 py-4 rounded-xl text-white font-bold flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-md shadow-black/10 text-sm"
                          >
                             Reservar <CalendarDays size={18} />
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="bg-white rounded-3xl p-16 text-center shadow-sm border border-slate-100 flex flex-col items-center">
                   <KeyRound size={56} className="text-slate-300 mb-6" strokeWidth={1}/>
                   <h3 className="text-xl font-bold text-slate-700">No hay habitaciones disponibles</h3>
                   <p className="text-slate-500 mt-2 text-sm max-w-sm">Lo sentimos, no encontramos inventario para este hotel en este momento.</p>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* SECCIÓN 4: Sidebar/Widget de Búsqueda (col-span-4) -> Placeholder para tu BookingWidget */}
        <div className="lg:col-span-4 sticky top-10 h-fit space-y-6">
           <div className="bg-white p-8 rounded-[2rem] shadow-lg shadow-black/5 border border-slate-100">
             <div className="flex items-center gap-3 mb-6">
                <CalendarDays size={24} className="text-hospeda-500" />
                <h3 className="text-lg font-bold text-slate-800">Selecciona tus Fechas</h3>
             </div>
             {/* TODO: Antonio, aquí debes insertar tu <BookingWidget /> 
                 pasándole el primary_color={hotel.primary_color} y el hotel_id={hotel.id}.
                 Por el momento, el botón "Reservar" de cada habitación funciona.
             */}
             <div className="p-10 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 text-sm text-slate-500">
                 [ BookingWidget Placeholder ]
                 <p className="text-xs mt-2 text-slate-400">Inserta aquí el componente de fechas.</p>
             </div>
           </div>
        </div>

      </main>
    </div>
  );
}