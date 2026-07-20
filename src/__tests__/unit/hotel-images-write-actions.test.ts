/**
 * Hotel Images Server Actions — Unit Tests (Write Layer)
 *
 * T10 extend: Write-then-read consistency
 * T11 extend: getPresignedCategoryUrlAction generates valid PUT URLs
 * T12: jargon-guard integration — rejects forbidden terms in upload flow
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
  const chainMethods = ['select', 'eq', 'order', 'limit', 'maybeSingle', 'single', 'insert', 'update'];
  for (const m of chainMethods) {
    chain[m] = vi.fn(() => chain);
  }
  chain.then = (resolve: any) => Promise.resolve(resolve(chain._result));
  return chain;
}

const mockDbChain = createMockChain({ data: [], error: null });

// ── Mock functions ─────────────────────────────────────────────────────────
const mockCreateClient = vi.fn();
const mockGetPresignedUploadUrl = vi.fn();

// ── Mocks ──────────────────────────────────────────────────────────────────
vi.mock('@/utils/supabase/server', () => ({
  createClient: mockCreateClient,
}));

vi.mock('@/lib/r2-client', () => ({
  getPresignedUploadUrl: mockGetPresignedUploadUrl,
  R2_PUBLIC_URL: 'https://pub-test.r2.dev',
}));

// ── Imports (after mocks) ─────────────────────────────────────────────────
import {
  getPresignedCategoryUrlAction,
  uploadHotelImageAction,
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
// T11 extend: getPresignedCategoryUrlAction
// ============================================================================
describe('T11 extend: getPresignedCategoryUrlAction', () => {
  it('generates PUT URL with category-aware path pattern', async () => {
    mockAuth('user-1');
    const staffChain = createMockChain({ data: [{ hotel_id: 'hotel-123' }], error: null });
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
      },
      from: vi.fn(() => staffChain),
    });

    mockGetPresignedUploadUrl.mockResolvedValue(
      'https://pub-test.r2.dev/hotels/hotel-123/exterior/1234567890-photo.webp?X-Amz-Algorithm=AWS4-HMAC-SHA256'
    );

    const result = await getPresignedCategoryUrlAction('hotel-123', 'exterior', 'photo.webp');

    expect(result.success).toBe(true);
    expect(result.uploadUrl).toContain('https://');
    expect(result.publicUrl).toContain('hotels/hotel-123/exterior/');
    expect(result.publicUrl).toContain('photo.webp');
    expect(mockGetPresignedUploadUrl).toHaveBeenCalledWith(
      expect.stringMatching(/hotels\/hotel-123\/exterior\/\d+-photo\.webp/),
      'image/webp'
    );
  });

  it('returns error when user is not authenticated', async () => {
    mockAuth(null);

    const result = await getPresignedCategoryUrlAction('hotel-123', 'exterior', 'photo.webp');

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/autenticado/i);
    expect(mockGetPresignedUploadUrl).not.toHaveBeenCalled();
  });

  it('returns error when user has no access to hotel', async () => {
    const noAccessChain = createMockChain({ data: [], error: null });
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
      },
      from: vi.fn(() => noAccessChain),
    });

    const result = await getPresignedCategoryUrlAction('hotel-999', 'exterior', 'photo.webp');

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/permisos|acceso|autoriz/i);
    expect(mockGetPresignedUploadUrl).not.toHaveBeenCalled();
  });

  it('returns error for invalid category', async () => {
    mockAuth('user-1');
    const staffChain = createMockChain({ data: [{ hotel_id: 'hotel-123' }], error: null });
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
      },
      from: vi.fn(() => staffChain),
    });

    const result = await getPresignedCategoryUrlAction('hotel-123', 'invalid_category' as any, 'photo.webp');

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/categor[aí]a|invalid/i);
    expect(mockGetPresignedUploadUrl).not.toHaveBeenCalled();
  });

  it('mutation mindset: forbidden term in fileName is rejected (T12)', async () => {
    mockAuth('user-1');
    const staffChain = createMockChain({ data: [{ hotel_id: 'hotel-123' }], error: null });
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
      },
      from: vi.fn(() => staffChain),
    });

    const result = await getPresignedCategoryUrlAction('hotel-123', 'exterior', 'OTA-listing.webp');

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/prohibido|t[eé]rmino|jargon/i);
    expect(mockGetPresignedUploadUrl).not.toHaveBeenCalled();
  });

  it('rejects fileName with "Marketplace" term', async () => {
    mockAuth('user-1');
    const staffChain = createMockChain({ data: [{ hotel_id: 'hotel-123' }], error: null });
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
      },
      from: vi.fn(() => staffChain),
    });

    const result = await getPresignedCategoryUrlAction('hotel-123', 'exterior', 'marketplace-photo.webp');

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/prohibido|t[eé]rmino|jargon/i);
  });

  it('rejects fileName with "vitrina digital" term', async () => {
    mockAuth('user-1');
    const staffChain = createMockChain({ data: [{ hotel_id: 'hotel-123' }], error: null });
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
      },
      from: vi.fn(() => staffChain),
    });

    // Use a space in the filename to match the forbidden term "vitrina digital"
    const result = await getPresignedCategoryUrlAction('hotel-123', 'exterior', 'vitrina digital image.webp');

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/prohibido|t[eé]rmino|jargon/i);
  });
});

// ============================================================================
// T10 extend: uploadHotelImageAction (write-then-read consistency)
// ============================================================================
describe('T10 extend: uploadHotelImageAction', () => {
  it('inserts image into hotel_images with correct category', async () => {
    const staffChain = createMockChain({ data: [{ hotel_id: 'hotel-123' }], error: null });
    const insertChain = createMockChain({
      data: { id: 'img-1', url: 'https://r2.dev/exterior/photo.webp', category: 'exterior', sort_order: 0, blur_data: null },
      error: null,
    });

    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
      },
      from: vi.fn((table: string) => {
        if (table === 'staff') return staffChain;
        if (table === 'hotel_images') return insertChain;
        return mockDbChain;
      }),
    });

    const result = await uploadHotelImageAction('hotel-123', {
      url: 'https://r2.dev/exterior/photo.webp',
      category: 'exterior',
      sort_order: 0,
    });

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.category).toBe('exterior');
    expect(result.data?.url).toBe('https://r2.dev/exterior/photo.webp');
    expect(insertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        hotel_id: 'hotel-123',
        url: 'https://r2.dev/exterior/photo.webp',
        category: 'exterior',
        sort_order: 0,
      })
    );
  });

  it('returns error when user is not authenticated', async () => {
    mockAuth(null);

    const result = await uploadHotelImageAction('hotel-123', {
      url: 'https://r2.dev/photo.webp',
      category: 'exterior',
      sort_order: 0,
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/autenticado/i);
  });

  it('returns error when user has no access to hotel', async () => {
    const noAccessChain = createMockChain({ data: [], error: null });
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
      },
      from: vi.fn(() => noAccessChain),
    });

    const result = await uploadHotelImageAction('hotel-999', {
      url: 'https://r2.dev/photo.webp',
      category: 'exterior',
      sort_order: 0,
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/permisos|acceso|autoriz/i);
  });

  it('returns error for invalid category', async () => {
    const staffChain = createMockChain({ data: [{ hotel_id: 'hotel-123' }], error: null });
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
      },
      from: vi.fn(() => staffChain),
    });

    const result = await uploadHotelImageAction('hotel-123', {
      url: 'https://r2.dev/photo.webp',
      category: 'invalid_category' as any,
      sort_order: 0,
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/categor[aí]a|invalid/i);
  });

  it('mutation mindset: blob URL is rejected', async () => {
    const staffChain = createMockChain({ data: [{ hotel_id: 'hotel-123' }], error: null });
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
      },
      from: vi.fn(() => staffChain),
    });

    const result = await uploadHotelImageAction('hotel-123', {
      url: 'blob:http://localhost:3000/abc123',
      category: 'exterior',
      sort_order: 0,
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/URL|inv[aá]lida|blob/i);
  });
});
