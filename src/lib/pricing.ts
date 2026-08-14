/**
 * 💰 Pricing Utilities — Single Source of Truth
 *
 * Pure functions for FLAT price calculations.
 * The price configured by the hotelier is the final price the guest pays.
 */

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

function isWeekendNight(date: Date): boolean {
  const day = date.getUTCDay();
  return day === 5 || day === 6;
}

function toISODate(date: Date): string {
  return date.toISOString().split('T')[0];
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
  const effectiveWeekendPrice = weekendPrice > 0 ? weekendPrice : weekdayPrice;
  const msPerDay = 24 * 60 * 60 * 1000;
  const nights = Math.round((checkOut.getTime() - checkIn.getTime()) / msPerDay);

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


