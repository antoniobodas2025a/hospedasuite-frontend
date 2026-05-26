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
