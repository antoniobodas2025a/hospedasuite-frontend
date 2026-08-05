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
      'ota.roomDetail.notAvailableForDates': 'No disponible para {checkIn} - {checkOut}',
      'ota.roomDetail.viewDetail': 'Ver detalle',
      'ota.roomDetail.perNight': '/noche',
      'ota.roomDetail.selectDates': 'Seleccionar fechas',
      'ota.roomDetail.pricePerNight': '{nights} noches · ${price} por noche',
      'ota.roomDetail.taxIncluded': 'Impuestos incluidos',
      'ota.roomDetail.guests': 'Huéspedes',
      'ota.roomDetail.errorTitle': 'Algo salió mal',
      'ota.roomDetail.genericError': 'No pudimos cargar la habitación',
      'ota.roomDetail.selectDatesToContinue': 'Selecciona tus fechas para continuar',
      'ota.roomDetail.weekendPrice': 'Fin de semana: ${price}',
      'ota.roomDetail.weekdayNights_one': '{count} noche entre semana',
      'ota.roomDetail.weekdayNights_other': '{count} noches entre semana',
      'ota.roomDetail.weekendNights_one': '{count} noche fin de semana',
      'ota.roomDetail.weekendNights_other': '{count} noches fin de semana',
      'ota.roomDetail.tax': 'IVA ({rate}%)',
      'ota.roomDetail.tryOtherDates': 'Prueba con otras fechas o habitaciones',
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
    state: 'calendar_first',
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

  it('renders room name, hotel name and breadcrumb', () => {
    const output = makeOutput({ state: 'calendar_first' });
    const dispatch = makeDispatch();

    const { getByText, getByRole } = render(<RoomDetailCalendar output={output} state="calendar_first" dispatch={dispatch} />);

    expect(getByText('Hotel Mirador')).toBeInTheDocument();
    expect(getByRole('heading', { level: 1, name: 'Suite Mirador' })).toBeInTheDocument();
  });

  it('reuses InlineDatePicker with the correct props in calendar_first', () => {
    const output = makeOutput({ state: 'calendar_first' });
    const dispatch = makeDispatch();

    render(<RoomDetailCalendar output={output} state="calendar_first" dispatch={dispatch} />);

    expect(InlineDatePickerMock).toHaveBeenCalled();
    const call = InlineDatePickerMock.mock.calls[0][0];
    expect(call.primaryColor).toBe('#c25a2a');
    expect(call.className).toBeDefined();
  });

  it('adds an aria-label to the InlineDatePicker wrapper', () => {
    const output = makeOutput({ state: 'calendar_first' });
    const dispatch = makeDispatch();

    const { getByLabelText } = render(
      <RoomDetailCalendar output={output} state="calendar_first" dispatch={dispatch} />
    );

    expect(getByLabelText('Seleccionar fechas')).toBeInTheDocument();
  });

  it('shows teaser price from room price when no dates are selected', () => {
    const output = makeOutput({
      state: 'calendar_first',
      pricePerNight: 300000,
      weekendPrice: 350000,
      pricing: null,
    });
    const dispatch = makeDispatch();

    const { getByText } = render(<RoomDetailCalendar output={output} state="calendar_first" dispatch={dispatch} />);

    expect(getByText('Desde')).toBeInTheDocument();
    expect(getByText('$300.000')).toBeInTheDocument();
    expect(getByText('Fin de semana: $350.000')).toBeInTheDocument();
  });

  it('hides weekend teaser when weekend price equals weekday price', () => {
    const output = makeOutput({
      state: 'calendar_first',
      pricePerNight: 300000,
      weekendPrice: 300000,
      pricing: null,
    });
    const dispatch = makeDispatch();

    const { getByText, queryByText } = render(
      <RoomDetailCalendar output={output} state="calendar_first" dispatch={dispatch} />
    );

    expect(getByText('$300.000')).toBeInTheDocument();
    expect(queryByText('Fin de semana:')).not.toBeInTheDocument();
  });

  it('dispatches SELECT_DATES when InlineDatePicker changes', () => {
    const output = makeOutput({ state: 'calendar_first' });
    const dispatch = makeDispatch();

    const { getByTestId } = render(<RoomDetailCalendar output={output} state="calendar_first" dispatch={dispatch} />);

    fireEvent.click(getByTestId('inline-date-picker-select'));

    expect(dispatch).toHaveBeenCalledWith({
      type: 'SELECT_DATES',
      checkIn: new Date('2026-08-10T12:00:00Z'),
      checkOut: new Date('2026-08-13T12:00:00Z'),
    });
  });

  it('shows animated summary bar with price breakdown in calendar_active', () => {
    const output = makeOutput({
      state: 'calendar_active',
      pricing: {
        weekdayPrice: 300000,
        weekendPrice: 350000,
        weekdayNights: 2,
        weekendNights: 1,
        subtotal: 950000,
        tax: 180500,
        total: 1130500,
        taxRate: 0.19,
        breakdown: [
          { date: '2026-08-10', dayOfWeek: 1, price: 300000, isWeekend: false },
          { date: '2026-08-11', dayOfWeek: 2, price: 300000, isWeekend: false },
          { date: '2026-08-12', dayOfWeek: 3, price: 350000, isWeekend: true },
        ],
      },
      initialCheckIn: new Date('2026-08-10T12:00:00Z'),
      initialCheckOut: new Date('2026-08-13T12:00:00Z'),
    });
    const dispatch = makeDispatch();

    const { getByTestId, getByText } = render(
      <RoomDetailCalendar output={output} state="calendar_active" dispatch={dispatch} />
    );

    expect(getByTestId('summary-bar')).toBeInTheDocument();
    expect(getByText('Ver detalle')).toBeInTheDocument();
    expect(getByText(/3 noches/)).toBeInTheDocument();
    expect(getByText('$1.130.500')).toBeInTheDocument();
  });

  it('renders hero image when gallery has images', () => {
    const output = makeOutput({
      state: 'calendar_first',
      gallery: [{ url: '/hero.jpg' }],
      coverImage: '/hero.jpg',
    });
    const dispatch = makeDispatch();

    const { getByRole } = render(
      <RoomDetailCalendar output={output} state="calendar_first" dispatch={dispatch} />
    );

    const img = getByRole('img');
    expect(img).toHaveAttribute('src', '/hero.jpg');
    expect(img).toHaveAttribute('data-fill', 'true');
    expect(img).toHaveAttribute('data-priority', 'true');
  });

  it('hides hero image when gallery is empty and no cover image', () => {
    const output = makeOutput({
      state: 'calendar_first',
      gallery: [],
      coverImage: '',
    });
    const dispatch = makeDispatch();

    const { queryByRole } = render(
      <RoomDetailCalendar output={output} state="calendar_first" dispatch={dispatch} />
    );

    expect(queryByRole('img')).not.toBeInTheDocument();
  });

  it('hero has entrance animation', () => {
    const output = makeOutput({ state: 'calendar_first' });
    const dispatch = makeDispatch();

    const { getByTestId } = render(
      <RoomDetailCalendar output={output} state="calendar_first" dispatch={dispatch} />
    );

    const hero = getByTestId('room-hero');
    expect(hero).toHaveAttribute('data-initial', expect.stringContaining('"scale":1.05'));
    expect(hero).toHaveAttribute('data-initial', expect.stringContaining('"opacity":0'));
    expect(hero).toHaveAttribute('data-animate', expect.stringContaining('"scale":1'));
    expect(hero).toHaveAttribute('data-animate', expect.stringContaining('"opacity":1'));
  });

  it('info strip shows capacity and beds', () => {
    const output = makeOutput({
      state: 'calendar_first',
      capacity: 2,
      beds: 1,
      bedType: 'Queen',
    });
    const dispatch = makeDispatch();

    const { getByTestId } = render(
      <RoomDetailCalendar output={output} state="calendar_first" dispatch={dispatch} />
    );

    const strip = getByTestId('room-info-strip');
    expect(strip).toHaveTextContent('2 Huéspedes');
    expect(strip).toHaveTextContent('1 Queen');
  });

  it('hides info strip when capacity is 0', () => {
    const output = makeOutput({
      state: 'calendar_first',
      capacity: 0,
      beds: 0,
      bedType: '',
    });
    const dispatch = makeDispatch();

    const { queryByTestId } = render(
      <RoomDetailCalendar output={output} state="calendar_first" dispatch={dispatch} />
    );

    expect(queryByTestId('room-info-strip')).not.toBeInTheDocument();
  });

  it('renders room name overlaid on hero', () => {
    const output = makeOutput({ state: 'calendar_first' });
    const dispatch = makeDispatch();

    const { getByTestId, getByRole } = render(
      <RoomDetailCalendar output={output} state="calendar_first" dispatch={dispatch} />
    );

    const hero = getByTestId('room-hero');
    const heading = getByRole('heading', { level: 1, name: 'Suite Mirador' });
    expect(hero).toContainElement(heading);
  });

  it('breadcrumb hotel link is overlaid on hero with correct href', () => {
    const output = makeOutput({ state: 'calendar_first' });
    const dispatch = makeDispatch();

    const { getByTestId, getByText } = render(
      <RoomDetailCalendar output={output} state="calendar_first" dispatch={dispatch} />
    );

    const hero = getByTestId('room-hero');
    const link = getByText('Hotel Mirador').closest('a');
    expect(link).toHaveAttribute('href', '/hotel/hotel-mirador');
    expect(hero).toContainElement(link);
  });

  it('price teaser glass card overlaps hero with negative margin', () => {
    const output = makeOutput({ state: 'calendar_first' });
    const dispatch = makeDispatch();

    const { getByTestId } = render(
      <RoomDetailCalendar output={output} state="calendar_first" dispatch={dispatch} />
    );

    const teaser = getByTestId('price-teaser');
    expect(teaser.className).toMatch(/-mt-6/);
  });

  it('price teaser still renders correctly', () => {
    const output = makeOutput({
      state: 'calendar_first',
      pricePerNight: 300000,
      weekendPrice: 350000,
    });
    const dispatch = makeDispatch();

    const { getByTestId, getByText } = render(
      <RoomDetailCalendar output={output} state="calendar_first" dispatch={dispatch} />
    );

    expect(getByTestId('price-teaser')).toBeInTheDocument();
    expect(getByText('Desde')).toBeInTheDocument();
    expect(getByText('$300.000')).toBeInTheDocument();
    expect(getByText('Fin de semana: $350.000')).toBeInTheDocument();
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

  it('reuses RoomGalleryGrid and RoomInfoPanel', () => {
    const output = makeOutput({
      state: 'detail',
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

    const { getByTestId, getAllByRole } = render(
      <RoomDetailGallery output={output} state="detail" dispatch={dispatch} />
    );

    expect(getByTestId('room-gallery-grid')).toBeInTheDocument();
    expect(getByTestId('room-info-panel')).toBeInTheDocument();
    expect(RoomGalleryGridMock).toHaveBeenCalledWith(
      expect.objectContaining({
        images: output.gallery,
        roomName: output.roomName,
        roomId: output.roomId,
      })
    );
    expect(getAllByRole('heading', { level: 1, name: 'Suite Mirador' }).length).toBeGreaterThan(0);
  });

  it('renders sticky CTA dock with total price, tax breakdown and Reservar button', () => {
    const output = makeOutput({
      state: 'detail',
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

    const { getByTestId, getByText } = render(
      <RoomDetailGallery output={output} state="detail" dispatch={dispatch} />
    );

    const ctaDock = getByTestId('cta-dock');
    expect(ctaDock).toBeInTheDocument();
    expect(ctaDock.textContent).toContain('$1.130.500');
    expect(ctaDock.textContent).toContain('Reservar');
  });

  it('dispatches CHANGE_DATES when Cambiar fechas is clicked', () => {
    const output = makeOutput({
      state: 'detail',
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

    const { getAllByRole } = render(<RoomDetailGallery output={output} state="detail" dispatch={dispatch} />);

    fireEvent.click(getAllByRole('button', { name: 'Cambiar fechas' })[0]);

    expect(dispatch).toHaveBeenCalledWith({ type: 'CHANGE_DATES' });
  });

  it('shows Ver otras habitaciones link when showOtherRooms is true', () => {
    const output = makeOutput({
      state: 'detail',
      showOtherRooms: true,
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

    const { getAllByText } = render(<RoomDetailGallery output={output} state="detail" dispatch={dispatch} />);

    const link = getAllByText('Ver otras habitaciones')[0];
    expect(link).toBeInTheDocument();
    expect(link.closest('a')).toHaveAttribute('href', '/hotel/hotel-mirador');
  });

  it('hides Ver otras habitaciones when showOtherRooms is false', () => {
    const output = makeOutput({
      state: 'detail',
      showOtherRooms: false,
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

    const { queryByText } = render(<RoomDetailGallery output={output} state="detail" dispatch={dispatch} />);

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

    const { getByTestId } = render(<RoomDetailSoldOut output={output} state="sold_out" dispatch={dispatch} />);

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

    const { getByRole } = render(<RoomDetailSoldOut output={output} state="sold_out" dispatch={dispatch} />);

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

    const { getAllByText } = render(<RoomDetailSoldOut output={output} state="sold_out" dispatch={dispatch} />);

    const link = getAllByText('Ver otras habitaciones')[0];
    expect(link).toBeInTheDocument();
    expect(link.closest('a')).toHaveAttribute('href', '/hotel/hotel-mirador');
  });
});
