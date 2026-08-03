// @vitest-environment jsdom
import '../../../__tests__/bun-test-dom-setup';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, cleanup } from '@testing-library/react';
import { BookingSuccessTracker } from '../BookingSuccessTracker';
import { trackCompleteBooking } from '@/lib/analytics';

vi.mock('@/lib/analytics', () => ({
  trackCompleteBooking: vi.fn(),
}));

describe('BookingSuccessTracker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('fires complete_booking on success page load with booking details', () => {
    render(
      <BookingSuccessTracker
        roomId="room-1"
        hotelId="hotel-1"
        totalPrice={476000}
        nights={2}
        guests={2}
        paymentMethod="wompi"
      />
    );

    expect(trackCompleteBooking).toHaveBeenCalledTimes(1);
    expect(trackCompleteBooking).toHaveBeenCalledWith({
      room_id: 'room-1',
      hotel_id: 'hotel-1',
      total_price: 476000,
      nights: 2,
      guests: 2,
      payment_method: 'wompi',
    });
  });

  it('fires complete_booking with direct payment method', () => {
    render(
      <BookingSuccessTracker
        roomId="room-2"
        hotelId="hotel-2"
        totalPrice={250000}
        nights={1}
        guests={1}
        paymentMethod="direct"
      />
    );

    expect(trackCompleteBooking).toHaveBeenCalledWith({
      room_id: 'room-2',
      hotel_id: 'hotel-2',
      total_price: 250000,
      nights: 1,
      guests: 1,
      payment_method: 'direct',
    });
  });
});
