'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { X, ArrowRight, Users, Maximize, BedDouble, Calendar } from 'lucide-react';
import { RoomAmenities } from '@/components/ota/RoomAmenities';

export function RoomShowcaseModal({ hotel }: { hotel: any }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Leemos el estado de la URL
  const roomId = searchParams.get('showRoom');
  const checkIn = searchParams.get('checkin');
  const checkOut = searchParams.get('checkout');

  // Función global para cerrar el modal limpiando la URL
  const closeModal = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('showRoom');
    router.push(`?${params.toString()}`, { scroll: false });
  };

  // 1. Si no hay orden de mostrar habitación, no renderizamos nada
  if (!roomId) return null;

  // 🚨 2. EL ESCUDO UX: Intercepción si faltan fechas
  if (!checkIn || !checkOut) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
        {/* Fondo oscuro con Blur */}
        <div 
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity" 
          onClick={closeModal} 
        />
        
        {/* Modal de Advertencia Persuasiva */}
        <div className="bg-white rounded-[2.5rem] p-8 md:p-10 w-full max-w-md relative z-10 text-center shadow-2xl animate-in zoom-in-95 duration-300">
          <div className="absolute top-4 right-4 z-20">
            <button onClick={closeModal} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="w-20 h-20 bg-blue-50 border border-blue-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            <Calendar size={40} className="text-hospeda-500" strokeWidth={1.5} />
          </div>
          
          <h2 className="text-2xl font-display font-bold text-slate-800 mb-3">Fechas de Viaje Requeridas</h2>
          <p className="text-slate-500 mb-8 leading-relaxed text-sm">
            Para mostrarte la disponibilidad real y la tarifa exacta de esta habitación, necesitamos saber tu fecha de llegada y salida.
          </p>
          
          <button 
            onClick={() => { 
              closeModal(); 
              // Opcional: Haz scroll hacia arriba donde suele estar el buscador
              window.scrollTo({ top: 0, behavior: 'smooth' }); 
            }} 
            style={{ backgroundColor: hotel.primary_color || '#0ea5e9' }}
            className="w-full text-white font-bold py-4 rounded-xl transition-transform hover:scale-105 shadow-lg flex items-center justify-center gap-2"
          >
            Seleccionar Fechas <ArrowRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  // 3. Flujo Normal: Si hay fechas, buscamos la habitación
  const room = hotel.rooms?.find((r: any) => r.id === roomId);
  if (!room) return null;

  const proceedToCheckout = () => {
    const params = new URLSearchParams();
    params.set('room', room.id);
    if (checkIn) params.set('checkin', checkIn);
    if (checkOut) params.set('checkout', checkOut);
    
    router.push(`/book/${hotel.slug}/checkout?${params.toString()}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity" 
        onClick={closeModal} 
      />
      
      <div className="bg-white rounded-[2rem] w-full max-w-5xl max-h-[95vh] flex flex-col relative shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        <div className="absolute top-4 right-4 z-20">
          <button 
            onClick={closeModal} 
            className="bg-white/80 backdrop-blur p-2 rounded-full shadow-sm hover:bg-white hover:scale-105 transition-all text-slate-800"
          >
            <X size={24} />
          </button>
        </div>

        <div className="overflow-y-auto custom-scrollbar flex-1 pb-32">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-4 h-[400px]">
            <div className="relative h-full w-full rounded-2xl overflow-hidden bg-slate-100">
              <Image 
                src={(room.gallery && room.gallery.length > 0) ? room.gallery[0].url : 'https://images.unsplash.com/photo-1611892440504-42a792e24d32'} 
                alt={room.name} 
                fill 
                className="object-cover" 
              />
            </div>
            
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
            style={{ backgroundColor: hotel.primary_color || '#0ea5e9' }}
            className="text-white px-8 py-4 rounded-xl font-bold text-lg flex items-center gap-3 transition-transform hover:scale-105 shadow-xl shadow-slate-200"
          >
            Continuar al Checkout <ArrowRight size={20} />
          </button>
        </div>

      </div>
    </div>
  );
}