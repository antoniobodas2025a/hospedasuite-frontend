'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireSuperAdmin } from '@/lib/auth-guards';
import { logAuditEvent } from '@/lib/audit-logger';
import { createClient } from '@/utils/supabase/server';
import type { LeadFilter, LeadListResult, LeadStatus } from '@/types/leads';

// ============================================================================
// SUPERADMIN LEAD MANAGEMENT — Server Actions (PR 1/3: Data Layer)
//
// All actions are guarded by requireSuperAdmin() which throws for
// non-authenticated or non-superadmin callers.
//
// These actions are SEPARATE from marketing.ts to avoid breaking tenant-level
// CRM operations. Existing marketing.ts actions remain untouched.
// ============================================================================

const DEFAULT_PAGE_SIZE = 50;

// ---------------------------------------------------------------------------
// 1. Get Leads (server-side pagination + filtering)
// ---------------------------------------------------------------------------

export async function getLeadsAction(
  filter: LeadFilter = {},
): Promise<LeadListResult> {
  await requireSuperAdmin();

  try {
    const page = filter.page ?? 1;
    const pageSize = filter.pageSize ?? DEFAULT_PAGE_SIZE;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabaseAdmin
      .from('hunted_leads')
      .select('*', { count: 'exact' });

    // Apply filters
    if (filter.search) {
      const term = `%${filter.search}%`;
      query = query.or(`business_name.ilike.${term},phone.ilike.${term}`);
    }

    if (filter.status) {
      query = query.eq('status', filter.status);
    }

    if (filter.city) {
      query = query.ilike('city_search', `%${filter.city}%`);
    }

    if (filter.dateFrom) {
      query = query.gte('created_at', filter.dateFrom);
    }

    if (filter.dateTo) {
      query = query.lte('created_at', filter.dateTo);
    }

    // Apply ordering and pagination
    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw new Error(error.message);

    return {
      leads: (data ?? []) as LeadListResult['leads'],
      total: count ?? 0,
      page,
      pageSize,
    };
  } catch (error: any) {
    console.error('[getLeadsAction]', error.message);
    return {
      leads: [],
      total: 0,
      page: filter.page ?? 1,
      pageSize: filter.pageSize ?? DEFAULT_PAGE_SIZE,
    };
  }
}

// ---------------------------------------------------------------------------
// 2. Update Lead Status
// ---------------------------------------------------------------------------

export async function updateLeadStatusAction(
  leadId: string,
  status: LeadStatus,
): Promise<{ success: boolean; error?: string }> {
  await requireSuperAdmin();

  try {
    // 📸 Snapshot pre-mutación para auditoría
    const { data: currentLead } = await supabaseAdmin
      .from('hunted_leads')
      .select('status')
      .eq('id', leadId)
      .single();

    const { error } = await supabaseAdmin
      .from('hunted_leads')
      .update({ status })
      .eq('id', leadId);

    if (error) throw new Error(error.message);

    // 🔍 Audit: lead status change
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const headersList = await headers();
    await logAuditEvent({
      actor_type: 'user',
      actor_id: user?.id,
      actor_email: user?.email,
      action: 'lead_status_updated',
      entity_type: 'lead',
      entity_id: leadId,
      old_value: currentLead ? { status: currentLead.status } : null,
      new_value: { status },
      ip_address: headersList.get('x-forwarded-for') || 'unknown',
      user_agent: headersList.get('user-agent') || 'unknown',
    });

    revalidatePath('/admin/leads');
    return { success: true };
  } catch (error: any) {
    console.error('[updateLeadStatusAction]', error.message);
    return { success: false, error: error.message };
  }
}

// ---------------------------------------------------------------------------
// 3. Update Lead Notes
// ---------------------------------------------------------------------------

export async function updateLeadNotesAction(
  leadId: string,
  notes: string,
): Promise<{ success: boolean; error?: string }> {
  await requireSuperAdmin();

  try {
    // 📸 Snapshot pre-mutación para auditoría
    const { data: currentLead } = await supabaseAdmin
      .from('hunted_leads')
      .select('notes')
      .eq('id', leadId)
      .single();

    const { error } = await supabaseAdmin
      .from('hunted_leads')
      .update({ notes })
      .eq('id', leadId);

    if (error) throw new Error(error.message);

    // 🔍 Audit: lead notes updated
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const headersList = await headers();
    await logAuditEvent({
      actor_type: 'user',
      actor_id: user?.id,
      actor_email: user?.email,
      action: 'lead_notes_updated',
      entity_type: 'lead',
      entity_id: leadId,
      old_value: currentLead ? { notes: currentLead.notes } : null,
      new_value: { notes },
      ip_address: headersList.get('x-forwarded-for') || 'unknown',
      user_agent: headersList.get('user-agent') || 'unknown',
    });

    revalidatePath('/admin/leads');
    return { success: true };
  } catch (error: any) {
    console.error('[updateLeadNotesAction]', error.message);
    return { success: false, error: error.message };
  }
}

// ---------------------------------------------------------------------------
// 4. Delete Lead (hard delete)
// ---------------------------------------------------------------------------

export async function deleteLeadAction(
  leadId: string,
): Promise<{ success: boolean; error?: string }> {
  await requireSuperAdmin();

  try {
    // 📸 Snapshot pre-borrado para auditoría
    const { data: leadSnapshot } = await supabaseAdmin
      .from('hunted_leads')
      .select('*')
      .eq('id', leadId)
      .single();

    const { error } = await supabaseAdmin
      .from('hunted_leads')
      .delete()
      .eq('id', leadId);

    if (error) throw new Error(error.message);

    // 🔍 Audit: lead deleted
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const headersList = await headers();
    await logAuditEvent({
      actor_type: 'user',
      actor_id: user?.id,
      actor_email: user?.email,
      action: 'lead_deleted',
      entity_type: 'lead',
      entity_id: leadId,
      old_value: (leadSnapshot as Record<string, unknown>) ?? null,
      new_value: null,
      ip_address: headersList.get('x-forwarded-for') || 'unknown',
      user_agent: headersList.get('user-agent') || 'unknown',
    });

    revalidatePath('/admin/leads');
    return { success: true };
  } catch (error: any) {
    console.error('[deleteLeadAction]', error.message);
    return { success: false, error: error.message };
  }
}

// ---------------------------------------------------------------------------
// 5. Assign Lead to Hotel
// ---------------------------------------------------------------------------

export async function assignLeadToHotelAction(
  leadId: string,
  hotelId: string,
): Promise<{ success: boolean; error?: string }> {
  await requireSuperAdmin();

  try {
    // 📸 Snapshot pre-mutación para auditoría
    const { data: currentLead } = await supabaseAdmin
      .from('hunted_leads')
      .select('hotel_id')
      .eq('id', leadId)
      .single();

    const { error } = await supabaseAdmin
      .from('hunted_leads')
      .update({ hotel_id: hotelId })
      .eq('id', leadId);

    if (error) throw new Error(error.message);

    // 🔍 Audit: lead assigned to hotel
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const headersList = await headers();
    await logAuditEvent({
      actor_type: 'user',
      actor_id: user?.id,
      actor_email: user?.email,
      action: 'lead_assigned',
      entity_type: 'lead',
      entity_id: leadId,
      old_value: currentLead ? { hotel_id: currentLead.hotel_id } : null,
      new_value: { hotel_id: hotelId },
      ip_address: headersList.get('x-forwarded-for') || 'unknown',
      user_agent: headersList.get('user-agent') || 'unknown',
    });

    revalidatePath('/admin/leads');
    return { success: true };
  } catch (error: any) {
    console.error('[assignLeadToHotelAction]', error.message);
    return { success: false, error: error.message };
  }
}

// ---------------------------------------------------------------------------
// 6. Create Lead Manually
// ---------------------------------------------------------------------------

export interface AdminLeadInput {
  business_name: string;
  phone: string;
  email?: string;
  city?: string;
  notes?: string;
}

export async function createAdminLeadAction(
  data: AdminLeadInput,
): Promise<{ success: boolean; data?: any; error?: string }> {
  await requireSuperAdmin();

  try {
    // Required field validation
    if (!data.business_name?.trim()) {
      return { success: false, error: 'El nombre del negocio es requerido.' };
    }
    if (!data.phone?.trim()) {
      return { success: false, error: 'El teléfono es requerido.' };
    }

    // Build notes with structured format if email is provided
    const structuredNotes = [
      data.email ? `Email: ${data.email}` : null,
      data.notes ?? null,
    ]
      .filter(Boolean)
      .join(' | ');

    const payload: Record<string, any> = {
      business_name: data.business_name.trim(),
      phone: data.phone.trim(),
      status: 'new',
      city_search: data.city?.trim() ?? null,
      notes: structuredNotes || null,
      created_at: new Date().toISOString(),
    };

    const { data: created, error } = await supabaseAdmin
      .from('hunted_leads')
      .insert([payload])
      .select()
      .single();

    if (error) {
      // Detect duplicate phone
      if (error.code === '23505') {
        return {
          success: false,
          error:
            'Ya existe un lead con ese número de teléfono. ¿Desea crear uno duplicado de todas formas?',
        };
      }
      throw new Error(error.message);
    }

    // 🔍 Audit: lead created
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const headersList = await headers();
    await logAuditEvent({
      actor_type: 'user',
      actor_id: user?.id,
      actor_email: user?.email,
      action: 'lead_created',
      entity_type: 'lead',
      entity_id: created.id,
      old_value: null,
      new_value: { business_name: data.business_name.trim(), phone: data.phone.trim(), status: 'new' },
      ip_address: headersList.get('x-forwarded-for') || 'unknown',
      user_agent: headersList.get('user-agent') || 'unknown',
    });

    revalidatePath('/admin/leads');
    return { success: true, data: created };
  } catch (error: any) {
    console.error('[createAdminLeadAction]', error.message);
    return { success: false, error: error.message };
  }
}
