'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Users, ArrowRight, ShieldCheck, Flame, Sun, Droplets, BedDouble } from 'lucide-react';
import { cn } from '@/lib/utils';

// Diccionario de Persuasión
const STORY_AMENITIES: Record<string, { icon: React.ElementType, title: string }> = {
  'chimenea': { icon: Flame, title: 'Fuego Prócer' },
  'techo_panoramico': { icon: Sun, title: 'Bóveda Celeste' },
  'ducha_lluvia': { icon: Droplets, title: 'Ducha Sensorial' },
  'cama_premium': { icon: BedDouble, title: 'Santuario de Hilos' },
};

interface RoomCardProps {
  room: any;
  hotelSlug: string;
  checkIn?: string | null;
  checkOut?: string | null;
  adults?: string | null;     // 🚨 FIX: Recibe los adultos
  children?: string | null;   // 🚨 FIX: Recibe los niños
  isSearchingDates: boolean;
}

export default function RoomCard({ room, hotelSlug, checkIn, checkOut, adults, children, isSearchingDates }: RoomCardProps) {
  // Manejo seguro de imagen principal
  const coverImage = Array.isArray(room.gallery) && room.gallery.length > 0 
    ? (room.gallery[0].url || room.gallery[0]) 
    : 'https://images.unsplash.com/photo-1611892440504-42a792e24d32';

  // Matemáticas de persuasión: Mostrar precio total si hay fechas
  let nights = 1;
  if (checkIn && checkOut) {
    const d1 = new Date(checkIn);
    const d2 = new Date(checkOut);
    nights = Math.max(1, Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 3600 * 24)));
  }
  const basePrice = room.price_per_night || room.price || 0;
  const displayPrice = isSearchingDates ? (basePrice * nights) : basePrice;

  // 🚨 LÓGICA DE URL BLINDADA (Previene la Fuga de Estado)
  const queryParams = new URLSearchParams();
  queryParams.set('showRoom', room.id);
  if (checkIn) queryParams.set('checkin', checkIn);
  if (checkOut) queryParams.set('checkout', checkOut);
  if (adults) queryParams.set('adults', adults);       // Asegura que viaje a la URL del modal
  if (children) queryParams.set('children', children); // Asegura que viaje a la URL del modal

  const destinationUrl = `?${queryParams.toString()}`;

  return (
    <div className="bg-white/80 backdrop-blur-xl p-4 md:p-5 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200/60 flex flex-col md:flex-row gap-6 group hover:border-indigo-500/30 hover:shadow-xl transition-all duration-500">
      
      {/* 🖼️ ZONA VISUAL (Atracción) */}
      <div className="w-full md:w-72 h-64 md:h-full min-h-[260px] bg-slate-100 rounded-[2rem] relative overflow-hidden shrink-0 shadow-inner">
        <Image 
          src={coverImage} 
          alt={room.name} 
          fill 
          className="object-cover transition-transform duration-700 group-hover:scale-110" 
        />
        
        {/* Gatillo de Escasez (Urgencia) */}
        {isSearchingDates && (
          <div className="absolute top-4 left-4 bg-rose-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-widest shadow-md flex items-center gap-1.5 animate-in fade-in zoom-in duration-500">
            <Flame size={12} className="fill-white" /> Alta Demanda
          </div>
        )}
      </div>

      {/* 📝 ZONA LÓGICA Y EMOCIONAL (Retención y Cierre) */}
      <div className="flex-1 flex flex-col justify-between py-2 pr-2">
        <div>
          <div className="flex justify-between items-start mb-3">
            <h4 className="text-2xl font-bold text-slate-900 tracking-tight">{room.name}</h4>
            <span className="text-[10px] bg-slate-100 border border-slate-200 text-slate-600 font-bold px-3 py-1 rounded-full uppercase tracking-widest whitespace-nowrap flex items-center gap-1">
              <Users size={12} /> Máx {room.capacity}
            </span>
          </div>
          
          <p className="text-sm text-slate-500 line-clamp-2 mb-4 font-lora italic">
            {room.description || "Un refugio diseñado para aislar el ruido del mundo moderno y reconectar con lo esencial."}
          </p>
          
          {/* Micro-Storytelling de Amenidades (Extraemos máximo 2 para la tarjeta) */}
          <div className="flex flex-wrap gap-2 mb-6">
            {room.amenities?.slice(0, 2).map((amenity: any, idx: number) => {
              const id = typeof amenity === 'string' ? amenity : amenity.id;
              const story = STORY_AMENITIES[id];
              if (!story) return null;
              const Icon = story.icon;
              return (
                <div key={idx} className="flex items-center gap-1.5 bg-indigo-50/50 text-indigo-700 border border-indigo-100/50 px-2.5 py-1 rounded-lg text-xs font-medium">
                  <Icon size={14} /> {story.title}
                </div>
              );
            })}
          </div>
        </div>

        {/* 💳 DOCK DE CONVERSIÓN */}
        <div className="mt-4 pt-5 flex flex-wrap items-end justify-between border-t border-slate-100 gap-4">
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1 flex items-center gap-1">
              {isSearchingDates ? `Total por ${nights} noche(s)` : 'Tarifa Base'}
            </p>
            <div className="flex items-end gap-2">
              <p className="text-3xl font-mono font-bold text-emerald-600 leading-none">
                ${displayPrice.toLocaleString()} 
              </p>
              <span className="text-xs font-sans font-medium text-slate-500 mb-1">COP</span>
            </div>
            
            {/* Reversión de Riesgo */}
            <p className="text-[10px] font-medium text-emerald-600 mt-2 flex items-center gap-1">
              <ShieldCheck size={12} /> Cancelación Gratuita Disponible
            </p>
          </div>

          {/* CTA Persuasivo (Call to Action) */}
          <Link 
            href={destinationUrl}
            scroll={false}
            className={cn(
              "px-6 py-4 rounded-[1.2rem] font-bold transition-all flex items-center gap-2 text-sm active:scale-95 shadow-md",
              isSearchingDates 
                ? "bg-indigo-600 hover:bg-slate-900 text-white shadow-indigo-500/20" 
                : "bg-slate-900 hover:bg-indigo-600 text-white"
            )}
          >
            {isSearchingDates ? 'Asegurar Refugio' : 'Explorar Unidad'} <ArrowRight size={16} strokeWidth={2.5} />
          </Link>
        </div>
      </div>
    </div>
  );
}