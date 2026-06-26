'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireSuperAdmin } from '@/lib/auth-guards';
import { logAuditEvent } from '@/lib/audit-logger';
import { createClient } from '@/utils/supabase/server';
import type { Database } from '@/types/database';
import type { FeatureFlagRow } from '@/data/superadmin';

// ============================================================================
// SUPERADMIN FEATURE FLAGS — Server Actions
//
// All actions are guarded by requireSuperAdmin() which throws for
// non-authenticated or non-superadmin callers.
//
// Mutations snapshot old_value, call logAuditEvent with entity_type: 'feature_flag',
// and call revalidatePath('/admin/feature-flags').
// ============================================================================

type FeatureFlagInsert = Database['public']['Tables']['feature_flags']['Insert'];
type FeatureFlagUpdate = Database['public']['Tables']['feature_flags']['Update'];

export interface CreateFlagInput {
  flag_key: string;
  flag_name: string;
  description?: string;
  enabled?: boolean;
  hotel_id?: string | null;
}

export interface UpdateFlagInput {
  flag_name?: string;
  description?: string;
  enabled?: boolean;
  hotel_id?: string | null;
}

// ---------------------------------------------------------------------------
// 1. List Feature Flags
// ---------------------------------------------------------------------------

export async function getFeatureFlagsAction(
  hotelId?: string | null,
): Promise<FeatureFlagRow[]> {
  await requireSuperAdmin();

  try {
    let query = supabaseAdmin
      .from('feature_flags')
      .select('*')
      .order('created_at', { ascending: false });

    if (hotelId !== undefined && hotelId !== null) {
      query = query.eq('hotel_id', hotelId);
    }

    const { data, error } = await query;

    if (error) throw new Error(error.message);

    return (data ?? []).map((row: any) => ({
      ...row,
      description: row.description ?? null,
    })) as FeatureFlagRow[];
  } catch (error: any) {
    console.error('[getFeatureFlagsAction]', error.message);
    return [];
  }
}

// ---------------------------------------------------------------------------
// 2. Create Feature Flag
// ---------------------------------------------------------------------------

export async function createFeatureFlagAction(
  input: CreateFlagInput,
): Promise<{ success: boolean; data?: FeatureFlagRow; error?: string }> {
  await requireSuperAdmin();

  try {
    if (!input.flag_key?.trim()) {
      return { success: false, error: 'flag_key es requerido.' };
    }
    if (!input.flag_name?.trim()) {
      return { success: false, error: 'flag_name es requerido.' };
    }

    const payload: FeatureFlagInsert = {
      flag_key: input.flag_key.trim(),
      flag_name: input.flag_name.trim(),
      description: input.description?.trim() || undefined,
      enabled: input.enabled ?? false,
      hotel_id: input.hotel_id || undefined,
    };

    const { data: created, error } = await supabaseAdmin
      .from('feature_flags')
      .insert(payload)
      .select()
      .single();

    if (error) {
      // Detect duplicate key violation
      if (error.code === '23505') {
        return {
          success: false,
          error: `Ya existe un flag con key "${input.flag_key}" para ese scope.`,
        };
      }
      throw new Error(error.message);
    }

    // Audit: flag created
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const headersList = await headers();
    await logAuditEvent({
      actor_type: 'user',
      actor_id: user?.id,
      actor_email: user?.email,
      action: 'feature_flag_created',
      entity_type: 'feature_flag',
      entity_id: created.id,
      old_value: null,
      new_value: {
        flag_key: input.flag_key.trim(),
        flag_name: input.flag_name.trim(),
        enabled: input.enabled ?? false,
        hotel_id: input.hotel_id || null,
      },
      ip_address: headersList.get('x-forwarded-for') || 'unknown',
      user_agent: headersList.get('user-agent') || 'unknown',
    });

    revalidatePath('/admin/feature-flags');
    const flag: FeatureFlagRow = {
      ...created,
      description: (created as any).description ?? null,
    };
    return { success: true, data: flag };
  } catch (error: any) {
    console.error('[createFeatureFlagAction]', error.message);
    return { success: false, error: error.message };
  }
}

// ---------------------------------------------------------------------------
// 3. Update Feature Flag
// ---------------------------------------------------------------------------

export async function updateFeatureFlagAction(
  id: string,
  input: UpdateFlagInput,
): Promise<{ success: boolean; error?: string }> {
  await requireSuperAdmin();

  try {
    // Snapshot pre-mutation for audit
    const { data: currentFlag } = await supabaseAdmin
      .from('feature_flags')
      .select('*')
      .eq('id', id)
      .single();

    const payload: FeatureFlagUpdate = {};
    if (input.flag_name !== undefined) payload.flag_name = input.flag_name.trim();
    if (input.description !== undefined) payload.description = input.description?.trim() || undefined;
    if (input.enabled !== undefined) payload.enabled = input.enabled;
    if (input.hotel_id !== undefined) payload.hotel_id = input.hotel_id || undefined;

    const { error } = await supabaseAdmin
      .from('feature_flags')
      .update(payload)
      .eq('id', id);

    if (error) throw new Error(error.message);

    // Audit: flag updated
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const headersList = await headers();
    await logAuditEvent({
      actor_type: 'user',
      actor_id: user?.id,
      actor_email: user?.email,
      action: 'feature_flag_updated',
      entity_type: 'feature_flag',
      entity_id: id,
      old_value: (currentFlag as Record<string, unknown>) ?? null,
      new_value: { ...currentFlag, ...payload } as Record<string, unknown>,
      ip_address: headersList.get('x-forwarded-for') || 'unknown',
      user_agent: headersList.get('user-agent') || 'unknown',
    });

    revalidatePath('/admin/feature-flags');
    return { success: true };
  } catch (error: any) {
    console.error('[updateFeatureFlagAction]', error.message);
    return { success: false, error: error.message };
  }
}

// ---------------------------------------------------------------------------
// 4. Delete Feature Flag
// ---------------------------------------------------------------------------

export async function deleteFeatureFlagAction(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  await requireSuperAdmin();

  try {
    // Snapshot pre-delete for audit
    const { data: flagSnapshot } = await supabaseAdmin
      .from('feature_flags')
      .select('*')
      .eq('id', id)
      .single();

    const { error } = await supabaseAdmin
      .from('feature_flags')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);

    // Audit: flag deleted
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const headersList = await headers();
    await logAuditEvent({
      actor_type: 'user',
      actor_id: user?.id,
      actor_email: user?.email,
      action: 'feature_flag_deleted',
      entity_type: 'feature_flag',
      entity_id: id,
      old_value: (flagSnapshot as Record<string, unknown>) ?? null,
      new_value: null,
      ip_address: headersList.get('x-forwarded-for') || 'unknown',
      user_agent: headersList.get('user-agent') || 'unknown',
    });

    revalidatePath('/admin/feature-flags');
    return { success: true };
  } catch (error: any) {
    console.error('[deleteFeatureFlagAction]', error.message);
    return { success: false, error: error.message };
  }
}

// ---------------------------------------------------------------------------
// 5. Toggle Feature Flag (inline enabled/disabled flip)
// ---------------------------------------------------------------------------

export async function toggleFeatureFlagAction(
  id: string,
): Promise<{ success: boolean; enabled?: boolean; error?: string }> {
  await requireSuperAdmin();

  try {
    // Snapshot current state
    const { data: currentFlag } = await supabaseAdmin
      .from('feature_flags')
      .select('enabled')
      .eq('id', id)
      .single();

    if (!currentFlag) {
      return { success: false, error: 'Flag no encontrado.' };
    }

    const newEnabled = !currentFlag.enabled;

    const { error } = await supabaseAdmin
      .from('feature_flags')
      .update({ enabled: newEnabled })
      .eq('id', id);

    if (error) throw new Error(error.message);

    // Audit: flag toggled
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const headersList = await headers();
    await logAuditEvent({
      actor_type: 'user',
      actor_id: user?.id,
      actor_email: user?.email,
      action: 'feature_flag_toggled',
      entity_type: 'feature_flag',
      entity_id: id,
      old_value: { enabled: currentFlag.enabled },
      new_value: { enabled: newEnabled },
      ip_address: headersList.get('x-forwarded-for') || 'unknown',
      user_agent: headersList.get('user-agent') || 'unknown',
    });

    revalidatePath('/admin/feature-flags');
    return { success: true, enabled: newEnabled };
  } catch (error: any) {
    console.error('[toggleFeatureFlagAction]', error.message);
    return { success: false, error: error.message };
  }
}
