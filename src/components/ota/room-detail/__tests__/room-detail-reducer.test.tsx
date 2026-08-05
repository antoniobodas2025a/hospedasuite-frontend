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
    div: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => (
      <div {...props}>{children}</div>
    ),
  },
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

  it('CONFIRM_DATES from calendar_active with availability → detail', () => {
    const initial: RoomDetailClientState = {
      state: 'calendar_active',
      checkIn: dates.checkIn,
      checkOut: dates.checkOut,
    };
    const action: RoomDetailClientAction = { type: 'CONFIRM_DATES', available: true };

    const next = roomDetailReducer(initial, action);

    expect(next.state).toBe('detail');
    expect(next.checkIn).toEqual(dates.checkIn);
    expect(next.checkOut).toEqual(dates.checkOut);
  });

  it('CONFIRM_DATES from calendar_active without availability → sold_out', () => {
    const initial: RoomDetailClientState = {
      state: 'calendar_active',
      checkIn: dates.checkIn,
      checkOut: dates.checkOut,
    };
    const action: RoomDetailClientAction = { type: 'CONFIRM_DATES', available: false };

    const next = roomDetailReducer(initial, action);

    expect(next.state).toBe('sold_out');
  });

  it('CONFIRM_DATES from non-calendar-active states is ignored', () => {
    const initial: RoomDetailClientState = {
      state: 'calendar_first',
      checkIn: null,
      checkOut: null,
    };
    const action: RoomDetailClientAction = { type: 'CONFIRM_DATES', available: true };

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
    const { getByRole, queryByRole } = render(
      <RoomDetailClient output={makeOutput({ state: 'calendar_first' })} />
    );
    fireEvent.click(getByRole('button', { name: 'Select dates' }));
    expect(queryByRole('button', { name: 'Confirm availability' })).toBeInTheDocument();
  });

  it('transitions from calendar_active to detail when confirming availability', () => {
    const { getByRole, getByTestId, getByText } = render(
      <RoomDetailClient output={makeOutput({ state: 'calendar_active' })} />
    );
    fireEvent.click(getByRole('button', { name: 'Confirm availability' }));
    expect(getByTestId('room-detail-gallery')).toBeInTheDocument();
    expect(getByText('Suite Mirador')).toBeInTheDocument();
  });

  it('transitions from calendar_active to sold_out when confirming no availability', () => {
    const { getByRole, getByTestId } = render(
      <RoomDetailClient output={makeOutput({ state: 'calendar_active' })} />
    );
    fireEvent.click(getByRole('button', { name: 'Confirm sold out' }));
    expect(getByTestId('room-detail-sold-out')).toBeInTheDocument();
  });

  it('renders the gallery for detail state', () => {
    const { getByTestId, getByText } = render(
      <RoomDetailClient output={makeOutput({ state: 'detail' })} />
    );
    expect(getByTestId('room-detail-gallery')).toBeInTheDocument();
    expect(getByText('Suite Mirador')).toBeInTheDocument();
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
