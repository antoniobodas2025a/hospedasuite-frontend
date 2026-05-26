'use server';

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { revalidatePath, revalidateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { FullWizardState } from '@/lib/onboarding-schemas';
import { checkUnitLimit } from '@/data/plan-guard';
import { generateUniqueSlug } from '@/lib/slug';

export async function executeOnboardingProvisioning(state: FullWizardState): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'No autenticado' };

    // Check if user already has a hotel linked
    const { data: staff } = await supabase
      .from('staff')
      .select('hotel_id')
      .eq('user_id', user.id)
      .maybeSingle();

    let hotelId = staff?.hotel_id;

    // ─── If no hotel exists yet, CREATE it ────
    if (!hotelId) {
      const supabaseAdmin = createAdminClient();
      
      // Generate unique slug for the hotel
      const slug = await generateUniqueSlug(state.hotelIdentity.name, async (s) => {
        const { data } = await supabaseAdmin
          .from('hotels')
          .select('id')
          .eq('slug', s)
          .maybeSingle();
        return !!data;
      });
      
      const { data: newHotel, error: createError } = await supabaseAdmin
        .from('hotels')
        .insert({
          name: state.hotelIdentity.name,
          slug,
          city: state.hotelIdentity.city,
          location: state.hotelIdentity.location,
          type: state.hotelIdentity.propertyType,
          owner_id: user.id,
          status: 'draft',
          is_onboarding_complete: false,
          onboarding_step: 0,
          subscription_plan: 'starter',
          subscription_status: 'trialing',
          trial_ends_at: new Date(Date.now() + 30 * 86400000).toISOString(),
        })
        .select()
        .single();

      if (createError || !newHotel) {
        return { success: false, error: 'No se pudo crear el hotel: ' + (createError?.message || 'Error desconocido') };
      }

      hotelId = newHotel.id;

      // Link user to hotel via staff table
      const { error: staffError } = await supabaseAdmin
        .from('staff')
        .insert({
          user_id: user.id,
          hotel_id: hotelId,
          role: 'admin',
          name: state.hotelIdentity.name,
          pin_code: String(Math.floor(100000 + Math.random() * 900000)),
        });

      if (staffError) {
        return { success: false, error: 'Error al vincular usuario: ' + staffError.message };
      }
    }

    // ─── Plan Gating: Check unit limit before creating rooms ────
    const roomCount = state.rooms.length
    if (roomCount > 0) {
      const limitCheck = await checkUnitLimit(hotelId)
      if (!limitCheck.ok) {
        return { success: false, error: limitCheck.reason }
      }
      if (limitCheck.currentCount + roomCount > limitCheck.maxAllowed) {
        return {
          success: false,
          error: `Tu plan permite hasta ${limitCheck.maxAllowed} unidades. Estás intentando crear ${roomCount} pero solo tienes espacio para ${limitCheck.remaining}.`,
        }
      }
    }

    // 1. Update hotel profile with wizard data
    const supabaseAdmin = createAdminClient();
    const isManual = state.payment.paymentMethod === 'manual';

    // Ensure hotel has a slug (for hotels created before this fix)
    const { data: existingHotel } = await supabaseAdmin
      .from('hotels')
      .select('slug')
      .eq('id', hotelId)
      .maybeSingle();

    let hotelSlug = existingHotel?.slug;
    if (!hotelSlug) {
      hotelSlug = await generateUniqueSlug(state.hotelIdentity.name, async (s) => {
        const { data } = await supabaseAdmin
          .from('hotels')
          .select('id')
          .eq('slug', s)
          .maybeSingle();
        return !!data;
      });
    }

    const hotelUpdateBase = {
      name: state.hotelIdentity.name,
      slug: hotelSlug,
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
      tax_rate: state.settings.taxRate ?? 0.19,
    };

    if (isManual) {
      // Manual payment (Nequi/Daviplata): GOOD FAITH policy
      // Hotel publishes immediately. Admin verifies payment later via dashboard.
      // If payment is invalid, admin can deactivate the hotel.
      const { error: hotelError } = await supabaseAdmin
        .from('hotels')
        .update({
          ...hotelUpdateBase,
          status: 'active',
          subscription_status: 'pending_approval',
          is_onboarding_complete: true,
          onboarding_step: 6,
        })
        .eq('id', hotelId);

      if (hotelError) throw hotelError;

      // Register the manual payment record for admin review
      const { error: paymentError } = await supabaseAdmin
        .from('manual_payments')
        .insert({
          hotel_id: hotelId,
          user_id: user.id,
          amount: state.payment.price || 89900,
          method: 'nequi',
          receipt_url: state.payment.manualReceiptUrl || '',
          status: 'pending',
        });

      if (paymentError) {
        console.error('Manual payment record error:', paymentError);
      }
    } else {
      // Wompi (or default): activate immediately
      const { error: hotelError } = await supabaseAdmin
        .from('hotels')
        .update({
          ...hotelUpdateBase,
          status: 'active',
          subscription_status: 'trialing',
          trial_ends_at: new Date(Date.now() + 30 * 86400000).toISOString(),
          is_onboarding_complete: true,
          onboarding_step: 6,
        })
        .eq('id', hotelId);

      if (hotelError) throw hotelError;
    }

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
      bed_type: room.bedType || null,
      bathroom_type: room.bathroomType || null,
      shower_type: room.showerType || null,
      hot_water: room.hotWater ?? true,
      room_size: room.roomSize || null,
      room_view: room.roomView || null,
      gallery: room.imageUrls.map(url => ({ url })),
      availability_range: room.availabilityRange,
      status: 'active',
      ical_export_token: crypto.randomUUID(),
    }));

    const { error: roomsError } = await supabaseAdmin
      .from('rooms')
      .insert(roomsPayload);

    if (roomsError) throw roomsError;

    // 3. Revalidate
    revalidatePath('/software/onboarding');
    revalidatePath('/admin/dashboard');
    revalidatePath(`/hotel/${hotelSlug}`);
    revalidateTag(`hotel-${hotelId}`, 'max');
    
    return { success: true };
  } catch (error: any) {
    console.error('🚨 ONBOARDING_PROVISIONING_ERROR:', error.message);
    return { success: false, error: error.message };
  }
}
