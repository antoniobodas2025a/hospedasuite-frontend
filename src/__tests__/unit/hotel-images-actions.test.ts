/**
 * Hotel Images Server Actions — Unit Tests (Read Layer)
 *
 * T10: getHotelImagesAction returns categorized images correctly
 * T11: getPresignedUrlAction generates valid presigned URLs
 *
 * Mocks: createClient (auth + DB), r2-client (presigned URLs)
 * Pattern: mutation mindset — wrong inputs MUST fail
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock DB chain ──────────────────────────────────────────────────────────
function createMockChain(result: any) {
  const chain: any = {
    _result: result,
  };
  const chainMethods = ['select', 'eq', 'order', 'limit', 'maybeSingle', 'single'];
  for (const m of chainMethods) {
    chain[m] = vi.fn(() => chain);
  }
  chain.then = (resolve: any) => Promise.resolve(resolve(chain._result));
  return chain;
}

const mockDbChain = createMockChain({ data: [], error: null });

// ── Mock functions ─────────────────────────────────────────────────────────
const mockCreateClient = vi.fn();
const mockGetPresignedReadUrl = vi.fn();

// ── Mocks ──────────────────────────────────────────────────────────────────
vi.mock('@/utils/supabase/server', () => ({
  createClient: mockCreateClient,
}));

vi.mock('@/lib/r2-client', () => ({
  getPresignedReadUrl: mockGetPresignedReadUrl,
  R2_PUBLIC_URL: 'https://pub-test.r2.dev',
}));

// ── Imports (after mocks) ─────────────────────────────────────────────────
import {
  getHotelImagesAction,
  getPresignedUrlAction,
} from '@/app/actions/hotel-images';

// ── Helpers ────────────────────────────────────────────────────────────────
function mockAuth(userId: string | null) {
  mockCreateClient.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: userId ? { id: userId } : null },
        error: userId ? null : { message: 'no session' },
      }),
    },
    from: vi.fn(() => mockDbChain),
  });
}

// ── Tests ──────────────────────────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  mockDbChain._result = { data: [], error: null };
});

// ============================================================================
// T10: getHotelImagesAction
// ============================================================================
describe('T10: getHotelImagesAction', () => {
  it('returns categorized images ordered by sort_order', async () => {
    const staffChain = createMockChain({ data: [{ hotel_id: 'hotel-123' }], error: null });
    const imagesChain = createMockChain({
      data: [
        { url: 'https://r2.dev/ext1.webp', category: 'exterior', sort_order: 0, blur_data: null },
        { url: 'https://r2.dev/ext2.webp', category: 'exterior', sort_order: 1, blur_data: 'blur1' },
        { url: 'https://r2.dev/room1.webp', category: 'habitacion', sort_order: 0, blur_data: null },
      ],
      error: null,
    });

    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
      },
      from: vi.fn((table: string) => {
        if (table === 'staff') return staffChain;
        if (table === 'hotel_images') return imagesChain;
        return mockDbChain;
      }),
    });

    const result = await getHotelImagesAction('hotel-123');

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(3);
    expect(result.data![0].category).toBe('exterior');
    expect(result.data![0].sort_order).toBe(0);
    expect(result.data![2].category).toBe('habitacion');
  });

  it('returns empty array when hotel has no images', async () => {
    const staffChain = createMockChain({ data: [{ hotel_id: 'hotel-123' }], error: null });
    const emptyChain = createMockChain({ data: [], error: null });

    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
      },
      from: vi.fn((table: string) => {
        if (table === 'staff') return staffChain;
        if (table === 'hotel_images') return emptyChain;
        return mockDbChain;
      }),
    });

    const result = await getHotelImagesAction('hotel-123');

    expect(result.success).toBe(true);
    expect(result.data).toEqual([]);
  });

  it('returns error when user is not authenticated', async () => {
    mockAuth(null);

    const result = await getHotelImagesAction('hotel-123');

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/autenticado/i);
  });

  it('returns error when user has no access to hotel (RLS guard)', async () => {
    const noAccessChain = createMockChain({ data: [], error: null });

    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
      },
      from: vi.fn(() => noAccessChain),
    });

    const result = await getHotelImagesAction('hotel-999');

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/permisos|acceso|autoriz/i);
  });

  it('mutation mindset: wrong hotelId does NOT return another hotel images', async () => {
    const noAccessChain = createMockChain({ data: [], error: null });

    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
      },
      from: vi.fn(() => noAccessChain),
    });

    const result = await getHotelImagesAction('hotel-999');

    expect(result.success).toBe(false);
    expect(result.data).toBeUndefined();
  });
});

// ============================================================================
// T11: getPresignedUrlAction
// ============================================================================
describe('T11: getPresignedUrlAction', () => {
  it('returns presigned URL for valid image key', async () => {
    mockAuth('user-1');
    mockGetPresignedReadUrl.mockResolvedValue('https://pub-test.r2.dev/hotels/h123/exterior/1234-photo.webp?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Expires=3600');

    const result = await getPresignedUrlAction('hotels/h123/exterior/1234-photo.webp');

    expect(result.success).toBe(true);
    expect(result.url).toContain('https://');
    expect(result.url).toContain('X-Amz-Expires=3600');
    expect(mockGetPresignedReadUrl).toHaveBeenCalledWith(
      'hotels/h123/exterior/1234-photo.webp',
      3600
    );
  });

  it('returns error for empty image key', async () => {
    mockAuth('user-1');

    const result = await getPresignedUrlAction('');

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/v[aá]lida|key|clave/i);
    expect(mockGetPresignedReadUrl).not.toHaveBeenCalled();
  });

  it('returns error when user is not authenticated', async () => {
    mockAuth(null);

    const result = await getPresignedUrlAction('hotels/h123/exterior/photo.webp');

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/autenticado/i);
    expect(mockGetPresignedReadUrl).not.toHaveBeenCalled();
  });

  it('mutation mindset: URL expires in positive time (1 hour)', async () => {
    mockAuth('user-1');
    mockGetPresignedReadUrl.mockResolvedValue('https://pub-test.r2.dev/photo.webp?X-Amz-Expires=3600');

    const result = await getPresignedUrlAction('hotels/h123/exterior/photo.webp');

    expect(result.success).toBe(true);
    expect(mockGetPresignedReadUrl).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Number)
    );
    const calledExpiresIn = mockGetPresignedReadUrl.mock.calls[0][1];
    expect(calledExpiresIn).toBeGreaterThan(0);
    expect(calledExpiresIn).toBe(3600);
  });

  it('propagates R2 client errors gracefully', async () => {
    mockAuth('user-1');
    mockGetPresignedReadUrl.mockRejectedValue(new Error('R2 connection timeout'));

    const result = await getPresignedUrlAction('hotels/h123/exterior/photo.webp');

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/R2|presigned|URL|error/i);
  });
});
