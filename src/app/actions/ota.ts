"use server";
import type { Room } from "@/types";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { rankHotels, applyDiversity } from "@/lib/hotel-ranking";
import {
	resolveHotelCoordinates,
	type CoordRecord,
} from "@/lib/hotel-coordinates";

// ─── Retry helper for Supabase queries (ETIMEDOUT resilience) ──────────────

async function withRetry<T>(
	fn: () => Promise<T>,
	maxRetries = 3,
	baseDelay = 1000,
): Promise<T> {
	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		try {
			return await fn();
		} catch (error: unknown) {
			const msg = error instanceof Error ? error.message : String(error);
			const isTimeout =
				msg.includes("ETIMEDOUT") || msg.includes("TimeoutError");
			if (!isTimeout || attempt >= maxRetries) throw error;
			await new Promise((r) => setTimeout(r, baseDelay * Math.pow(2, attempt)));
		}
	}
	throw new Error("Unreachable");
}

/**
 * Normalize string for search: remove accents, lowercase, trim.
 * "Medellín" → "medellin", "Bogotá" → "bogota"
 */
function normalizeForSearch(str: string): string {
	return str
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.trim();
}

export interface LocationSuggestion {
	city: string;
	hotelCount: number;
}

/**
 * Search locations (cities) with hotel counts for autocomplete.
 * Returns distinct cities matching the query, sorted by hotel count.
 */
export async function searchLocationsAction(
	query: string,
): Promise<{ success: boolean; data: LocationSuggestion[]; error?: string }> {
	try {
		if (!query || query.length < 2) {
			return { success: true, data: [] };
		}

		// Fetch all active hotels with their city
		const { data, error } = await supabaseAdmin
			.from("hotels")
			.select("city, location")
			.eq("status", "active")
			.not("city", "is", null);

		if (error) {
			console.error("[LOCATIONS] Error fetching cities:", error.message);
			return { success: false, data: [], error: error.message };
		}

		// Group by city, count hotels, filter by query
		const cityMap = new Map<string, number>();
		const locationSet = new Set<string>();

		for (const hotel of data || []) {
			const city = (hotel.city || "").trim();
			const location = (hotel.location || "").trim();

			if (city) {
				cityMap.set(city, (cityMap.get(city) || 0) + 1);
			}
			if (location) {
				locationSet.add(location);
			}
		}

		// Filter by query match (city, location, or address) — accent-insensitive
		const normalizedQuery = normalizeForSearch(query);
		const results: LocationSuggestion[] = [];

		// Match cities (accent-insensitive)
		for (const [city, count] of cityMap.entries()) {
			const normalizedCity = normalizeForSearch(city);
			if (normalizedCity.includes(normalizedQuery)) {
				results.push({ city, hotelCount: count });
			}
		}

		// Match locations (neighborhoods, areas) that aren't already in cities
		for (const loc of locationSet) {
			const normalizedLoc = normalizeForSearch(loc);
			if (normalizedLoc.includes(normalizedQuery) && !cityMap.has(loc)) {
				// Count hotels with this location
				const count = (data || []).filter(
					(h: any) => normalizeForSearch(h.location || "") === normalizedLoc,
				).length;
				if (count > 0) {
					results.push({ city: loc, hotelCount: count });
				}
			}
		}

		// Sort by hotel count (descending), then alphabetically
		results.sort(
			(a, b) => b.hotelCount - a.hotelCount || a.city.localeCompare(b.city),
		);

		// Limit to top 8 suggestions
		return { success: true, data: results.slice(0, 8) };
	} catch (error: unknown) {
		const message =
			error instanceof Error ? error.message : "Error desconocido";
		console.error("[LOCATIONS] Failed to search locations:", message);
		return { success: false, data: [], error: message };
	}
}

export async function fetchChannelHotelsAction(
	page: number = 0,
	limit: number = 24,
	category: string = "all",
	search: string = "",
	location: string = "",
	checkin?: string,
	checkout?: string,
	guests?: number,
) {
	try {
		const from = page * limit;
		const to = from + limit - 1;

		// 1. Build base query — fetch ALL active hotels with retry on timeout
		let query = supabaseAdmin
			.from("hotels")
			.select(
				`id, name, location, city, slug, status, main_image_url, description, category, type, rooms(price)`,
			)
			.eq("status", "active");

		if (category !== "all") {
			query = query.or(`category.ilike.%${category}%,type.ilike.%${category}%`);
		}

		if (search) {
			query = query.or(
				`name.ilike.%${search}%,location.ilike.%${search}%,city.ilike.%${search}%`,
			);
		}

		// Execute with retry on ETIMEDOUT (exponential backoff: 1s, 2s, 4s)
		const result = await withRetry(async () => await query);
		const { data: allHotels, error } = result;

		if (error) {
			console.error("🚨 ERROR CRÍTICO DE SUPABASE EN Channel:", error.message);
			throw new Error(error.message);
		}

		// 2. Client-side location filter (accent-insensitive)
		let filteredHotels = allHotels || [];
		if (location) {
			const normalizedLocation = normalizeForSearch(location);
			filteredHotels = filteredHotels.filter((h: any) => {
				const city = normalizeForSearch(h.city || "");
				const loc = normalizeForSearch(h.location || "");
				const addr = normalizeForSearch(h.address || "");
				return (
					city.includes(normalizedLocation) ||
					loc.includes(normalizedLocation) ||
					addr.includes(normalizedLocation)
				);
			});
		}

		// 3. Enrich with coordinates from ota_catalog (primary) + hotel_locations (fallback)
		const otaHotelIds = filteredHotels.map((h: any) => h.id);
		const coordsMap = new Map<
			string,
			{ lat: number; lng: number; precision: string }
		>();

		if (otaHotelIds.length > 0) {
			// Primary: ota_catalog (precomputed, cached)
			const { data: catalogData } = await supabaseAdmin
				.from("ota_catalog")
				.select("id, lat, lng, precision")
				.in("id", otaHotelIds);

			// Fallback: hotel_locations (from onboarding wizard geocoding)
			const idsWithoutCoords = otaHotelIds.filter(
				(id: string) =>
					!catalogData?.some((row: any) => row.id === id && row.lat && row.lng),
			);

			let locData: any[] | null = null;
			if (idsWithoutCoords.length > 0) {
				const locResult = await supabaseAdmin
					.from("hotel_locations")
					.select("hotel_id, lat, lng, precision")
					.in("hotel_id", idsWithoutCoords)
					.order("geocoded_at", { ascending: false });
				locData = locResult.data;
			}

			// Delegate to pure function (S9-S12)
			const resolved = resolveHotelCoordinates(
				otaHotelIds,
				(catalogData || []) as CoordRecord[],
				(locData || []) as (CoordRecord & { hotel_id: string })[],
			);

			for (const [id, coord] of resolved) {
				coordsMap.set(id, {
					lat: coord.lat,
					lng: coord.lng,
					precision: coord.precision,
				});
			}
		}

		// 4. Map to Channel response shape
		let otaHotels = filteredHotels.map((h: any) => {
			const roomPrices = h.rooms?.map((r: { price: number }) => r.price) || [];
			const coords = coordsMap.get(h.id);
			return {
				id: h.id,
				name: h.name,
				location: h.location || h.city || "",
				city: h.city || null,
				slug: h.slug,
				min_price: roomPrices.length > 0 ? Math.min(...roomPrices) : 0,
				main_image_url:
					h.main_image_url ||
					"https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?q=80&w=2070",
				description: h.description || "",
				type: h.type || "hotel",
				category: h.category,
				// S3: Filter NaN coordinates — hotel stays in cards list, no marker on map
				latitude: coords?.lat != null && !isNaN(coords.lat) ? coords.lat : null,
				longitude:
					coords?.lng != null && !isNaN(coords.lng) ? coords.lng : null,
				precision: coords?.precision ?? null,
			};
		});

		if (otaHotels.length === 0) {
			return { success: true, data: [], hasMore: false };
		}

		const hotelIds = otaHotels.map((h: any) => h.id);

		// 4. Batch availability (single RPC replaces N+1 per-hotel calls)
		if (checkin && checkout) {
			const safeCheckIn = checkin.split("T")[0];
			const safeCheckOut = checkout.split("T")[0];

			const { data: batchAvail } = await supabaseAdmin.rpc(
				"get_batch_availability",
				{
					p_hotel_ids: hotelIds,
					p_check_in: safeCheckIn,
					p_check_out: safeCheckOut,
					p_guests: guests || 0,
				},
			);

			const availMap = new Map<string, any>(
				(batchAvail || []).map((a: any) => [a.hotel_id, a]),
			);

			otaHotels = otaHotels
				.filter((h: any) => {
					const avail = availMap.get(h.id);
					return avail && Number(avail.available_rooms) > 0;
				})
				.map((h: any) => {
					const avail = availMap.get(h.id);
					return {
						...h,
						availableRooms: Number(avail?.available_rooms ?? 0),
						totalRooms: Number(avail?.total_rooms ?? 0),
						min_price: avail
							? Number(avail.min_price) || h.min_price
							: h.min_price,
					};
				});
		}

		if (otaHotels.length === 0) {
			return { success: true, data: [], hasMore: false };
		}

		// Update hotel IDs after availability filter
		const remainingIds = otaHotels.map((h: any) => h.id);

		// 5. Batch review stats (single query replaces N+1 per-hotel calls)
		const { data: reviewData } = await supabaseAdmin
			.from("reviews")
			.select("hotel_id, rating")
			.in("hotel_id", remainingIds)
			.eq("status", "approved");

		const reviewMap = new Map<
			string,
			{ averageRating: number; totalReviews: number }
		>();
		for (const r of reviewData || []) {
			const existing = reviewMap.get(r.hotel_id) || {
				averageRating: 0,
				totalReviews: 0,
			};
			const newTotal = existing.totalReviews + 1;
			const newAvg =
				(existing.averageRating * existing.totalReviews + r.rating) / newTotal;
			reviewMap.set(r.hotel_id, {
				averageRating: Math.round(newAvg * 10) / 10,
				totalReviews: newTotal,
			});
		}

		// Enrich hotels with reviewStats
		otaHotels = otaHotels.map((h: any) => ({
			...h,
			reviewStats: reviewMap.get(h.id) || { averageRating: 0, totalReviews: 0 },
		}));

		// 6. MCDA Ranking — score hotels by availability, reviews, price, and text match
		const scorableHotels = otaHotels.map((h: any) => ({
			id: h.id,
			name: h.name,
			location: h.location,
			min_price: h.min_price,
			description: h.description,
			reviewStats: h.reviewStats,
			availableRooms: h.availableRooms,
			totalRooms: h.totalRooms,
		}));

		const ranked = rankHotels(scorableHotels, {
			checkIn: checkin,
			checkOut: checkout,
			query: search || location,
		});

		// Map ranked order back to full hotel objects preserving enriched data
		const enrichedMap = new Map(otaHotels.map((h: any) => [h.id, h]));
		let finalHotels: any[] = ranked
			.map((r) => enrichedMap.get(r.id))
			.filter(Boolean);

		// 7. Diversity constraint — round-robin by category (max 2 of same type in a row)
		finalHotels = applyDiversity(finalHotels, 2);

		// 8. Paginate from the fully processed result
		const pagedHotels = finalHotels.slice(from, to + 1);
		const hasMore = finalHotels.length > to + 1;

		return { success: true, data: pagedHotels, hasMore };
	} catch (error: unknown) {
		const message =
			error instanceof Error ? error.message : "Error desconocido en Channel";
		console.error("❌ FALLO EN ACCIÓN Channel:", message);
		return { success: false, error: message, data: [], hasMore: false };
	}
}

/**
 * 🥇 PREMIUM FETCH: Detalle del Hotel + Motor de Disponibilidad RPC (Tier-1)
 */
export async function getHotelDetailsBySlugAction(
	slug: string,
	checkIn?: string,
	checkOut?: string,
) {
	try {
		// 1. Traemos SOLO los datos del hotel base
		const { data: hotel, error } = await supabaseAdmin
			.from("hotels")
			.select("*")
			.eq("slug", slug)
			.eq("status", "active")
			.single();

		if (error || !hotel) return { success: false, hotel: null };

		let finalRooms: any[] = [];

		// 2. MOTOR DE DISPONIBILIDAD (Postgres Anti-Join)
		if (checkIn && checkOut) {
			const safeCheckIn = checkIn.split("T")[0];
			const safeCheckOut = checkOut.split("T")[0];

			console.log(
				`[SEC-OPS] Ejecutando RPC de disponibilidad para ${slug}: ${safeCheckIn} a ${safeCheckOut}`,
			);

			// ✅ EL ENFOQUE TIER-1 INYECTADO AQUÍ
			const { data: availableRooms, error: rpcError } = await supabaseAdmin.rpc(
				"get_available_rooms",
				{
					p_hotel_id: hotel.id,
					p_check_in: safeCheckIn,
					p_check_out: safeCheckOut,
				},
			);

			if (rpcError) {
				// Fallback: Si el RPC no existe (migraciones no corridas), usar query directa
				console.warn(
					"⚠️ RPC get_available_rooms no disponible, usando fallback:",
					rpcError.message,
				);
				const { data: fallbackRooms } = await supabaseAdmin
					.from("rooms")
					.select(
						"id, name, capacity, beds, bed_type, price, status, gallery, amenities, size_sqm",
					)
					.eq("hotel_id", hotel.id)
					.neq("status", "maintenance");
				finalRooms = fallbackRooms || [];
			} else {
				finalRooms = availableRooms || [];
			}
		} else {
			// 3. Fallback: Si el usuario entra al hotel sin fechas, mostramos el catálogo activo
			const { data: allRooms } = await supabaseAdmin
				.from("rooms")
				.select(
					"id, name, capacity, beds, bed_type, price, status, gallery, amenities, size_sqm",
				)
				.eq("hotel_id", hotel.id)
				.neq("status", "maintenance");

			finalRooms = allRooms || [];
		}

		// 4. Sanitización y mapeo final con Barrera Zero-Trust restaurada
		const premiumHotel = {
			...hotel,
			rooms: finalRooms
				.filter((r: Partial<Room>) => r.status !== "maintenance") // 🛡️ BARRERA FORENSE RESTAURADA
				.map((r: Partial<Room>) => ({
					...r,
					price_per_night: r.price, // Compatibilidad con componentes frontend
				})),
		};

		// 5. Enriquecer con coordenadas de hotel_locations (para mapa del detalle)
		try {
			const { data: loc } = await supabaseAdmin
				.from("hotel_locations")
				.select("lat, lng")
				.eq("hotel_id", hotel.id)
				.order("created_at", { ascending: false })
				.limit(1)
				.single();
			if (loc) {
				premiumHotel.latitude = loc.lat;
				premiumHotel.longitude = loc.lng;
			}
		} catch {
			// Non-blocking — el mapa del detalle funciona sin coordenadas
		}

		return { success: true, hotel: premiumHotel };
	} catch (error: unknown) {
		const message =
			error instanceof Error ? error.message : "Error desconocido";
		console.error(`❌ FALLO CRÍTICO EN ACCIÓN DETALLE HOTEL:`, message);
		return { success: false, hotel: null };
	}
}

// ============================================================================
// REVIEWS — Guest review system with moderation
// ============================================================================

import * as z from "zod";

const ReviewSubmissionSchema = z.object({
	hotelId: z.string().min(1, "Hotel ID es requerido"),
	guestName: z
		.string()
		.min(2, "Nombre debe tener al menos 2 caracteres")
		.max(100, "Nombre muy largo"),
	guestEmail: z.email("Email inválido"),
	guestLocation: z.string().max(100).optional(),
	rating: z
		.number()
		.min(1, "Selecciona una calificación")
		.max(5, "Calificación inválida"),
	comment: z
		.string()
		.min(10, "Comentario debe tener al menos 10 caracteres")
		.max(2000, "Comentario muy largo (máx 2000)"),
	stayDate: z.string().optional(),
});

/**
 * Spam auto-detection: flags reviews that match common spam patterns.
 * Returns { isSpam: true, reason: string } or { isSpam: false }.
 */
function detectSpam(
	comment: string,
	guestName: string,
): { isSpam: boolean; reason?: string } {
	const text = comment.toLowerCase();
	const name = guestName.toLowerCase();

	// 1. URLs in comment (common in spam)
	if (/(https?:\/\/|www\.)\S+/i.test(comment)) {
		return { isSpam: true, reason: "No se permiten enlaces en las opiniones." };
	}

	// 2. Repeated words (e.g. "great great great great")
	const words = text.split(/\s+/);
	const wordCounts: Record<string, number> = {};
	for (const w of words) {
		if (w.length > 3) wordCounts[w] = (wordCounts[w] || 0) + 1;
	}
	const maxRepeat = Math.max(0, ...Object.values(wordCounts));
	if (maxRepeat > 4) {
		return { isSpam: true, reason: "Texto repetitivo detectado." };
	}

	// 3. All caps (>80% uppercase)
	const alphaChars = comment.replace(/[^a-zA-ZáéíóúñÁÉÍÓÚÑ]/g, "");
	if (
		alphaChars.length > 10 &&
		alphaChars.replace(/[^A-ZÁÉÍÓÚÑ]/g, "").length / alphaChars.length > 0.8
	) {
		return {
			isSpam: true,
			reason: "No se permiten opiniones escritas completamente en mayúsculas.",
		};
	}

	// 4. Name appears in comment (self-promotion pattern)
	if (name.length > 3 && text.includes(name)) {
		return {
			isSpam: true,
			reason: "El nombre no puede aparecer en el comentario.",
		};
	}

	return { isSpam: false };
}

export interface ReviewSubmission {
	hotelId: string;
	guestName: string;
	guestEmail: string;
	guestLocation?: string;
	rating: number;
	comment: string;
	stayDate?: string;
}

export async function submitReviewAction(submission: ReviewSubmission) {
	try {
		// 1. Zod v4 validation (server-side)
		const validated = ReviewSubmissionSchema.safeParse(submission);
		if (!validated.success) {
			const flat = z.flattenError(validated.error);
			const firstError =
				flat.formErrors[0] ||
				Object.values(flat.fieldErrors)[0]?.[0] ||
				"Error de validación";
			return { success: false, error: firstError };
		}

		const {
			hotelId,
			guestName,
			guestEmail,
			guestLocation,
			rating,
			comment,
			stayDate,
		} = validated.data;

		// 2. Spam auto-detection
		const spamCheck = detectSpam(comment, guestName);
		if (spamCheck.isSpam) {
			return { success: false, error: spamCheck.reason };
		}

		// 3. Booking verification: must have a completed stay at this hotel
		const { data: completedBooking } = await supabaseAdmin
			.from("bookings")
			.select("id, check_out")
			.eq("hotel_id", hotelId)
			.eq("guests->>email", guestEmail.toLowerCase())
			.in("status", ["checked_out", "CHECKED_OUT"])
			.maybeSingle();

		if (!completedBooking) {
			return {
				success: false,
				error:
					"Solo huéspedes con una estadía completada pueden dejar una opinión. Si crees que esto es un error, contacta al hotel.",
			};
		}

		// 4. Rate limiting: max 1 review per email per hotel per 30 days
		const thirtyDaysAgo = new Date(
			Date.now() - 30 * 24 * 60 * 60 * 1000,
		).toISOString();
		const { data: existingReview } = await supabaseAdmin
			.from("reviews")
			.select("id, status")
			.eq("guest_email", guestEmail.toLowerCase())
			.eq("hotel_id", hotelId)
			.gte("created_at", thirtyDaysAgo)
			.maybeSingle();

		if (existingReview) {
			const msg =
				existingReview.status === "pending"
					? "Ya enviaste una opinión para este hotel. Está pendiente de verificación."
					: "Ya dejaste una opinión para este hotel recientemente. Espera 30 días para enviar otra.";
			return { success: false, error: msg };
		}

		// 4. Insert review
		const { error } = await supabaseAdmin.from("reviews").insert({
			hotel_id: hotelId,
			guest_name: guestName.trim(),
			guest_email: guestEmail.trim().toLowerCase(),
			guest_location: guestLocation?.trim() || null,
			rating,
			comment: comment.trim(),
			stay_date: stayDate || null,
			status: "pending",
		});

		if (error) {
			console.error("[REVIEWS] Error submitting review:", error.message);
			return { success: false, error: error.message };
		}

		// 6. Revalidate cache so next page load shows updated reviews
		const { revalidateTag } = await import("next/cache");
		revalidateTag(`reviews-${hotelId}`, "max");

		return { success: true };
	} catch (error: unknown) {
		const message =
			error instanceof Error ? error.message : "Error desconocido";
		console.error("[REVIEWS] Failed to submit review:", message);
		return { success: false, error: message };
	}
}

export async function getApprovedReviewsAction(hotelId: string) {
	try {
		const { data, error } = await supabaseAdmin
			.from("reviews")
			.select(
				"id, guest_name, guest_location, rating, comment, stay_date, created_at",
			)
			.eq("hotel_id", hotelId)
			.eq("status", "approved")
			.order("created_at", { ascending: false });

		if (error) {
			console.error(
				"[REVIEWS] Error fetching approved reviews:",
				error.message,
			);
			return { success: false, error: error.message, data: [] };
		}

		return { success: true, data: data || [] };
	} catch (error: unknown) {
		const message =
			error instanceof Error ? error.message : "Error desconocido";
		console.error("[REVIEWS] Failed to fetch approved reviews:", message);
		return { success: false, error: message, data: [] };
	}
}

export async function getReviewStatsAction(hotelId: string) {
	try {
		const { data, error } = await supabaseAdmin
			.from("reviews")
			.select("rating")
			.eq("hotel_id", hotelId)
			.eq("status", "approved");

		if (error) {
			console.error("[REVIEWS] Error fetching review stats:", error.message);
			return { success: false, error: error.message, data: null };
		}

		const reviews = data || [];
		const total = reviews.length;

		if (total === 0) {
			return {
				success: true,
				data: {
					overall: 0,
					total: 0,
					breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
				},
			};
		}

		const sum = reviews.reduce((acc: number, r: any) => acc + r.rating, 0);
		const overall = Math.round((sum / total) * 10) / 10;

		const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
		reviews.forEach((r: any) => {
			breakdown[r.rating as keyof typeof breakdown]++;
		});

		return { success: true, data: { overall, total, breakdown } };
	} catch (error: unknown) {
		const message =
			error instanceof Error ? error.message : "Error desconocido";
		console.error("[REVIEWS] Failed to fetch review stats:", message);
		return { success: false, error: message, data: null };
	}
}
