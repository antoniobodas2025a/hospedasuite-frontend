/**
 * Checkout Schemas — Zod validation for the booking checkout flow.
 *
 * Mirrors the PendingBookingPayload contract from bookings.ts.
 * Ensures deterministic validation before any server action is called.
 *
 * Heurística #5 (Prevención de Errores): Invalid data is rejected before
 * reaching the server, preventing booking corruption.
 *
 * Heurística #9 (Recuperación de Errores): Error messages are in plain
 * Spanish, matching the user's mental model.
 *
 * Ley de Postel: Liberal in what we accept (trim, normalize), conservative
 * in what we send (strict validation with .min(), .max(), .refine()).
 */

import { z } from "zod";

// ── Date validation ──────────────────────────────────────────────────────────

const DATE_ISO_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isValidDateISO(dateStr: string): boolean {
  if (!DATE_ISO_REGEX.test(dateStr)) return false;
  const d = new Date(`${dateStr}T12:00:00Z`);
  return !isNaN(d.getTime());
}

function isSameOrAfter(a: Date, b: Date): boolean {
  return a.getTime() >= b.getTime();
}

// ── Guest data schema (Step 1: Datos del Huésped) ────────────────────────────

export const guestDataSchema = z.object({
  fullName: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(120, "El nombre es demasiado largo")
    .trim(),
  document: z
    .string()
    .min(4, "El documento debe tener al menos 4 caracteres")
    .max(30, "El documento es demasiado largo")
    .trim(),
  phone: z
    .string()
    .min(6, "El teléfono debe tener al menos 6 dígitos")
    .max(20, "El teléfono es demasiado largo")
    .trim(),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Ingresa un correo electrónico válido")
    .max(255, "El correo es demasiado largo"),
});

export type GuestData = z.infer<typeof guestDataSchema>;

// ── Booking dates schema (validated on checkout page) ────────────────────────

export const bookingDatesSchema = z
  .object({
    checkin: z.string().refine((val) => {
      if (!isValidDateISO(val)) return false;
      const d = new Date(`${val}T12:00:00Z`);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return d >= today;
    }, "La fecha de check-in debe ser hoy o posterior y tener formato YYYY-MM-DD"),
    checkout: z.string().refine((val) => {
      if (!isValidDateISO(val)) return false;
      return true;
    }, "La fecha de check-out debe tener formato YYYY-MM-DD"),
  })
  .refine(
    (data) => {
      const checkIn = new Date(`${data.checkin}T12:00:00Z`);
      const checkOut = new Date(`${data.checkout}T12:00:00Z`);
      return !isSameOrAfter(checkIn, checkOut);
    },
    { message: "La fecha de check-out debe ser posterior al check-in" },
  );

export type BookingDates = z.infer<typeof bookingDatesSchema>;

// ── Payment amount schema ────────────────────────────────────────────────────

export const paymentAmountSchema = z.object({
  basePrice: z.number().min(1, "El precio base debe ser mayor a 0"),
  taxRate: z.number().min(0).max(0.19, "La tasa de impuesto no puede exceder 19%"),
  nights: z.number().int().min(1, "Debe ser al menos 1 noche"),
});

export type PaymentAmount = z.infer<typeof paymentAmountSchema>;

// ── Full checkout payload (matches PendingBookingPayload from bookings.ts) ───

export const checkoutPayloadSchema = z.object({
  fullName: z.string().min(2, "El nombre debe tener al menos 2 caracteres").trim(),
  email: z.string().email("Ingresa un correo electrónico válido").trim().toLowerCase(),
  phone: z.string().min(6, "El teléfono debe tener al menos 6 dígitos").trim(),
  document: z.string().min(4, "El documento debe tener al menos 4 caracteres").trim(),
  roomId: z.string().uuid("El ID de la habitación es inválido"),
  checkin: z.string().refine((val) => isValidDateISO(val), "Formato de fecha inválido (YYYY-MM-DD)"),
  checkout: z.string().refine((val) => isValidDateISO(val), "Formato de fecha inválido (YYYY-MM-DD)"),
  source: z.enum(["direct", "ota"]),
  upsells: z.array(z.string()).default([]),
  amount: z.number().min(1, "El monto total debe ser mayor a 0"),
}).refine(
  (data) => {
    const checkIn = new Date(`${data.checkin}T12:00:00Z`);
    const checkOut = new Date(`${data.checkout}T12:00:00Z`);
    return !isSameOrAfter(checkIn, checkOut);
  },
  { message: "La fecha de check-out debe ser posterior al check-in" },
);

export type CheckoutPayload = z.infer<typeof checkoutPayloadSchema>;

// ── Pure calculation function (deterministic, 2 decimal precision) ───────────

/**
 * Calculates the grand total from base price, nights, and tax rate.
 * Pure function — no side effects, fully testable.
 *
 * Precision: Rounded to integer (COP has no cents in practice).
 */
export function calculateGrandTotal(
  basePricePerNight: number,
  nights: number,
  taxRate: number,
): {
  subtotal: number;
  tax: number;
  total: number;
  hasTax: boolean;
} {
  const subtotal = basePricePerNight * nights;
  const tax = Math.round(subtotal * taxRate);
  return {
    subtotal,
    tax,
    total: subtotal + tax,
    hasTax: taxRate > 0,
  };
}

// ── Validation helpers ───────────────────────────────────────────────────────

/**
 * Validates guest data and returns human-readable errors.
 * Heurística #9: Errors in plain Spanish, < 100ms response.
 */
export function validateGuestData(data: unknown): {
  success: boolean;
  errors: Record<string, string> | null;
  data?: GuestData;
} {
  const result = guestDataSchema.safeParse(data);
  if (result.success) {
    return { success: true, errors: null, data: result.data };
  }

  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const path = issue.path[0] as string;
    if (!errors[path]) {
      errors[path] = issue.message;
    }
  }
  return { success: false, errors };
}

/**
 * Validates the full checkout payload before sending to server action.
 */
export function validateCheckoutPayload(data: unknown): {
  success: boolean;
  errors: Record<string, string> | null;
  data?: CheckoutPayload;
} {
  const result = checkoutPayloadSchema.safeParse(data);
  if (result.success) {
    return { success: true, errors: null, data: result.data };
  }

  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const path = issue.path[0] as string;
    if (!errors[path]) {
      errors[path] = issue.message;
    }
  }
  return { success: false, errors };
}
