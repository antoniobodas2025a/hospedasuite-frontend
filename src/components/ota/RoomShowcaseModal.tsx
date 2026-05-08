'use client';

import React, { useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { 
  X, ArrowRight, Users, Maximize, BedDouble, Calendar, 
  Wifi, Coffee, Wind, Bath, Flame, Droplets, Sun, Star,
  Info, ClipboardList, Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

// ============================================================================
// DICCIONARIO DE STORYTELLING EDITABLE (PLANTILLAS TIER-1)
// ============================================================================
const AMENITY_TEMPLATES: Record<string, { icon: React.ElementType, title: string, story: string }> = {
  'wifi': { icon: Wifi, title: 'Conexión Ininterrumpida', story: 'Alta velocidad mediante fibra óptica para mantenerse conectado o desconectar bajo sus propios términos.' },
  'minibar': { icon: Coffee, title: 'Minibar de Autor', story: 'Una selección curada de sabores locales lista para ser descubierta a su llegada.' },
  'ac': { icon: Wind, title: 'Climatización Perfecta', story: 'Control térmico de precisión para ignorar el frío de la montaña o el calor de la tarde.' },
  'jacuzzi': { icon: Bath, title: 'Burbujas de Relajación', story: 'Sumerja sus sentidos en hidromasaje privado con vistas inigualables al valle.' },
  'chimenea': { icon: Flame, title: 'Fuego Prócer', story: 'Chimenea real de leña para calentar conversaciones y revivir la nostalgia boyacense.' },
  'ducha_lluvia': { icon: Droplets, title: 'Ducha Sensorial', story: 'Arquitectura hídrica diseñada para simular una lluvia constante de alta presión.' },
  'techo_panoramico': { icon: Sun, title: 'Cielo de Plata', story: 'Visualización directa a la Vía Láctea desde la comodidad absoluta de su domo.' }
};

export function RoomShowcaseModal({ hotel }: { hotel: any }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // 🚨 ÚNICA FUENTE DE VERDAD (SSOT): Estado leído exclusivamente de la URL
  const roomId = searchParams.get('showRoom');
  const checkIn = searchParams.get('checkin');
  const checkOut = searchParams.get('checkout');
  const adults = Number(searchParams.get('adults')) || 2;
  const children = Number(searchParams.get('children')) || 0;

  const totalGuests = adults + children;

  // Resolución Topológica de la Habitación
  const room = useMemo(() => 
    hotel.rooms?.find((r: any) => r.id === roomId), 
  [hotel.rooms, roomId]);

  // Gatekeepers de Navegación
  const closeModal = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('showRoom');
    router.push(`?${params.toString()}`, { scroll: false });
  };

  if (!roomId) return null;

  // 🛡️ ESCUDO UX: Fechas Faltantes (Protección de Integridad)
  if (!checkIn || !checkOut) {
    return (
      <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={closeModal} />
        <div className="bg-white rounded-[2.5rem] p-10 w-full max-w-md relative z-10 text-center shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
          <Calendar size={48} className="text-indigo-600 mx-auto mb-6" strokeWidth={1.5} />
          <h2 className="text-2xl font-black text-slate-900 mb-2">Defina su Estadía</h2>
          <p className="text-slate-500 mb-8 text-sm">Para garantizar la tarifa exacta, necesitamos saber cuándo nos visitará.</p>
          <button onClick={() => { closeModal(); window.scrollTo({ top: 0, behavior: 'smooth' }); }} 
            className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl hover:bg-indigo-600 transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95">
            Seleccionar Fechas <ArrowRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  if (!room) return null;

  // Cálculos Financieros y Temporales Seguros
  const dateFrom = parseISO(checkIn);
  const dateTo = parseISO(checkOut);
  const nights = Math.max(1, Math.ceil((dateTo.getTime() - dateFrom.getTime()) / (1000 * 3600 * 24)));
  const basePrice = room.price_per_night || room.price || 0;
  const totalPrice = basePrice * nights;
  
  // Validación de Reglas de Negocio
  const isOverCapacity = totalGuests > room.capacity;

  const handleCheckout = () => {
    if (isOverCapacity) return;
    const params = new URLSearchParams();
    params.set('room', room.id);
    params.set('checkin', checkIn);
    params.set('checkout', checkOut);
    params.set('adults', adults.toString());
    params.set('children', children.toString());
    // Delegación al procesador final (Wompi)
    router.push(`/book/${hotel.slug}/checkout?${params.toString()}`);
  };

  const images = room.gallery?.length > 0 ? room.gallery : [{ url: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32' }];

  return (
    <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center sm:p-6 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={closeModal} />
      
      <div className="bg-white sm:rounded-[2.5rem] rounded-t-[2.5rem] w-full max-w-6xl h-[92vh] flex flex-col relative shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 duration-300">
        
        {/* Header Flotante (Boton Cerrar Mac-Style) */}
        <button onClick={closeModal} className="absolute top-6 right-6 z-30 bg-white/90 backdrop-blur-md p-3 rounded-full shadow-lg text-slate-800 hover:scale-110 transition-all border border-slate-200">
          <X size={20} strokeWidth={3} />
        </button>

        <div className="overflow-y-auto custom-scrollbar flex-1 pb-32 bg-slate-50">
          
          {/* MOSAICO CINEMATOGRÁFICO DE IMÁGENES */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 p-2 h-[300px] md:h-[500px]">
            <div className="md:col-span-2 relative h-full rounded-3xl overflow-hidden shadow-inner bg-slate-200">
              <Image src={images[0].url || images[0]} alt={room.name} fill className="object-cover" priority quality={90} />
            </div>
            <div className="hidden md:grid md:col-span-2 grid-cols-2 gap-2">
              {images.slice(1, 5).map((img: any, i: number) => (
                <div key={i} className="relative h-full rounded-2xl overflow-hidden bg-slate-200 group">
                  <Image src={img.url || img} alt={`${room.name} ${i+1}`} fill className="object-cover group-hover:scale-110 transition-transform duration-700" />
                </div>
              ))}
              {images.length < 5 && Array(4 - (images.length - 1)).fill(0).map((_, i) => (
                <div key={`fill-${i}`} className="bg-slate-100 rounded-2xl flex items-center justify-center border border-dashed border-slate-200">
                  <Star className="text-slate-200" size={24} />
                </div>
              ))}
            </div>
          </div>

          <div className="px-6 py-10 md:px-16 max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-12">
            
            {/* COLUMNA IZQUIERDA: MANIFIESTO Y NARRATIVA */}
            <div className="lg:col-span-2 space-y-10">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-100 text-amber-700 text-[10px] font-bold uppercase tracking-widest mb-4">
                  <Star size={12} className="fill-amber-500" /> Selección de Autor
                </span>
                <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-6">{room.name}</h2>
                <p className="text-lg text-slate-600 font-lora leading-relaxed italic">
                  {room.description || "Un refugio diseñado para quienes buscan silenciar el ruido del mundo y reconectar con la esencia de la montaña."}
                </p>
              </div>

              {/* AMENIDADES CON STORYTELLING */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-slate-200">
                {room.amenities?.map((amenity: any, idx: number) => {
                  const id = typeof amenity === 'string' ? amenity : amenity.id;
                  const template = AMENITY_TEMPLATES[id] || { 
                    icon: Star, 
                    title: typeof amenity === 'string' ? amenity.toUpperCase() : amenity.details, 
                    story: "Servicio premium garantizado por HospedaSuite." 
                  };
                  const Icon = template.icon;
                  return (
                    <div key={idx} className="flex gap-4">
                      <div className="shrink-0 size-12 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-center">
                        <Icon size={24} className="text-indigo-500" strokeWidth={1.5} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{template.title}</p>
                        <p className="text-xs text-slate-500 leading-relaxed font-lora">{template.story}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* COLUMNA DERECHA: WIDGET DE RESUMEN (READ-ONLY) */}
            <div className="lg:col-span-1">
              <div className="sticky top-4 bg-white rounded-[2rem] p-8 shadow-xl border border-slate-100 ring-1 ring-slate-900/5">
                
                <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <ClipboardList size={20} className="text-indigo-600" /> Resumen de Reserva
                </h3>

                <div className="space-y-4">
                  
                  {/* Fila 1: Fechas y Noches */}
                  <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
                     <div>
                       <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1 flex items-center gap-1"><Clock size={10} /> Estadía</p>
                       <p className="text-sm font-bold text-slate-900">
                         {format(dateFrom, "dd MMM", { locale: es })} — {format(dateTo, "dd MMM", { locale: es })}
                       </p>
                     </div>
                     <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">
                       <span className="text-xs font-bold text-slate-700">{nights} Noche{nights > 1 ? 's' : ''}</span>
                     </div>
                  </div>

                  {/* Fila 2: Ocupación Verificada */}
                  <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
                     <div>
                       <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Ocupación</p>
                       <p className="text-sm font-bold text-slate-900">
                         {adults} Adulto{adults > 1 ? 's' : ''} {children > 0 ? `y ${children} Niños` : ''}
                       </p>
                     </div>
                     <Users size={18} className="text-slate-400" />
                  </div>

                  {/* Escudo Dinámico: Alerta de Capacidad (Si se forzó por URL maliciosa) */}
                  {isOverCapacity && (
                    <div className="flex gap-2 p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-700">
                      <Info size={16} className="shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold mb-1">Aforo Excedido</p>
                        <p className="text-[10px] leading-tight">
                          Esta unidad solo permite un máximo de {room.capacity} personas. Por favor, cierre esta ventana y ajuste su búsqueda.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Desglose Financiero Básico */}
                  <div className="pt-6 border-t border-slate-100">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-medium text-slate-500">Tarifa Base ({nights} noches)</span>
                      <span className="text-sm font-bold text-slate-900">${totalPrice.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-xs font-medium text-slate-500">Impuestos y Tasas</span>
                      <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full uppercase">Incluido</span>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 💳 DOCK DE CIERRE FINANCIERO (Fijado Abajo) */}
        <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-slate-200 p-6 md:px-12 flex items-center justify-between z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
          <div className="hidden sm:block">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1">Total a Invertir</p>
            <p className="text-3xl font-black text-slate-900">${totalPrice.toLocaleString()} <span className="text-sm font-medium text-slate-400">COP</span></p>
          </div>
          
          <button 
            disabled={isOverCapacity}
            onClick={handleCheckout}
            className={cn(
              "w-full sm:w-auto px-10 py-5 rounded-2xl font-bold text-white transition-all shadow-xl flex items-center justify-center gap-3 active:scale-95",
              isOverCapacity 
                ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none" 
                : "bg-slate-900 hover:bg-indigo-600 shadow-indigo-500/20"
            )}
          >
            {isOverCapacity ? 'Ajuste la Búsqueda' : 'Confirmar y Reservar'} <ArrowRight size={20} strokeWidth={2.5} />
          </button>
        </div>

      </div>
    </div>
  );
}