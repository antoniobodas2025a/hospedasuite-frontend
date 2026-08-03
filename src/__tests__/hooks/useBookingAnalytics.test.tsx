// @vitest-environment jsdom
import '../bun-test-dom-setup';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, fireEvent, cleanup, act } from '@testing-library/react';
import posthog from 'posthog-js';
import { useBookingAnalytics } from '@/hooks/useBookingAnalytics';

vi.mock('posthog-js', () => ({
  __esModule: true,
  default: {
    capture: vi.fn(),
  },
}));

class FakeIntersectionObserver {
  readonly root: Element | null = null;
  readonly rootMargin: string = '0px';
  readonly thresholds: readonly number[] = [0.5];
  private callback: IntersectionObserverCallback;
  private observed: Element[] = [];
  static instances: FakeIntersectionObserver[] = [];

  constructor(
    callback: IntersectionObserverCallback,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _options?: IntersectionObserverInit
  ) {
    this.callback = callback;
    FakeIntersectionObserver.instances.push(this);
  }

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }

  observe(element: Element) {
    this.observed.push(element);
  }

  unobserve(element: Element) {
    this.observed = this.observed.filter((el) => el !== element);
  }

  disconnect() {
    this.observed = [];
  }

  trigger(isIntersecting: boolean, intersectionRatio: number) {
    this.callback(
      this.observed.map((target) => ({
        target,
        isIntersecting,
        intersectionRatio,
        boundingClientRect: {} as DOMRectReadOnly,
        intersectionRect: {} as DOMRectReadOnly,
        rootBounds: null,
        time: Date.now(),
      })) as IntersectionObserverEntry[],
      this
    );
  }
}

function AllEventsFixture({
  price = 200000,
  nights = 1,
  hasDates = false,
  taxRate = 0.19,
}: {
  price?: number;
  nights?: number;
  hasDates?: boolean;
  taxRate?: number;
}) {
  const {
    trackViewRef,
    trackClickReserve,
    trackOpenRoomModal,
    trackCloseRoomModal,
    trackCompleteBooking,
    trackAbandonBooking,
  } = useBookingAnalytics({
    hotelId: 'hotel-1',
    roomId: 'room-1',
    price,
    nights,
    hasDates,
    taxRate,
  });

  return (
    <div ref={trackViewRef} data-testid="room-card">
      <button onClick={trackClickReserve} data-testid="reserve">
        Reservar
      </button>
      <button onClick={() => trackOpenRoomModal({ source: 'card' })} data-testid="open">
        Abrir
      </button>
      <button onClick={() => trackCloseRoomModal({ action: 'back' })} data-testid="close">
        Cerrar
      </button>
      <button onClick={() => trackCompleteBooking({ total_price: 476000, guests: 2, payment_method: 'wompi' })} data-testid="complete">
        Completar
      </button>
      <button onClick={() => trackAbandonBooking({ step: 'modal', time_spent: 42 })} data-testid="abandon">
        Abandonar
      </button>
    </div>
  );
}

describe('useBookingAnalytics', () => {
  beforeEach(() => {
    FakeIntersectionObserver.instances = [];
    globalThis.IntersectionObserver = FakeIntersectionObserver as unknown as typeof IntersectionObserver;
  });

  afterEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('fires view_room when the tracked element becomes 50% visible', () => {
    render(<AllEventsFixture />);
    const instance = FakeIntersectionObserver.instances[0];

    act(() => instance.trigger(true, 0.5));

    expect(posthog.capture).toHaveBeenCalledWith('view_room', {
      room_id: 'room-1',
      hotel_id: 'hotel-1',
      price: 200000,
      has_dates: false,
      tax_rate: 0.19,
    });
  });

  it('does not fire view_room more than once', () => {
    render(<AllEventsFixture />);
    const instance = FakeIntersectionObserver.instances[0];

    act(() => {
      instance.trigger(true, 0.5);
      instance.trigger(true, 0.5);
    });

    expect(posthog.capture).toHaveBeenCalledTimes(1);
  });

  it('does not fire view_room when the element is less than 50% visible', () => {
    render(<AllEventsFixture />);
    const instance = FakeIntersectionObserver.instances[0];

    act(() => instance.trigger(true, 0.25));

    expect(posthog.capture).not.toHaveBeenCalled();
  });

  it('fires click_reserve with the configured context', () => {
    const { getByTestId } = render(<AllEventsFixture nights={2} hasDates={true} />);
    fireEvent.click(getByTestId('reserve'));

    expect(posthog.capture).toHaveBeenCalledWith('click_reserve', {
      room_id: 'room-1',
      hotel_id: 'hotel-1',
      price: 200000,
      nights: 2,
      has_dates: true,
      tax_rate: 0.19,
    });
  });

  it('fires open_room_modal with the provided source', () => {
    const { getByTestId } = render(<AllEventsFixture />);
    fireEvent.click(getByTestId('open'));

    expect(posthog.capture).toHaveBeenCalledWith('open_room_modal', {
      room_id: 'room-1',
      hotel_id: 'hotel-1',
      source: 'card',
    });
  });

  it('fires close_room_modal with the provided action', () => {
    const { getByTestId } = render(<AllEventsFixture />);
    fireEvent.click(getByTestId('close'));

    expect(posthog.capture).toHaveBeenCalledWith('close_room_modal', {
      room_id: 'room-1',
      hotel_id: 'hotel-1',
      action: 'back',
    });
  });

  it('fires complete_booking with the provided details', () => {
    const { getByTestId } = render(<AllEventsFixture />);
    fireEvent.click(getByTestId('complete'));

    expect(posthog.capture).toHaveBeenCalledWith('complete_booking', {
      room_id: 'room-1',
      hotel_id: 'hotel-1',
      total_price: 476000,
      nights: 1,
      guests: 2,
      payment_method: 'wompi',
    });
  });

  it('fires abandon_booking with the provided step and time spent', () => {
    const { getByTestId } = render(<AllEventsFixture />);
    fireEvent.click(getByTestId('abandon'));

    expect(posthog.capture).toHaveBeenCalledWith('abandon_booking', {
      room_id: 'room-1',
      hotel_id: 'hotel-1',
      step: 'modal',
      time_spent: 42,
    });
  });
});
