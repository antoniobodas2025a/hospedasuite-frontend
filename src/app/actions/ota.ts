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
      .select(`id, name, location, slug, status, main_image_url, category, type, rooms!inner(price)`)
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
    const supabaseAdmin = getSupabaseAdmin();

    const { error } = await supabaseAdmin.from('reviews').insert({
      hotel_id: submission.hotelId,
      guest_name: submission.guestName.trim(),
      guest_email: submission.guestEmail.trim().toLowerCase(),
      guest_location: submission.guestLocation?.trim() || null,
      rating: submission.rating,
      comment: submission.comment.trim(),
      stay_date: submission.stayDate || null,
      status: 'pending',
    });

    if (error) {
      console.error('[REVIEWS] Error submitting review:', error.message);
      return { success: false, error: error.message };
    }

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