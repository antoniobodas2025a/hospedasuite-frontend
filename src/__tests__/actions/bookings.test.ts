import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRevalidatePath = vi.fn();
const mockEmitEvent = vi.fn();
const mockRequireHotelAccess = vi.fn();

const mockInsert = vi.fn();
const mockFrom = vi.fn();
const queryQueue: Array<{ data: any; error: any }> = [];
let currentTable = '';

const chain: any = {
  select: vi.fn(() => chain),
  eq: vi.fn(() => chain),
  neq: vi.fn(() => chain),
  or: vi.fn(() => chain),
  lt: vi.fn(() => chain),
  gt: vi.fn(() => chain),
  maybeSingle: vi.fn(() => chain),
  single: vi.fn(() => Promise.resolve(queryQueue.shift() ?? { data: null, error: null })),
  insert: mockInsert.mockImplementation((data: any) => {
    chain.inserted.push({ table: currentTable, data });
    return chain;
  }),
  inserted: [] as Array<{ table: string; data: any }>,
};

const mockSupabaseAdmin = {
  from: mockFrom.mockImplementation((table: string) => {
    currentTable = table;
    return chain;
  }),
};

const mockCookieStore = {
  get: vi.fn(() => undefined),
};

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: mockSupabaseAdmin,
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));

vi.mock('next/cache', () => ({
  revalidatePath: mockRevalidatePath,
}));

vi.mock('@/lib/events', () => ({
  emitEvent: mockEmitEvent,
}));

vi.mock('@/lib/tenant-guard', () => ({
  requireHotelAccess: mockRequireHotelAccess,
}));

import {
  createPendingBookingAction,
  verifyBookingAction,
} from '@/app/actions/bookings';

function basePayload(overrides: Record<string, unknown> = {}) {
  return {
    fullName: 'Juan Pérez',
    email: 'juan@example.com',
    phone: '+573001234567',
    document: '12345678',
    roomId: 'room-1',
    checkin: '2026-08-10',
    checkout: '2026-08-11',
    source: 'direct' as const,
    upsells: [],
    amount: 300000,
    consentAccepted: true,
    ...overrides,
  };
}

describe('createPendingBookingAction — FLAT pricing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryQueue.length = 0;
    chain.inserted.length = 0;
    currentTable = '';
  });

  function enqueueSuccessPath() {
    queryQueue.push({
      data: { id: 'room-1', hotel_id: 'hotel-1', price: 300000, weekend_price: 360000 },
      error: null,
    }); // rooms select
    queryQueue.push({ data: null, error: { code: 'PGRST116', message: 'Not found' } }); // existing guest
    queryQueue.push({ data: { id: 'guest-1' }, error: null }); // guest insert
    queryQueue.push({ data: { id: 'booking-1' }, error: null }); // booking insert
    queryQueue.push({ data: { id: 'link-1' }, error: null }); // payment link insert
  }

  it('accepts the exact flat total as the valid amount', async () => {
    enqueueSuccessPath();

    const result = await createPendingBookingAction(basePayload({ amount: 300000 }));

    expect(result.success).toBe(true);
    expect(result.bookingId).toBe('link-1');
  });

  it('rejects amounts outside the 5% flat-price tolerance', async () => {
    queryQueue.push({
      data: { id: 'room-1', hotel_id: 'hotel-1', price: 300000, weekend_price: 360000 },
      error: null,
    });

    const result = await createPendingBookingAction(basePayload({ amount: 280000 }));

    expect(result.success).toBe(false);
    expect(result.error).toBe('Monto verificado no coincide con tarifa de la unidad.');
  });

  it('does NOT query hotel tax_rate or tax_regime', async () => {
    enqueueSuccessPath();

    await createPendingBookingAction(basePayload());

    const tables = mockFrom.mock.calls.map((call) => call[0]);
    expect(tables).not.toContain('hotels');
  });

  it('does NOT insert tax_amount or tax_rate_applied on the booking', async () => {
    enqueueSuccessPath();

    await createPendingBookingAction(basePayload());

    const bookingInsert = chain.inserted.find((item: any) => item.table === 'bookings');
    expect(bookingInsert).toBeDefined();
    const bookingRow = Array.isArray(bookingInsert.data) ? bookingInsert.data[0] : bookingInsert.data;
    expect(bookingRow).not.toHaveProperty('tax_amount');
    expect(bookingRow).not.toHaveProperty('tax_rate_applied');
    expect(bookingRow.total_price).toBe(300000);
  });

  it('calculates the expected flat total using weekend-aware pricing', async () => {
    // Thu -> Sun: 1 weekday + 2 weekend nights = 300000 + 360000 + 360000 = 1.020.000
    enqueueSuccessPath();

    const result = await createPendingBookingAction(
      basePayload({ checkin: '2026-08-13', checkout: '2026-08-16', amount: 1020000 })
    );

    expect(result.success).toBe(true);
  });
});

describe('verifyBookingAction — no tax info returned', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryQueue.length = 0;
    chain.inserted.length = 0;
    currentTable = '';
    mockRequireHotelAccess.mockResolvedValue({ allowed: true });
  });

  it('returns booking data without tax fields', async () => {
    queryQueue.push({
      data: {
        id: 'booking-1',
        status: 'PENDING',
        total_price: 300000,
        subtotal: 300000,
        tax_amount: 0,
        tax_rate_applied: 0,
        weekend_price_used: 300000,
        check_in: '2026-08-10',
        check_out: '2026-08-11',
        source: 'direct',
        room_id: 'room-1',
        hotel_id: 'hotel-1',
        guests: [{ full_name: 'Juan Pérez', email: 'juan@example.com' }],
        rooms: [{ name: 'Suite' }],
        hotels: [{ name: 'Mirador', slug: 'mirador', address: 'Calle 1', phone: '123' }],
        payments: [{ method: 'wompi', status: 'PENDING' }],
      },
      error: null,
    });

    const result = await verifyBookingAction('booking-1');

    expect(result.success).toBe(true);
    expect(result.booking).toBeDefined();
    if (!result.booking) throw new Error('booking missing');
    expect(result.booking).not.toHaveProperty('taxAmount');
    expect(result.booking).not.toHaveProperty('taxRateApplied');
    expect(result.booking).not.toHaveProperty('taxRate');
    expect(result.booking.totalPrice).toBe(300000);
  });
});
