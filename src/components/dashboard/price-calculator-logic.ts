export type TaxRegime = 'simplified' | 'responsible';

export interface PriceBreakdown {
	guestSees: number;
	wompiFee: number;
	platformFee: number;
	iva: number;
	retencion: number;
	hotelReceives: number;
	netBase: number;
}

const WOMPI_FEE_RATE = 0.03;
const PLATFORM_FEE_RATE = 0.08;
const IVA_RATE = 0.19;
const RETENCION_RATE = 0.11;

/**
 * B2C Colombian pricing model: the entered price IS the final price.
 * For responsible hotels, IVA is EXTRACTED internally (gross / 1.19).
 * Fees are calculated on the net base (pre-IVA amount).
 */
export function calculatePriceBreakdown(
	basePrice: number,       // NOW: precio final (IVA incluido si aplica)
	taxRegime: TaxRegime,
): PriceBreakdown {
	const guestSees = basePrice;  // El precio ingresado ES el que ve el huésped
	const ivaRate = taxRegime === 'responsible' ? IVA_RATE : 0;
	const netBase = ivaRate > 0 ? Math.round(basePrice / (1 + ivaRate)) : basePrice;
	const iva = basePrice - netBase;
	
	// Fees calculated on net base (base gravable, sin IVA)
	const wompiFee = Math.round(netBase * WOMPI_FEE_RATE);
	const platformFee = Math.round(netBase * PLATFORM_FEE_RATE);
	const retencion = Math.round(platformFee * RETENCION_RATE);
	const hotelReceives = netBase - wompiFee - platformFee - retencion;

	return {
		guestSees,
		wompiFee,
		platformFee,
		iva,
		retencion,
		hotelReceives,
		netBase,
	};
}
