import { getHotelDetailsBySlugAction } from '@/app/actions/ota';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { MapPin, ShieldCheck, CalendarX2, Star, CheckCircle2, Users } from 'lucide-react';
import type { Metadata } from 'next';
import { RoomShowcaseModal } from '@/components/ota/RoomShowcaseModal'; 
import AvailabilitySearchBar from '@/components/ota/AvailabilitySearchBar'; 
import RoomCard from '@/components/ota/RoomCard'; 
import { Suspense } from 'react';

// Mandato de renderizado dinámico para control de inventario en tiempo real
export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | undefined }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const { success, hotel } = await getHotelDetailsBySlugAction(slug);
  
  if (!success || !hotel) return { title: 'Propiedad no encontrada' };
  
  return {
    title: `${hotel.name} | Reserva Oficial | HospedaSuite`,
    description: `Descubre la experiencia en ${hotel.name} ubicado en ${hotel.location}. Reserva directa al mejor precio garantizado.`,
    openGraph: { 
      images: [hotel.main_image_url || 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb'],
      title: `${hotel.name} | Experiencia de Lujo`,
    },
  };
}

export default async function OTAHotelDetailPage({ params, searchParams }: PageProps) {
  // Resolución asíncrona de parámetros para compatibilidad con Next.js 15
  const { slug } = await params;
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

  // 2. Aplicación del Filtro de Integridad Física (Filtro Pax)
  // Certificamos que la habitación solo sea visible si puede alojar al total de huéspedes.
  const availableRooms = (hotel.rooms || []).filter((room: any) => {
    const isActive = room.status === 'active';
    const hasCapacity = room.capacity >= totalRequiredGuests;
    return isActive && hasCapacity;
  });

  const isSearchingDates = !!(checkin && checkout);
  const coverImage = hotel.main_image_url || 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb';

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 pb-24 font-poppins selection:bg-indigo-500/30">
      
      {/* Componente Cliente (Modal) Aislado por Suspense */}
      <Suspense fallback={null}>
        <RoomShowcaseModal hotel={hotel} />
      </Suspense>

      {/* 🌌 HERO SECTION */}
      <div className="relative h-[65vh] min-h-[500px] w-full overflow-hidden">
        <div className="absolute inset-0">
          <Image 
            src={coverImage} 
            alt={hotel.name} 
            fill 
            className="object-cover object-center scale-105" 
            priority 
            quality={100}
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/30 to-transparent" />
        </div>

        <div className="absolute bottom-0 left-0 right-0 max-w-6xl mx-auto px-6 pb-24 z-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="bg-white/20 backdrop-blur-md border border-white/30 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
              <Star className="size-3 text-amber-400 fill-amber-400" />
              Categoría Premium
            </span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter mb-4 drop-shadow-lg">
            {hotel.name}
          </h1>
          <div className="flex items-center gap-2 text-white font-medium text-sm md:text-base bg-black/30 backdrop-blur-md w-max px-4 py-2 rounded-2xl border border-white/10 shadow-sm">
            <MapPin size={18} className="text-indigo-400" /> {hotel.location}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 relative z-20 -mt-12">
        
        {/* BARRA DE BÚSQUEDA INTERACTIVA */}
        <div className="relative z-[100] mb-16 rounded-[2rem] bg-white/90 backdrop-blur-3xl border border-slate-200/60 p-2 shadow-2xl shadow-slate-200/50 ring-1 ring-slate-900/5">
          <AvailabilitySearchBar />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          
          <div className="lg:col-span-2 space-y-10">
            
            <div className="bg-white/60 backdrop-blur-xl p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-slate-200/60">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 border-l-2 border-indigo-500 pl-3">La Experiencia</h2>
              <p className="text-slate-600 leading-relaxed text-base font-lora italic">
                {hotel.description || `Bienvenido a ${hotel.name}. Una joya en el corazón de ${hotel.location}.`}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pt-4 border-b border-slate-200 pb-6">
              <h3 className="text-3xl font-black text-slate-900 tracking-tight">
                {isSearchingDates ? 'Inventario Disponible' : 'Nuestras Unidades'}
              </h3>
              {isSearchingDates && (
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-4 py-1.5 rounded-full uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
                  <CheckCircle2 className="size-4" /> Fechas Confirmadas
                </span>
              )}
            </div>
            
            {/* ITERADOR DE INVENTARIO FILTRADO */}
            <div className="space-y-6">
              {availableRooms.length === 0 ? (
                <div className="bg-white p-16 rounded-[3rem] border border-slate-200 text-center flex flex-col items-center justify-center shadow-sm">
                   <div className="w-20 h-20 bg-slate-50 rounded-[2rem] border border-slate-100 flex items-center justify-center mb-6 shadow-inner">
                     {totalRequiredGuests > 0 ? <Users size={32} className="text-slate-400" /> : <CalendarX2 size={32} className="text-slate-400" />}
                   </div>
                   <h4 className="text-2xl font-bold text-slate-900 mb-2 tracking-tight">
                     {totalRequiredGuests > 0 ? `Capacidad para ${totalRequiredGuests} no disponible` : 'Inventario Agotado'}
                   </h4>
                   <p className="text-slate-500 max-w-sm mx-auto text-sm">
                     No encontramos unidades que cumplan con la capacidad solicitada para estas fechas. Prueba reduciendo el número de huéspedes o modificando tu estancia.
                   </p>
                </div>
              ) : (
                availableRooms.map((room: any) => (
                  <RoomCard 
                    key={room.id}
                    room={room}
                    hotelSlug={slug}
                    checkIn={checkin}
                    checkOut={checkout}
                    adults={adults}
                    children={children}
                    isSearchingDates={isSearchingDates}
                  />
                ))
              )}
            </div>
          </div>

          {/* WIDGET DE CONFIANZA */}
          <div className="hidden lg:block relative z-10">
            <div className="sticky top-8 bg-white/80 backdrop-blur-3xl p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-200/60">
              <div className="flex flex-col items-center text-center gap-3 mb-8 pb-8 border-b border-slate-100">
                 <div className="size-16 rounded-[1.5rem] bg-indigo-600 border border-indigo-100 flex items-center justify-center shadow-inner">
                    <ShieldCheck className="text-white" size={32} />
                 </div>
                 <div>
                    <p className="font-bold text-slate-900 text-lg tracking-tight">Reserva Garantizada</p>
                    <p className="text-xs text-slate-500 uppercase tracking-widest mt-1">HospedaSuite Protocol</p>
                 </div>
              </div>
              <ul className="space-y-6">
                <li className="flex items-start gap-4 text-slate-600">
                  <div className="mt-1 size-6 rounded-full bg-emerald-50 flex items-center justify-center shrink-0 border border-emerald-100">
                    <CheckCircle2 className="size-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">Transacción Cifrada</p>
                    <p className="text-xs text-slate-500 mt-1">Conexión directa con la pasarela bancaria. Sin intermediarios.</p>
                  </div>
                </li>
                <li className="flex items-start gap-4 text-slate-600">
                  <div className="mt-1 size-6 rounded-full bg-emerald-50 flex items-center justify-center shrink-0 border border-emerald-100">
                    <CheckCircle2 className="size-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">Confirmación Inmediata</p>
                    <p className="text-xs text-slate-500 mt-1">Su habitación se bloquea en el inventario global al instante.</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}