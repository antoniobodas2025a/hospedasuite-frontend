'use client';

import { useEffect } from 'react';
import { trackCompleteBooking } from '@/lib/analytics';

interface BookingSuccessTrackerProps {
  roomId: string;
  hotelId: string;
  totalPrice: number;
  nights: number;
  guests: number;
  paymentMethod: string;
}

/**
 * Client-side tracker that fires the complete_booking analytics event
 * once the booking success page has loaded.
 */
export function BookingSuccessTracker({
  roomId,
  hotelId,
  totalPrice,
  nights,
  guests,
  paymentMethod,
}: BookingSuccessTrackerProps) {
  useEffect(() => {
    trackCompleteBooking({
      room_id: roomId,
      hotel_id: hotelId,
      total_price: totalPrice,
      nights,
      guests,
      payment_method: paymentMethod,
    });
  }, [roomId, hotelId, totalPrice, nights, guests, paymentMethod]);

  return null;
}
