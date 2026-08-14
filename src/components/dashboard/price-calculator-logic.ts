export interface PriceBreakdown {
	basePrice: number;
	total: number;
	wompiFee: number;
	platformFee: number;
	retencion: number;
	hotelReceives: number;
}

const WOMPI_FEE_RATE = 0.03;
const PLATFORM_FEE_RATE = 0.08;
const RETENCION_RATE = 0.11;

/**
 * FLAT pricing model: the hotel enters the FINAL price the guest pays.
 * No tax is added. Fees are calculated on the base price.
 */
export function calculatePriceBreakdown(
	basePrice: number,
): PriceBreakdown {
	const total = basePrice;

	// Fees calculated on base price (hotel's net income)
	const wompiFee = Math.round(basePrice * WOMPI_FEE_RATE);
	const platformFee = Math.round(basePrice * PLATFORM_FEE_RATE);
	const retencion = Math.round(platformFee * RETENCION_RATE);
	const hotelReceives = basePrice - wompiFee - platformFee - retencion;

	return {
		basePrice,
		total,
		wompiFee,
		platformFee,
		retencion,
		hotelReceives,
	};
}


