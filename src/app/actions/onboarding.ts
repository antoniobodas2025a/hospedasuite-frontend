'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { FullWizardState } from '@/lib/onboarding-schemas';
import { checkUnitLimit } from '@/data/plan-guard';

export async function executeOnboardingProvisioning(state: FullWizardState): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  
  try {
    // Get current user's hotel_id from staff table
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'No autenticado' };

    const { data: staff } = await supabase
      .from('staff')
      .select('hotel_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!staff?.hotel_id) return { success: false, error: 'No se encontró el hotel' };

    const hotelId = staff.hotel_id;

    // ─── Plan Gating: Check unit limit before creating rooms ────
    const roomCount = state.rooms.length
    if (roomCount > 0) {
      const limitCheck = await checkUnitLimit(hotelId)
      if (!limitCheck.ok) {
        return { success: false, error: limitCheck.reason }
      }
      // Also check if adding these rooms would exceed the limit
      if (limitCheck.currentCount + roomCount > limitCheck.maxAllowed) {
        return {
          success: false,
          error: `Tu plan permite hasta ${limitCheck.maxAllowed} unidades. Estás intentando crear ${roomCount} pero solo tienes espacio para ${limitCheck.remaining}.`,
        }
      }
    }

    // 1. Update hotel profile
    const { error: hotelError } = await supabase
      .from('hotels')
      .update({
        name: state.hotelIdentity.name,
        city: state.hotelIdentity.city,
        location: state.hotelIdentity.location,
        address: state.hotelIdentity.address || null,
        phone: state.hotelIdentity.phone || null,
        email: state.hotelIdentity.email || null,
        description: state.hotelIdentity.description || null,
        category: state.hotelIdentity.category || null,
        type: state.hotelIdentity.propertyType,
        gallery_urls: state.galleryImages,
        amenities: state.settings.amenities,
        check_in_time: state.settings.checkInTime || '15:00',
        check_out_time: state.settings.checkOutTime || '11:00',
        cancellation_policy: state.settings.cancellationPolicy || null,
        whatsapp_number: state.settings.whatsappNumber || null,
        google_maps_url: state.settings.googleMapsUrl || null,
        status: 'active',
        is_onboarding_complete: true,
        onboarding_step: 6,
      })
      .eq('id', hotelId);

    if (hotelError) throw hotelError;

    // 2. Insert rooms
    const roomsPayload = state.rooms.map(room => ({
      hotel_id: hotelId,
      name: room.name,
      type: room.type || null,
      price: room.price,
      description: room.description || null,
      amenities: room.amenities,
      capacity: room.capacity || null,
      beds: room.beds || null,
      gallery: room.imageUrls.map(url => ({ url })),
      availability_range: room.availabilityRange,
      status: 'available',
      ical_export_token: crypto.randomUUID(),
    }));

    const { error: roomsError } = await supabase
      .from('rooms')
      .insert(roomsPayload);

    if (roomsError) throw roomsError;

    // 3. Revalidate and redirect
    revalidatePath('/', 'layout');
    revalidatePath('/dashboard');
    
    return { success: true };
  } catch (error: any) {
    console.error('🚨 ONBOARDING_PROVISIONING_ERROR:', error.message);
    return { success: false, error: error.message };
  }
}
