/**
 * 💰 Pricing Utilities — Single Source of Truth
 *
 * Pure functions for tax and price calculations.
 * Eliminates hardcoded 0.19/1.19 across the codebase.
 *
 * Colombia tax context:
 * - Régimen Simplificado: tax_rate = 0 (most glampings/boutique hotels)
 * - Régimen Ordinario: tax_rate = 0.19 (hotels with IVA registration)
 */

export const DEFAULT_TAX_RATE = 0.19;

/**
 * Calculates tax amount for a given subtotal and tax rate.
 */
export function calculateTaxAmount(subtotal: number, taxRate: number = DEFAULT_TAX_RATE): number {
  return Math.round(subtotal * taxRate);
}

/**
 * Calculates total price with tax breakdown.
 * Returns an object with subtotal, tax, total, and hasTax flag.
 */
export function calculateTotalWithTax(
  basePrice: number,
  taxRate: number = DEFAULT_TAX_RATE
): {
  subtotal: number;
  tax: number;
  total: number;
  hasTax: boolean;
} {
  const subtotal = basePrice;
  const tax = calculateTaxAmount(subtotal, taxRate);
  return { subtotal, tax, total: subtotal + tax, hasTax: taxRate > 0 };
}

/**
 * Calculates price for multiple nights with tax breakdown.
 * Alias for calculateTotalWithTax with nights multiplier.
 */
export function calculatePrice(
  basePrice: number,
  nights: number,
  taxRate: number = DEFAULT_TAX_RATE
): {
  subtotal: number;
  tax: number;
  total: number;
  hasTax: boolean;
} {
  return calculateTotalWithTax(basePrice * nights, taxRate);
}

/**
 * Formats a price for display (COP locale).
 */
export function formatPrice(amount: number): string {
  return amount.toLocaleString('es-CO');
}

/**
 * Returns the tax label based on rate.
 */
export function getTaxLabel(taxRate: number = DEFAULT_TAX_RATE): string {
  return taxRate > 0 ? `IVA (${Math.round(taxRate * 100)}%)` : '';
}

export interface RoomPricingBreakdown {
  weekdayPrice: number;
  weekendPrice: number;
  weekdayNights: number;
  weekendNights: number;
  subtotal: number;
  tax: number;
  total: number;
  taxRate: number;
  breakdown: Array<{
    date: string;
    dayOfWeek: number;
    price: number;
    isWeekend: boolean;
  }>;
}

function isWeekendNight(date: Date): boolean {
  const day = date.getUTCDay();
  return day === 5 || day === 6;
}

function toISODate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Builds a per-night pricing breakdown for a room stay.
 *
 * Uses the room's weekday price and an optional override weekend price.
 * When no explicit weekend price is provided, it falls back to weekday * 1.2.
 * Tax is applied once on the subtotal using the configured tax rate.
 */
export function buildRoomPricingBreakdown({
  pricePerNight,
  weekendPrice,
  taxRate,
  checkIn,
  checkOut,
}: {
  pricePerNight: number;
  weekendPrice: number;
  taxRate: number;
  checkIn: Date;
  checkOut: Date;
}): RoomPricingBreakdown {
  const weekdayPrice = pricePerNight;
  const effectiveWeekendPrice = weekendPrice > 0 ? weekendPrice : weekdayPrice * 1.2;
  const msPerDay = 24 * 60 * 60 * 1000;
  const nights = Math.max(1, Math.round((checkOut.getTime() - checkIn.getTime()) / msPerDay));

  const breakdown: RoomPricingBreakdown['breakdown'] = [];
  let weekdayNights = 0;
  let weekendNights = 0;
  let subtotal = 0;
  const current = new Date(checkIn.getTime());

  for (let i = 0; i < nights; i++) {
    const weekend = isWeekendNight(current);
    const price = weekend ? effectiveWeekendPrice : weekdayPrice;

    breakdown.push({
      date: toISODate(current),
      dayOfWeek: current.getUTCDay(),
      price,
      isWeekend: weekend,
    });

    subtotal += price;
    if (weekend) {
      weekendNights++;
    } else {
      weekdayNights++;
    }

    current.setUTCDate(current.getUTCDate() + 1);
  }

  const tax = calculateTaxAmount(subtotal, taxRate);
  const total = subtotal + tax;

  return {
    weekdayPrice,
    weekendPrice: effectiveWeekendPrice,
    weekdayNights,
    weekendNights,
    subtotal,
    tax,
    total,
    taxRate,
    breakdown,
  };
}

/**
 * Formats price with tax breakdown.
 * Returns formatted strings for subtotal, tax, total, and tax metadata.
 */
export function formatPriceWithTax(
  basePrice: number,
  taxRate: number = DEFAULT_TAX_RATE,
  nights: number = 1
): {
  subtotal: string;
  tax: string;
  total: string;
  taxLabel: string;
  hasTax: boolean;
} {
  const { total, tax, hasTax } = calculateTotalWithTax(basePrice * nights, taxRate);
  return {
    subtotal: formatPrice(basePrice * nights),
    tax: formatPrice(tax),
    total: formatPrice(total),
    taxLabel: getTaxLabel(taxRate),
    hasTax,
  };
}
