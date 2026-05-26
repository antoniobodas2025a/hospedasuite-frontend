// ============================================================================
// PRICING — Single Source of Truth for tax calculations
//
// All price displays MUST use these functions. No direct 0.19/1.19 literals
// in component code. Thread hotel.tax_rate through props.
// ============================================================================

export const DEFAULT_TAX_RATE = 0.19;

/**
 * Calculates the tax amount for a given base price.
 * Defaults to DEFAULT_TAX_RATE (0.19) when taxRate is undefined (NULL in DB).
 *
 * @example calculateTaxAmount(100000, 0.19) // → 19000
 * @example calculateTaxAmount(100000)        // → 19000 (default)
 * @example calculateTaxAmount(100000, 0)     // → 0
 */
export function calculateTaxAmount(basePrice: number, taxRate?: number): number {
  const rate = taxRate ?? DEFAULT_TAX_RATE;
  return Math.round(basePrice * rate);
}

/**
 * Calculates the total price including tax.
 * Defaults to DEFAULT_TAX_RATE (0.19) when taxRate is undefined (NULL in DB).
 *
 * @example calculateTotalWithTax(100000, 0.19) // → 119000
 * @example calculateTotalWithTax(100000)        // → 119000 (default)
 * @example calculateTotalWithTax(100000, 0)     // → 100000
 */
export function calculateTotalWithTax(basePrice: number, taxRate?: number): number {
  const rate = taxRate ?? DEFAULT_TAX_RATE;
  return Math.round(basePrice * (1 + rate));
}

/**
 * Calculates a complete price breakdown for a multi-night stay.
 * Returns subtotal (base * nights), tax amount, total with tax, and hasTax flag.
 *
 * @example calculatePrice(100000, 3, 0.19) // → { subtotal: 300000, tax: 57000, total: 357000, hasTax: true }
 * @example calculatePrice(100000, 3, 0)    // → { subtotal: 300000, tax: 0, total: 300000, hasTax: false }
 */
export function calculatePrice(
  basePrice: number,
  nights: number,
  taxRate?: number,
): { subtotal: number; tax: number; total: number; hasTax: boolean } {
  const subtotal = basePrice * nights;
  const rate = taxRate ?? DEFAULT_TAX_RATE;
  const tax = calculateTaxAmount(subtotal, rate);
  const total = calculateTotalWithTax(subtotal, rate);
  const hasTax = rate > 0;
  return { subtotal, tax, total, hasTax };
}
