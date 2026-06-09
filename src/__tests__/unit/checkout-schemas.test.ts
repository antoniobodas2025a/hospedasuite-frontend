/**
 * Checkout Schemas — TDD Test Suite + Mutation Testing
 *
 * Validates Zod schemas, pure calculation functions, and mutation resilience.
 *
 * Heurística #5: Invalid data is rejected before reaching the server.
 * Heurística #9: Error messages are in plain Spanish.
 *
 * Mutation Kill Rate: 100% target on pricing and validation logic.
 */

import { describe, it, expect } from 'vitest';
import {
  guestDataSchema,
  bookingDatesSchema,
  checkoutPayloadSchema,
  paymentAmountSchema,
  calculateGrandTotal,
  validateGuestData,
  validateCheckoutPayload,
} from '@/lib/checkout-schemas';

// ── TDD: Guest Data Validation ───────────────────────────────────────────────

describe('guestDataSchema', () => {
  it('accepts valid guest data', () => {
    const result = guestDataSchema.safeParse({
      fullName: 'Juan Pérez',
      document: '12345678',
      phone: '3001234567',
      email: 'juan@example.com',
    });

    expect(result.success).toBe(true);
  });

  it('rejects empty fullName', () => {
    const result = guestDataSchema.safeParse({
      fullName: '',
      document: '12345678',
      phone: '3001234567',
      email: 'juan@example.com',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('al menos 2 caracteres');
    }
  });

  it('rejects short document', () => {
    const result = guestDataSchema.safeParse({
      fullName: 'Juan Pérez',
      document: '123',
      phone: '3001234567',
      email: 'juan@example.com',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('al menos 4 caracteres');
    }
  });

  it('rejects short phone', () => {
    const result = guestDataSchema.safeParse({
      fullName: 'Juan Pérez',
      document: '12345678',
      phone: '12345',
      email: 'juan@example.com',
    });

    expect(result.success).toBe(false);
  });

  it('rejects invalid email', () => {
    const result = guestDataSchema.safeParse({
      fullName: 'Juan Pérez',
      document: '12345678',
      phone: '3001234567',
      email: 'not-an-email',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('correo electrónico válido');
    }
  });

  it('trims whitespace from all fields', () => {
    const result = guestDataSchema.safeParse({
      fullName: '  Juan Pérez  ',
      document: '  12345678  ',
      phone: '  3001234567  ',
      email: '  JUAN@EXAMPLE.COM  ',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fullName).toBe('Juan Pérez');
      expect(result.data.email).toBe('juan@example.com');
    }
  });

  it('rejects fullName longer than 120 chars', () => {
    const result = guestDataSchema.safeParse({
      fullName: 'A'.repeat(121),
      document: '12345678',
      phone: '3001234567',
      email: 'juan@example.com',
    });

    expect(result.success).toBe(false);
  });

  // MUTATION: If .min(2) is changed to .optional(), this survives
  it('MUTATION: detects missing required fullName', () => {
    const result = guestDataSchema.safeParse({
      document: '12345678',
      phone: '3001234567',
      email: 'juan@example.com',
    });

    expect(result.success).toBe(false);
  });
});

// ── TDD: Booking Dates Validation ────────────────────────────────────────────

describe('bookingDatesSchema', () => {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  const fmt = (d: Date) => d.toISOString().split('T')[0];

  it('accepts valid date range', () => {
    const result = bookingDatesSchema.safeParse({
      checkin: fmt(tomorrow),
      checkout: fmt(nextWeek),
    });

    expect(result.success).toBe(true);
  });

  it('rejects checkout before checkin', () => {
    const result = bookingDatesSchema.safeParse({
      checkin: fmt(nextWeek),
      checkout: fmt(tomorrow),
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('posterior al check-in');
    }
  });

  it('rejects same checkin and checkout', () => {
    const result = bookingDatesSchema.safeParse({
      checkin: fmt(tomorrow),
      checkout: fmt(tomorrow),
    });

    expect(result.success).toBe(false);
  });

  it('rejects invalid date format', () => {
    const result = bookingDatesSchema.safeParse({
      checkin: '01/15/2026',
      checkout: '01/20/2026',
    });

    expect(result.success).toBe(false);
  });

  it('rejects past checkin date', () => {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const result = bookingDatesSchema.safeParse({
      checkin: fmt(yesterday),
      checkout: fmt(tomorrow),
    });

    expect(result.success).toBe(false);
  });

  // MUTATION: If the >= comparison is inverted to <, this survives
  it('MUTATION: detects same-day booking (checkin === checkout)', () => {
    const result = bookingDatesSchema.safeParse({
      checkin: fmt(tomorrow),
      checkout: fmt(tomorrow),
    });

    expect(result.success).toBe(false);
  });
});

// ── TDD: Payment Amount Validation ───────────────────────────────────────────

describe('paymentAmountSchema', () => {
  it('accepts valid payment data', () => {
    const result = paymentAmountSchema.safeParse({
      basePrice: 100000,
      taxRate: 0.19,
      nights: 3,
    });

    expect(result.success).toBe(true);
  });

  it('rejects zero basePrice', () => {
    const result = paymentAmountSchema.safeParse({
      basePrice: 0,
      taxRate: 0.19,
      nights: 3,
    });

    expect(result.success).toBe(false);
  });

  it('rejects negative basePrice', () => {
    const result = paymentAmountSchema.safeParse({
      basePrice: -100,
      taxRate: 0.19,
      nights: 3,
    });

    expect(result.success).toBe(false);
  });

  it('rejects taxRate above 19%', () => {
    const result = paymentAmountSchema.safeParse({
      basePrice: 100000,
      taxRate: 0.25,
      nights: 3,
    });

    expect(result.success).toBe(false);
  });

  it('accepts zero taxRate (régimen simplificado)', () => {
    const result = paymentAmountSchema.safeParse({
      basePrice: 100000,
      taxRate: 0,
      nights: 3,
    });

    expect(result.success).toBe(true);
  });

  it('rejects zero nights', () => {
    const result = paymentAmountSchema.safeParse({
      basePrice: 100000,
      taxRate: 0.19,
      nights: 0,
    });

    expect(result.success).toBe(false);
  });

  // MUTATION: If .min(1) is changed to .min(0), this survives
  it('MUTATION: detects zero basePrice (min constraint)', () => {
    const result = paymentAmountSchema.safeParse({
      basePrice: 0,
      taxRate: 0.19,
      nights: 3,
    });

    expect(result.success).toBe(false);
  });
});

// ── TDD: Full Checkout Payload ───────────────────────────────────────────────

describe('checkoutPayloadSchema', () => {
  it('accepts valid checkout payload', () => {
    const result = checkoutPayloadSchema.safeParse({
      fullName: 'Juan Pérez',
      email: 'juan@example.com',
      phone: '3001234567',
      document: '12345678',
      roomId: '550e8400-e29b-41d4-a716-446655440000',
      checkin: '2026-07-01',
      checkout: '2026-07-05',
      source: 'direct',
      upsells: [],
      amount: 570000,
    });

    expect(result.success).toBe(true);
  });

  it('rejects invalid UUID for roomId', () => {
    const result = checkoutPayloadSchema.safeParse({
      fullName: 'Juan Pérez',
      email: 'juan@example.com',
      phone: '3001234567',
      document: '12345678',
      roomId: 'not-a-uuid',
      checkin: '2026-07-01',
      checkout: '2026-07-05',
      source: 'direct',
      upsells: [],
      amount: 570000,
    });

    expect(result.success).toBe(false);
  });

  it('rejects invalid source', () => {
    const result = checkoutPayloadSchema.safeParse({
      fullName: 'Juan Pérez',
      email: 'juan@example.com',
      phone: '3001234567',
      document: '12345678',
      roomId: '550e8400-e29b-41d4-a716-446655440000',
      checkin: '2026-07-01',
      checkout: '2026-07-05',
      source: 'invalid',
      upsells: [],
      amount: 570000,
    });

    expect(result.success).toBe(false);
  });

  it('rejects zero amount', () => {
    const result = checkoutPayloadSchema.safeParse({
      fullName: 'Juan Pérez',
      email: 'juan@example.com',
      phone: '3001234567',
      document: '12345678',
      roomId: '550e8400-e29b-41d4-a716-446655440000',
      checkin: '2026-07-01',
      checkout: '2026-07-05',
      source: 'direct',
      upsells: [],
      amount: 0,
    });

    expect(result.success).toBe(false);
  });

  // MUTATION: If amount validation is removed, this survives
  it('MUTATION: detects zero amount', () => {
    const result = checkoutPayloadSchema.safeParse({
      fullName: 'Juan Pérez',
      email: 'juan@example.com',
      phone: '3001234567',
      document: '12345678',
      roomId: '550e8400-e29b-41d4-a716-446655440000',
      checkin: '2026-07-01',
      checkout: '2026-07-05',
      source: 'direct',
      upsells: [],
      amount: 0,
    });

    expect(result.success).toBe(false);
  });
});

// ── TDD: Pure Calculation (calculateGrandTotal) ──────────────────────────────

describe('calculateGrandTotal', () => {
  it('calculates total with 19% tax', () => {
    const result = calculateGrandTotal(100000, 3, 0.19);

    expect(result.subtotal).toBe(300000);
    expect(result.tax).toBe(57000);
    expect(result.total).toBe(357000);
    expect(result.hasTax).toBe(true);
  });

  it('calculates total with 0% tax (régimen simplificado)', () => {
    const result = calculateGrandTotal(100000, 3, 0);

    expect(result.subtotal).toBe(300000);
    expect(result.tax).toBe(0);
    expect(result.total).toBe(300000);
    expect(result.hasTax).toBe(false);
  });

  it('calculates total for 1 night', () => {
    const result = calculateGrandTotal(150000, 1, 0.19);

    expect(result.subtotal).toBe(150000);
    expect(result.tax).toBe(28500);
    expect(result.total).toBe(178500);
  });

  it('rounds tax to integer (COP precision)', () => {
    const result = calculateGrandTotal(99999, 1, 0.19);

    // 99999 * 0.19 = 18999.81 → rounded to 19000
    expect(result.tax).toBe(19000);
    expect(result.total).toBe(118999);
  });

  it('handles very large amounts', () => {
    const result = calculateGrandTotal(1000000, 30, 0.19);

    expect(result.subtotal).toBe(30000000);
    expect(result.tax).toBe(5700000);
    expect(result.total).toBe(35700000);
  });

  // MUTATION: If * is changed to / in subtotal calculation, this survives
  it('MUTATION: detects multiplication error in subtotal', () => {
    const result = calculateGrandTotal(100000, 3, 0.19);

    // If subtotal = basePrice / nights = 33333, total would be wrong
    expect(result.subtotal).toBe(300000);
    expect(result.total).toBeGreaterThan(result.subtotal);
  });

  // MUTATION: If + is changed to - in total calculation, this survives
  it('MUTATION: detects addition error in total', () => {
    const result = calculateGrandTotal(100000, 3, 0.19);

    // If total = subtotal - tax = 243000, this fails
    expect(result.total).toBe(result.subtotal + result.tax);
  });

  // MUTATION: If * is changed to / in tax calculation, this survives
  it('MUTATION: detects multiplication error in tax', () => {
    const result = calculateGrandTotal(100000, 3, 0.19);

    // If tax = subtotal / taxRate = 1578947, this fails
    expect(result.tax).toBe(57000);
  });
});

// ── TDD: Validation Helpers ──────────────────────────────────────────────────

describe('validateGuestData', () => {
  it('returns success for valid data', () => {
    const result = validateGuestData({
      fullName: 'Juan Pérez',
      document: '12345678',
      phone: '3001234567',
      email: 'juan@example.com',
    });

    expect(result.success).toBe(true);
    expect(result.errors).toBeNull();
  });

  it('returns human-readable errors for invalid data', () => {
    const result = validateGuestData({
      fullName: '',
      document: '123',
      phone: '12345',
      email: 'not-email',
    });

    expect(result.success).toBe(false);
    expect(result.errors).not.toBeNull();
    if (result.errors) {
      expect(result.errors.fullName).toBeDefined();
      expect(result.errors.document).toBeDefined();
      expect(result.errors.phone).toBeDefined();
      expect(result.errors.email).toBeDefined();
    }
  });

  it('returns null data on failure', () => {
    const result = validateGuestData({ fullName: '' });

    expect(result.success).toBe(false);
    expect(result.data).toBeUndefined();
  });
});

describe('validateCheckoutPayload', () => {
  it('returns success for valid payload', () => {
    const result = validateCheckoutPayload({
      fullName: 'Juan Pérez',
      email: 'juan@example.com',
      phone: '3001234567',
      document: '12345678',
      roomId: '550e8400-e29b-41d4-a716-446655440000',
      checkin: '2026-07-01',
      checkout: '2026-07-05',
      source: 'direct',
      upsells: [],
      amount: 570000,
    });

    expect(result.success).toBe(true);
    expect(result.errors).toBeNull();
  });

  it('returns errors for invalid payload', () => {
    const result = validateCheckoutPayload({
      fullName: '',
      email: 'invalid',
      phone: '',
      document: '',
      roomId: 'not-uuid',
      checkin: 'bad-date',
      checkout: 'bad-date',
      source: 'invalid',
      upsells: [],
      amount: 0,
    });

    expect(result.success).toBe(false);
    expect(result.errors).not.toBeNull();
  });
});

// ── TDD: Integration — Pricing coherence with CheckoutForm ───────────────────

describe('Pricing coherence (CheckoutForm ↔ pricing.ts)', () => {
  it('matches calculateTaxAmount from pricing.ts', () => {
    // This mirrors the logic in CheckoutForm.tsx line 73
    const subtotal = 300000;
    const taxRate = 0.19;

    // From pricing.ts: Math.round(subtotal * taxRate)
    const expectedTax = Math.round(subtotal * taxRate);
    const result = calculateGrandTotal(100000, 3, taxRate);

    expect(result.tax).toBe(expectedTax);
    expect(result.total).toBe(subtotal + expectedTax);
  });

  it('grandTotal matches CheckoutForm calculation', () => {
    // CheckoutForm.tsx: const grandTotal = subtotal + taxes
    const basePrice = 100000;
    const nights = 3;
    const taxRate = 0.19;

    const result = calculateGrandTotal(basePrice, nights, taxRate);

    // Same formula as CheckoutForm
    const subtotal = basePrice * nights;
    const taxes = Math.round(subtotal * taxRate);
    const grandTotal = subtotal + taxes;

    expect(result.total).toBe(grandTotal);
  });
});
