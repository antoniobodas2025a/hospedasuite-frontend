/**
 * 💰 Pricing Utilities — Single Source of Truth
 *
 * Pure functions for FLAT price calculations.
 * The price configured by the hotelier is the final price the guest pays.
 */

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Default multiplier for weekend price fallback.
 * When a room doesn't have a configured weekend_price, we use basePrice (FLAT model, no markup).
 */
export const WEEKEND_FALLBACK_MULTIPLIER = 1.2;

// ============================================================================
// TYPES
// ============================================================================

export interface PriceBreakdown {
  subtotal: number;
  total: number;
}

export interface RoomPricingBreakdown {
  weekdayPrice: number;
  weekendPrice: number;
  weekdayNights: number;
  weekendNights: number;
  subtotal: number;
  total: number;
  breakdown: Array<{
    date: string;
    dayOfWeek: number;
    price: number;
    isWeekend: boolean;
  }>;
}

// ============================================================================
// PURE FUNCTIONS
// ============================================================================

function isWeekendNight(date: Date): boolean {
  const day = date.getUTCDay();
  return day === 5 || day === 6;
}

function toISODate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Calculates the number of nights between two dates.
 * Single source of truth for night calculation across the app.
 */
export function calculateNights(checkIn: Date, checkOut: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((checkOut.getTime() - checkIn.getTime()) / msPerDay);
}

/**
 * Normalizes weekend_price with fallback to basePrice.
 * Handles null, undefined, 0, and negative values.
 * Single source of truth for weekend price normalization.
 * 
 * FLAT model: if hotelier doesn't configure weekend_price, use basePrice (no markup).
 */
export function normalizeWeekendPrice(
  weekendPrice: number | null | undefined,
  basePrice: number
): number {
  return (weekendPrice && weekendPrice > 0)
    ? weekendPrice
    : basePrice;
}

/**
 * Calculates the flat price for a stay.
 *
 * The configured base price is the final price — no tax is added.
 */
export function calculatePrice(
  basePrice: number,
  nights: number,
): PriceBreakdown {
  const subtotal = basePrice * nights;
  return { subtotal, total: subtotal };
}

/**
 * Formats a price for display (COP locale).
 */
export function formatPrice(amount: number): string {
  return amount.toLocaleString('es-CO');
}

/**
 * Builds a per-night pricing breakdown for a room stay.
 *
 * FLAT model: pricePerNight and weekendPrice are final prices.
 * No tax is added. total always equals subtotal.
 */
export function buildRoomPricingBreakdown({
  pricePerNight,
  weekendPrice,
  checkIn,
  checkOut,
}: {
  pricePerNight: number;
  weekendPrice: number;
  checkIn: Date;
  checkOut: Date;
}): RoomPricingBreakdown {
  const weekdayPrice = pricePerNight;
  // Use weekendPrice if configured (> 0), otherwise fall back to weekdayPrice
  const effectiveWeekendPrice = weekendPrice > 0 ? weekendPrice : weekdayPrice;
  const nights = calculateNights(checkIn, checkOut);

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

  return {
    weekdayPrice,
    weekendPrice: effectiveWeekendPrice,
    weekdayNights,
    weekendNights,
    subtotal,
    total: subtotal,
    breakdown,
  };
}


