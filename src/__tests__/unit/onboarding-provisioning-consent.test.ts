import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock server-only to prevent client component error
vi.mock('server-only', () => ({}));

// Mock Supabase
const mockSupabaseAdmin = {
  from: vi.fn(() => ({
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: { id: 'hotel-123' }, error: null })),
      })),
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({ error: null })),
    })),
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
  })),
};

vi.mock('@/utils/supabase/admin', () => ({
  createAdminClient: () => mockSupabaseAdmin,
}));

vi.mock('@/utils/supabase/server', () => ({
  createClient: () => Promise.resolve({
    auth: {
      getUser: () => Promise.resolve({
        data: { user: { id: 'user-123' } },
        error: null,
      }),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
    })),
  }),
}));

vi.mock('next/headers', () => ({
  headers: () => ({
    get: vi.fn((key: string) => {
      if (key === 'x-forwarded-for') return '192.168.1.1';
      if (key === 'user-agent') return 'Mozilla/5.0 Test Browser';
      return null;
    }),
  }),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

vi.mock('@/lib/slug', () => ({
  generateUniqueSlug: vi.fn(() => Promise.resolve('hotel-test')),
}));

vi.mock('@/data/plan-guard', () => ({
  checkUnitLimit: vi.fn(() => Promise.resolve({
    ok: true,
    currentCount: 0,
    maxAllowed: 10,
    remaining: 10,
  })),
}));

vi.mock('@/lib/provisioning-guard', () => ({
  validateProvisioningImageUrls: vi.fn(() => null),
}));

const createValidWizardState = () => ({
  hotelIdentity: {
    name: 'Hotel Test',
    city: 'Bogotá',
    location: 'Chapinero',
    propertyType: 'hotel' as const,
  },
  galleryImages: [
    { url: 'https://example.com/img1.jpg', category: 'exterior' as const, sort_order: 0 },
    { url: 'https://example.com/img2.jpg', category: 'lobby' as const, sort_order: 1 },
    { url: 'https://example.com/img3.jpg', category: 'habitacion' as const, sort_order: 2 },
  ],
  rooms: [
    {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Habitación 1',
      price: 100000,
      amenities: [],
      imageUrls: [],
    },
  ],
  settings: {
    amenities: [],
    checkInTime: '15:00',
    checkOutTime: '11:00',
    taxRate: 0.19,
    tax_regime: 'simplified' as const,
    wompi_sandbox_mode: false,
  },
  payment: {
    price: 89900,
    paymentMethod: 'free' as const,
    manualReceiptUrl: null,
  },
  paymentTransactionId: 'FREE-123456',
  termsAccepted: true,
});

describe('executeOnboardingProvisioning - Consent Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should reject provisioning when termsAccepted is false', async () => {
    const state = createValidWizardState();
    state.termsAccepted = false;

    const { executeOnboardingProvisioning } = await import('@/app/actions/onboarding');
    const result = await executeOnboardingProvisioning(state);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Términos y Condiciones');
  });

  it('should reject provisioning when termsAccepted is undefined', async () => {
    const state = createValidWizardState();
    // @ts-expect-error - Testing invalid state
    delete state.termsAccepted;

    const { executeOnboardingProvisioning } = await import('@/app/actions/onboarding');
    const result = await executeOnboardingProvisioning(state);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Términos y Condiciones');
  });

  it('should accept provisioning when termsAccepted is true', async () => {
    const state = createValidWizardState();
    state.termsAccepted = true;

    const { executeOnboardingProvisioning } = await import('@/app/actions/onboarding');
    const result = await executeOnboardingProvisioning(state);

    expect(result.success).toBe(true);
  });

  it('should save consent evidence to hotels table', async () => {
    const state = createValidWizardState();
    state.termsAccepted = true;

    const { executeOnboardingProvisioning } = await import('@/app/actions/onboarding');
    await executeOnboardingProvisioning(state);

    // Verify that hotels.update was called with consent fields
    const updateCall = mockSupabaseAdmin.from.mock.calls.find(
      (call: any[]) => call[0] === 'hotels'
    );
    
    expect(updateCall).toBeDefined();
    
    const updateMock = mockSupabaseAdmin.from();
    const updateArgs = updateMock.update.mock.calls[0];
    
    if (updateArgs) {
      const updateData = updateArgs[0];
      expect(updateData.terms_accepted).toBe(true);
      expect(updateData.terms_version).toBe('v1.0');
      expect(updateData.consent_timestamp).toBeDefined();
      expect(updateData.consent_ip).toBe('192.168.1.1');
      expect(updateData.consent_user_agent).toBe('Mozilla/5.0 Test Browser');
    }
  });

  it('should log consent to consent_audit table', async () => {
    const state = createValidWizardState();
    state.termsAccepted = true;

    const { executeOnboardingProvisioning } = await import('@/app/actions/onboarding');
    await executeOnboardingProvisioning(state);

    // Verify that consent_audit.insert was called
    const insertCall = mockSupabaseAdmin.from.mock.calls.find(
      (call: any[]) => call[0] === 'consent_audit'
    );
    
    expect(insertCall).toBeDefined();
    
    const insertMock = mockSupabaseAdmin.from();
    const insertArgs = insertMock.insert.mock.calls[0];
    
    if (insertArgs) {
      const insertData = insertArgs[0];
      expect(insertData.user_id).toBe('user-123');
      expect(insertData.terms_version).toBe('v1.0');
      expect(insertData.action).toBe('accept');
      expect(insertData.consent_ip).toBe('192.168.1.1');
      expect(insertData.consent_user_agent).toBe('Mozilla/5.0 Test Browser');
    }
  });
});
