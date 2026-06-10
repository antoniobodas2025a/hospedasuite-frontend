'use server';

import { createLeadAction } from './marketing';

// ============================================================================
// PUBLIC LEAD CAPTURE — Server action para el formulario público de /software
//
// Adapta la interfaz del CRM interno (hunted_leads) a un formulario público
// de baja fricción (máximo 4 campos). Mapea los campos del usuario al schema
// existente sin modificar la base de datos.
// ============================================================================

interface PublicLeadInput {
  name: string;
  email: string;
  phone: string;
  business_name: string;
  city?: string;
  plan_interest?: string;
}

export async function createPublicLeadAction(lead: PublicLeadInput) {
  // Validación mínima pero efectiva
  if (!lead.name.trim()) {
    return { success: false, error: 'El nombre es requerido' };
  }
  if (!lead.email.trim() || !lead.email.includes('@')) {
    return { success: false, error: 'Email inválido' };
  }
  if (!lead.phone.trim()) {
    return { success: false, error: 'El teléfono es requerido' };
  }
  if (!lead.business_name.trim()) {
    return { success: false, error: 'El nombre del alojamiento es requerido' };
  }

  // Mapeo al schema existente de hunted_leads
  const notes = [
    `Nombre: ${lead.name}`,
    `Email: ${lead.email}`,
    `Plan interés: ${lead.plan_interest || 'No especificado'}`,
    `Fuente: Landing /software`,
  ].join(' | ');

  return createLeadAction({
    business_name: lead.business_name,
    phone: lead.phone,
    notes,
    city_search: lead.city,
  });
}
