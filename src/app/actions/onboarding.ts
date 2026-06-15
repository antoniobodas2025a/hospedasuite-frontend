'use server';

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { revalidatePath, revalidateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { FullWizardState } from '@/lib/onboarding-schemas';
import { checkUnitLimit } from '@/data/plan-guard';
import { generateUniqueSlug } from '@/lib/slug';
import { FEATURES } from '@/lib/feature-flags';
import { validateProvisioningImageUrls } from '@/lib/provisioning-guard';

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

    // ─── Defense in depth: reject blob/data/javascript URLs ────
    const imageUrlError = validateProvisioningImageUrls({
      galleryImages: state.galleryImages,
      rooms: state.rooms.map(r => ({ name: r.name, imageUrls: r.imageUrls })),
    });
    if (imageUrlError) {
      return { success: false, error: imageUrlError };
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
      main_image_url: state.galleryImages?.[0] || null,
      amenities: state.settings.amenities,
      check_in_time: state.settings.checkInTime || '15:00',
      check_out_time: state.settings.checkOutTime || '11:00',
      cancellation_policy: state.settings.cancellationPolicy || null,
      whatsapp_number: state.settings.whatsappNumber || null,
      google_maps_url: state.settings.googleMapsUrl || null,
      tax_rate: state.settings.taxRate ?? 0,
      // Soberanía Financiera: claves de Wompi del hotel
      wompi_public_key: state.settings.wompi_public_key || null,
      wompi_integrity_secret: state.settings.wompi_integrity_secret || null,
      wompi_sandbox_mode: state.settings.wompi_sandbox_mode || false,
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
          method: state.payment.manualPaymentMethod || 'nequi',
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

    // 3. Geocode hotel address (non-blocking — if it fails, hotel still works)
    try {
      const address = state.hotelIdentity.address || state.hotelIdentity.location || '';
      const city = state.hotelIdentity.city || '';

      if (address || city) {
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
        const geocodeRes = await fetch(`${baseUrl}/api/geocode`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address, city, country: 'Colombia' }),
        });

        if (geocodeRes.ok) {
          const geocodeJson = await geocodeRes.json();
          if (geocodeJson.success && geocodeJson.data) {
            await supabaseAdmin.from('hotel_locations').insert({
              hotel_id: hotelId,
              lat: geocodeJson.data.lat,
              lng: geocodeJson.data.lng,
              precision: geocodeJson.data.precision,
              source: 'wizard',
              raw_input: [address, city].filter(Boolean).join(', '),
              geocoded_at: new Date().toISOString(),
            });
            console.log(`📍 [Onboarding] Coordenadas guardadas para ${state.hotelIdentity.name}`);
          }
        }
      }
    } catch (geocodeErr) {
      // Non-blocking — log but don't fail provisioning
      console.warn(
        `📍 [Onboarding] Geocoding no disponible:`,
        geocodeErr instanceof Error ? geocodeErr.message : geocodeErr,
      );
    }

    // 4. Create saas_subscriptions record (feature-flagged — Wompi recurring billing)
    // Only for Wompi payments; manual payments get a subscription on admin approval.
    if (
      FEATURES.WIZARD_WOMPI_SUBSCRIPTION &&
      state.payment.paymentMethod === 'wompi'
    ) {
      try {
        const now = new Date();
        const trialEnd = new Date(now.getTime() + 90 * 86400000); // 90-day trial

        await supabaseAdmin.from('saas_subscriptions').upsert(
          {
            hotel_id: hotelId,
            plan_key: 'starter',
            status: 'trialing',
            current_period_start: now.toISOString(),
            current_period_end: trialEnd.toISOString(),
            wompi_payment_source_id: state.paymentTransactionId || null,
          },
          { onConflict: 'hotel_id' },
        );

        console.log(`💳 [Onboarding] Suscripción creada para hotel ${hotelId}`);
      } catch (subErr) {
        // Non-blocking — log but don't fail provisioning
        console.warn(
          `💳 [Onboarding] Error creando suscripción:`,
          subErr instanceof Error ? subErr.message : subErr,
        );
      }
    }

    // 5. Welcome Email to Hotelier
    try {
      const { Resend } = await import('resend');
      const { WelcomeHotelier } = await import('@/emails/WelcomeHotelier');
      const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_for_build');
      
      const { render } = await import('@react-email/render');
      const emailHtml = await render(WelcomeHotelier({
        hotelName: state.hotelIdentity.name,
        hotelSlug,
        ownerEmail: user.email || state.hotelIdentity.email || '',
        wompiConfigured: !!state.settings.wompi_public_key,
      }));

      await resend.emails.send({
        from: 'HospedaSuite <bienvenida@hospedasuite.com>',
        to: user.email || state.hotelIdentity.email || '',
        subject: `¡${state.hotelIdentity.name} ya está activo en HospedaSuite!`,
        html: emailHtml,
      });

      console.log(`📧 [Onboarding] Email de bienvenida enviado a ${user.email}`);
    } catch (emailErr) {
      console.warn('📧 [Onboarding] Error enviando email de bienvenida:', emailErr);
    }

    // 6. Revalidate
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
