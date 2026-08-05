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
      'ota.roomDetail.notAvailableForDates': 'No disponible para {checkIn} - {checkOut}',
      'ota.roomDetail.viewDetail': 'Ver detalle',
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
    state: 'calendar_first',
    roomName: 'Suite Mirador',
    hotelName: 'Hotel Mirador',
    hotelSlug: 'hotel-mirador',
    totalHotelRooms: 1,
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
  it('SELECT_DATES from calendar_first → calendar_active', () => {
    const initial: RoomDetailClientState = {
      state: 'calendar_first',
      checkIn: null,
      checkOut: null,
    };
    const action: RoomDetailClientAction = { type: 'SELECT_DATES', ...dates };

    const next = roomDetailReducer(initial, action);

    expect(next.state).toBe('calendar_active');
    expect(next.checkIn).toEqual(dates.checkIn);
    expect(next.checkOut).toEqual(dates.checkOut);
  });

  it('SELECT_DATES from calendar_active replaces the selected dates', () => {
    const initial: RoomDetailClientState = {
      state: 'calendar_active',
      checkIn: new Date('2026-08-01T12:00:00Z'),
      checkOut: new Date('2026-08-02T12:00:00Z'),
    };
    const action: RoomDetailClientAction = { type: 'SELECT_DATES', ...dates };

    const next = roomDetailReducer(initial, action);

    expect(next.state).toBe('calendar_active');
    expect(next.checkIn).toEqual(dates.checkIn);
    expect(next.checkOut).toEqual(dates.checkOut);
  });

  it('SELECT_DATES from non-calendar states is ignored', () => {
    const initial: RoomDetailClientState = {
      state: 'detail',
      checkIn: new Date('2026-08-01T12:00:00Z'),
      checkOut: new Date('2026-08-02T12:00:00Z'),
    };
    const action: RoomDetailClientAction = { type: 'SELECT_DATES', ...dates };

    const next = roomDetailReducer(initial, action);

    expect(next.state).toBe('detail');
    expect(next.checkIn).toEqual(initial.checkIn);
    expect(next.checkOut).toEqual(initial.checkOut);
  });

  it('CONFIRM_DATES from calendar_active → detail', () => {
    const initial: RoomDetailClientState = {
      state: 'calendar_active',
      checkIn: dates.checkIn,
      checkOut: dates.checkOut,
    };
    const action: RoomDetailClientAction = { type: 'CONFIRM_DATES' };

    const next = roomDetailReducer(initial, action);

    expect(next.state).toBe('detail');
    expect(next.checkIn).toEqual(dates.checkIn);
    expect(next.checkOut).toEqual(dates.checkOut);
  });

  it('CONFIRM_DATES from non-calendar-active states is ignored', () => {
    const initial: RoomDetailClientState = {
      state: 'calendar_first',
      checkIn: null,
      checkOut: null,
    };
    const action: RoomDetailClientAction = { type: 'CONFIRM_DATES' };

    const next = roomDetailReducer(initial, action);

    expect(next.state).toBe('calendar_first');
  });

  it('CLEAR_DATES from calendar_active → calendar_first', () => {
    const initial: RoomDetailClientState = {
      state: 'calendar_active',
      checkIn: dates.checkIn,
      checkOut: dates.checkOut,
    };
    const action: RoomDetailClientAction = { type: 'CLEAR_DATES' };

    const next = roomDetailReducer(initial, action);

    expect(next.state).toBe('calendar_first');
    expect(next.checkIn).toBeNull();
    expect(next.checkOut).toBeNull();
  });

  it('CLEAR_DATES from detail → calendar_first', () => {
    const initial: RoomDetailClientState = {
      state: 'detail',
      checkIn: dates.checkIn,
      checkOut: dates.checkOut,
    };
    const action: RoomDetailClientAction = { type: 'CLEAR_DATES' };

    const next = roomDetailReducer(initial, action);

    expect(next.state).toBe('calendar_first');
    expect(next.checkIn).toBeNull();
    expect(next.checkOut).toBeNull();
  });

  it('CLEAR_DATES from sold_out → calendar_first', () => {
    const initial: RoomDetailClientState = {
      state: 'sold_out',
      checkIn: dates.checkIn,
      checkOut: dates.checkOut,
    };
    const action: RoomDetailClientAction = { type: 'CLEAR_DATES' };

    const next = roomDetailReducer(initial, action);

    expect(next.state).toBe('calendar_first');
    expect(next.checkIn).toBeNull();
    expect(next.checkOut).toBeNull();
  });

  it('SELECT_SUGGESTION from sold_out → calendar_active', () => {
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

    expect(next.state).toBe('calendar_active');
    expect(next.checkIn).toEqual(dates.checkIn);
    expect(next.checkOut).toEqual(dates.checkOut);
  });

  it('SELECT_SUGGESTION from non-sold_out states is ignored', () => {
    const initial: RoomDetailClientState = {
      state: 'calendar_first',
      checkIn: null,
      checkOut: null,
    };
    const action: RoomDetailClientAction = {
      type: 'SELECT_SUGGESTION',
      checkIn: dates.checkIn,
      checkOut: dates.checkOut,
    };

    const next = roomDetailReducer(initial, action);

    expect(next.state).toBe('calendar_first');
    expect(next.checkIn).toBeNull();
    expect(next.checkOut).toBeNull();
  });

  it('CHANGE_DATES from detail → calendar_active', () => {
    const initial: RoomDetailClientState = {
      state: 'detail',
      checkIn: dates.checkIn,
      checkOut: dates.checkOut,
    };
    const action: RoomDetailClientAction = { type: 'CHANGE_DATES' };

    const next = roomDetailReducer(initial, action);

    expect(next.state).toBe('calendar_active');
    expect(next.checkIn).toEqual(dates.checkIn);
    expect(next.checkOut).toEqual(dates.checkOut);
  });

  it('CHANGE_DATES from non-detail states is ignored', () => {
    const initial: RoomDetailClientState = {
      state: 'calendar_active',
      checkIn: dates.checkIn,
      checkOut: dates.checkOut,
    };
    const action: RoomDetailClientAction = { type: 'CHANGE_DATES' };

    const next = roomDetailReducer(initial, action);

    expect(next.state).toBe('calendar_active');
  });

  it('FETCH_ERROR from any state → error', () => {
    const states: RoomDetailClientState['state'][] = [
      'loading',
      'calendar_first',
      'calendar_active',
      'detail',
      'sold_out',
    ];

    for (const state of states) {
      const initial: RoomDetailClientState = {
        state,
        checkIn: state === 'calendar_first' ? null : dates.checkIn,
        checkOut: state === 'calendar_first' ? null : dates.checkOut,
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

  it('renders the calendar for calendar_first state', () => {
    const { getByTestId, getByRole } = render(
      <RoomDetailClient output={makeOutput({ state: 'calendar_first' })} />
    );
    expect(getByTestId('room-detail-calendar')).toBeInTheDocument();
    expect(getByRole('button', { name: 'Select dates' })).toBeInTheDocument();
  });

  it('transitions from calendar_first to calendar_active when selecting dates', () => {
    const { getByRole, getByTestId } = render(
      <RoomDetailClient output={makeOutput({ state: 'calendar_first' })} />
    );
    fireEvent.click(getByRole('button', { name: 'Select dates' }));
    expect(getByTestId('room-detail-calendar')).toHaveAttribute('data-state', 'calendar_active');
  });

  it('transitions from calendar_active to detail when confirming availability', () => {
    const { getByRole, getByTestId } = render(
      <RoomDetailClient
        output={makeOutput({
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
            breakdown: [],
          },
          initialCheckIn: new Date('2026-08-10T12:00:00Z'),
          initialCheckOut: new Date('2026-08-13T12:00:00Z'),
        })}
      />
    );
    fireEvent.click(getByRole('button', { name: 'Ver detalle' }));
    expect(getByTestId('room-detail-gallery')).toBeInTheDocument();
  });

  it('passes user-selected dates from reducer into the detail gallery', () => {
    const { getByRole, getByTestId } = render(
      <RoomDetailClient
        output={makeOutput({
          state: 'calendar_first',
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
        })}
      />
    );
    fireEvent.click(getByRole('button', { name: 'Select dates' }));
    fireEvent.click(getByRole('button', { name: 'Ver detalle' }));

    const gallery = getByTestId('room-detail-gallery');
    expect(gallery).toHaveAttribute('data-checkin', '2026-08-10');
    expect(gallery).toHaveAttribute('data-checkout', '2026-08-13');
  });

  it('renders the gallery for detail state', () => {
    const { getByTestId, getAllByText } = render(
      <RoomDetailClient output={makeOutput({ state: 'detail' })} />
    );
    expect(getByTestId('room-detail-gallery')).toBeInTheDocument();
    expect(getAllByText('Suite Mirador').length).toBeGreaterThan(0);
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
});
