'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { GlassCard } from '@/components/ui/glass';
import { Users, ArrowRight, ShieldCheck, Star, TrendingUp, Award, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getRoomAmenityById } from '@/lib/amenity-registry';

interface RoomCardProps {
  room: any;
  hotelSlug: string;
  checkIn?: string | null;
  checkOut?: string | null;
  adults?: string | null;
  children?: string | null;
  isSearchingDates: boolean;
  allRooms?: any[];
  totalRooms?: number;
  availableCount?: number;
  hotel?: { cancellation_policy?: string | null };
}

export default function RoomCard({ room, hotelSlug, checkIn, checkOut, adults, children, isSearchingDates, allRooms = [], totalRooms = 0, availableCount = 0, hotel }: RoomCardProps) {
  const coverImage = Array.isArray(room.gallery) && room.gallery.length > 0
    ? (room.gallery[0].url || room.gallery[0])
    : 'https://images.unsplash.com/photo-1611892440504-42a792e24d32';

  let nights = 1;
  if (checkIn && checkOut) {
    const d1 = new Date(checkIn);
    const d2 = new Date(checkOut);
    nights = Math.max(1, Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 3600 * 24)));
  }
  const basePrice = room.price_per_night || room.price || 0;
  const displayPrice = isSearchingDates ? (basePrice * nights) : basePrice;
  const taxes = Math.round(displayPrice * 0.19);
  const totalPrice = displayPrice + taxes;

  const allPrices = allRooms.map((r) => r.price_per_night || r.price || 0).filter((p) => p > 0);
  const minPrice = allPrices.length > 0 ? Math.min(...allPrices) : 0;
  const avgPrice = allPrices.length > 0 ? Math.round(allPrices.reduce((a, b) => a + b, 0) / allPrices.length) : 0;
  const isBestValue = basePrice === minPrice && allRooms.length > 1;
  const isGreatDeal = avgPrice > 0 && basePrice <= avgPrice * 0.8 && !isBestValue;
  const isPopular = room.capacity >= 4;

  const availabilityRatio = totalRooms > 0 ? availableCount / totalRooms : 1;
  const isLowStock = isSearchingDates && availabilityRatio <= 0.33;
  const isAlmostGone = isSearchingDates && availableCount <= 2 && availableCount > 0;

  const queryParams = new URLSearchParams();
  queryParams.set('showRoom', room.id);
  if (checkIn) queryParams.set('checkin', checkIn);
  if (checkOut) queryParams.set('checkout', checkOut);
  if (adults) queryParams.set('adults', adults);
  if (children) queryParams.set('children', children);

  const destinationUrl = `?${queryParams.toString()}`;

  return (
    <div className="group/card will-change-transform">
      <GlassCard className="p-4 md:p-5 flex flex-col md:flex-row gap-6 hover:border-brand-500/30 hover:shadow-xl transition-all duration-500 transition-transform duration-200 group-hover/card:scale-[1.01]">

        {/* ZONA VISUAL (Atraccion) */}
        <div className="w-full md:w-72 h-64 md:h-full min-h-[260px] bg-muted rounded-[var(--radius-squircle-2xl)] relative overflow-hidden shrink-0 shadow-inner">
          <Image
            src={coverImage}
            alt={room.name}
            fill
            className="object-cover transition-transform duration-700 group-hover/card:scale-110"
          />

          {/* Badges superpuestos — Semantic status colors */}
          <div className="absolute top-4 left-4 flex flex-col gap-2">
            {isBestValue && (
              <div className="bg-success text-success-foreground text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-widest shadow-md flex items-center gap-1.5 animate-in fade-in zoom-in duration-500">
                <Award size={12} /> Mejor Valor
              </div>
            )}
            {isGreatDeal && (
              <div className="bg-brand-500 text-primary-foreground text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-widest shadow-md flex items-center gap-1.5 animate-in fade-in zoom-in duration-500">
                <Star size={12} className="fill-white" /> Oferta
              </div>
            )}
            {isPopular && (
              <div className="bg-warning text-warning-foreground text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-widest shadow-md flex items-center gap-1.5 animate-in fade-in zoom-in duration-500">
                <TrendingUp size={12} /> Mas Popular
              </div>
            )}
            {isAlmostGone && (
              <div className="bg-urgent text-urgent-foreground text-xs font-bold px-3 py-1.5 rounded-full shadow-md flex items-center gap-1.5 animate-in fade-in zoom-in duration-500">
                <Flame size={12} className="fill-white" /> Solo {availableCount} disponible{availableCount > 1 ? 's' : ''}
              </div>
            )}
            {isLowStock && !isAlmostGone && (
              <div className="bg-warning/80 text-warning-foreground text-xs font-bold px-3 py-1.5 rounded-full shadow-md flex items-center gap-1.5 animate-in fade-in zoom-in duration-500">
                <TrendingUp size={12} /> Alta Demanda
              </div>
            )}
          </div>
        </div>

        {/* ZONA LOGICA Y EMOCIONAL (Retencion y Cierre) */}
        <div className="flex-1 flex flex-col justify-between py-2 pr-2">
          <div>
            <div className="flex justify-between items-start mb-3">
              <h4 className="text-2xl font-bold text-foreground tracking-tight">{room.name}</h4>
              <span className="text-xs bg-muted border border-border text-muted-foreground font-bold px-3 py-1 rounded-full uppercase tracking-widest whitespace-nowrap flex items-center gap-1">
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
                const entry = getRoomAmenityById(id);
                if (!entry.storyTitle) return null;
                const Icon = entry.icon;
                return (
                  <div key={idx} className="flex items-center gap-1.5 bg-brand-50/50 text-brand-700 border border-brand-100/50 px-2.5 py-1 rounded-[var(--radius-squircle-md)] text-xs font-medium">
                    <Icon size={14} /> {entry.storyTitle}
                  </div>
                );
              })}
            </div>
          </div>

          {/* DOCK DE CONVERSION */}
          <div className="mt-4 pt-5 flex flex-wrap items-end justify-between border-t border-border/40 gap-4">
            <div>
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
                  <p className="text-xs text-muted-foreground/60 font-bold uppercase tracking-widest mb-1">Tarifa Base</p>
                  <div className="flex items-end gap-2">
                    <p className="text-3xl font-mono font-bold text-secondary leading-none">
                      ${displayPrice.toLocaleString()}
                    </p>
                    <span className="text-xs font-sans font-medium text-muted-foreground mb-1">COP/noche</span>
                  </div>
                </div>
              )}

              {hotel?.cancellation_policy && (
                <p className="text-xs font-medium text-secondary mt-2 flex items-center gap-1">
                  <ShieldCheck size={12} /> Cancelacion Gratuita Disponible
                </p>
              )}
            </div>

            {/* CTA — CSS active scale instead of motion.div whileTap */}
            <Link
              href={destinationUrl}
              scroll={false}
              className={cn(
                "px-6 py-4 rounded-[var(--radius-squircle-md)] font-bold transition-all flex items-center gap-2 text-sm shadow-md active:scale-[0.96] transition-transform",
                isSearchingDates
                  ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-cta"
                  : "bg-foreground hover:bg-primary text-background"
              )}
            >
              {isSearchingDates ? 'Asegurar Refugio' : 'Explorar Unidad'} <ArrowRight size={16} strokeWidth={2.5} />
            </Link>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
