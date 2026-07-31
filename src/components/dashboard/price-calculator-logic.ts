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

export function calculatePriceBreakdown(
	basePrice: number,
	taxRegime: TaxRegime,
): PriceBreakdown {
	const iva = taxRegime === 'responsible' ? basePrice * IVA_RATE : 0;
	const guestSees = basePrice + iva;
	const wompiFee = basePrice * WOMPI_FEE_RATE;
	const platformFee = basePrice * PLATFORM_FEE_RATE;
	const retencion = platformFee * RETENCION_RATE;
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
