// @vitest-environment jsdom
import '../../../../__tests__/bun-test-dom-setup';
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom';
import { render, fireEvent } from '@testing-library/react';
import type { RoomDetailViewModelOutput } from '@/view-models/room-detail-view-model';
import {
  RoomDetailClient,
  roomDetailReducer,
  type RoomDetailClientState,
  type RoomDetailClientAction,
} from '../room-detail-client';

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, initial: _initial, animate: _animate, exit: _exit, transition: _transition, whileTap: _whileTap, ...props }: { children: React.ReactNode; [key: string]: unknown }) => (
      <div {...props}>{children}</div>
    ),
    button: ({ children, initial: _initial, animate: _animate, exit: _exit, transition: _transition, whileTap: _whileTap, ...props }: { children: React.ReactNode; [key: string]: unknown }) => (
      <button {...props}>{children}</button>
    ),
    span: ({ children, initial: _initial, animate: _animate, exit: _exit, transition: _transition, whileTap: _whileTap, ...props }: { children: React.ReactNode; [key: string]: unknown }) => (
      <span {...props}>{children}</span>
    ),
  },
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    const messages: Record<string, string> = {
      'ota.booking.from': 'Desde',
      'ota.booking.reserve': 'Reservar',
      'ota.search.selectDates': 'Seleccionar fechas',
      'ota.showcase.total': 'Total',
      'ota.showcase.cop': 'COP',
      'ota.showcase.nights': '{count} noches',
      'ota.showcase.nights_one': '{count} noche',
      'ota.showcase.nights_other': '{count} noches',
      'ota.showcase.seeOtherRooms': 'Ver otras habitaciones',
      'ota.roomDetail.backToHotel': 'Volver al hotel',
      'ota.roomDetail.changeDates': 'Cambiar fechas',
      'ota.roomDetail.chooseDates': 'Elegir fechas',
      'ota.roomDetail.notAvailableForDates': 'No disponible para {checkIn} - {checkOut}',
      'ota.roomDetail.perNight': '/noche',
      'ota.roomDetail.selectDates': 'Seleccionar fechas',
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

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('next/image', () => ({
  __esModule: true,
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} />,
}));

vi.mock('@/components/ota/InlineDatePicker', () => ({
  __esModule: true,
  default: ({ onChange }: { onChange?: (range: { from: Date; to: Date }) => void }) => (
    <div data-testid="inline-date-picker">
      <button
        type="button"
        onClick={() => onChange?.({ from: new Date('2026-08-10T12:00:00Z'), to: new Date('2026-08-13T12:00:00Z') })}
      >
        Select dates
      </button>
    </div>
  ),
}));

vi.mock('@/components/ota/RoomGalleryGrid', () => ({
  __esModule: true,
  default: () => <div data-testid="room-gallery-grid" />,
}));

vi.mock('@/components/ota/RoomInfoPanel', () => ({
  RoomInfoPanel: () => <div data-testid="room-info-panel" />,
}));

vi.mock('@/components/ota/RoomCard', () => ({
  __esModule: true,
  default: () => <div data-testid="room-card" />,
}));

vi.mock('@/components/ota/PriceBreakdown', () => ({
  __esModule: true,
  default: () => <div data-testid="price-breakdown" />,
}));

vi.mock('@/components/ui/glass', () => ({
  GlassCard: ({ children, 'data-testid': dataTestId, ...props }: { children?: React.ReactNode; 'data-testid'?: string; [key: string]: unknown }) => (
    <div {...props} data-testid={dataTestId ?? 'glass-card'}>{children}</div>
  ),
  GlassPanel: ({ children, 'data-testid': dataTestId, ...props }: { children?: React.ReactNode; 'data-testid'?: string; [key: string]: unknown }) => (
    <div {...props} data-testid={dataTestId ?? 'glass-panel'}>{children}</div>
  ),
  GlassPill: ({ children, 'data-testid': dataTestId, ...props }: { children?: React.ReactNode; 'data-testid'?: string; [key: string]: unknown }) => (
    <div {...props} data-testid={dataTestId ?? 'glass-pill'}>{children}</div>
  ),
}));

vi.mock('@/lib/amenity-registry', () => ({
  getRoomAmenityById: () => null,
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
    gallery: [],
    coverImage: '/logo.png',
    description: 'A nice suite',
    capacity: 2,
    beds: 1,
    bedType: 'Queen',
    amenities: [],
    cancellationPolicy: null,
    suggestions: [],
    showOtherRooms: false,
    breadcrumb: { label: 'Hotel Mirador / Suite Mirador', href: '/hotel/hotel-mirador' },
    canBook: true,
    error: null,
    roomId: 'room-1',
    primaryColor: '#3b82f6',
    ...overrides,
  };
}

const dates = {
  checkIn: new Date('2026-08-10T12:00:00Z'),
  checkOut: new Date('2026-08-13T12:00:00Z'),
};

describe('roomDetailReducer', () => {
  it('SELECT_DATES from gallery → dates_selected', () => {
    const initial: RoomDetailClientState = {
      state: 'gallery',
      checkIn: null,
      checkOut: null,
    };
    const action: RoomDetailClientAction = { type: 'SELECT_DATES', ...dates };

    const next = roomDetailReducer(initial, action);

    expect(next.state).toBe('dates_selected');
    expect(next.checkIn).toEqual(dates.checkIn);
    expect(next.checkOut).toEqual(dates.checkOut);
  });

  it('SELECT_DATES from dates_selected replaces the selected dates', () => {
    const initial: RoomDetailClientState = {
      state: 'dates_selected',
      checkIn: new Date('2026-08-01T12:00:00Z'),
      checkOut: new Date('2026-08-02T12:00:00Z'),
    };
    const action: RoomDetailClientAction = { type: 'SELECT_DATES', ...dates };

    const next = roomDetailReducer(initial, action);

    expect(next.state).toBe('dates_selected');
    expect(next.checkIn).toEqual(dates.checkIn);
    expect(next.checkOut).toEqual(dates.checkOut);
  });

  it('SELECT_DATES from sold_out is ignored', () => {
    const initial: RoomDetailClientState = {
      state: 'sold_out',
      checkIn: dates.checkIn,
      checkOut: dates.checkOut,
    };
    const action: RoomDetailClientAction = { type: 'SELECT_DATES', ...dates };

    const next = roomDetailReducer(initial, action);

    expect(next.state).toBe('sold_out');
    expect(next.checkIn).toEqual(dates.checkIn);
    expect(next.checkOut).toEqual(dates.checkOut);
  });

  it('CLEAR_DATES from any state → gallery with null dates', () => {
    const states: RoomDetailClientState['state'][] = ['dates_selected', 'sold_out'];

    for (const state of states) {
      const initial: RoomDetailClientState = {
        state,
        checkIn: dates.checkIn,
        checkOut: dates.checkOut,
      };
      const action: RoomDetailClientAction = { type: 'CLEAR_DATES' };

      const next = roomDetailReducer(initial, action);

      expect(next.state).toBe('gallery');
      expect(next.checkIn).toBeNull();
      expect(next.checkOut).toBeNull();
    }
  });

  it('SELECT_SUGGESTION from sold_out → dates_selected', () => {
    const initial: RoomDetailClientState = {
      state: 'sold_out',
      checkIn: null,
      checkOut: null,
    };
    const action: RoomDetailClientAction = {
      type: 'SELECT_SUGGESTION',
      checkIn: dates.checkIn,
      checkOut: dates.checkOut,
    };

    const next = roomDetailReducer(initial, action);

    expect(next.state).toBe('dates_selected');
    expect(next.checkIn).toEqual(dates.checkIn);
    expect(next.checkOut).toEqual(dates.checkOut);
  });

  it('SELECT_SUGGESTION from non-sold_out states is ignored', () => {
    const initial: RoomDetailClientState = {
      state: 'gallery',
      checkIn: null,
      checkOut: null,
    };
    const action: RoomDetailClientAction = {
      type: 'SELECT_SUGGESTION',
      checkIn: dates.checkIn,
      checkOut: dates.checkOut,
    };

    const next = roomDetailReducer(initial, action);

    expect(next.state).toBe('gallery');
    expect(next.checkIn).toBeNull();
    expect(next.checkOut).toBeNull();
  });

  it('FETCH_ERROR from any state → error', () => {
    const states: RoomDetailClientState['state'][] = [
      'loading',
      'gallery',
      'dates_selected',
      'sold_out',
    ];

    for (const state of states) {
      const initial: RoomDetailClientState = {
        state,
        checkIn: state === 'gallery' ? null : dates.checkIn,
        checkOut: state === 'gallery' ? null : dates.checkOut,
      };
      const action: RoomDetailClientAction = { type: 'FETCH_ERROR' };

      const next = roomDetailReducer(initial, action);

      expect(next.state).toBe('error');
    }
  });
});

describe('RoomDetailClient', () => {
  it('renders the skeleton for loading state', () => {
    const { getByTestId } = render(<RoomDetailClient output={makeOutput({ state: 'loading' })} />);
    expect(getByTestId('room-detail-skeleton')).toBeInTheDocument();
  });

  it('renders the gallery and calendar for the gallery state', () => {
    const { getByTestId, getByRole } = render(
      <RoomDetailClient output={makeOutput({ state: 'gallery' })} />
    );
    expect(getByTestId('room-detail-gallery')).toBeInTheDocument();
    expect(getByTestId('room-detail-calendar')).toBeInTheDocument();
    expect(getByRole('button', { name: 'Select dates' })).toBeInTheDocument();
  });

  it('renders the gallery and calendar for the dates_selected state', () => {
    const { getByTestId } = render(
      <RoomDetailClient
        output={makeOutput({
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
          initialCheckIn: dates.checkIn,
          initialCheckOut: dates.checkOut,
        })}
      />
    );
    expect(getByTestId('room-detail-gallery')).toBeInTheDocument();
    expect(getByTestId('room-detail-calendar')).toBeInTheDocument();
  });

  it('transitions from gallery to dates_selected when selecting dates', () => {
    const { getByRole, getByTestId } = render(
      <RoomDetailClient output={makeOutput({ state: 'gallery' })} />
    );
    fireEvent.click(getByRole('button', { name: 'Select dates' }));
    expect(getByTestId('room-detail-calendar')).toHaveAttribute('data-state', 'dates_selected');
  });

  it('shows the price summary in the calendar sidebar after selecting dates', () => {
    const { getByRole, getByTestId } = render(
      <RoomDetailClient output={makeOutput({ state: 'gallery', pricing: null })} />
    );
    fireEvent.click(getByRole('button', { name: 'Select dates' }));

    expect(getByTestId('summary-bar')).toBeInTheDocument();
    expect(getByTestId('calendar-reserve-button')).toHaveTextContent('Reservar');
    expect(getByTestId('summary-bar')).toHaveTextContent('$1.071.000');
  });

  it('hides calendar Reservar without dates and enables it after selecting dates', () => {
    const { getByRole, getByTestId, queryByTestId } = render(
      <RoomDetailClient output={makeOutput({ state: 'gallery', pricing: null })} />
    );
    expect(queryByTestId('calendar-reserve-button')).not.toBeInTheDocument();

    fireEvent.click(getByRole('button', { name: 'Select dates' }));

    expect(getByTestId('calendar-reserve-button')).toBeEnabled();
  });

  it('shows the calendar Reservar button in the inline booking card', () => {
    const { getByTestId } = render(
      <RoomDetailClient
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
          initialCheckIn: dates.checkIn,
          initialCheckOut: dates.checkOut,
        })}
      />
    );

    const reserveButton = getByTestId('calendar-reserve-button');
    expect(reserveButton).toBeEnabled();
    expect(reserveButton).toHaveTextContent('Reservar');
  });

  it('does not render a Ver habitación / Ver detalle button', () => {
    const { queryByText } = render(
      <RoomDetailClient output={makeOutput({ state: 'gallery' })} />
    );
    expect(queryByText('Ver habitación')).not.toBeInTheDocument();
    expect(queryByText('Ver detalle')).not.toBeInTheDocument();
  });

  it('passes user-selected dates into the gallery component', () => {
    const { getByRole, getByTestId } = render(
      <RoomDetailClient output={makeOutput({ state: 'gallery', pricing: null })} />
    );
    fireEvent.click(getByRole('button', { name: 'Select dates' }));

    const gallery = getByTestId('room-detail-gallery');
    expect(gallery).toHaveAttribute('data-checkin', '2026-08-10');
    expect(gallery).toHaveAttribute('data-checkout', '2026-08-13');
  });

  it('renders the sold-out state for sold_out', () => {
    const { getByTestId } = render(<RoomDetailClient output={makeOutput({ state: 'sold_out' })} />);
    expect(getByTestId('room-detail-sold-out')).toBeInTheDocument();
  });

  it('renders the error state for error', () => {
    const { getByTestId, getByText } = render(
      <RoomDetailClient output={makeOutput({ state: 'error', error: 'Not found' })} />
    );
    expect(getByTestId('room-detail-error')).toBeInTheDocument();
    expect(getByText('Not found')).toBeInTheDocument();
  });

  it('renders the unified layout: gallery full-width above info panel + calendar sidebar', () => {
    const { getByTestId } = render(<RoomDetailClient output={makeOutput({ state: 'gallery' })} />);

    const gallery = getByTestId('room-detail-gallery');
    const infoPanel = getByTestId('room-info-panel');
    const calendar = getByTestId('room-detail-calendar');

    expect(gallery).toBeInTheDocument();
    expect(infoPanel).toBeInTheDocument();
    expect(calendar).toBeInTheDocument();

    const galleryHtml = document.body.innerHTML;
    expect(galleryHtml.indexOf('data-testid="room-detail-gallery"')).toBeLessThan(
      galleryHtml.indexOf('data-testid="room-info-panel"')
    );
    expect(galleryHtml.indexOf('data-testid="room-info-panel"')).toBeLessThan(
      galleryHtml.indexOf('data-testid="room-detail-calendar"')
    );
  });

  it('does not render a CTA dock and exposes a single reserve CTA in the calendar', () => {
    const { getByTestId, queryByTestId } = render(
      <RoomDetailClient
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
          initialCheckIn: dates.checkIn,
          initialCheckOut: dates.checkOut,
        })}
      />
    );

    expect(queryByTestId('cta-dock')).not.toBeInTheDocument();
    expect(getByTestId('calendar-reserve-button')).toBeEnabled();
  });
});
