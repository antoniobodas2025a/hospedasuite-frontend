/**
 * BookingContext — Pure data contract for room detail checkout state.
 *
 * SRP: The detail page should NOT know about useSearchParams, router, or Supabase.
 * All booking state is injected as a read-only object by the parent page.
 *
 * Phase 1 of Uncle Bob refactor (contract defined, implementation pending).
 */
export interface BookingContext {
	checkIn: string;
	checkOut: string;
	guests: number;
	hotelSlug: string;
	roomId: string;
	room: {
		name: string;
		pricePerNight: number;
		capacity: number;
		gallery: Array<{ url: string } | string>;
		description?: string;
		amenities?: string[];
	};
	taxRate: number;
}

export interface PriceBreakdown {
	subtotal: number;
	tax: number;
	total: number;
	nights: number;
}
