// @vitest-environment jsdom
import "../bun-test-dom-setup";
import "@testing-library/jest-dom";
import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { render, cleanup } from "@testing-library/react";
import BookingWidget from "@/components/ota/BookingWidget";

// Mock next/navigation
const mockRouter = { push: vi.fn() };
const mockSearchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
  useSearchParams: () => mockSearchParams,
}));

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const messages: Record<string, string> = {
      'ota.booking.totalCOP': 'COP total',
      'ota.booking.nights': 'noches',
      'ota.booking.from': 'Desde',
      'ota.booking.copPerNight': 'COP/noche',
      'ota.booking.datesConfirmed': 'Fechas confirmadas',
      'ota.booking.selectDates': 'Selecciona tus fechas',
      'ota.booking.selectDatesHint': 'Usa la barra de busqueda para ver disponibilidad',
      'ota.booking.selectDatesFirst': 'Selecciona tus fechas primero',
      'ota.booking.selectDatesFirstHint': 'Usa la barra de busqueda de arriba',
      'ota.booking.of': 'de',
      'ota.booking.onlyOneLeft': 'Solo queda 1 disponible',
      'ota.booking.onlyXLeft': 'Solo quedan {count} disponibles',
      'ota.booking.noAvailability': 'Sin disponibilidad',
      'ota.booking.reserve': 'Reservar',
      'ota.booking.bestPriceGuaranteed': 'Mejor precio garantizado',
      'ota.booking.bestPriceDesc': 'Reserva directo sin comisiones',
      'ota.booking.instantConfirmation': 'Confirmacion inmediata',
      'ota.booking.instantConfirmationDesc': 'Tu habitacion se bloquea al instante',
      'ota.booking.cancellationPolicy': 'Politica de cancelacion',
      'ota.booking.guest_one': 'huésped',
      'ota.booking.guest_other': 'huéspedes',
      'ota.booking.unitsAvailable_one': 'unidad disponible',
      'ota.booking.unitsAvailable_other': 'unidades disponibles',
    };
    return messages[key] ?? key;
  },
  useLocale: () => 'es',
}));

// Mock glass component
vi.mock("@/components/ui/glass", () => ({
  GlassCard: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("div", null, children),
}));



const baseRooms = [
  {
    id: 'room-1',
    name: 'Suite Deluxe',
    price: 200000,
    price_per_night: 200000,
    capacity: 2,
    status: 'active',
  },
];

describe("BookingWidget", () => {
  afterEach(() => {
    cleanup();
    mockRouter.push.mockClear();
    mockSearchParams.forEach((_, key) => mockSearchParams.delete(key));
  });

  it("displays unified 'Reservar' button text without dates selected", () => {
    const { getByRole } = render(
      <BookingWidget
        rooms={baseRooms}
        taxRate={0.19}
      />
    );

    expect(getByRole('button', { name: /Reservar/ })).toBeInTheDocument();
  });

  it("displays unified 'Reservar' button text with dates selected", () => {
    const { getByRole } = render(
      <BookingWidget
        rooms={baseRooms}
        checkIn="2026-08-10"
        checkOut="2026-08-11"
        taxRate={0.19}
      />
    );

    expect(getByRole('button', { name: /Reservar/ })).toBeInTheDocument();
  });

  it("does not display conditional button text", () => {
    const { queryByText } = render(
      <BookingWidget
        rooms={baseRooms}
        taxRate={0.19}
      />
    );

    expect(queryByText('Ver Habitaciones')).not.toBeInTheDocument();
    expect(queryByText('Ver Disponibilidad')).not.toBeInTheDocument();
    expect(queryByText('Reservar Ahora')).not.toBeInTheDocument();
    expect(queryByText('Book Now')).not.toBeInTheDocument();
    expect(queryByText('Check Availability')).not.toBeInTheDocument();
    expect(queryByText('View Rooms')).not.toBeInTheDocument();
  });

  it("does not display 'Desde' label in the widget", () => {
    const { queryByText } = render(
      <BookingWidget
        rooms={baseRooms}
        taxRate={0.19}
      />
    );

    expect(queryByText(/Desde/i)).not.toBeInTheDocument();
  });

  it("displays total price with IVA when dates are selected", () => {
    const { getByText } = render(
      <BookingWidget
        rooms={baseRooms}
        checkIn="2026-08-10"
        checkOut="2026-08-11"
        taxRate={0.19}
      />
    );

    expect(getByText(/238\.000/)).toBeInTheDocument();
  });

  it("renders InlineDatePicker for date selection", () => {
    const { getByTestId } = render(
      <BookingWidget
        rooms={baseRooms}
        taxRate={0.19}
      />
    );

    expect(getByTestId('inline-date-picker')).toBeInTheDocument();
  });

  it("displays scarcity badge when only 1 room is available", () => {
    const { getByText } = render(
      <BookingWidget
        rooms={baseRooms}
        taxRate={0.19}
        totalRooms={1}
      />
    );

    expect(getByText(/Solo queda 1 disponible/i)).toBeInTheDocument();
  });

  it("shows tooltip on scarcity badge", () => {
    const { getByText } = render(
      <BookingWidget
        rooms={baseRooms}
        taxRate={0.19}
        totalRooms={1}
      />
    );

    const badge = getByText(/Solo queda 1 disponible/i);
    expect(badge.closest('[title]')).toHaveAttribute(
      'title',
      'Esta habitación se reserva rápido'
    );
  });

  it("renders skeleton placeholders when isLoading is true", () => {
    const { getAllByTestId, queryByRole, queryByTestId } = render(
      <BookingWidget
        rooms={baseRooms}
        taxRate={0.19}
        isLoading
      />
    );

    expect(getAllByTestId('skeleton-loader').length).toBeGreaterThan(0);
    expect(queryByRole('button', { name: /Reservar/i })).not.toBeInTheDocument();
    expect(queryByTestId('inline-date-picker')).not.toBeInTheDocument();
  });
});
