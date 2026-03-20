'use server';
import { createClient } from '@supabase/supabase-js';

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
      const roomPrices = h.rooms?.map((r: any) => r.price) || [];
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
    
  } catch (error: any) {
    console.error("❌ FALLO EN ACCIÓN OTA:", error.message);
    return { success: false, error: error.message, data: [], hasMore: false };
  }
}

/**
 * 🥇 PREMIUM FETCH: Detalle del Hotel + Motor de Disponibilidad en Tiempo Real
 */
export async function getHotelDetailsBySlugAction(slug: string, checkIn?: string, checkOut?: string) {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    const { data: hotel, error } = await supabaseAdmin
      .from('hotels')
      .select(`
        *,
        rooms (
          id, name, capacity, price, status, gallery, amenities, size_sqm     
        )
      `)
      .eq('slug', slug)
      .eq('status', 'active')
      .single();

    if (error || !hotel) return { success: false, hotel: null };

    let occupiedRoomIds: string[] = [];

    // MOTOR DE DISPONIBILIDAD
    if (checkIn && checkOut) {
      const safeCheckIn = checkIn.split('T')[0];
      const safeCheckOut = checkOut.split('T')[0];

      const { data: overlaps, error: overlapError } = await supabaseAdmin
        .from('bookings')
        .select('room_id')
        .eq('hotel_id', hotel.id)
        .in('status', ['confirmed', 'checked_in', 'maintenance']) 
        .lt('check_in', safeCheckOut) 
        .gt('check_out', safeCheckIn); 

      if (!overlapError && overlaps) {
        occupiedRoomIds = overlaps.map(b => b.room_id);
      }
    }

    const premiumHotel = {
      ...hotel,
      rooms: hotel.rooms
        ?.filter((r: any) => r.status !== 'maintenance') 
        ?.filter((r: any) => !occupiedRoomIds.includes(r.id)) 
        ?.map((r: any) => ({
          ...r,
          price_per_night: r.price 
        }))
    };

    return { success: true, hotel: premiumHotel };

  } catch (error: any) {
    console.error(`❌ FALLO CRÍTICO EN ACCIÓN DETALLE HOTEL:`, error.message);
    return { success: false, hotel: null };
  }
}