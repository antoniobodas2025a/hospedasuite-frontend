'use server';

import { supabaseAdmin } from '@/lib/supabase-admin';
import { pushToKlaviyoMcp } from '@/lib/klaviyo-mcp'; // Importamos la integración real

// ============================================================================
// PUBLIC LEAD CAPTURE — Server action para el formulario público de /software
//
// Formulario público de baja fricción (2 campos). Inserta directamente en
// hunted_leads sin tenant guard y sincroniza con Klaviyo vía MCP.
// ============================================================================

interface PublicLeadInput {
  email: string;
  phone: string;
  plan_interest?: string;
  room_count?: number;
  referred_by?: string;
}

// ============================================================================
// MAIN ACTION
// ============================================================================

export async function createPublicLeadAction(lead: PublicLeadInput) {
  // Validación mínima pero efectiva
  if (!lead.email.trim() || !lead.email.includes('@')) {
    return { success: false, error: 'Email inválido' };
  }
  if (!lead.phone.trim()) {
    return { success: false, error: 'El teléfono es requerido' };
  }

  const attackLine =
    lead.plan_interest === 'free' && (lead.room_count || 1) > 1
      ? 'UPSELL'
      : 'LINE_1_ORGULLO';

  // Mapeo al schema existente de hunted_leads
  const notes = [
    `Email: ${lead.email}`,
    `Plan interés: ${lead.plan_interest || 'No especificado'}`,
    `Habitaciones: ${lead.room_count || 1}`,
    `Fuente: Landing /software`,
    lead.referred_by ? `Referred by: ${lead.referred_by}` : null,
  ]
    .filter(Boolean)
    .join(' | ');

  // 1. Guardar en DB interna (sin tenant guard: leads públicos aún no tienen hotel)
  // `business_name` usa el email como placeholder ("Lead: ...") para distinguir
  // leads públicos de los leads cazados con nombre real en el CRM.
  // `as any`: los tipos generados marcan id/created_at como requeridos en Insert
  // (los genera la DB); es el mismo workaround que el resto del codebase.
  const { error } = await supabaseAdmin
    .from('hunted_leads')
    .insert([{ business_name: `Lead: ${lead.email}`, phone: lead.phone, notes, status: 'new' } as any]);

  if (error) {
    return { success: false, error: error.message };
  }

  // 2. Push a Klaviyo Real API (fire-and-forget)
  pushToKlaviyoMcp({
    email: lead.email,
    phone: lead.phone,
    properties: {
      roomCount: lead.room_count || 1,
      attackLine,
    },
  }).catch((err) => console.error('[Klaviyo] Sync failed:', err));

  return { success: true, attackLine };
}
