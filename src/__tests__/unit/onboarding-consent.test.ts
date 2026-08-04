import { describe, it, expect } from 'vitest';
import { fullWizardStateSchema } from '@/lib/onboarding-schemas';

// Mock data for valid wizard state
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
});

describe('fullWizardStateSchema - Terms Acceptance Validation', () => {
  it('should fail validation when termsAccepted is false', () => {
    const state = createValidWizardState();
    // @ts-expect-error - Testing invalid state
    state.termsAccepted = false;

    const result = fullWizardStateSchema.safeParse(state);

    expect(result.success).toBe(false);
    if (!result.success) {
      const termsError = result.error.issues.find(
        issue => issue.path.includes('termsAccepted')
      );
      expect(termsError).toBeDefined();
      expect(termsError?.message).toContain('Términos y Condiciones');
    }
  });

  it('should fail validation when termsAccepted is undefined', () => {
    const state = createValidWizardState();
    // @ts-expect-error - Testing invalid state
    delete state.termsAccepted;

    const result = fullWizardStateSchema.safeParse(state);

    expect(result.success).toBe(false);
    if (!result.success) {
      const termsError = result.error.issues.find(
        issue => issue.path.includes('termsAccepted')
      );
      expect(termsError).toBeDefined();
    }
  });

  it('should fail validation when termsAccepted is null', () => {
    const state = createValidWizardState();
    // @ts-expect-error - Testing invalid state
    state.termsAccepted = null;

    const result = fullWizardStateSchema.safeParse(state);

    expect(result.success).toBe(false);
  });

  it('should pass validation when termsAccepted is true', () => {
    const state = createValidWizardState();
    state.termsAccepted = true;

    const result = fullWizardStateSchema.safeParse(state);

    expect(result.success).toBe(true);
  });

  it('should include termsAccepted in parsed data when valid', () => {
    const state = createValidWizardState();
    state.termsAccepted = true;

    const result = fullWizardStateSchema.safeParse(state);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.termsAccepted).toBe(true);
    }
  });
});
