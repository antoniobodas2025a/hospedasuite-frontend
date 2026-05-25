'use client';

import React, { useRef, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion, useInView } from 'framer-motion';
import { GlassCard } from '@/components/ui/glass';
import { Users, ArrowRight, ShieldCheck, Star, TrendingUp, Award, Flame, Bed } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getRoomAmenityById } from '@/lib/amenity-registry';
import { getImageSizeUrl } from '@/lib/image-config';
import { formatBedType } from '@/lib/room-helpers';
import { useTranslations } from 'next-intl';
import type { Room, GalleryItem } from '@/types';

// ============================================================================
// BED TYPE FORMATTER — DB values → human-readable labels
// Extracted to src/lib/room-helpers.ts for sharing with RoomComparison
// ============================================================================

interface RoomCardProps {
  room: Partial<Room> & { id: string; name: string; cover_image_blur?: string };
  hotelSlug: string;
  checkIn?: string | null;
  checkOut?: string | null;
  isSearchingDates: boolean;
  allRooms?: (Partial<Room> & { id: string; name: string; cover_image_blur?: string })[];
  totalRooms?: number;
  availableCount?: number;
  hotel?: { cancellation_policy?: string | null };
}

export default function RoomCard({ room, hotelSlug, checkIn, checkOut, isSearchingDates, allRooms = [], totalRooms = 0, availableCount = 0, hotel }: RoomCardProps) {
  const searchParams = useSearchParams();
  const guests = searchParams.get('guests');

  const coverImage = Array.isArray(room.gallery) && room.gallery.length > 0
    ? (typeof room.gallery[0] === 'string' ? room.gallery[0] : (room.gallery[0] as GalleryItem).url || '')
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
  const isPopular = (room.capacity ?? 0) >= 4;

  const availabilityRatio = totalRooms > 0 ? availableCount / totalRooms : 1;
  const isLowStock = isSearchingDates && availabilityRatio <= 0.33;
  const isAlmostGone = isSearchingDates && availableCount <= 2 && availableCount > 0;

  const queryParams = new URLSearchParams();
  queryParams.set('showRoom', room.id);
  if (checkIn) queryParams.set('checkin', checkIn);
  if (checkOut) queryParams.set('checkout', checkOut);
  if (guests) queryParams.set('guests', guests);

  const destinationUrl = `?${queryParams.toString()}`;

  return (
    <RoomCardInner
      room={room}
      hotelSlug={hotelSlug}
      checkIn={checkIn}
      checkOut={checkOut}
      isSearchingDates={isSearchingDates}
      allRooms={allRooms}
      totalRooms={totalRooms}
      availableCount={availableCount}
      hotel={hotel}
      isBestValue={isBestValue}
      isGreatDeal={isGreatDeal}
      isPopular={isPopular}
      isAlmostGone={isAlmostGone}
      isLowStock={isLowStock}
      destinationUrl={destinationUrl}
      coverImage={coverImage}
      displayPrice={displayPrice}
      basePrice={basePrice}
      taxes={taxes}
      totalPrice={totalPrice}
      nights={nights}
    />
  );
}

function RoomCardInner({
  room, hotelSlug, checkIn, checkOut, isSearchingDates,
  allRooms, totalRooms, availableCount, hotel, isBestValue, isGreatDeal,
  isPopular, isAlmostGone, isLowStock, destinationUrl, coverImage,
  displayPrice, basePrice, taxes, totalPrice, nights,
}: RoomCardProps & {
  isBestValue: boolean; isGreatDeal: boolean; isPopular: boolean;
  isAlmostGone: boolean; isLowStock: boolean; destinationUrl: string;
  coverImage: string; displayPrice: number; basePrice: number;
  taxes: number; totalPrice: number; nights: number;
}) {
  const t = useTranslations();
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  const [badgeVisible, setBadgeVisible] = useState(false);

  useEffect(() => {
    if (isInView) {
      const timer = setTimeout(() => setBadgeVisible(true), 200);
      return () => clearTimeout(timer);
    }
  }, [isInView]);

  return (
    <motion.div
      ref={ref}
      className="group/card will-change-transform"
      initial={{ opacity: 0, y: 24 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ type: 'spring', stiffness: 200, damping: 20, duration: 0.4 }}
    >
      <GlassCard className="p-4 md:p-5 flex flex-col md:flex-row gap-6 hover:border-brand-500/30 hover:shadow-xl transition-all duration-500 group-hover/card:scale-[1.01]">

        {/* ZONA VISUAL (Atraccion) */}
        <div className="w-full md:w-72 h-64 md:h-full min-h-[260px] bg-muted rounded-[var(--radius-squircle-2xl)] relative overflow-hidden shrink-0 shadow-inner">
          <Image
            src={getImageSizeUrl(coverImage, 'card')}
            alt={room.name}
            fill
            className="object-cover transition-transform duration-700 group-hover/card:scale-110"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 288px"
            quality={75}
            loading="lazy"
            placeholder={room.cover_image_blur ? 'blur' : undefined}
            blurDataURL={room.cover_image_blur}
          />

          {/* Badges superpuestos — Gravity Reveal con spring physics */}
          <div className="absolute top-4 left-4 flex flex-col gap-2">
            {isBestValue && (
              <motion.div
                initial={{ scale: 0.7, y: -8, opacity: 0 }}
                animate={badgeVisible ? { scale: 1, y: 0, opacity: 1 } : {}}
                transition={{ type: 'spring', stiffness: 400, damping: 12, delay: 0.1 }}
                className="bg-success text-success-foreground text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-widest shadow-md flex items-center gap-1.5"
              >
                <Award size={12} /> {t('ota.roomCard.bestValue')}
              </motion.div>
            )}
            {isGreatDeal && (
              <motion.div
                initial={{ scale: 0.7, y: -8, opacity: 0 }}
                animate={badgeVisible ? { scale: 1, y: 0, opacity: 1 } : {}}
                transition={{ type: 'spring', stiffness: 400, damping: 12, delay: 0.15 }}
                className="bg-brand-500 text-primary-foreground text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-widest shadow-md flex items-center gap-1.5"
              >
                <Star size={12} className="fill-white" /> {t('ota.roomCard.deal')}
              </motion.div>
            )}
            {isPopular && (
              <motion.div
                initial={{ scale: 0.7, y: -8, opacity: 0 }}
                animate={badgeVisible ? { scale: 1, y: 0, opacity: 1 } : {}}
                transition={{ type: 'spring', stiffness: 400, damping: 12, delay: 0.2 }}
                className="bg-warning text-warning-foreground text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-widest shadow-md flex items-center gap-1.5"
              >
                <TrendingUp size={12} /> {t('ota.roomCard.mostPopular')}
              </motion.div>
            )}
            {isAlmostGone && (
              <motion.div
                initial={{ scale: 0.7, y: -8, opacity: 0 }}
                animate={badgeVisible ? { scale: 1, y: 0, opacity: 1 } : {}}
                transition={{ type: 'spring', stiffness: 400, damping: 12, delay: 0.25 }}
                className="bg-urgent text-urgent-foreground text-xs font-bold px-3 py-1.5 rounded-full shadow-md flex items-center gap-1.5"
              >
                <Flame size={12} className="fill-white" /> {t('ota.roomCard.onlyXAvailable', { count: availableCount || 0 })}
              </motion.div>
            )}
            {isLowStock && !isAlmostGone && (
              <motion.div
                initial={{ scale: 0.7, y: -8, opacity: 0 }}
                animate={badgeVisible ? { scale: 1, y: 0, opacity: 1 } : {}}
                transition={{ type: 'spring', stiffness: 400, damping: 12, delay: 0.3 }}
                className="bg-warning/80 text-warning-foreground text-xs font-bold px-3 py-1.5 rounded-full shadow-md flex items-center gap-1.5"
              >
                <TrendingUp size={12} /> {t('ota.roomCard.highDemand')}
              </motion.div>
            )}
          </div>
        </div>

        {/* ZONA LOGICA Y EMOCIONAL (Retencion y Cierre) */}
        <div className="flex-1 flex flex-col justify-between py-2 pr-2">
          <div>
            <div className="flex justify-between items-start mb-3">
              <h4 className="text-2xl font-bold text-foreground tracking-tight">{room.name}</h4>
            <div className="flex flex-col items-end gap-1">
              <span className="text-xs bg-muted border border-border text-muted-foreground font-bold px-3 py-1 rounded-full uppercase tracking-widest whitespace-nowrap flex items-center gap-1">
                <Users size={12} /> Max {room.capacity}
              </span>
              {room.beds && room.beds > 0 && (
                <span className="text-xs bg-muted border border-border text-muted-foreground font-bold px-3 py-1 rounded-full uppercase tracking-widest whitespace-nowrap flex items-center gap-1">
                  <Bed size={12} /> {formatBedType(room.bed_type, room.beds)}
                </span>
              )}
            </div>
            </div>

            <p className="text-sm text-muted-foreground line-clamp-2 mb-4 font-lora italic">
              {room.description || t('ota.roomCard.fallbackDescription')}
            </p>

            {/* Amenidades — Mac 2026: label escaneable, no marketing prose */}
            <div className="flex flex-wrap gap-2 mb-6">
              {room.amenities?.slice(0, 4).map((amenity: string | { id: string }, idx: number) => {
                const id = typeof amenity === 'string' ? amenity : amenity.id;
                const entry = getRoomAmenityById(id);
                if (!entry) return null;
                const Icon = entry.icon;
                return (
                  <div key={idx} className="flex items-center gap-1.5 bg-muted/60 text-muted-foreground border border-border/40 px-2.5 py-1 rounded-[var(--radius-squircle-md)] text-xs font-medium">
                    <Icon size={14} /> {entry.label}
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
                      <span className="font-bold text-foreground">${basePrice.toLocaleString()}</span> x {nights} {t('ota.roomCard.nights', { count: nights })}
                    </p>
                    <p className="text-xs text-muted-foreground/60">+ {t('ota.roomCard.taxesAndFees')}: ${taxes.toLocaleString()}</p>
                  <div className="flex items-end gap-2 pt-1">
                    <p className="text-3xl font-mono font-bold text-secondary leading-none">
                      ${totalPrice.toLocaleString()}
                    </p>
                    <span className="text-xs font-sans font-medium text-muted-foreground mb-1">{t('ota.roomCard.copTotal')}</span>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-xs text-muted-foreground/60 font-bold uppercase tracking-widest mb-1">{t('ota.roomCard.baseRate')}</p>
                  <div className="flex items-end gap-2">
                    <p className="text-3xl font-mono font-bold text-secondary leading-none">
                      ${displayPrice.toLocaleString()}
                    </p>
                    <span className="text-xs font-sans font-medium text-muted-foreground mb-1">{t('ota.roomCard.copPerNight')}</span>
                  </div>
                </div>
              )}

              {hotel?.cancellation_policy && (
                <p className="text-xs font-medium text-secondary mt-2 flex items-center gap-1">
                  <ShieldCheck size={12} /> {t('ota.roomCard.freeCancellation')}
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
              {isSearchingDates ? t('ota.roomCard.secureRoom') : t('ota.roomCard.exploreRoom')} <ArrowRight size={16} strokeWidth={2.5} />
            </Link>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}
