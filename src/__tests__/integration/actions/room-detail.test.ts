import { describe, it, expect, vi } from 'vitest';
import { getRoomDetailAction } from '@/app/actions/room-detail';
import { createRoomDetailGateway } from '@/gateways/supabase-room-gateway';
import { supabaseAdmin } from '@/lib/supabase-admin';

vi.mock('@/gateways/supabase-room-gateway', () => ({
  createRoomDetailGateway: vi.fn(),
}));

function mockRoomDetail(overrides: any = {}) {
  return {
    id: 'room-1',
    name: 'Suite',
    description: 'A nice suite',
    capacity: 2,
    beds: 1,
    bedType: 'Queen',
    gallery: ['https://example.com/img1.jpg'],
    amenities: ['WiFi'],
    pricePerNight: 100,
    weekendPrice: 150,
    status: 'active' as const,
    restricted: false,
    ...overrides,
  };
}

describe('getRoomDetailAction', () => {
  it('returns room detail when the gateway finds a room', async () => {
    const gateway = { getRoomDetail: vi.fn().mockResolvedValue(mockRoomDetail()) };
    (createRoomDetailGateway as any).mockReturnValue(gateway);

    const result = await getRoomDetailAction('mirador', 'room-1');

    expect(createRoomDetailGateway).toHaveBeenCalledWith(supabaseAdmin);
    expect(gateway.getRoomDetail).toHaveBeenCalledWith('mirador', 'room-1');
    expect(result.success).toBe(true);
    expect(result.data?.id).toBe('room-1');
    expect(result.data?.name).toBe('Suite');
    expect(result.data?.restricted).toBe(false);
  });

  it('returns an error when the gateway returns null', async () => {
    const gateway = { getRoomDetail: vi.fn().mockResolvedValue(null) };
    (createRoomDetailGateway as any).mockReturnValue(gateway);

    const result = await getRoomDetailAction('mirador', 'room-1');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Hotel or room not available');
    expect(result.data).toBeUndefined();
  });

  it('returns room detail with restricted flag for past-due hotels', async () => {
    const gateway = { getRoomDetail: vi.fn().mockResolvedValue(mockRoomDetail({ restricted: true })) };
    (createRoomDetailGateway as any).mockReturnValue(gateway);

    const result = await getRoomDetailAction('mirador', 'room-1');

    expect(result.success).toBe(true);
    expect(result.data?.restricted).toBe(true);
  });

  it('returns an error when the gateway throws', async () => {
    const gateway = { getRoomDetail: vi.fn().mockRejectedValue(new Error('Supabase timeout')) };
    (createRoomDetailGateway as any).mockReturnValue(gateway);

    const result = await getRoomDetailAction('mirador', 'room-1');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Supabase timeout');
  });
});
