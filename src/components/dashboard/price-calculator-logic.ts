export type TaxRegime = 'simplified' | 'responsible';

export interface PriceBreakdown {
	guestSees: number;
	wompiFee: number;
	platformFee: number;
	iva: number;
	retencion: number;
	hotelReceives: number;
}

const WOMPI_FEE_RATE = 0.03;
const PLATFORM_FEE_RATE = 0.08;
const IVA_RATE = 0.19;
const RETENCION_RATE = 0.11;

/**
 * ADD pricing model: the hotel enters the BASE price.
 * For responsible hotels, IVA is ADDED on top (base * 0.19).
 * Fees are calculated on the base price (hotel's net income).
 */
export function calculatePriceBreakdown(
	basePrice: number,       // precio base (sin IVA)
	taxRegime: TaxRegime,
): PriceBreakdown {
	const ivaRate = taxRegime === 'responsible' ? IVA_RATE : 0;
	const iva = Math.round(basePrice * ivaRate);
	const guestSees = basePrice + iva;  // base + IVA

	// Fees calculated on base price (hotel's net income)
	const wompiFee = Math.round(basePrice * WOMPI_FEE_RATE);
	const platformFee = Math.round(basePrice * PLATFORM_FEE_RATE);
	const retencion = Math.round(platformFee * RETENCION_RATE);
	const hotelReceives = basePrice - wompiFee - platformFee - retencion;

	return {
		guestSees,
		wompiFee,
		platformFee,
		iva,
		retencion,
		hotelReceives,
	};
}
