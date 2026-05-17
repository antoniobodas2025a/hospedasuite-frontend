'use server';
import { createClient } from '@supabase/supabase-js';
import type { Room } from '@/types';

// 🚨 FIX QA CRÍTICO: Patrón Factory + Sanitización de Variables (.trim)
// Esto evita que espacios invisibles en el .env rompan el motor fetch de Node.js
const getSupabaseAdmin = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || '';

  return createClient(
    supabaseUrl,
    supabaseKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
};

export async function fetchOTAHotelsAction(
  page: number = 0, 
  limit: number = 24, 
  category: string = 'all', 
  search: string = ''
) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    
    const from = page * limit;
    const to = from + limit - 1;

    let query = supabaseAdmin
      .from('hotels')
      .select(`id, name, location, slug, status, main_image_url, description, category, type, rooms!inner(price)`)
      .eq('status', 'active');

    if (category !== 'all') {
      query = query.or(`category.ilike.%${category}%,type.ilike.%${category}%`);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,location.ilike.%${search}%`);
    }

    const { data: hotels, error } = await query.range(from, to);

    if (error) {
      console.error("🚨 ERROR CRÍTICO DE SUPABASE EN OTA:", error.message);
      throw new Error(error.message);
    }

    const otaHotels = hotels?.map(h => {
      const roomPrices = h.rooms?.map((r: { price: number }) => r.price) || [];
      return {
        id: h.id, 
        name: h.name, 
        location: h.location || 'Destino', 
        city_slug: h.slug,
        min_price: roomPrices.length > 0 ? Math.min(...roomPrices) : 0, 
        main_image_url: h.main_image_url || 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?q=80&w=2070',
        description: h.description || '',
        type: h.type || 'hotel', 
        category: h.category
      };
    }) || [];

    const hasMore = hotels ? hotels.length === limit : false;
    return { success: true, data: otaHotels, hasMore };
    
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido en OTA';
    console.error("❌ FALLO EN ACCIÓN OTA:", message);
    return { success: false, error: message, data: [], hasMore: false };
  }
}

/**
 * 🥇 PREMIUM FETCH: Detalle del Hotel + Motor de Disponibilidad RPC (Tier-1)
 */
export async function getHotelDetailsBySlugAction(slug: string, checkIn?: string, checkOut?: string) {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    // 1. Traemos SOLO los datos del hotel base
    const { data: hotel, error } = await supabaseAdmin
      .from('hotels')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'active')
      .single();

    if (error || !hotel) return { success: false, hotel: null };

    let finalRooms = [];

    // 2. MOTOR DE DISPONIBILIDAD (Postgres Anti-Join)
    if (checkIn && checkOut) {
      const safeCheckIn = checkIn.split('T')[0];
      const safeCheckOut = checkOut.split('T')[0];

      console.log(`[SEC-OPS] Ejecutando RPC de disponibilidad para ${slug}: ${safeCheckIn} a ${safeCheckOut}`);

      // ✅ EL ENFOQUE TIER-1 INYECTADO AQUÍ
      const { data: availableRooms, error: rpcError } = await supabaseAdmin.rpc('get_available_rooms', {
        p_hotel_id: hotel.id,
        p_check_in: safeCheckIn,
        p_check_out: safeCheckOut
      });

      if (rpcError) {
        console.error("🚨 Error en Motor RPC:", rpcError.message);
        throw new Error(rpcError.message);
      }

      finalRooms = availableRooms || [];
    } else {
      // 3. Fallback: Si el usuario entra al hotel sin fechas, mostramos el catálogo activo
      const { data: allRooms } = await supabaseAdmin
        .from('rooms')
        .select('id, name, capacity, price, status, gallery, amenities, size_sqm')
        .eq('hotel_id', hotel.id)
        .neq('status', 'maintenance');

      finalRooms = allRooms || [];
    }

    // 4. Sanitización y mapeo final con Barrera Zero-Trust restaurada
    const premiumHotel = {
      ...hotel,
      rooms: finalRooms
        .filter((r: Partial<Room>) => r.status !== 'maintenance') // 🛡️ BARRERA FORENSE RESTAURADA
        .map((r: Partial<Room>) => ({
          ...r,
          price_per_night: r.price // Compatibilidad con componentes frontend
        }))
    };

    return { success: true, hotel: premiumHotel };

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    console.error(`❌ FALLO CRÍTICO EN ACCIÓN DETALLE HOTEL:`, message);
    return { success: false, hotel: null };
  }
}

// ============================================================================
// REVIEWS — Guest review system with moderation
// ============================================================================

import * as z from 'zod';

const ReviewSubmissionSchema = z.object({
  hotelId: z.string().min(1, 'Hotel ID es requerido'),
  guestName: z.string().min(2, 'Nombre debe tener al menos 2 caracteres').max(100, 'Nombre muy largo'),
  guestEmail: z.email('Email inválido'),
  guestLocation: z.string().max(100).optional(),
  rating: z.number().min(1, 'Selecciona una calificación').max(5, 'Calificación inválida'),
  comment: z.string().min(10, 'Comentario debe tener al menos 10 caracteres').max(2000, 'Comentario muy largo (máx 2000)'),
  stayDate: z.string().optional(),
});

/**
 * Spam auto-detection: flags reviews that match common spam patterns.
 * Returns { isSpam: true, reason: string } or { isSpam: false }.
 */
function detectSpam(comment: string, guestName: string): { isSpam: boolean; reason?: string } {
  const text = comment.toLowerCase();
  const name = guestName.toLowerCase();

  // 1. URLs in comment (common in spam)
  if (/(https?:\/\/|www\.)\S+/i.test(comment)) {
    return { isSpam: true, reason: 'No se permiten enlaces en las opiniones.' };
  }

  // 2. Repeated words (e.g. "great great great great")
  const words = text.split(/\s+/);
  const wordCounts: Record<string, number> = {};
  for (const w of words) {
    if (w.length > 3) wordCounts[w] = (wordCounts[w] || 0) + 1;
  }
  const maxRepeat = Math.max(0, ...Object.values(wordCounts));
  if (maxRepeat > 4) {
    return { isSpam: true, reason: 'Texto repetitivo detectado.' };
  }

  // 3. All caps (>80% uppercase)
  const alphaChars = comment.replace(/[^a-zA-ZáéíóúñÁÉÍÓÚÑ]/g, '');
  if (alphaChars.length > 10 && (alphaChars.replace(/[^A-ZÁÉÍÓÚÑ]/g, '').length / alphaChars.length) > 0.8) {
    return { isSpam: true, reason: 'No se permiten opiniones escritas completamente en mayúsculas.' };
  }

  // 4. Name appears in comment (self-promotion pattern)
  if (name.length > 3 && text.includes(name)) {
    return { isSpam: true, reason: 'El nombre no puede aparecer en el comentario.' };
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
      const firstError = flat.formErrors[0] || Object.values(flat.fieldErrors)[0]?.[0] || 'Error de validación';
      return { success: false, error: firstError };
    }

    const { hotelId, guestName, guestEmail, guestLocation, rating, comment, stayDate } = validated.data;

    const supabaseAdmin = getSupabaseAdmin();

    // 2. Spam auto-detection
    const spamCheck = detectSpam(comment, guestName);
    if (spamCheck.isSpam) {
      return { success: false, error: spamCheck.reason };
    }

    // 3. Booking verification: must have a completed stay at this hotel
    const { data: completedBooking } = await supabaseAdmin
      .from('bookings')
      .select('id, check_out')
      .eq('hotel_id', hotelId)
      .eq('guests->>email', guestEmail.toLowerCase())
      .in('status', ['checked_out', 'CHECKED_OUT'])
      .maybeSingle();

    if (!completedBooking) {
      return {
        success: false,
        error: 'Solo huéspedes con una estadía completada pueden dejar una opinión. Si crees que esto es un error, contacta al hotel.',
      };
    }

    // 4. Rate limiting: max 1 review per email per hotel per 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: existingReview } = await supabaseAdmin
      .from('reviews')
      .select('id, status')
      .eq('guest_email', guestEmail.toLowerCase())
      .eq('hotel_id', hotelId)
      .gte('created_at', thirtyDaysAgo)
      .maybeSingle();

    if (existingReview) {
      const msg = existingReview.status === 'pending'
        ? 'Ya enviaste una opinión para este hotel. Está pendiente de verificación.'
        : 'Ya dejaste una opinión para este hotel recientemente. Espera 30 días para enviar otra.';
      return { success: false, error: msg };
    }

    // 4. Insert review
    const { error } = await supabaseAdmin.from('reviews').insert({
      hotel_id: hotelId,
      guest_name: guestName.trim(),
      guest_email: guestEmail.trim().toLowerCase(),
      guest_location: guestLocation?.trim() || null,
      rating,
      comment: comment.trim(),
      stay_date: stayDate || null,
      status: 'pending',
    });

    if (error) {
      console.error('[REVIEWS] Error submitting review:', error.message);
      return { success: false, error: error.message };
    }

    // 6. Revalidate cache so next page load shows updated reviews
    const { revalidateTag } = await import('next/cache');
   revalidateTag(`reviews-${hotelId}`, 'max');

    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    console.error('[REVIEWS] Failed to submit review:', message);
    return { success: false, error: message };
  }
}

export async function getApprovedReviewsAction(hotelId: string) {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    const { data, error } = await supabaseAdmin
      .from('reviews')
      .select('id, guest_name, guest_location, rating, comment, stay_date, created_at')
      .eq('hotel_id', hotelId)
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[REVIEWS] Error fetching approved reviews:', error.message);
      return { success: false, error: error.message, data: [] };
    }

    return { success: true, data: data || [] };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    console.error('[REVIEWS] Failed to fetch approved reviews:', message);
    return { success: false, error: message, data: [] };
  }
}

export async function getReviewStatsAction(hotelId: string) {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    const { data, error } = await supabaseAdmin
      .from('reviews')
      .select('rating')
      .eq('hotel_id', hotelId)
      .eq('status', 'approved');

    if (error) {
      console.error('[REVIEWS] Error fetching review stats:', error.message);
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

    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    const overall = Math.round((sum / total) * 10) / 10;

    const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach((r) => {
      breakdown[r.rating as keyof typeof breakdown]++;
    });

    return { success: true, data: { overall, total, breakdown } };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    console.error('[REVIEWS] Failed to fetch review stats:', message);
    return { success: false, error: message, data: null };
  }
}