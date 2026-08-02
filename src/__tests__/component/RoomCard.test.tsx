// @vitest-environment jsdom
import "../bun-test-dom-setup";
import "@testing-library/jest-dom";
import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { render, cleanup } from "@testing-library/react";
import RoomCard from "@/components/ota/RoomCard";

// Mock next/image to render a simple img
vi.mock("next/image", () => ({
  __esModule: true,
  default: ({ alt, src }: { alt: string; src: string }) =>
    React.createElement("img", { alt, src }),
}));

// Mock next/link to render a simple anchor
vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) =>
    React.createElement("a", { href }, children),
}));

// Mock next/navigation
const mockSearchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams,
}));

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: { children?: React.ReactNode }) =>
      React.createElement("div", props, children),
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
        hotel={{ tax_rate: 0.19 }}
      />
    );

    // 3 nights: $200.000 × 3 = $600.000 + IVA (19%): $114.000 | Total: $714.000
    expect(getByText(/\$714\.000/)).toBeInTheDocument();
  });
});
