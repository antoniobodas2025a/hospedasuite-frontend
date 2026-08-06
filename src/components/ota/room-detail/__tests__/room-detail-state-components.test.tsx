// @vitest-environment jsdom
import '../../../../__tests__/bun-test-dom-setup';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom';
import React from 'react';
import { render, cleanup, fireEvent } from '@testing-library/react';
import type { RoomDetailViewModelOutput } from '@/view-models/room-detail-view-model';
import { RoomDetailSkeleton } from '../room-detail-skeleton';
import { RoomDetailError } from '../room-detail-error';
import { RoomDetailCalendar } from '../room-detail-calendar';
import { RoomDetailGallery } from '../room-detail-gallery';
import { RoomDetailSoldOut } from '../room-detail-sold-out';
import type { RoomDetailClientAction } from '../room-detail-client';

// Mock framer-motion to avoid DOM issues in jsdom
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, initial, animate, exit: _exit, transition: _transition, whileTap: _whileTap, ...props }: { children?: React.ReactNode; [key: string]: unknown }) =>
      React.createElement('div', {
        ...props,
        'data-initial': initial !== undefined ? JSON.stringify(initial) : undefined,
        'data-animate': animate !== undefined ? JSON.stringify(animate) : undefined,
      }, children),
    button: ({ children, initial, animate, exit: _exit, transition: _transition, whileTap: _whileTap, ...props }: { children?: React.ReactNode; [key: string]: unknown }) =>
      React.createElement('button', {
        ...props,
        'data-initial': initial !== undefined ? JSON.stringify(initial) : undefined,
        'data-animate': animate !== undefined ? JSON.stringify(animate) : undefined,
      }, children),
    span: ({ children, initial, animate, exit: _exit, transition: _transition, whileTap: _whileTap, ...props }: { children?: React.ReactNode; [key: string]: unknown }) =>
      React.createElement('span', {
        ...props,
        'data-initial': initial !== undefined ? JSON.stringify(initial) : undefined,
        'data-animate': animate !== undefined ? JSON.stringify(animate) : undefined,
      }, children),
  },
  AnimatePresence: ({ children }: { children?: React.ReactNode }) =>
    React.createElement(React.Fragment, {}, children),
}));

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    const messages: Record<string, string> = {
      'ota.booking.from': 'Desde',
      'ota.booking.reserve': 'Reservar',
      'ota.search.selectDates': 'Seleccionar fechas',
      'ota.showcase.total': 'Total',
      'ota.showcase.cop': 'COP',
      'ota.showcase.nights_one': '{count} noche',
      'ota.showcase.nights_other': '{count} noches',
      'ota.showcase.nights': '{count} noches',
      'ota.showcase.seeOtherRooms': 'Ver otras habitaciones',
      'ota.roomDetail.backToHotel': 'Volver al hotel',
      'ota.roomDetail.changeDates': 'Cambiar fechas',
      'ota.roomDetail.chooseDates': 'Elegir fechas',
      'ota.roomDetail.notAvailableForDates': 'No disponible para {checkIn} - {checkOut}',
      'ota.roomDetail.viewDetail': 'Ver detalle',
      'ota.roomDetail.perNight': '/noche',
      'ota.roomDetail.selectDates': 'Seleccionar fechas',
      'ota.roomDetail.pricePerNight': '{nights} noches · ${price} por noche',
      'ota.roomDetail.taxIncluded': 'Impuestos incluidos',
      'ota.roomDetail.guests': 'Huéspedes',
      'ota.roomDetail.errorTitle': 'Algo salió mal',
      'ota.roomDetail.genericError': 'No pudimos cargar la habitación',
      'ota.roomDetail.selectDatesToContinue': 'Seleccioná tus fechas para continuar',
      'ota.roomDetail.weekendPrice': 'Fin de semana: ${price}',
      'ota.roomDetail.weekdayNights_one': '{count} noche entre semana',
      'ota.roomDetail.weekdayNights_other': '{count} noches entre semana',
      'ota.roomDetail.weekendNights_one': '{count} noche fin de semana',
      'ota.roomDetail.weekendNights_other': '{count} noches fin de semana',
      'ota.roomDetail.tax': 'IVA ({rate}%)',
      'ota.roomDetail.tryOtherDates': 'Probá con otras fechas o habitaciones',
      'ota.roomDetail.alternativeOptions': 'Otras opciones para estas fechas',
    };
    let text = messages[key] ?? key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, String(v));
      });
    }
    return text;
  },
  useLocale: () => 'es',
}));

// Mock next/navigation
const mockRouter = { push: vi.fn() };
vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  useSearchParams: () => new URLSearchParams(),
}));

// Mock next/link
vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) =>
    React.createElement('a', { href }, children),
}));

// Mock next/image
vi.mock('next/image', () => ({
  __esModule: true,
  default: (props: React.ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean; priority?: boolean }) => {
    const { alt, fill, priority, ...rest } = props;
    return React.createElement('img', { alt, 'data-fill': fill ? 'true' : undefined, 'data-priority': priority ? 'true' : undefined, ...rest });
  },
}));

// Mock InlineDatePicker
const InlineDatePickerMock = vi.fn();
vi.mock('@/components/ota/InlineDatePicker', () => ({
  __esModule: true,
  default: (props: {
    checkIn?: string | null;
    checkOut?: string | null;
    onChange?: (range: { from: Date; to: Date }) => void;
    className?: string;
    primaryColor?: string;
    bookedDates?: string[];
  }) => {
    InlineDatePickerMock(props);
    return (
      <div data-testid="inline-date-picker">
        <button
          type="button"
          data-testid="inline-date-picker-select"
          onClick={() => props.onChange?.({ from: new Date('2026-08-10T12:00:00Z'), to: new Date('2026-08-13T12:00:00Z') })}
        >
          Select dates
        </button>
      </div>
    );
  },
}));

// Mock RoomGalleryGrid
const RoomGalleryGridMock = vi.fn();
vi.mock('@/components/ota/RoomGalleryGrid', () => ({
  __esModule: true,
  default: (props: { images: Array<{ url: string }>; roomName: string; roomId?: string; layout?: string }) => {
    RoomGalleryGridMock(props);
    return <div data-testid="room-gallery-grid">{props.roomName}</div>;
  },
}));

// Mock RoomInfoPanel
const RoomInfoPanelMock = vi.fn();
vi.mock('@/components/ota/RoomInfoPanel', () => ({
  RoomInfoPanel: (props: { room: Record<string, unknown>; checkIn: string; checkOut: string; nights: number }) => {
    RoomInfoPanelMock(props);
    return <div data-testid="room-info-panel">RoomInfoPanel</div>;
  },
}));

// Mock RoomCard
const RoomCardMock = vi.fn();
vi.mock('@/components/ota/RoomCard', () => ({
  __esModule: true,
  default: (props: { room: Record<string, unknown>; hotelSlug: string }) => {
    RoomCardMock(props);
    return <div data-testid="room-card">{String(props.room.name)}</div>;
  },
}));

// Mock PriceBreakdown
vi.mock('@/components/ota/PriceBreakdown', () => ({
  __esModule: true,
  default: () => <div data-testid="price-breakdown">PriceBreakdown</div>,
}));

// Mock glass components
vi.mock('@/components/ui/glass', () => ({
  GlassCard: ({ children, 'data-testid': dataTestId, ...props }: { children?: React.ReactNode; 'data-testid'?: string; [key: string]: unknown }) =>
    React.createElement('div', { ...props, 'data-testid': dataTestId ?? 'glass-card' }, children),
  GlassPanel: ({ children, 'data-testid': dataTestId, ...props }: { children?: React.ReactNode; 'data-testid'?: string; [key: string]: unknown }) =>
    React.createElement('div', { ...props, 'data-testid': dataTestId ?? 'glass-panel' }, children),
  GlassPill: ({ children, 'data-testid': dataTestId, ...props }: { children?: React.ReactNode; 'data-testid'?: string; [key: string]: unknown }) =>
    React.createElement('div', { ...props, 'data-testid': dataTestId ?? 'glass-pill' }, children),
}));

function makeOutput(overrides: Partial<RoomDetailViewModelOutput> = {}): RoomDetailViewModelOutput {
  return {
    state: 'gallery',
    roomName: 'Suite Mirador',
    hotelName: 'Hotel Mirador',
    hotelSlug: 'hotel-mirador',
    totalHotelRooms: 1,
    pricePerNight: 300000,
    weekendPrice: 350000,
    taxRate: 0.19,
    pricing: null,
    gallery: [{ url: '/hero.jpg' }, { url: '/detail1.jpg' }],
    coverImage: '/hero.jpg',
    description: 'Una suite con vista panorámica',
    capacity: 2,
    beds: 1,
    bedType: 'Queen',
    amenities: [{ id: 'wifi', label: 'Wi-Fi' }],
    cancellationPolicy: 'Cancelación gratuita 24h antes',
    suggestions: [],
    showOtherRooms: false,
    breadcrumb: { label: 'Hotel Mirador / Suite Mirador', href: '/hotel/hotel-mirador' },
    canBook: true,
    error: null,
    roomId: 'room-1',
    primaryColor: '#c25a2a',
    ...overrides,
  };
}

function makeDispatch(): React.Dispatch<RoomDetailClientAction> {
  return vi.fn();
}

describe('T-08: RoomDetailSkeleton', () => {
  it('renders a skeleton that matches the detail layout proportions', () => {
    const { getByTestId } = render(<RoomDetailSkeleton />);

    expect(getByTestId('room-detail-skeleton')).toBeInTheDocument();
    expect(getByTestId('skeleton-gallery')).toBeInTheDocument();
    expect(getByTestId('skeleton-calendar')).toBeInTheDocument();
    expect(getByTestId('skeleton-price')).toBeInTheDocument();
  });
});

describe('T-08: RoomDetailError', () => {
  it('renders the error message and a back-to-hotel link with the correct href', () => {
    const output = makeOutput({
      state: 'error',
      error: 'Habitación no encontrada',
      breadcrumb: { label: 'Hotel Mirador', href: '/hotel/hotel-mirador' },
    });

    const { getByTestId, getByText } = render(<RoomDetailError output={output} />);

    expect(getByTestId('room-detail-error')).toBeInTheDocument();
    expect(getByText('Habitación no encontrada')).toBeInTheDocument();
    const link = getByText('Volver al hotel');
    expect(link).toBeInTheDocument();
    expect(link.closest('a')).toHaveAttribute('href', '/hotel/hotel-mirador');
  });
});

describe('T-09: RoomDetailCalendar', () => {
  beforeEach(() => {
    InlineDatePickerMock.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders as a sticky sidebar, not a full page', () => {
    const output = makeOutput({ state: 'gallery' });
    const dispatch = makeDispatch();

    const { getByTestId, queryByTestId } = render(
      <RoomDetailCalendar output={output} state="gallery" dispatch={dispatch} />
    );

    expect(getByTestId('room-detail-calendar')).toBeInTheDocument();
    expect(getByTestId('room-detail-calendar-sidebar')).toBeInTheDocument();
    expect(queryByTestId('room-hero')).not.toBeInTheDocument();
  });

  it('reuses InlineDatePicker with the correct props', () => {
    const output = makeOutput({ state: 'gallery' });
    const dispatch = makeDispatch();

    render(<RoomDetailCalendar output={output} state="gallery" dispatch={dispatch} />);

    expect(InlineDatePickerMock).toHaveBeenCalled();
    const call = InlineDatePickerMock.mock.calls[0][0];
    expect(call.primaryColor).toBe('#c25a2a');
    expect(call.className).toBeDefined();
  });

  it('falls back to undefined when primaryColor is white', () => {
    const output = makeOutput({ state: 'gallery', primaryColor: '#ffffff' });
    const dispatch = makeDispatch();

    render(<RoomDetailCalendar output={output} state="gallery" dispatch={dispatch} />);

    const call = InlineDatePickerMock.mock.calls[0][0];
    expect(call.primaryColor).toBeUndefined();
  });

  it('falls back to undefined for short white primaryColor', () => {
    const output = makeOutput({ state: 'gallery', primaryColor: '#fff' });
    const dispatch = makeDispatch();

    render(<RoomDetailCalendar output={output} state="gallery" dispatch={dispatch} />);

    const call = InlineDatePickerMock.mock.calls[0][0];
    expect(call.primaryColor).toBeUndefined();
  });

  it('shows the price teaser when no dates are selected', () => {
    const output = makeOutput({ state: 'gallery', pricing: null });
    const dispatch = makeDispatch();

    const { getByTestId, getByText } = render(
      <RoomDetailCalendar output={output} state="gallery" dispatch={dispatch} />
    );

    expect(getByTestId('price-teaser')).toBeInTheDocument();
    expect(getByText('Desde')).toBeInTheDocument();
    expect(getByText('$300.000')).toBeInTheDocument();
    expect(getByText('Fin de semana: $350.000')).toBeInTheDocument();
  });

  it('hides the weekend teaser when weekend price equals weekday price', () => {
    const output = makeOutput({
      state: 'gallery',
      pricePerNight: 300000,
      weekendPrice: 300000,
      pricing: null,
    });
    const dispatch = makeDispatch();

    const { getByText, queryByText } = render(
      <RoomDetailCalendar output={output} state="gallery" dispatch={dispatch} />
    );

    expect(getByText('$300.000')).toBeInTheDocument();
    expect(queryByText('Fin de semana:')).not.toBeInTheDocument();
  });

  it('shows the summary bar with price breakdown when dates are selected', () => {
    const output = makeOutput({
      state: 'dates_selected',
      pricing: {
        weekdayPrice: 300000,
        weekendPrice: 350000,
        weekdayNights: 3,
        weekendNights: 0,
        subtotal: 900000,
        tax: 171000,
        total: 1071000,
        taxRate: 0.19,
        breakdown: [],
      },
      initialCheckIn: new Date('2026-08-10T12:00:00Z'),
      initialCheckOut: new Date('2026-08-13T12:00:00Z'),
    });
    const dispatch = makeDispatch();

    const { getByTestId } = render(
      <RoomDetailCalendar output={output} state="dates_selected" dispatch={dispatch} />
    );

    expect(getByTestId('summary-bar')).toBeInTheDocument();
    expect(getByTestId('summary-bar')).toHaveTextContent('Total');
    expect(getByTestId('summary-bar')).toHaveTextContent('$1.071.000');
  });

  it('dispatches SELECT_DATES when InlineDatePicker changes', () => {
    const output = makeOutput({ state: 'gallery' });
    const dispatch = makeDispatch();

    const { getByTestId } = render(
      <RoomDetailCalendar output={output} state="gallery" dispatch={dispatch} />
    );

    fireEvent.click(getByTestId('inline-date-picker-select'));

    expect(dispatch).toHaveBeenCalledWith({
      type: 'SELECT_DATES',
      checkIn: new Date('2026-08-10T12:00:00Z'),
      checkOut: new Date('2026-08-13T12:00:00Z'),
    });
  });

  it('hides the Reservar button without dates and shows it after selecting dates', () => {
    const output = makeOutput({ state: 'gallery', pricing: null });
    const dispatch = makeDispatch();

    const { getByTestId, queryByTestId, rerender } = render(
      <RoomDetailCalendar output={output} state="gallery" dispatch={dispatch} />
    );

    expect(queryByTestId('calendar-reserve-button')).not.toBeInTheDocument();

    rerender(
      <RoomDetailCalendar
        output={makeOutput({
          state: 'dates_selected',
          pricing: {
            weekdayPrice: 300000,
            weekendPrice: 350000,
            weekdayNights: 3,
            weekendNights: 0,
            subtotal: 900000,
            tax: 171000,
            total: 1071000,
            taxRate: 0.19,
            breakdown: [],
          },
          initialCheckIn: new Date('2026-08-10T12:00:00Z'),
          initialCheckOut: new Date('2026-08-13T12:00:00Z'),
        })}
        state="dates_selected"
        dispatch={dispatch}
      />
    );

    expect(getByTestId('calendar-reserve-button')).toBeEnabled();
  });

  it('hides the calendar Reservar button when booking is not allowed', () => {
    const output = makeOutput({
      state: 'dates_selected',
      canBook: false,
      pricing: {
        weekdayPrice: 300000,
        weekendPrice: 350000,
        weekdayNights: 3,
        weekendNights: 0,
        subtotal: 900000,
        tax: 171000,
        total: 1071000,
        taxRate: 0.19,
        breakdown: [],
      },
      initialCheckIn: new Date('2026-08-10T12:00:00Z'),
      initialCheckOut: new Date('2026-08-13T12:00:00Z'),
    });
    const dispatch = makeDispatch();

    const { queryByTestId } = render(
      <RoomDetailCalendar output={output} state="dates_selected" dispatch={dispatch} />
    );

    expect(queryByTestId('calendar-reserve-button')).not.toBeInTheDocument();
  });

  it('renders the calendar inline on mobile without a fixed bottom bar', () => {
    const output = makeOutput({ state: 'gallery', pricing: null });
    const dispatch = makeDispatch();

    const { getByTestId, queryByTestId } = render(
      <RoomDetailCalendar output={output} state="gallery" dispatch={dispatch} />
    );

    expect(getByTestId('room-detail-calendar-sidebar')).toBeInTheDocument();
    expect(queryByTestId('room-detail-calendar-mobile-bar')).not.toBeInTheDocument();
    expect(getByTestId('inline-date-picker')).toBeInTheDocument();
  });

  it('navigates to checkout when Reservar is clicked with dates', () => {
    const output = makeOutput({
      state: 'dates_selected',
      pricing: {
        weekdayPrice: 300000,
        weekendPrice: 350000,
        weekdayNights: 3,
        weekendNights: 0,
        subtotal: 900000,
        tax: 171000,
        total: 1071000,
        taxRate: 0.19,
        breakdown: [],
      },
      initialCheckIn: new Date('2026-08-10T12:00:00Z'),
      initialCheckOut: new Date('2026-08-13T12:00:00Z'),
    });
    const dispatch = makeDispatch();

    const { getByTestId } = render(
      <RoomDetailCalendar output={output} state="dates_selected" dispatch={dispatch} />
    );

    fireEvent.click(getByTestId('calendar-reserve-button'));

    expect(mockRouter.push).toHaveBeenCalledWith(
      '/book/hotel-mirador/checkout?room=room-1&checkin=2026-08-10&checkout=2026-08-13'
    );
  });
});

describe('T-10: RoomDetailGallery', () => {
  beforeEach(() => {
    RoomGalleryGridMock.mockClear();
    RoomInfoPanelMock.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders breadcrumb, room name and hero image immediately', () => {
    const output = makeOutput({ state: 'gallery' });
    const dispatch = makeDispatch();

    const { getByTestId, getByText, getByRole } = render(
      <RoomDetailGallery output={output} state="gallery" dispatch={dispatch} />
    );

    expect(getByTestId('room-hero')).toBeInTheDocument();
    expect(getByText('Hotel Mirador')).toBeInTheDocument();
    expect(getByRole('heading', { level: 1, name: 'Suite Mirador' })).toBeInTheDocument();
    const img = getByRole('img');
    expect(img).toHaveAttribute('src', '/hero.jpg');
    expect(img).toHaveAttribute('data-fill', 'true');
    expect(img).toHaveAttribute('data-priority', 'true');
  });

  it('renders the info strip with capacity and bed type', () => {
    const output = makeOutput({ state: 'gallery', capacity: 2, beds: 1, bedType: 'Queen' });
    const dispatch = makeDispatch();

    const { getByTestId } = render(
      <RoomDetailGallery output={output} state="gallery" dispatch={dispatch} />
    );

    const strip = getByTestId('room-info-strip');
    expect(strip).toHaveTextContent('2 Huéspedes');
    expect(strip).toHaveTextContent('1 Queen');
  });

  it('reuses RoomGalleryGrid without RoomInfoPanel', () => {
    const output = makeOutput({
      state: 'dates_selected',
      pricing: {
        weekdayPrice: 300000,
        weekendPrice: 350000,
        weekdayNights: 2,
        weekendNights: 1,
        subtotal: 950000,
        tax: 180500,
        total: 1130500,
        taxRate: 0.19,
        breakdown: [],
      },
      initialCheckIn: new Date('2026-08-10T12:00:00Z'),
      initialCheckOut: new Date('2026-08-13T12:00:00Z'),
    });
    const dispatch = makeDispatch();

    const { getByTestId, queryByTestId } = render(
      <RoomDetailGallery output={output} state="dates_selected" dispatch={dispatch} />
    );

    expect(getByTestId('room-gallery-grid')).toBeInTheDocument();
    expect(queryByTestId('room-info-panel')).not.toBeInTheDocument();
    expect(RoomGalleryGridMock).toHaveBeenCalledWith(
      expect.objectContaining({
        images: output.gallery.slice(1),
        roomName: output.roomName,
        roomId: output.roomId,
      })
    );
  });

  it('applies font-lora to the hero heading', () => {
    const output = makeOutput({ state: 'gallery' });
    const dispatch = makeDispatch();

    const { getByRole } = render(
      <RoomDetailGallery output={output} state="gallery" dispatch={dispatch} />
    );

    const heading = getByRole('heading', { level: 1, name: 'Suite Mirador' });
    expect(heading).toHaveClass('font-lora');
    expect(heading).toHaveClass('font-black');
    expect(heading).toHaveClass('tracking-tight');
  });

  it('does not render a CTA dock', () => {
    const output = makeOutput({ state: 'gallery', pricing: null });
    const dispatch = makeDispatch();

    const { queryByTestId } = render(
      <RoomDetailGallery output={output} state="gallery" dispatch={dispatch} />
    );

    expect(queryByTestId('cta-dock')).not.toBeInTheDocument();
  });

  it('shows Ver otras habitaciones link when showOtherRooms is true', () => {
    const output = makeOutput({
      state: 'gallery',
      showOtherRooms: true,
    });
    const dispatch = makeDispatch();

    const { getAllByText } = render(
      <RoomDetailGallery output={output} state="gallery" dispatch={dispatch} />
    );

    const link = getAllByText('Ver otras habitaciones')[0];
    expect(link).toBeInTheDocument();
    expect(link.closest('a')).toHaveAttribute('href', '/hotel/hotel-mirador');
  });

  it('hides Ver otras habitaciones when showOtherRooms is false', () => {
    const output = makeOutput({
      state: 'gallery',
      showOtherRooms: false,
    });
    const dispatch = makeDispatch();

    const { queryByText } = render(
      <RoomDetailGallery output={output} state="gallery" dispatch={dispatch} />
    );

    expect(queryByText('Ver otras habitaciones')).not.toBeInTheDocument();
  });
});

describe('T-11: RoomDetailSoldOut', () => {
  beforeEach(() => {
    InlineDatePickerMock.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders sold-out message for the selected dates', () => {
    const output = makeOutput({
      state: 'sold_out',
      initialCheckIn: new Date('2026-08-10T12:00:00Z'),
      initialCheckOut: new Date('2026-08-13T12:00:00Z'),
    });
    const dispatch = makeDispatch();

    const { getByTestId } = render(
      <RoomDetailSoldOut output={output} state="sold_out" dispatch={dispatch} />
    );

    expect(getByTestId('room-detail-sold-out')).toBeInTheDocument();
    expect(getByTestId('sold-out-message')).toBeInTheDocument();
  });

  it('reuses InlineDatePicker for selecting alternative dates', () => {
    const output = makeOutput({
      state: 'sold_out',
      initialCheckIn: new Date('2026-08-10T12:00:00Z'),
      initialCheckOut: new Date('2026-08-13T12:00:00Z'),
      bookedDates: ['2026-08-10', '2026-08-11', '2026-08-12'],
    });
    const dispatch = makeDispatch();

    render(<RoomDetailSoldOut output={output} state="sold_out" dispatch={dispatch} />);

    expect(InlineDatePickerMock).toHaveBeenCalled();
    const call = InlineDatePickerMock.mock.calls[0][0];
    expect(call.bookedDates).toEqual(['2026-08-10', '2026-08-11', '2026-08-12']);
  });

  it('dispatches CLEAR_DATES when Cambiar fechas is clicked', () => {
    const output = makeOutput({
      state: 'sold_out',
      initialCheckIn: new Date('2026-08-10T12:00:00Z'),
      initialCheckOut: new Date('2026-08-13T12:00:00Z'),
    });
    const dispatch = makeDispatch();

    const { getByRole } = render(
      <RoomDetailSoldOut output={output} state="sold_out" dispatch={dispatch} />
    );

    fireEvent.click(getByRole('button', { name: 'Cambiar fechas' }));

    expect(dispatch).toHaveBeenCalledWith({ type: 'CLEAR_DATES' });
  });

  it('renders up to 3 suggestion cards with prices', () => {
    const output = makeOutput({
      state: 'sold_out',
      initialCheckIn: new Date('2026-08-10T12:00:00Z'),
      initialCheckOut: new Date('2026-08-13T12:00:00Z'),
      suggestions: [
        {
          id: 'room-2',
          name: 'Suite Estándar',
          price: 250000,
          checkIn: new Date('2026-08-14T12:00:00Z'),
          checkOut: new Date('2026-08-17T12:00:00Z'),
        },
        {
          id: 'room-3',
          name: 'Suite Deluxe',
          price: 400000,
          checkIn: new Date('2026-08-14T12:00:00Z'),
          checkOut: new Date('2026-08-17T12:00:00Z'),
        },
      ],
    });
    const dispatch = makeDispatch();

    const { getAllByTestId, getByText } = render(
      <RoomDetailSoldOut output={output} state="sold_out" dispatch={dispatch} />
    );

    expect(getAllByTestId('suggestion-card')).toHaveLength(2);
    expect(getByText('Suite Estándar')).toBeInTheDocument();
    expect(getByText('Suite Deluxe')).toBeInTheDocument();
  });

  it('shows Ver otras habitaciones link when showOtherRooms is true', () => {
    const output = makeOutput({
      state: 'sold_out',
      showOtherRooms: true,
      initialCheckIn: new Date('2026-08-10T12:00:00Z'),
      initialCheckOut: new Date('2026-08-13T12:00:00Z'),
    });
    const dispatch = makeDispatch();

    const { getAllByText } = render(
      <RoomDetailSoldOut output={output} state="sold_out" dispatch={dispatch} />
    );

    const link = getAllByText('Ver otras habitaciones')[0];
    expect(link).toBeInTheDocument();
    expect(link.closest('a')).toHaveAttribute('href', '/hotel/hotel-mirador');
  });
});
