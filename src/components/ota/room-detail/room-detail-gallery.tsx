'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ChevronRight, ArrowRight, Users, Bed } from 'lucide-react';
import { useTranslations } from 'next-intl';
import RoomGalleryGrid from '@/components/ota/RoomGalleryGrid';
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

export function RoomDetailGallery({
  output,
  selectedCheckIn,
  selectedCheckOut,
}: RoomDetailGalleryProps) {
  const t = useTranslations();

  const checkIn = selectedCheckIn ?? output.initialCheckIn;
  const checkOut = selectedCheckOut ?? output.initialCheckOut;
  const checkInStr = toISODate(checkIn);
  const checkOutStr = toISODate(checkOut);

  const heroImage = output.gallery[0]?.url || output.coverImage || undefined;
  // Hero already renders gallery[0], so the grid starts from gallery[1]
  // to avoid showing the same image twice (especially in the mobile carousel).
  const galleryForGrid = heroImage ? output.gallery.slice(1) : output.gallery;

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
                <h1 className="text-2xl lg:text-3xl font-black font-lora text-white tracking-tight truncate">
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
          <h1 className="text-2xl lg:text-3xl font-black font-lora text-foreground tracking-tight truncate">
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

      {/* Gallery grid */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: MOTION_DURATION.slow / 1000,
          ease: MOTION_EASING.easeOut,
        }}
      >
        {galleryForGrid.length > 0 ? (
          <RoomGalleryGrid
            images={galleryForGrid}
            roomName={output.roomName}
            roomId={output.roomId}
            layout="detail-page"
          />
        ) : null}
      </motion.div>

      {/* Ver otras habitaciones */}
      {output.showOtherRooms && (
        <div>
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
