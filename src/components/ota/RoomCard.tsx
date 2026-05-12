'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Users, ArrowRight, ShieldCheck, Flame, Sun, Droplets, BedDouble, Star, TrendingUp, Award } from 'lucide-react';
import { cn } from '@/lib/utils';

// Diccionario de Persuasion
const STORY_AMENITIES: Record<string, { icon: React.ElementType, title: string }> = {
  'chimenea': { icon: Flame, title: 'Fuego Procer' },
  'techo_panoramico': { icon: Sun, title: 'Boveda Celeste' },
  'ducha_lluvia': { icon: Droplets, title: 'Ducha Sensorial' },
  'cama_premium': { icon: BedDouble, title: 'Santuario de Hilos' },
};

interface RoomCardProps {
  room: any;
  hotelSlug: string;
  checkIn?: string | null;
  checkOut?: string | null;
  adults?: string | null;
  children?: string | null;
  isSearchingDates: boolean;
  allRooms?: any[];
}

export default function RoomCard({ room, hotelSlug, checkIn, checkOut, adults, children, isSearchingDates, allRooms = [] }: RoomCardProps) {
  // Manejo seguro de imagen principal
  const coverImage = Array.isArray(room.gallery) && room.gallery.length > 0 
    ? (room.gallery[0].url || room.gallery[0]) 
    : 'https://images.unsplash.com/photo-1611892440504-42a792e24d32';

  // Matematicas de persuasion: Mostrar precio total si hay fechas
  let nights = 1;
  if (checkIn && checkOut) {
    const d1 = new Date(checkIn);
    const d2 = new Date(checkOut);
    nights = Math.max(1, Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 3600 * 24)));
  }
  const basePrice = room.price_per_night || room.price || 0;
  const displayPrice = isSearchingDates ? (basePrice * nights) : basePrice;
  const taxes = Math.round(displayPrice * 0.19); // 19% IVA Colombia
  const totalPrice = displayPrice + taxes;

  // Logica de badges
  const minPrice = allRooms.length > 0 ? Math.min(...allRooms.map((r) => r.price_per_night || r.price || 0)) : 0;
  const isBestValue = basePrice === minPrice && allRooms.length > 1;
  const isPopular = room.capacity >= 4; // Habitaciones grandes = mas populares
  const isLowStock = isSearchingDates && nights > 0; // Simplificado: mostrar urgencia cuando hay fechas

  // Logica de URL blindada
  const queryParams = new URLSearchParams();
  queryParams.set('showRoom', room.id);
  if (checkIn) queryParams.set('checkin', checkIn);
  if (checkOut) queryParams.set('checkout', checkOut);
  if (adults) queryParams.set('adults', adults);
  if (children) queryParams.set('children', children);

  const destinationUrl = `?${queryParams.toString()}`;

  return (
    <div className="bg-card/80 backdrop-blur-xl p-4 md:p-5 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-border/60 flex flex-col md:flex-row gap-6 group hover:border-brand-500/30 hover:shadow-xl transition-all duration-500">
      
      {/* ZONA VISUAL (Atraccion) */}
      <div className="w-full md:w-72 h-64 md:h-full min-h-[260px] bg-muted rounded-[2rem] relative overflow-hidden shrink-0 shadow-inner">
        <Image 
          src={coverImage} 
          alt={room.name} 
          fill 
          className="object-cover transition-transform duration-700 group-hover:scale-110" 
        />
        
        {/* Badges superpuestos */}
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          {isBestValue && (
            <div className="bg-emerald-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-widest shadow-md flex items-center gap-1.5 animate-in fade-in zoom-in duration-500">
              <Award size={12} /> Mejor Valor
            </div>
          )}
          {isPopular && (
            <div className="bg-amber-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-widest shadow-md flex items-center gap-1.5 animate-in fade-in zoom-in duration-500">
              <TrendingUp size={12} /> Mas Popular
            </div>
          )}
          {isSearchingDates && (
            <div className="bg-rose-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-widest shadow-md flex items-center gap-1.5 animate-in fade-in zoom-in duration-500">
              <Flame size={12} className="fill-white" /> Alta Demanda
            </div>
          )}
        </div>
      </div>

      {/* ZONA LOGICA Y EMOCIONAL (Retencion y Cierre) */}
      <div className="flex-1 flex flex-col justify-between py-2 pr-2">
        <div>
          <div className="flex justify-between items-start mb-3">
            <h4 className="text-2xl font-bold text-foreground tracking-tight">{room.name}</h4>
            <span className="text-[10px] bg-muted border border-border text-muted-foreground font-bold px-3 py-1 rounded-full uppercase tracking-widest whitespace-nowrap flex items-center gap-1">
              <Users size={12} /> Max {room.capacity}
            </span>
          </div>
          
          <p className="text-sm text-muted-foreground line-clamp-2 mb-4 font-lora italic">
            {room.description || "Un refugio disenado para aislar el ruido del mundo moderno y reconectar con lo esencial."}
          </p>
          
          {/* Micro-Storytelling de Amenidades */}
          <div className="flex flex-wrap gap-2 mb-6">
            {room.amenities?.slice(0, 2).map((amenity: any, idx: number) => {
              const id = typeof amenity === 'string' ? amenity : amenity.id;
              const story = STORY_AMENITIES[id];
              if (!story) return null;
              const Icon = story.icon;
              return (
                <div key={idx} className="flex items-center gap-1.5 bg-brand-50/50 text-brand-700 border border-brand-100/50 px-2.5 py-1 rounded-lg text-xs font-medium">
                  <Icon size={14} /> {story.title}
                </div>
              );
            })}
          </div>
        </div>

        {/* DOCK DE CONVERSION */}
        <div className="mt-4 pt-5 flex flex-wrap items-end justify-between border-t border-border/40 gap-4">
          <div>
            {/* Price breakdown */}
            {isSearchingDates ? (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  <span className="font-bold text-foreground">${basePrice.toLocaleString()}</span> x {nights} noche{nights > 1 ? 's' : ''}
                </p>
                <p className="text-xs text-muted-foreground/60">+ Impuestos y tasas: ${taxes.toLocaleString()}</p>
                <div className="flex items-end gap-2 pt-1">
                  <p className="text-3xl font-mono font-bold text-secondary leading-none">
                    ${totalPrice.toLocaleString()} 
                  </p>
                  <span className="text-xs font-sans font-medium text-muted-foreground mb-1">COP total</span>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-widest mb-1">Tarifa Base</p>
                <div className="flex items-end gap-2">
                  <p className="text-3xl font-mono font-bold text-secondary leading-none">
                    ${displayPrice.toLocaleString()} 
                  </p>
                  <span className="text-xs font-sans font-medium text-muted-foreground mb-1">COP/noche</span>
                </div>
              </div>
            )}
            
            {/* Reversion de Riesgo */}
            <p className="text-[10px] font-medium text-secondary mt-2 flex items-center gap-1">
              <ShieldCheck size={12} /> Cancelacion Gratuita Disponible
            </p>
          </div>

          {/* CTA Persuasivo */}
          <Link 
            href={destinationUrl}
            scroll={false}
            className={cn(
              "px-6 py-4 rounded-[1.2rem] font-bold transition-all flex items-center gap-2 text-sm active:scale-95 shadow-md",
              isSearchingDates 
                ? "bg-primary hover:bg-brand-800 text-primary-foreground shadow-brand-500/20" 
                : "bg-foreground hover:bg-primary text-background"
            )}
          >
            {isSearchingDates ? 'Asegurar Refugio' : 'Explorar Unidad'} <ArrowRight size={16} strokeWidth={2.5} />
          </Link>
        </div>
      </div>
    </div>
  );
}
