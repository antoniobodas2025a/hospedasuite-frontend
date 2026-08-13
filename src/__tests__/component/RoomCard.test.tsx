// @vitest-environment jsdom
import "../bun-test-dom-setup";
import "@testing-library/jest-dom";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, cleanup, act, fireEvent } from "@testing-library/react";
import RoomCard, { areRoomCardPropsEqual } from "@/components/ota/RoomCard";
import type { GalleryItem } from "@/types";

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
const mockRouter = { push: vi.fn() };
const mockSearchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
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
      layoutId,
      ...props
    }: {
      children?: React.ReactNode;
      whileHover?: Record<string, unknown>;
      whileTap?: Record<string, unknown>;
      transition?: Record<string, unknown>;
      layoutId?: string;
      [key: string]: unknown;
    }) =>
      React.createElement("div", {
        ...props,
        "data-whilehover": whileHover ? JSON.stringify(whileHover) : undefined,
        "data-whiletap": whileTap ? JSON.stringify(whileTap) : undefined,
        "data-transition": transition ? JSON.stringify(transition) : undefined,
        "data-layoutid": layoutId,
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
      'ota.roomCard.viewPhotos': 'Reservar',
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
  gallery: [] as GalleryItem[],
  description: 'Habitación amplia con vista al jardín',
};

describe("RoomCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    FakeIntersectionObserver.instances = [];
    globalThis.IntersectionObserver = FakeIntersectionObserver as unknown as typeof IntersectionObserver;
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    mockRouter.push.mockClear();
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

    // Base $200.000 | Total: $238.000 (IVA agregado)
    expect(getByText(/\$200\.000/)).toBeInTheDocument();
    expect(getByText(/IVA agregado/i)).toBeInTheDocument();
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

    expect(getByText(/Sin IVA/i)).toBeInTheDocument();
    expect(queryByText(/IVA agregado/i)).not.toBeInTheDocument();
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

  it("fires click_reserve and navigates to room detail page after the processing delay", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { getByRole } = render(
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

    const cta = getByRole('button', { name: /Reservar/i });
    expect(cta).toBeTruthy();

    act(() => fireEvent.click(cta));
    expect(cta).toBeDisabled();
    expect(cta.textContent).toContain('Procesando...');

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(posthog.capture).toHaveBeenCalledWith('click_reserve', {
      room_id: 'room-1',
      hotel_id: 'hotel-test',
      price: 200000,
      nights: 1,
      has_dates: true,
      tax_rate: 0.19,
    });
    expect(mockRouter.push).toHaveBeenCalledWith(
      expect.stringContaining('/hotel/hotel-test/room/room-1')
    );
    expect(mockRouter.push).toHaveBeenCalledWith(
      expect.stringContaining('checkin=2026-08-10')
    );
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

  it("renders a native scroll anchor id on the card wrapper", () => {
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

    const anchor = container.querySelector('#room-room-1');
    expect(anchor).toBeInTheDocument();
    expect(anchor).toHaveAttribute('data-testid', 'room-card');
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
    const { getByRole } = render(
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

    const cta = getByRole('button', { name: /Reservar/i });
    expect(cta).toBeTruthy();
    act(() => {
      cta?.focus();
    });
    expect(cta).toHaveFocus();
  });

  it("preserves guests in reserve link after the processing delay", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { getByRole } = render(
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

    const cta = getByRole('button', { name: /Reservar/i });
    expect(cta).toBeTruthy();

    act(() => fireEvent.click(cta));

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(mockRouter.push).toHaveBeenCalledWith(
      expect.stringContaining('guests=2')
    );
    expect(mockRouter.push).toHaveBeenCalledWith(
      expect.stringContaining('/hotel/hotel-test/room/room-1')
    );
  });

  it("loads hero image eagerly when imagePriority is true", () => {
    const { container } = render(
      <RoomCard
        room={{ ...baseRoom, gallery: [{ url: 'https://example.com/hero.jpg' }] as GalleryItem[] }}
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

  it("applies content-visibility to cards outside the initial viewport", () => {
    const { container: belowFold } = render(
      <RoomCard
        room={baseRoom}
        hotelSlug="hotel-test"
        isSearchingDates={false}
        allRooms={[baseRoom]}
        totalRooms={1}
        availableCount={1}
        hotelId="hotel-test"
        hotel={{ tax_rate: 0.19 }}
        index={2}
      />
    );

    const card = belowFold.querySelector('[data-testid="room-card"]');
    expect(card).toBeTruthy();
    expect(card?.getAttribute('style')).toContain('content-visibility');
  });

  it("does not apply content-visibility to above-the-fold cards", () => {
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
        index={0}
      />
    );

    const card = container.querySelector('[data-testid="room-card"]');
    expect(card).toBeTruthy();
    expect(card?.getAttribute('style') ?? '').not.toContain('content-visibility');
  });
});

describe("areRoomCardPropsEqual", () => {
  const baseProps = {
    room: baseRoom,
    hotelSlug: "hotel-test",
    hotelId: "hotel-test",
    checkIn: "2026-08-10",
    checkOut: "2026-08-11",
    isSearchingDates: false,
    isLoading: false,
    allRooms: [baseRoom],
    totalRooms: 1,
    availableCount: 1,
    hotel: { tax_rate: 0.19, cancellation_policy: "Flexible" },
    searchParams: new URLSearchParams({ guests: "2" }),
    imagePriority: false,
    index: 0,
  };

  it("returns true when all relevant props are equal", () => {
    expect(areRoomCardPropsEqual(baseProps, { ...baseProps })).toBe(true);
  });

  it("returns false when room reference changes", () => {
    expect(areRoomCardPropsEqual(baseProps, { ...baseProps, room: { ...baseRoom } })).toBe(false);
  });

  it("returns false when dates change", () => {
    expect(areRoomCardPropsEqual(baseProps, { ...baseProps, checkOut: "2026-08-12" })).toBe(false);
  });

  it("returns false when tax_rate changes", () => {
    expect(areRoomCardPropsEqual(baseProps, { ...baseProps, hotel: { ...baseProps.hotel, tax_rate: 0 } })).toBe(false);
  });

  it("returns false when searchParams change", () => {
    expect(areRoomCardPropsEqual(baseProps, { ...baseProps, searchParams: new URLSearchParams({ guests: "3" }) })).toBe(false);
  });

  it("returns false when imagePriority changes", () => {
    expect(areRoomCardPropsEqual(baseProps, { ...baseProps, imagePriority: true })).toBe(false);
  });

  it("returns false when index changes", () => {
    expect(areRoomCardPropsEqual(baseProps, { ...baseProps, index: 1 })).toBe(false);
  });
});
