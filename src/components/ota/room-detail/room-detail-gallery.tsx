'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ChevronRight, ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import RoomGalleryGrid from '@/components/ota/RoomGalleryGrid';
import { RoomInfoPanel } from '@/components/ota/RoomInfoPanel';
import { GlassCard, GlassPill } from '@/components/ui/glass';
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
  const nights = checkIn && checkOut ? calculateNights(checkIn, checkOut) : 1;

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
      price_per_night: output.pricing?.weekdayPrice ?? 0,
      price: output.pricing?.weekdayPrice ?? 0,
    }),
    [output]
  );

  const handleChangeDates = React.useCallback(() => {
    dispatch({ type: 'CHANGE_DATES' });
  }, [dispatch]);

  const handleReserve = React.useCallback(() => {
    if (!output.canBook || !checkInStr || !checkOutStr) return;
    const url = `/book/${output.hotelSlug}/checkout?room=${output.roomId}&checkin=${checkInStr}&checkout=${checkOutStr}`;
    router.push(url);
  }, [output.canBook, output.hotelSlug, output.roomId, checkInStr, checkOutStr, router]);

  return (
    <div data-testid="room-detail-gallery" data-checkin={checkInStr} data-checkout={checkOutStr} className="p-4 lg:p-6 space-y-6">
      {/* Sticky header — mobile only */}
      <div className="lg:hidden sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/40 -mx-4 px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <nav aria-label="breadcrumb" className="mb-1">
              <ol className="flex items-center text-[10px] text-muted-foreground">
                <li>
                  <Link href={output.breadcrumb.href} className="hover:text-foreground transition-colors">
                    {output.hotelName}
                  </Link>
                </li>
                <li aria-hidden="true">
                  <ChevronRight size={10} className="mx-1" />
                </li>
                <li className="truncate font-medium text-foreground">{output.roomName}</li>
              </ol>
            </nav>
            <h1 className="text-lg font-bold text-foreground truncate">{output.roomName}</h1>
          </div>
          {output.pricing && (
            <div className="text-right shrink-0">
              <p className="text-[10px] text-muted-foreground">{nights} {t('ota.showcase.nights', { count: nights })}</p>
              <p className="text-base font-black text-brand-600">${formatPrice(output.pricing.total)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Desktop header */}
      <div className="hidden lg:block space-y-2">
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
        <h1 className="text-2xl lg:text-3xl font-black text-foreground tracking-tight">{output.roomName}</h1>
      </div>

      {/* Two-column layout: gallery + info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Left — gallery */}
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
          />
        </motion.div>

        {/* Right — info panel + sticky CTA */}
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
      {output.pricing && (
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
                <p className="text-xl font-black text-foreground">${formatPrice(output.pricing.total)}</p>
              </div>
              {output.pricing.tax > 0 && (
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
            <div className="flex items-center gap-2">
              <motion.button
                type="button"
                onClick={handleChangeDates}
                whileTap={{ scale: 0.96 }}
                transition={{
                  duration: MOTION_DURATION.normal / 1000,
                  ease: MOTION_EASING.easeOut,
                }}
                className={cn(
                  'px-4 py-3 rounded-[var(--radius-squircle-md)]',
                  'text-sm font-bold text-foreground',
                  'bg-muted hover:bg-muted/80 transition-colors'
                )}
              >
                {t('ota.roomDetail.changeDates')}
              </motion.button>
              <motion.button
                type="button"
                onClick={handleReserve}
                disabled={!output.canBook}
                whileTap={{ scale: 0.96 }}
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
            </div>
          </GlassPill>
        </motion.div>
      )}

      {/* Mobile stacked CTA */}
      {output.pricing && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 p-4 bg-background/95 backdrop-blur-xl border-t border-border/40">
          <GlassCard className="flex items-center justify-between gap-3 p-3">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                {nights} {t('ota.showcase.nights', { count: nights })}
              </p>
              <p className="text-lg font-black text-brand-600">${formatPrice(output.pricing.total)}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleChangeDates}
                className="px-3 py-2.5 rounded-[var(--radius-squircle-md)] text-xs font-bold bg-muted text-foreground hover:bg-muted/80 transition-colors"
              >
                {t('ota.roomDetail.changeDates')}
              </button>
              <button
                type="button"
                onClick={handleReserve}
                disabled={!output.canBook}
                className={cn(
                  'px-4 py-2.5 rounded-[var(--radius-squircle-md)]',
                  'bg-primary text-primary-foreground font-bold text-xs',
                  'hover:bg-primary/90 transition-colors',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                {t('ota.booking.reserve')}
              </button>
            </div>
          </GlassCard>
        </div>
      )}

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

