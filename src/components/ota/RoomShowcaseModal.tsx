'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { X, ArrowRight, Users, Maximize, BedDouble } from 'lucide-react';
import { RoomAmenities } from '@/components/ota/RoomAmenities';

// 🚨 FIX QA: Exportación Nombrada para sincronizar con page.tsx
export function RoomShowcaseModal({ hotel }: { hotel: any }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Leemos la habitación seleccionada desde la URL
  const roomId = searchParams.get('showRoom');
  
  // Extraemos las fechas si el usuario ya buscó disponibilidad
  const checkIn = searchParams.get('checkin');
  const checkOut = searchParams.get('checkout');

  // Si no hay ID en la URL, el modal se oculta
  if (!roomId) return null;

  const room = hotel.rooms?.find((r: any) => r.id === roomId);
  if (!room) return null;

  const closeModal = () => {
    // Eliminamos solo el parámetro showRoom para no perder las fechas de búsqueda
    const params = new URLSearchParams(searchParams.toString());
    params.delete('showRoom');
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const proceedToCheckout = () => {
    // 🚨 FASE 3: Preparación para la Pasarela de Pagos
    const params = new URLSearchParams();
    params.set('room', room.id);
    if (checkIn) params.set('checkin', checkIn);
    if (checkOut) params.set('checkout', checkOut);
    
    // Navegamos a la pantalla de pago inyectando los datos
    router.push(`/book/${hotel.slug}/checkout?${params.toString()}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Fondo oscuro con Blur */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity" 
        onClick={closeModal} 
      />
      
      {/* Contenedor Principal del Modal */}
      <div className="bg-white rounded-[2rem] w-full max-w-5xl max-h-[95vh] flex flex-col relative shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Cabecera Flotante */}
        <div className="absolute top-4 right-4 z-20">
          <button 
            onClick={closeModal} 
            className="bg-white/80 backdrop-blur p-2 rounded-full shadow-sm hover:bg-white hover:scale-105 transition-all text-slate-800"
          >
            <X size={24} />
          </button>
        </div>

        {/* Contenido Scrolleable */}
        <div className="overflow-y-auto custom-scrollbar flex-1 pb-32">
          
          {/* Galería Estilo Airbnb */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-4 h-[400px]">
            {/* Imagen Principal Grande */}
            <div className="relative h-full w-full rounded-2xl overflow-hidden bg-slate-100">
              <Image 
                src={(room.gallery && room.gallery.length > 0) ? room.gallery[0].url : 'https://images.unsplash.com/photo-1611892440504-42a792e24d32'} 
                alt={room.name} 
                fill 
                className="object-cover" 
              />
            </div>
            
            {/* Grilla Secundaria */}
            <div className="hidden md:grid grid-cols-2 gap-2 h-full">
              {room.gallery?.slice(1, 5).map((img: any, i: number) => (
                <div key={i} className="relative h-full w-full rounded-2xl overflow-hidden bg-slate-100">
                  <Image src={img.url} alt={`${room.name} ${i+1}`} fill className="object-cover hover:scale-105 transition-transform duration-500" />
                </div>
              ))}
              {(!room.gallery || room.gallery.length <= 1) && (
                <div className="col-span-2 relative h-full w-full rounded-2xl overflow-hidden bg-slate-100 flex items-center justify-center">
                  <span className="text-slate-400 font-medium">Sin más imágenes</span>
                </div>
              )}
            </div>
          </div>

          {/* Detalles de la Habitación */}
          <div className="px-8 py-6 max-w-4xl mx-auto">
            <h2 className="text-4xl font-display font-bold text-slate-800 mb-6">{room.name}</h2>
            
            <div className="flex flex-wrap gap-4 mb-8">
              <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                <Users size={18} className="text-slate-500" />
                <span className="text-sm font-bold text-slate-700">Hasta {room.capacity} Huéspedes</span>
              </div>
              {room.size_sqm && (
                <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                  <Maximize size={18} className="text-slate-500" />
                  <span className="text-sm font-bold text-slate-700">{room.size_sqm} m² de espacio</span>
                </div>
              )}
              <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                <BedDouble size={18} className="text-slate-500" />
                <span className="text-sm font-bold text-slate-700">Camas Premium</span>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-8">
              <h3 className="text-xl font-bold text-slate-800 mb-6">¿Qué incluye este espacio?</h3>
              <RoomAmenities amenities={room.amenities || []} />
            </div>
          </div>
        </div>

        {/* 🚨 FOOTER FIJO DE COMPRA (Sticky) */}
        <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-100 p-6 flex items-center justify-between z-10 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
          <div>
             <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Precio Total</p>
             <p className="text-3xl font-display font-bold text-slate-800">
               ${(room.price_per_night || room.price || 0).toLocaleString()} 
               <span className="text-base font-normal text-slate-500"> / noche</span>
             </p>
          </div>
          
          <button 
            onClick={proceedToCheckout}
            className="bg-hospeda-900 hover:bg-black text-white px-8 py-4 rounded-xl font-bold text-lg flex items-center gap-3 transition-transform hover:scale-105 shadow-xl shadow-slate-200"
          >
            {checkIn && checkOut ? 'Reservar Fechas' : 'Continuar al Checkout'} <ArrowRight size={20} />
          </button>
        </div>

      </div>
    </div>
  );
}