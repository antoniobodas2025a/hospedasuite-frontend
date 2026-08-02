// @vitest-environment jsdom
import "../bun-test-dom-setup";
import "@testing-library/jest-dom";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, cleanup, act, fireEvent } from "@testing-library/react";
import RoomCard from "@/components/ota/RoomCard";

// Mock next/image to render a simple img that exposes priority/loading props
vi.mock("next/image", () => ({
  __esModule: true,
  default: ({ alt, src, loading, priority }: { alt: string; src: string; loading?: 'eager' | 'lazy'; priority?: boolean }) =>
    React.createElement("img", { alt, src, "data-loading": loading, "data-priority": priority ? 'true' : undefined }),
}));

// Mock next/link to render a simple anchor that forwards onClick
vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href, onClick }: { children: React.ReactNode; href: string; onClick?: () => void }) =>
    React.createElement("a", { href, onClick }, children),
}));

// Mock next/navigation
const mockSearchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams,
}));

// Mock framer-motion and expose animation props as data attributes for assertions
vi.mock("framer-motion", () => ({
  motion: {
    div: ({
      children,
      whileHover,
      whileTap,
      transition,
      ...props
    }: {
      children?: React.ReactNode;
      whileHover?: Record<string, unknown>;
      whileTap?: Record<string, unknown>;
      transition?: Record<string, unknown>;
      [key: string]: unknown;
    }) =>
      React.createElement("div", {
        ...props,
        "data-whilehover": whileHover ? JSON.stringify(whileHover) : undefined,
        "data-whiletap": whileTap ? JSON.stringify(whileTap) : undefined,
        "data-transition": transition ? JSON.stringify(transition) : undefined,
      }, children),
  },
  useInView: () => true,
  AnimatePresence: ({ children }: { children?: React.ReactNode }) =>
    React.createElement(React.Fragment, {}, children),
}));

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const messages: Record<string, string> = {
      'ota.roomCard.nights_one': 'noche',
      'ota.roomCard.nights_other': 'noches',
      'ota.roomCard.copTotal': 'COP total',
      'ota.roomCard.copPerNight': 'COP/noche',
      'ota.roomCard.baseRate': 'Tarifa Base',
      'ota.roomCard.freeCancellation': 'Cancelación Gratuita Disponible',
      'ota.roomCard.fallbackDescription': 'Un refugio acogedor',
      'ota.roomCard.reserve': 'Reservar',
    };
    return messages[key] ?? key;
  },
}));

// Mock amenity-registry
vi.mock("@/lib/amenity-registry", () => ({
  getRoomAmenityById: () => null,
}));

// Mock image-config
vi.mock("@/lib/image-config", () => ({
  getImageSizeUrl: (url: string) => url,
}));

// Mock room-helpers
vi.mock("@/lib/room-helpers", () => ({
  formatBedType: () => '1 cama',
}));

// Mock glass card
vi.mock("@/components/ui/glass", () => ({
  GlassCard: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("div", null, children),
}));

// Mock posthog for analytics assertions
vi.mock("posthog-js", () => ({
  __esModule: true,
  default: {
    capture: vi.fn(),
  },
}));

import posthog from "posthog-js";

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

const baseRoom = {
  id: 'room-1',
  name: 'Suite Deluxe',
  price: 200000,
  price_per_night: 200000,
  capacity: 2,
  status: 'active',
  gallery: [],
  description: 'Habitación amplia con vista al jardín',
};

describe("RoomCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    FakeIntersectionObserver.instances = [];
    globalThis.IntersectionObserver = FakeIntersectionObserver as unknown as typeof IntersectionObserver;
  });

  afterEach(() => {
    cleanup();
    mockSearchParams.forEach((_, key) => mockSearchParams.delete(key));
  });

  it("displays unified 'Reservar' button text without dates", () => {
    const { getByText } = render(
      <RoomCard
        room={baseRoom}
        hotelSlug="hotel-test"
        isSearchingDates={false}
        allRooms={[baseRoom]}
        totalRooms={1}
        availableCount={1}
        hotelId="hotel-test"
        hotel={{ tax_rate: 0.19 }}
      />
    );

    expect(getByText(/Reservar/i)).toBeInTheDocument();
  });

  it("displays unified 'Reservar' button text with dates selected", () => {
    const { getByText } = render(
      <RoomCard
        room={baseRoom}
        hotelSlug="hotel-test"
        checkIn="2026-08-10"
        checkOut="2026-08-11"
        isSearchingDates={true}
        allRooms={[baseRoom]}
        totalRooms={1}
        availableCount={1}
        hotelId="hotel-test"
        hotel={{ tax_rate: 0.19 }}
      />
    );

    expect(getByText(/Reservar/i)).toBeInTheDocument();
  });

  it("displays price with IVA breakdown when tax_rate is 0.19", () => {
    const { getByText } = render(
      <RoomCard
        room={baseRoom}
        hotelSlug="hotel-test"
        isSearchingDates={false}
        allRooms={[baseRoom]}
        totalRooms={1}
        availableCount={1}
        hotelId="hotel-test"
        hotel={{ tax_rate: 0.19 }}
      />
    );

    // $200.000 + IVA (19%): $38.000 | Total: $238.000
    expect(getByText(/\$200\.000/)).toBeInTheDocument();
    expect(getByText(/IVA \(19%\)/)).toBeInTheDocument();
    expect(getByText(/\$38\.000/)).toBeInTheDocument();
    expect(getByText(/\$238\.000/)).toBeInTheDocument();
  });

  it("displays 'IVA incluido' label when tax_rate is 0", () => {
    const { getByText, queryByText } = render(
      <RoomCard
        room={baseRoom}
        hotelSlug="hotel-test"
        isSearchingDates={false}
        allRooms={[baseRoom]}
        totalRooms={1}
        availableCount={1}
        hotelId="hotel-test"
        hotel={{ tax_rate: 0 }}
      />
    );

    expect(getByText(/IVA incluido/i)).toBeInTheDocument();
    expect(queryByText(/IVA \(19%\)/)).not.toBeInTheDocument();
  });

  it("calculates total for multiple nights with IVA", () => {
    const { getByText } = render(
      <RoomCard
        room={baseRoom}
        hotelSlug="hotel-test"
        checkIn="2026-08-10"
        checkOut="2026-08-13"
        isSearchingDates={true}
        allRooms={[baseRoom]}
        totalRooms={1}
        availableCount={1}
        hotelId="hotel-test"
        hotel={{ tax_rate: 0.19 }}
      />
    );

    // 3 nights: $200.000 × 3 = $600.000 + IVA (19%): $114.000 | Total: $714.000
    expect(getByText(/\$714\.000/)).toBeInTheDocument();
  });

  it("does not display legacy conditional button text", () => {
    const { queryByText } = render(
      <RoomCard
        room={baseRoom}
        hotelSlug="hotel-test"
        isSearchingDates={false}
        allRooms={[baseRoom]}
        totalRooms={1}
        availableCount={1}
        hotelId="hotel-test"
        hotel={{ tax_rate: 0.19 }}
      />
    );

    expect(queryByText('Asegurar Refugio')).not.toBeInTheDocument();
    expect(queryByText('Explorar Unidad')).not.toBeInTheDocument();
    expect(queryByText('Secure Room')).not.toBeInTheDocument();
    expect(queryByText('Explore Room')).not.toBeInTheDocument();
  });

  it("fires view_room when the card becomes 50% visible", () => {
    render(
      <RoomCard
        room={baseRoom}
        hotelSlug="hotel-test"
        isSearchingDates={false}
        allRooms={[baseRoom]}
        totalRooms={1}
        availableCount={1}
        hotelId="hotel-test"
        hotel={{ tax_rate: 0.19 }}
      />
    );

    const instance = FakeIntersectionObserver.instances[0];
    act(() => instance.trigger(true, 0.5));

    expect(posthog.capture).toHaveBeenCalledWith('view_room', {
      room_id: 'room-1',
      hotel_id: 'hotel-test',
      price: 200000,
      has_dates: false,
      tax_rate: 0.19,
    });
  });

  it("fires click_reserve when the reserve CTA is clicked", () => {
    const { container } = render(
      <RoomCard
        room={baseRoom}
        hotelSlug="hotel-test"
        checkIn="2026-08-10"
        checkOut="2026-08-11"
        isSearchingDates={true}
        allRooms={[baseRoom]}
        totalRooms={1}
        availableCount={1}
        hotelId="hotel-test"
        hotel={{ tax_rate: 0.19 }}
      />
    );

    const cta = container.querySelector('a');
    expect(cta).toBeTruthy();
    act(() => fireEvent.click(cta!));

    expect(posthog.capture).toHaveBeenCalledWith('click_reserve', {
      room_id: 'room-1',
      hotel_id: 'hotel-test',
      price: 200000,
      nights: 1,
      has_dates: true,
      tax_rate: 0.19,
    });
  });

  it("uses DEFAULT_TAX_RATE and fires tax_rate_fallback when tax_rate is null", () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(
      <RoomCard
        room={baseRoom}
        hotelSlug="hotel-test"
        isSearchingDates={false}
        allRooms={[baseRoom]}
        totalRooms={1}
        availableCount={1}
        hotelId="hotel-test"
        hotel={{ tax_rate: null as unknown as number }}
      />
    );

    const instance = FakeIntersectionObserver.instances[0];
    act(() => instance.trigger(true, 0.5));

    expect(posthog.capture).toHaveBeenCalledWith('tax_rate_fallback', {
      hotel_id: 'hotel-test',
      fallback_rate: 0.19,
    });
    expect(posthog.capture).toHaveBeenCalledWith('view_room', {
      room_id: 'room-1',
      hotel_id: 'hotel-test',
      price: 200000,
      has_dates: false,
      tax_rate: 0.19,
    });
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("renders skeleton placeholders when isLoading is true", () => {
    const { getAllByTestId, queryByText } = render(
      <RoomCard
        room={baseRoom}
        hotelSlug="hotel-test"
        isSearchingDates={false}
        allRooms={[baseRoom]}
        totalRooms={1}
        availableCount={1}
        hotelId="hotel-test"
        hotel={{ tax_rate: 0.19 }}
        isLoading
      />
    );

    expect(getAllByTestId('skeleton-loader').length).toBeGreaterThan(0);
    expect(queryByText(baseRoom.name)).not.toBeInTheDocument();
  });

  it("configures hover lift and active scale-down micro-animations", () => {
    const { container } = render(
      <RoomCard
        room={baseRoom}
        hotelSlug="hotel-test"
        isSearchingDates={false}
        allRooms={[baseRoom]}
        totalRooms={1}
        availableCount={1}
        hotelId="hotel-test"
        hotel={{ tax_rate: 0.19 }}
      />
    );

    const card = container.querySelector('[data-testid="room-card"]');
    expect(card).toBeInTheDocument();
    expect(card?.hasAttribute('data-whilehover')).toBe(true);
    expect(card?.hasAttribute('data-whiletap')).toBe(true);
    expect(JSON.parse(card?.getAttribute('data-whilehover') || '{}')).toHaveProperty('y', -4);
    expect(JSON.parse(card?.getAttribute('data-whiletap') || '{}')).toHaveProperty('scale', 0.96);
  });

  it("makes the reserve CTA keyboard focusable", () => {
    const { container } = render(
      <RoomCard
        room={baseRoom}
        hotelSlug="hotel-test"
        isSearchingDates={false}
        allRooms={[baseRoom]}
        totalRooms={1}
        availableCount={1}
        hotelId="hotel-test"
        hotel={{ tax_rate: 0.19 }}
      />
    );

    const cta = container.querySelector('a');
    expect(cta).toBeTruthy();
    act(() => {
      cta?.focus();
    });
    expect(cta).toHaveFocus();
  });

  it("uses searchParams prop to preserve guests in reserve link", () => {
    const { container } = render(
      <RoomCard
        room={baseRoom}
        hotelSlug="hotel-test"
        isSearchingDates={false}
        allRooms={[baseRoom]}
        totalRooms={1}
        availableCount={1}
        hotelId="hotel-test"
        hotel={{ tax_rate: 0.19 }}
        searchParams={new URLSearchParams({ guests: "2" })}
      />
    );

    const cta = container.querySelector('a');
    expect(cta).toBeTruthy();
    expect(cta?.getAttribute('href')).toContain('guests=2');
    expect(cta?.getAttribute('href')).toContain('showRoom=room-1');
  });

  it("loads hero image eagerly when imagePriority is true", () => {
    const { container } = render(
      <RoomCard
        room={{ ...baseRoom, gallery: ['https://example.com/hero.jpg'] }}
        hotelSlug="hotel-test"
        isSearchingDates={false}
        allRooms={[baseRoom]}
        totalRooms={1}
        availableCount={1}
        hotelId="hotel-test"
        hotel={{ tax_rate: 0.19 }}
        imagePriority
      />
    );

    const img = container.querySelector('img');
    expect(img).toBeTruthy();
    expect(img?.getAttribute('data-loading')).toBe('eager');
    expect(img?.getAttribute('data-priority')).toBe('true');
  });
});
