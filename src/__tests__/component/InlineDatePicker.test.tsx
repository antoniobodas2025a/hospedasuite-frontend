// @vitest-environment jsdom
import "../bun-test-dom-setup";
import "@testing-library/jest-dom";
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import React from "react";
import { render, cleanup, fireEvent } from "@testing-library/react";
import InlineDatePicker from "@/components/ota/InlineDatePicker";

// Mock framer-motion to avoid DOM issues in jsdom
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: { children?: React.ReactNode }) =>
      React.createElement("div", props, children),
    button: ({ children, ...props }: { children?: React.ReactNode }) =>
      React.createElement("button", props, children),
  },
  AnimatePresence: ({ children }: { children?: React.ReactNode }) =>
    React.createElement(React.Fragment, {}, children),
  useInView: () => true,
}));

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "es",
}));

// Mock next/navigation useSearchParams
const mockSearchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams,
}));

describe("InlineDatePicker", () => {
  const onChangeMock = vi.fn();
  const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
      getItem: vi.fn((key: string) => store[key] ?? null),
      setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
      removeItem: vi.fn((key: string) => { delete store[key]; }),
      clear: vi.fn(() => { store = {}; }),
    };
  })();

  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
  });

  beforeEach(() => {
    onChangeMock.mockClear();
    mockSearchParams.forEach((_, key) => mockSearchParams.delete(key));
    localStorageMock.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders quick date preset buttons", () => {
    const { getByText } = render(<InlineDatePicker onChange={onChangeMock} />);

    expect(getByText("Este fin de semana")).toBeInTheDocument();
    expect(getByText("Próxima semana")).toBeInTheDocument();
    expect(getByText("Próximo mes")).toBeInTheDocument();
  });

  it("selects next weekend dates when clicking quick date button", () => {
    const { getByText } = render(<InlineDatePicker onChange={onChangeMock} />);

    fireEvent.click(getByText("Este fin de semana"));

    expect(onChangeMock).toHaveBeenCalledTimes(1);
    const call = onChangeMock.mock.calls[0][0];
    expect(call.from).toBeInstanceOf(Date);
    expect(call.to).toBeInstanceOf(Date);
    expect(call.to.getTime()).toBeGreaterThan(call.from.getTime());
  });

  it("renders availability legend with available, booked, and past states", () => {
    const { getByText } = render(<InlineDatePicker onChange={onChangeMock} />);

    expect(getByText("Disponible")).toBeInTheDocument();
    expect(getByText("Ocupado")).toBeInTheDocument();
    expect(getByText("Pasado")).toBeInTheDocument();
  });

  it("toggles collapsible content when header button is clicked", () => {
    const { getByTestId } = render(<InlineDatePicker onChange={onChangeMock} defaultExpanded={true} />);

    const toggleButton = getByTestId("inline-date-picker-toggle");
    expect(toggleButton).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(toggleButton);
    expect(toggleButton).toHaveAttribute("aria-expanded", "false");
  });

  it("displays calendar with appropriate grid role for keyboard navigation", () => {
    const { getByRole } = render(<InlineDatePicker onChange={onChangeMock} />);

    const calendar = getByRole("grid");
    expect(calendar).toBeInTheDocument();
  });

  it("passes initial date range from URL params", () => {
    mockSearchParams.set("checkin", "2026-08-10");
    mockSearchParams.set("checkout", "2026-08-12");

    const { getByTestId } = render(<InlineDatePicker onChange={onChangeMock} />);

    const fromInput = getByTestId("inline-date-picker-checkin");
    const toInput = getByTestId("inline-date-picker-checkout");
    expect(fromInput).toHaveAttribute("value", "2026-08-10");
    expect(toInput).toHaveAttribute("value", "2026-08-12");
  });

  it("saves selected dates to localStorage for the given hotel", () => {
    const { getByText } = render(
      <InlineDatePicker onChange={onChangeMock} hotelId="hotel-1" />
    );

    fireEvent.click(getByText("Este fin de semana"));

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "booking_dates_hotel-1",
      expect.stringContaining("from")
    );
    const saved = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
    expect(saved.from).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(saved.to).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("loads saved dates from localStorage on mount when no URL dates are provided", () => {
    const futureFrom = new Date();
    futureFrom.setDate(futureFrom.getDate() + 10);
    const futureTo = new Date(futureFrom);
    futureTo.setDate(futureTo.getDate() + 2);
    const fromIso = futureFrom.toISOString().split("T")[0];
    const toIso = futureTo.toISOString().split("T")[0];

    localStorageMock.setItem(
      "booking_dates_hotel-2",
      JSON.stringify({ from: fromIso, to: toIso })
    );

    const { getByTestId } = render(
      <InlineDatePicker onChange={onChangeMock} hotelId="hotel-2" />
    );

    const fromInput = getByTestId("inline-date-picker-checkin");
    const toInput = getByTestId("inline-date-picker-checkout");
    expect(fromInput).toHaveAttribute("value", fromIso);
    expect(toInput).toHaveAttribute("value", toIso);
  });

  it("ignores expired localStorage dates and keeps picker empty", () => {
    const pastFrom = new Date();
    pastFrom.setDate(pastFrom.getDate() - 10);
    const pastTo = new Date(pastFrom);
    pastTo.setDate(pastTo.getDate() + 2);
    const fromIso = pastFrom.toISOString().split("T")[0];
    const toIso = pastTo.toISOString().split("T")[0];

    localStorageMock.setItem(
      "booking_dates_hotel-3",
      JSON.stringify({ from: fromIso, to: toIso })
    );

    const { queryByTestId } = render(
      <InlineDatePicker onChange={onChangeMock} hotelId="hotel-3" />
    );

    expect(queryByTestId("inline-date-picker-checkin")).not.toBeInTheDocument();
    expect(queryByTestId("inline-date-picker-checkout")).not.toBeInTheDocument();
  });

  it("gives URL params precedence over localStorage", () => {
    mockSearchParams.set("checkin", "2026-12-01");
    mockSearchParams.set("checkout", "2026-12-05");

    localStorageMock.setItem(
      "booking_dates_hotel-4",
      JSON.stringify({ from: "2026-08-01", to: "2026-08-03" })
    );

    const { getByTestId } = render(
      <InlineDatePicker onChange={onChangeMock} hotelId="hotel-4" />
    );

    const fromInput = getByTestId("inline-date-picker-checkin");
    const toInput = getByTestId("inline-date-picker-checkout");
    expect(fromInput).toHaveAttribute("value", "2026-12-01");
    expect(toInput).toHaveAttribute("value", "2026-12-05");
  });
});
