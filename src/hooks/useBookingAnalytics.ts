'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  trackViewRoom,
  trackClickReserve,
  trackOpenRoomModal,
  trackCloseRoomModal,
  trackCompleteBooking,
  trackAbandonBooking,
} from '@/lib/analytics';

interface UseBookingAnalyticsProps {
  hotelId?: string;
  roomId?: string;
  price?: number;
  nights?: number;
  hasDates?: boolean;
  taxRate?: number;
}

/**
 * Hook for booking-flow analytics.
 *
 * Tracks:
 * - view_room: when the tracked element (room card) is 50%+ visible in the viewport.
 * - click_reserve: when the user clicks the reserve CTA.
 * - open_room_modal / close_room_modal: modal lifecycle events.
 * - complete_booking: successful payment confirmation.
 * - abandon_booking: user leaves the flow without completing.
 *
 * Usage:
 *   const { trackViewRef, trackClickReserve } = useBookingAnalytics({ hotelId, roomId, ... });
 *   <div ref={trackViewRef}>...</div>
 *   <button onClick={trackClickReserve}>Reservar</button>
 */
export function useBookingAnalytics({
  hotelId,
  roomId,
  price = 0,
  nights = 1,
  hasDates = false,
  taxRate = 0,
}: UseBookingAnalyticsProps) {
  const [viewElement, setViewElement] = useState<HTMLElement | null>(null);
  const [hasViewed, setHasViewed] = useState(false);

  const propsRef = useRef<UseBookingAnalyticsProps>({
    hotelId,
    roomId,
    price,
    nights,
    hasDates,
    taxRate,
  });

  useEffect(() => {
    propsRef.current = { hotelId, roomId, price, nights, hasDates, taxRate };
  });

  useEffect(() => {
    if (!viewElement || typeof window === 'undefined' || hasViewed) return;
    if (!hotelId || !roomId) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            const { hotelId: hid, roomId: rid, price: p, hasDates: hd, taxRate: tr } = propsRef.current;
            trackViewRoom({
              room_id: rid!,
              hotel_id: hid!,
              price: p ?? 0,
              has_dates: hd ?? false,
              tax_rate: tr ?? 0,
            });
            setHasViewed(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.5 }
    );

    observer.observe(viewElement);
    return () => observer.disconnect();
  }, [viewElement, hasViewed, hotelId, roomId]);

  const onClickReserve = useCallback(() => {
    if (!hotelId || !roomId) return;
    trackClickReserve({
      room_id: roomId,
      hotel_id: hotelId,
      price: price ?? 0,
      nights: nights ?? 1,
      has_dates: hasDates ?? false,
      tax_rate: taxRate ?? 0,
    });
  }, [hotelId, roomId, price, nights, hasDates, taxRate]);

  const onOpenRoomModal = useCallback(
    ({ source }: { source: 'card' | 'sidebar' }) => {
      if (!hotelId || !roomId) return;
      trackOpenRoomModal({
        room_id: roomId,
        hotel_id: hotelId,
        source,
      });
    },
    [hotelId, roomId]
  );

  const onCloseRoomModal = useCallback(
    ({ action }: { action: 'reserve' | 'back' | 'esc' }) => {
      if (!hotelId || !roomId) return;
      trackCloseRoomModal({
        room_id: roomId,
        hotel_id: hotelId,
        action,
      });
    },
    [hotelId, roomId]
  );

  const onCompleteBooking = useCallback(
    ({
      total_price,
      guests,
      payment_method,
    }: {
      total_price: number;
      guests: number;
      payment_method: string;
    }) => {
      if (!hotelId || !roomId) return;
      trackCompleteBooking({
        room_id: roomId,
        hotel_id: hotelId,
        total_price,
        nights: nights ?? 1,
        guests,
        payment_method,
      });
    },
    [hotelId, roomId, nights]
  );

  const onAbandonBooking = useCallback(
    ({ step, time_spent }: { step: 'card' | 'modal' | 'checkout'; time_spent: number }) => {
      if (!hotelId || !roomId) return;
      trackAbandonBooking({
        room_id: roomId,
        hotel_id: hotelId,
        step,
        time_spent,
      });
    },
    [hotelId, roomId]
  );

  return {
    trackViewRef: setViewElement,
    trackClickReserve: onClickReserve,
    trackOpenRoomModal: onOpenRoomModal,
    trackCloseRoomModal: onCloseRoomModal,
    trackCompleteBooking: onCompleteBooking,
    trackAbandonBooking: onAbandonBooking,
  };
}
