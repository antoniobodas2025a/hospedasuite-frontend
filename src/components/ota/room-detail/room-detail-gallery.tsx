'use client';

import React, { useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ChevronRight, ArrowRight, Users, Bed } from 'lucide-react';
import { useTranslations } from 'next-intl';
import RoomGalleryGrid from '@/components/ota/RoomGalleryGrid';
import { RoomInfoPanel } from '@/components/ota/RoomInfoPanel';
import { GlassPill } from '@/components/ui/glass';
import { cn } from '@/lib/utils';
import { formatPrice } from '@/lib/pricing';
import { MOTION_DURATION, MOTION_EASING } from '@/lib/motion-tokens';
import type { RoomDetailViewModelOutput } from '@/view-models/room-detail-view-model';
import type { RoomDetailClientAction, RoomDetailState } from './room-detail-client';

interface RoomDetailGalleryProps {
  output: RoomDetailViewModelOutput;
  state: RoomDetailState;
  dispatch: React.Dispatch<RoomDetailClientAction>;
  selectedCheckIn?: Date | null;
  selectedCheckOut?: Date | null;
}

function toISODate(date: Date | null | undefined): string {
  if (!date) return '';
  return date.toISOString().split('T')[0];
}

function calculateNights(checkIn: Date, checkOut: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.max(1, Math.round((checkOut.getTime() - checkIn.getTime()) / msPerDay));
}

export function RoomDetailGallery({
  output,
  state,
  dispatch,
  selectedCheckIn,
  selectedCheckOut,
}: RoomDetailGalleryProps) {
  const t = useTranslations();
  const router = useRouter();

  const checkIn = selectedCheckIn ?? output.initialCheckIn;
  const checkOut = selectedCheckOut ?? output.initialCheckOut;
  const checkInStr = toISODate(checkIn);
  const checkOutStr = toISODate(checkOut);
  const hasDates = Boolean(checkIn && checkOut);
  const nights = hasDates && checkIn && checkOut ? calculateNights(checkIn, checkOut) : 1;

  const roomForInfoPanel = useMemo(
    () => ({
      id: output.roomId,
      name: output.roomName,
      description: output.description,
      capacity: output.capacity,
      beds: output.beds,
      bed_type: output.bedType,
      gallery: output.gallery,
      amenities: output.amenities.map((a) => a.id),
      price_per_night: output.pricing?.subtotal ? Math.round(output.pricing.subtotal / nights) : output.pricePerNight,
      price: output.pricing?.subtotal ? Math.round(output.pricing.subtotal / nights) : output.pricePerNight,
    }),
    [output, nights]
  );

  const handleReserve = React.useCallback(() => {
    if (!output.canBook || !checkInStr || !checkOutStr) return;
    const url = `/book/${output.hotelSlug}/checkout?room=${output.roomId}&checkin=${checkInStr}&checkout=${checkOutStr}`;
    router.push(url);
  }, [output.canBook, output.hotelSlug, output.roomId, checkInStr, checkOutStr, router]);

  const heroImage = output.gallery[0]?.url || output.coverImage || undefined;

  return (
    <div data-testid="room-detail-gallery" data-checkin={checkInStr} data-checkout={checkOutStr} className="space-y-6">
      {/* Breadcrumb + room name + hero image */}
      {heroImage ? (
        <>
          <motion.div
            data-testid="room-hero"
            initial={{ scale: 1.05, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              duration: MOTION_DURATION.slow / 1000,
              ease: MOTION_EASING.easeOut,
            }}
          >
            <div className="relative aspect-[16/9] lg:aspect-[21/9] overflow-hidden rounded-[var(--radius-squircle-2xl)]">
              <Image
                src={heroImage}
                alt={output.roomName}
                fill
                className="object-cover"
                priority
              />
              <div className="absolute inset-x-0 bottom-0 h-[40%] bg-gradient-to-t from-black/60 via-black/30 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4 lg:p-6 space-y-1">
                <nav aria-label="breadcrumb">
                  <ol className="flex items-center text-xs text-white/70">
                    <li>
                      <Link
                        href={output.breadcrumb.href}
                        className="text-white underline-offset-2 hover:underline transition-colors"
                      >
                        {output.hotelName}
                      </Link>
                    </li>
                    <li aria-hidden="true">
                      <ChevronRight size={12} className="mx-1.5" />
                    </li>
                    <li className="font-medium text-white">{output.roomName}</li>
                  </ol>
                </nav>
                <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight">
                  {output.roomName}
                </h1>
              </div>
            </div>
          </motion.div>
        </>
      ) : (
        <div className="space-y-2">
          <nav aria-label="breadcrumb">
            <ol className="flex items-center text-xs text-muted-foreground">
              <li>
                <Link href={output.breadcrumb.href} className="hover:text-foreground transition-colors">
                  {output.hotelName}
                </Link>
              </li>
              <li aria-hidden="true">
                <ChevronRight size={12} className="mx-1.5" />
              </li>
              <li className="font-medium text-foreground">{output.roomName}</li>
            </ol>
          </nav>
          <h1 className="text-2xl lg:text-3xl font-black text-foreground tracking-tight">
            {output.roomName}
          </h1>
        </div>
      )}

      {/* Compact info strip */}
      {output.capacity > 0 && (
        <div
          data-testid="room-info-strip"
          className="flex items-center gap-2 text-sm text-muted-foreground"
        >
          <Users size={16} />
          <span>
            {output.capacity} {t('ota.roomDetail.guests')}
          </span>
          <span>·</span>
          <Bed size={16} />
          <span>
            {output.beds} {output.bedType}
          </span>
        </div>
      )}

      {/* Main content: gallery + info panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: MOTION_DURATION.slow / 1000,
            ease: MOTION_EASING.easeOut,
          }}
        >
          <RoomGalleryGrid
            images={output.gallery}
            roomName={output.roomName}
            roomId={output.roomId}
            layout="detail-page"
          />
        </motion.div>

        <div className="space-y-6">
          <RoomInfoPanel
            room={roomForInfoPanel}
            checkIn={checkInStr}
            checkOut={checkOutStr}
            defaultGuests={2}
            isOverCapacity={false}
            nights={nights}
            taxRate={output.pricing?.taxRate}
            variant="desktop"
            cancellationPolicy={output.cancellationPolicy}
          />

          {/* Ver otras habitaciones — desktop placement */}
          {output.showOtherRooms && (
            <div className="hidden lg:block">
              <Link
                href={output.breadcrumb.href}
                className="inline-flex items-center gap-1 text-sm font-bold text-brand-600 hover:text-brand-500 transition-colors"
              >
                {t('ota.showcase.seeOtherRooms')} <ArrowRight size={14} />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Sticky CTA dock — desktop */}
      <motion.div
        data-testid="cta-dock"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        transition={{
          duration: MOTION_DURATION.normal / 1000,
          ease: MOTION_EASING.easeOut,
        }}
        className="hidden lg:block fixed bottom-6 left-1/2 -translate-x-1/2 z-30 w-full max-w-2xl px-4"
      >
        <GlassPill className="flex items-center justify-between gap-4 p-2 pl-6 shadow-2xl">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                {nights} {t('ota.showcase.nights', { count: nights })}
              </p>
              <p className="text-xl font-black text-foreground">
                ${formatPrice(output.pricing?.total ?? output.pricePerNight * nights)}
              </p>
            </div>
            {output.pricing && output.pricing.tax > 0 && (
              <div className="hidden sm:block text-xs text-muted-foreground">
                <p>
                  {t('ota.showcase.total')}: ${formatPrice(output.pricing.subtotal)}
                </p>
                <p>
                  IVA ({Math.round(output.pricing.taxRate * 100)}%): ${formatPrice(output.pricing.tax)}
                </p>
              </div>
            )}
          </div>
          <motion.button
            type="button"
            onClick={handleReserve}
            disabled={!hasDates || !output.canBook}
            whileTap={hasDates ? { scale: 0.96 } : undefined}
            transition={{
              duration: MOTION_DURATION.normal / 1000,
              ease: MOTION_EASING.easeOut,
            }}
            className={cn(
              'px-6 py-3 rounded-[var(--radius-squircle-md)]',
              'bg-primary text-primary-foreground font-bold text-sm',
              'hover:bg-primary/90 transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {t('ota.booking.reserve')}
          </motion.button>
        </GlassPill>
      </motion.div>

      {/* Mobile Ver otras habitaciones */}
      {output.showOtherRooms && (
        <div className="lg:hidden pb-24">
          <Link
            href={output.breadcrumb.href}
            className="inline-flex items-center gap-1 text-sm font-bold text-brand-600 hover:text-brand-500 transition-colors"
          >
            {t('ota.showcase.seeOtherRooms')} <ArrowRight size={14} />
          </Link>
        </div>
      )}
    </div>
  );
}
