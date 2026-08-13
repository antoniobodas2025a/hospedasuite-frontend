/**
 * 💰 Pricing Utilities — Single Source of Truth
 *
 * Pure functions for tax and price calculations.
 * Eliminates hardcoded 0.19/1.19 across the codebase.
 *
 * Colombia tax context:
 * - Régimen Simplificado: tax_rate = 0 (most glampings/boutique hotels)
 * - Régimen Responsable de IVA: tax_rate = 0.19 (hotels with IVA registration)
 *
 * ADD pricing model:
 * - The hotel enters the BASE price (net income).
 * - For responsible hotels, IVA is ADDED on top (base * 0.19).
 * - For simplified hotels, no IVA applies (price stays as-is).
 */

/** IVA rate for "Responsable de IVA" hotels. */
export const RESPONSIBLE_IVA_RATE = 0.19;

/** @deprecated Use RESPONSIBLE_IVA_RATE. Kept for backward compatibility. */
export const DEFAULT_TAX_RATE = RESPONSIBLE_IVA_RATE;

// ============================================================================
// CORE TAX FUNCTIONS
// ============================================================================

/**
 * Calculates tax amount for a given subtotal and tax rate.
 * ADDS tax to a net base — use for supplier-side (net → gross).
 * For consumer-side (gross → net extraction), use extractTaxFromGross().
 */
export function calculateTaxAmount(subtotal: number, taxRate: number = RESPONSIBLE_IVA_RATE): number {
  return Math.round(subtotal * taxRate);
}

/**
 * Calculates total price with tax breakdown (net → gross).
 * Returns an object with subtotal, tax, total, and hasTax flag.
 */
export function calculateTotalWithTax(
  basePrice: number,
  taxRate: number = RESPONSIBLE_IVA_RATE
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
 * Extracts IVA from a gross (final) price.
 *
 * Kept for compatibility with legacy consumers; prefer calculateTotalWithTax
 * for the current ADD model.
 */
export function extractTaxFromGross(
  grossPrice: number,
  taxRate: number
): {
  gross: number;
  net: number;
  tax: number;
  hasTax: boolean;
} {
  if (taxRate <= 0) {
    return { gross: grossPrice, net: grossPrice, tax: 0, hasTax: false };
  }
  const net = Math.round(grossPrice / (1 + taxRate));
  const tax = grossPrice - net;
  return { gross: grossPrice, net, tax, hasTax: true };
}

/**
 * Returns the effective tax rate for a hotel, centralizing the fallback logic.
 *
 * - If tax_rate is an explicit number, use it (0 for simplified, 0.19 for responsible).
 * - If tax_rate is NULL/undefined, fall back to tax_regime:
 *   - 'responsible' → RESPONSIBLE_IVA_RATE (0.19)
 *   - anything else → 0 (simplified = no IVA)
 *
 * This replaces all `?? 0.19` / `?? DEFAULT_TAX_RATE` fallbacks across the codebase
 * which incorrectly charged 19% IVA to simplified hotels with null tax_rate.
 */
export function getEffectiveTaxRate(
  taxRate: number | null | undefined,
  taxRegime?: string | null
): number {
  if (typeof taxRate === 'number') return taxRate;
  return taxRegime === 'responsible' ? RESPONSIBLE_IVA_RATE : 0;
}

/**
 * Calculates price for multiple nights with tax breakdown.
 * Alias for calculateTotalWithTax with nights multiplier.
 */
export function calculatePrice(
  basePrice: number,
  nights: number,
  taxRate: number = RESPONSIBLE_IVA_RATE
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
export function getTaxLabel(taxRate: number = RESPONSIBLE_IVA_RATE): string {
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
 * ADD model: pricePerNight and weekendPrice are BASE prices (hotel net).
 * IVA is added on top of the subtotal. Per-night breakdown shows base prices.
 *
 * When no explicit weekend price is provided, it falls back to weekday * 1.2.
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

  // ADD model: add IVA on top of the base subtotal
  const tax = Math.round(subtotal * taxRate);
  const total = subtotal + tax;

  return {
    weekdayPrice,
    weekendPrice: effectiveWeekendPrice,
    weekdayNights,
    weekendNights,
    subtotal,  // base price (pre-tax)
    tax,       // IVA added
    total,     // base + IVA
    taxRate,
    breakdown,
  };
}

/**
 * Formats price with tax breakdown.
 * Returns formatted strings for subtotal, tax, total, and tax metadata.
 *
 * @deprecated Uses the ADD model (net → gross). B2C Colombian model requires
 * extractTaxFromGross() instead (gross → net extraction).
 * Kept for backward compatibility — no known consumers as of 2026-08-09.
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
