// @vitest-environment jsdom
import '../bun-test-dom-setup';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import posthog from 'posthog-js';
import {
  trackViewRoom,
  trackClickReserve,
  trackOpenRoomModal,
  trackCloseRoomModal,
  trackCompleteBooking,
  trackAbandonBooking,
} from '@/lib/analytics';

vi.mock('posthog-js', () => ({
  __esModule: true,
  default: {
    capture: vi.fn(),
  },
}));

describe('Booking analytics event dispatchers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('dispatches view_room with correct properties', () => {
    trackViewRoom({
      room_id: 'room-1',
      hotel_id: 'hotel-1',
      price: 200000,
      has_dates: false,
    });

    expect(posthog.capture).toHaveBeenCalledWith('view_room', {
      room_id: 'room-1',
      hotel_id: 'hotel-1',
      price: 200000,
      has_dates: false,
    });
  });

  it('dispatches click_reserve with correct properties', () => {
    trackClickReserve({
      room_id: 'room-1',
      hotel_id: 'hotel-1',
      price: 238000,
      nights: 2,
      has_dates: true,
    });

    expect(posthog.capture).toHaveBeenCalledWith('click_reserve', {
      room_id: 'room-1',
      hotel_id: 'hotel-1',
      price: 238000,
      nights: 2,
      has_dates: true,
    });
  });

  it('dispatches open_room_modal with correct properties', () => {
    trackOpenRoomModal({
      room_id: 'room-1',
      hotel_id: 'hotel-1',
      source: 'card',
    });

    expect(posthog.capture).toHaveBeenCalledWith('open_room_modal', {
      room_id: 'room-1',
      hotel_id: 'hotel-1',
      source: 'card',
    });
  });

  it('dispatches close_room_modal with correct properties', () => {
    trackCloseRoomModal({
      room_id: 'room-1',
      hotel_id: 'hotel-1',
      action: 'reserve',
    });

    expect(posthog.capture).toHaveBeenCalledWith('close_room_modal', {
      room_id: 'room-1',
      hotel_id: 'hotel-1',
      action: 'reserve',
    });
  });

  it('dispatches complete_booking with correct properties', () => {
    trackCompleteBooking({
      room_id: 'room-1',
      hotel_id: 'hotel-1',
      total_price: 476000,
      nights: 2,
      guests: 2,
      payment_method: 'wompi',
    });

    expect(posthog.capture).toHaveBeenCalledWith('complete_booking', {
      room_id: 'room-1',
      hotel_id: 'hotel-1',
      total_price: 476000,
      nights: 2,
      guests: 2,
      payment_method: 'wompi',
    });
  });

  it('dispatches abandon_booking with correct properties', () => {
    trackAbandonBooking({
      room_id: 'room-1',
      hotel_id: 'hotel-1',
      step: 'modal',
      time_spent: 42,
    });

    expect(posthog.capture).toHaveBeenCalledWith('abandon_booking', {
      room_id: 'room-1',
      hotel_id: 'hotel-1',
      step: 'modal',
      time_spent: 42,
    });
  });
});
