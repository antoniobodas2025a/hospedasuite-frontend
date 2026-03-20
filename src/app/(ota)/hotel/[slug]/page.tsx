import { getHotelDetailsBySlugAction } from '@/app/actions/ota';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { MapPin, ArrowRight, ShieldCheck, CalendarX2 } from 'lucide-react';
import type { Metadata } from 'next';
import { RoomAmenities } from '@/components/ota/RoomAmenities';
import { RoomShowcaseModal } from '@/components/ota/RoomShowcaseModal'; 
import AvailabilitySearchBar from '@/components/ota/AvailabilitySearchBar'; // 🚨 NUEVO COMPONENTE
import { Suspense } from 'react';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | undefined }>; // 🚨 NEXT.JS 15 REQUIREMENT
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const { success, hotel } = await getHotelDetailsBySlugAction(slug);
  if (!success || !hotel) return { title: 'Hotel no encontrado' };
  return {
    title: `${hotel.name} | Reserva en HospedaSuite`,
    description: `Descubre ${hotel.name} ubicado en ${hotel.location}.`,
    openGraph: { images: [hotel.main_image_url || 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb'] },
  };
}

export default async function OTAHotelDetailPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  // 🚨 Extraemos las fechas de la URL si el huésped ya buscó
  const { checkin, checkout } = await searchParams;
  
  // 🚨 Pasamos las fechas al motor SQL. Él hará la magia.
  const { success, hotel } = await getHotelDetailsBySlugAction(slug, checkin, checkout);

  if (!success || !hotel) notFound(); 

  const isSearchingDates = !!(checkin && checkout);

  return (
    <main className="min-h-screen bg-slate-50 pb-20 relative">
      
      <Suspense fallback={null}>
        <RoomShowcaseModal hotel={hotel} />
      </Suspense>

      <div className="relative h-[50vh] min-h-[400px] w-full">
        <Image src={hotel.main_image_url || 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb'} alt={hotel.name} fill className="object-cover" priority />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 max-w-7xl mx-auto px-6 pb-24">
          <h1 className="text-5xl md:text-6xl font-display font-bold text-white mb-2 shadow-sm">{hotel.name}</h1>
          <div className="flex items-center gap-2 text-slate-300 font-medium">
            <MapPin size={18} className="text-hospeda-400" /> {hotel.location}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        {/* 🚨 LA BARRA DE BÚSQUEDA INTERACTIVA */}
        <AvailabilitySearchBar />
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-12">
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
              <h2 className="text-2xl font-bold text-slate-800 mb-4">Acerca de la propiedad</h2>
              <p className="text-slate-600 leading-relaxed">{hotel.description || `Bienvenido a ${hotel.name}. Disfruta de una experiencia inolvidable en nuestras instalaciones de primera categoría.`}</p>
            </div>

            <div className="flex justify-between items-end pt-4">
              <h3 className="text-3xl font-display font-bold text-slate-800">
                {isSearchingDates ? 'Habitaciones Disponibles' : 'Nuestras Habitaciones'}
              </h3>
              {isSearchingDates && (
                <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                  Para tus fechas
                </span>
              )}
            </div>
            
            <div className="space-y-6">
              {hotel.rooms?.length === 0 ? (
                <div className="bg-white p-12 rounded-[2rem] border border-slate-100 text-center flex flex-col items-center justify-center">
                   <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                     <CalendarX2 size={32} className="text-slate-400" />
                   </div>
                   <h4 className="text-xl font-bold text-slate-800 mb-2">¡Ups! Todo está agotado</h4>
                   <p className="text-slate-500">No hay habitaciones disponibles para las fechas seleccionadas. Intenta cambiar tu búsqueda.</p>
                </div>
              ) : (
                hotel.rooms?.map((room: any) => (
                  <div key={room.id} className="bg-white p-6 rounded-[2rem] shadow-sm flex flex-col sm:flex-row gap-6 group hover:shadow-md transition-shadow">
                    <div className="w-full sm:w-48 h-48 bg-slate-100 rounded-2xl relative overflow-hidden shrink-0">
                      <Image src={(room.gallery && room.gallery.length > 0) ? room.gallery[0].url : 'https://images.unsplash.com/photo-1611892440504-42a792e24d32'} alt={room.name} fill className="object-cover transition-transform duration-500 group-hover:scale-105" />
                    </div>
                    <div className="flex-1 flex flex-col">
                      <div className="flex justify-between items-start mb-4">
                        <h4 className="text-xl font-bold text-slate-800">{room.name}</h4>
                        <span className="text-xs bg-slate-100 text-slate-600 font-bold px-3 py-1 rounded-full">
                           Hasta {room.capacity} Pax
                        </span>
                      </div>
                      
                      <div className="mb-6">
                        <RoomAmenities amenities={room.amenities || []} />
                      </div>

                      <div className="mt-auto pt-6 flex items-end justify-between border-t border-slate-50">
                        <div>
                          <p className="text-xs text-slate-400 font-bold uppercase">Desde</p>
                          <p className="text-2xl font-display font-bold text-slate-800">${(room.price_per_night || room.price || 0).toLocaleString()} <span className="text-sm font-normal text-slate-500">/noche</span></p>
                        </div>

                        {/* Si ya seleccionó fechas, pasamos las fechas en la URL al modal de checkout */}
                        <Link 
                          href={`?showRoom=${room.id}${isSearchingDates ? `&checkin=${checkin}&checkout=${checkout}` : ''}`}
                          scroll={false}
                          className="bg-slate-100 text-slate-800 px-6 py-3 rounded-xl font-bold hover:bg-hospeda-900 hover:text-white transition-colors flex items-center gap-2"
                        >
                          {isSearchingDates ? 'Reservar Ahora' : 'Explorar Habitación'} <ArrowRight size={18} />
                        </Link>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="hidden lg:block">
            <div className="sticky top-24 bg-white p-8 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100">
              <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-100">
                 <p className="font-bold text-slate-800">{hotel.name}</p>
              </div>
              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-3 text-slate-600">
                  <ShieldCheck className="text-emerald-500" size={24} />
                  <span className="text-sm font-medium">Pago Seguro. Reserva confirmada al instante.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}