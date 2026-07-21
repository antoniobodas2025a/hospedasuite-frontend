/**
 * Onboarding Dual-Write — Unit Tests
 *
 * Tests that executeOnboardingProvisioning writes to BOTH:
 * - hotel_images (new categorized table)
 * - gallery_urls (legacy flat array)
 *
 * Also tests main_image_url derivation from first priority image.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock server-only BEFORE any imports to prevent "cannot be imported from Client Component" errors
vi.mock('server-only', () => ({}));

// ── Mock DB chain ──────────────────────────────────────────────────────────
function createMockChain(result: any) {
  const chain: any = {
    _result: result,
    _inserts: [] as any[],
    _updates: [] as any[],
  };
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.order = vi.fn(() => chain);
  chain.limit = vi.fn(() => chain);
  chain.maybeSingle = vi.fn(() => chain);
  chain.single = vi.fn(() => chain);
  chain.insert = vi.fn((data: any) => {
    chain._inserts.push(data);
    return chain;
  });
  chain.update = vi.fn((data: any) => {
    chain._updates.push(data);
    return chain;
  });
  chain.then = (resolve: any) => Promise.resolve(resolve(chain._result));
  return chain;
}

// ── Mock functions ─────────────────────────────────────────────────────────
const mockCreateClient = vi.fn();
const mockCreateAdminClient = vi.fn();

// ── Mocks ──────────────────────────────────────────────────────────────────
vi.mock('server-only', () => ({}));

vi.mock('@/data/plan-guard', () => ({
  checkUnitLimit: vi.fn().mockResolvedValue({ ok: true, currentCount: 0, maxAllowed: 10, remaining: 10 }),
}));

vi.mock('@/utils/supabase/server', () => ({
  createClient: mockCreateClient,
}));

vi.mock('@/utils/supabase/admin', () => ({
  createAdminClient: mockCreateAdminClient,
}));

vi.mock('@/lib/slug', () => ({
  generateUniqueSlug: vi.fn().mockResolvedValue('test-hotel'),
}));

vi.mock('@/lib/feature-flags', () => ({
  FEATURES: { WIZARD_WOMPI_SUBSCRIPTION: false },
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

// ── Imports (after mocks) ─────────────────────────────────────────────────
import { executeOnboardingProvisioning } from '@/app/actions/onboarding';
import type { FullWizardState } from '@/lib/onboarding-schemas';

// ── Helpers ────────────────────────────────────────────────────────────────
function createMockWizardState(overrides?: Partial<FullWizardState>): FullWizardState {
  return {
    hotelIdentity: {
      name: 'Test Hotel',
      city: 'Medellín',
      location: 'El Poblado',
      propertyType: 'hotel',
    },
    galleryImages: [
      { url: 'https://r2.dev/exterior1.webp', category: 'exterior', sort_order: 0 },
      { url: 'https://r2.dev/lobby1.webp', category: 'lobby', sort_order: 1 },
      { url: 'https://r2.dev/room1.webp', category: 'habitacion', sort_order: 2 },
    ],
    rooms: [
      {
        id: 'room-1',
        name: 'Room 101',
        price: 100000,
        amenities: [],
        imageUrls: [],
      },
    ],
    settings: {
      amenities: ['wifi'],
      checkInTime: '15:00',
      checkOutTime: '11:00',
      taxRate: 0.19,
      wompi_sandbox_mode: false,
    },
    payment: {
      planId: 'starter',
      price: 89900,
      transactionId: null,
      paymentMethod: 'free',
      manualReceiptUrl: null,
    },
    ...overrides,
  };
}

function setupAuthAndStaff(hotelId: string | null = 'hotel-123') {
  const userChain = createMockChain({ data: { user: { id: 'user-1' } }, error: null });
  const staffChain = createMockChain({
    data: hotelId ? [{ hotel_id: hotelId }] : [],
    error: null,
  });

  mockCreateClient.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
    },
    from: vi.fn((table: string) => {
      if (table === 'staff') return staffChain;
      return createMockChain({ data: [], error: null });
    }),
  });

  return { userChain, staffChain };
}

function setupAdminClient() {
  const adminChains: Record<string, any> = {};

  const mockAdmin = {
    from: vi.fn((table: string) => {
      if (!adminChains[table]) {
        adminChains[table] = createMockChain({ data: { id: 'hotel-123', slug: 'test-hotel' }, error: null });
      }
      return adminChains[table];
    }),
  };

  mockCreateAdminClient.mockReturnValue(mockAdmin);

  return { mockAdmin, adminChains };
}

// ── Tests ──────────────────────────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
});

describe('Onboarding dual-write: hotel_images + gallery_urls', () => {
  it('writes to hotel_images table when provisioning completes', async () => {
    setupAuthAndStaff(null); // No existing hotel — will create
    const { adminChains } = setupAdminClient();

    const hotelChain = createMockChain({ data: { id: 'hotel-123', slug: 'test-hotel' }, error: null });
    const hotelImagesChain = createMockChain({ data: [], error: null });

    adminChains['hotels'] = hotelChain;
    adminChains['hotel_images'] = hotelImagesChain;
    adminChains['staff'] = createMockChain({ data: null, error: null });
    adminChains['rooms'] = createMockChain({ data: [], error: null });
    adminChains['hotel_locations'] = createMockChain({ data: null, error: null });

    const state = createMockWizardState();
    const result = await executeOnboardingProvisioning(state);

    expect(result.success).toBe(true);

    // Verify hotel_images insert was called
    expect(hotelImagesChain.insert).toHaveBeenCalled();
    const insertedData = hotelImagesChain.insert.mock.calls[0]?.[0];

    // Should insert categorized images (or at least flat URLs with default category)
    if (Array.isArray(insertedData)) {
      expect(insertedData.length).toBeGreaterThan(0);
      expect(insertedData[0]).toHaveProperty('hotel_id');
      expect(insertedData[0]).toHaveProperty('url');
      expect(insertedData[0]).toHaveProperty('category');
    }
  });

  it('writes flat URLs to gallery_urls for backward compatibility', async () => {
    setupAuthAndStaff(null);
    const { adminChains } = setupAdminClient();

    const hotelChain = createMockChain({ data: { id: 'hotel-123', slug: 'test-hotel' }, error: null });
    adminChains['hotels'] = hotelChain;
    adminChains['staff'] = createMockChain({ data: null, error: null });
    adminChains['rooms'] = createMockChain({ data: [], error: null });
    adminChains['hotel_locations'] = createMockChain({ data: null, error: null });
    adminChains['hotel_images'] = createMockChain({ data: [], error: null });

    const state = createMockWizardState();
    const result = await executeOnboardingProvisioning(state);

    expect(result.success).toBe(true);

    // Verify hotels update includes gallery_urls
    expect(hotelChain.update).toHaveBeenCalled();
    const updateData = hotelChain.update.mock.calls[0]?.[0];
    expect(updateData).toHaveProperty('gallery_urls');
    expect(updateData.gallery_urls).toEqual(state.galleryImages);
  });

  it('sets main_image_url from first priority image (exterior if available)', async () => {
    setupAuthAndStaff(null);
    const { adminChains } = setupAdminClient();

    const hotelChain = createMockChain({ data: { id: 'hotel-123', slug: 'test-hotel' }, error: null });
    adminChains['hotels'] = hotelChain;
    adminChains['staff'] = createMockChain({ data: null, error: null });
    adminChains['rooms'] = createMockChain({ data: [], error: null });
    adminChains['hotel_locations'] = createMockChain({ data: null, error: null });
    adminChains['hotel_images'] = createMockChain({ data: [], error: null });

    const state = createMockWizardState({
      galleryImages: [
        { url: 'https://r2.dev/exterior1.webp', category: 'exterior', sort_order: 0 },
        { url: 'https://r2.dev/lobby1.webp', category: 'lobby', sort_order: 1 },
        { url: 'https://r2.dev/room1.webp', category: 'habitacion', sort_order: 2 },
      ],
    });

    const result = await executeOnboardingProvisioning(state);

    expect(result.success).toBe(true);

    const updateData = hotelChain.update.mock.calls[0]?.[0];
    expect(updateData).toHaveProperty('main_image_url');
    // main_image_url should be set from first image (or first exterior if categorized)
    expect(updateData.main_image_url).toBeTruthy();
  });

  it('mutation mindset: blob URLs are rejected before insert', async () => {
    setupAuthAndStaff(null);
    const { adminChains } = setupAdminClient();

    const hotelChain = createMockChain({ data: { id: 'hotel-123', slug: 'test-hotel' }, error: null });
    adminChains['hotels'] = hotelChain;
    adminChains['staff'] = createMockChain({ data: null, error: null });

    const state = createMockWizardState({
      galleryImages: [
        { url: 'blob:http://localhost:3000/abc123', category: 'exterior', sort_order: 0 },
        { url: 'https://r2.dev/valid.webp', category: 'lobby', sort_order: 1 },
        { url: 'https://r2.dev/valid2.webp', category: 'habitacion', sort_order: 2 },
      ],
    });

    const result = await executeOnboardingProvisioning(state);

    // Should fail due to blob URL validation
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/URL|inv[aá]lida|blob/i);
  });
});
