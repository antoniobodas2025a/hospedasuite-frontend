'use server';

import { supabaseAdmin } from '@/lib/supabase-admin';
import { revalidatePath } from 'next/cache';
import { TRIAL_DAYS } from '@/config/saas-plans';
import { requireSuperAdmin } from '@/lib/auth-guards';

// ============================================================================
// 1. LISTAR HOTELES CON duplicate_review
// ============================================================================
export async function getDuplicateHotelsAction(): Promise<{
  success: boolean;
  data?: Array<{
    id: string;
    name: string;
    slug: string;
    city: string | null;
    location: string | null;
    created_at: string;
    subscription_status: string;
    fingerprint_hash: string | null;
  }>;
  error?: string;
}> {
  try {
    await requireSuperAdmin();

    const { data, error } = await supabaseAdmin
      .from('hotels')
      .select(`
        id,
        name,
        slug,
        city,
        location,
        created_at,
        subscription_status,
        hotel_fingerprints!inner(fingerprint_hash)
      `)
      .eq('subscription_status', 'duplicate_review')
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, error: 'Error al consultar hoteles duplicados: ' + error.message };
    }

    // Flatten the join result
    const flattened = (data || []).map((h: any) => ({
      id: h.id,
      name: h.name,
      slug: h.slug,
      city: h.city,
      location: h.location,
      created_at: h.created_at,
      subscription_status: h.subscription_status,
      fingerprint_hash: Array.isArray(h.hotel_fingerprints)
        ? h.hotel_fingerprints[0]?.fingerprint_hash ?? null
        : h.hotel_fingerprints?.fingerprint_hash ?? null,
    }));

    return { success: true, data: flattened };
  } catch (error: any) {
    console.error('Get duplicate hotels error:', error.message);
    return { success: false, error: error.message || 'Error al consultar hoteles duplicados' };
  }
}

// ============================================================================
// 2. APROBAR HOTEL DUPLICADO → trialing
// ============================================================================
export async function approveDuplicateHotelAction(
  hotelId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireSuperAdmin();

    const { error } = await supabaseAdmin
      .from('hotels')
      .update({
        subscription_status: 'trialing',
        status: 'active',
        trial_ends_at: new Date(Date.now() + TRIAL_DAYS * 86400000).toISOString(),
      })
      .eq('id', hotelId)
      .eq('subscription_status', 'duplicate_review');

    if (error) {
      return { success: false, error: 'Error al aprobar hotel: ' + error.message };
    }

    revalidatePath('/admin/hotels/duplicates');
    return { success: true };
  } catch (error: any) {
    console.error('Approve duplicate hotel error:', error.message);
    return { success: false, error: error.message || 'Error al aprobar hotel' };
  }
}

// ============================================================================
// 3. RECHAZAR HOTEL DUPLICADO → suspended + cancelled
// ============================================================================
export async function rejectDuplicateHotelAction(
  hotelId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireSuperAdmin();

    const { error } = await supabaseAdmin
      .from('hotels')
      .update({
        status: 'suspended',
        subscription_status: 'cancelled',
      })
      .eq('id', hotelId)
      .eq('subscription_status', 'duplicate_review');

    if (error) {
      return { success: false, error: 'Error al rechazar hotel: ' + error.message };
    }

    revalidatePath('/admin/hotels/duplicates');
    return { success: true };
  } catch (error: any) {
    console.error('Reject duplicate hotel error:', error.message);
    return { success: false, error: error.message || 'Error al rechazar hotel' };
  }
}
