'use server';

import { createLeadAction } from './marketing';
import { pushToKlaviyoMcp } from '@/lib/klaviyo-mcp'; // Importamos la integración real

// ============================================================================
// PUBLIC LEAD CAPTURE — Server action para el formulario público de /software
//
// Adapta la interfaz del CRM interno (hunted_leads) a un formulario público
// de baja fricción (máximo 4 campos). Mapea los campos del usuario al schema
// existente e inyecta payload estructurado para Klaviyo MCP con tagging regional.
// ============================================================================

interface PublicLeadInput {
  name: string;
  email: string;
  phone: string;
  business_name: string;
  city?: string;
  plan_interest?: string;
  room_count?: number; // S3: Dynamic room count from slider
}

// ============================================================================
// REGIONAL TAGGING — Boyacá-Centro capture zone & Bouncer
// ============================================================================

// Epicentro Paipa + Radio Inmediato (Estrategia Fase 1)
const BOYACA_CENTRO_CITIES = [
  'paipa', 'tibasosa', 'sogamoso', 'tota', 'sugamuxi', 
  'duitama', 'firavitoba', 'nobsa'
];

function detectRegionalHub(city?: string): string {
  if (!city) return 'General'; // Default fallback
  const normalized = city.toLowerCase().trim();
  if (BOYACA_CENTRO_CITIES.some((c) => normalized.includes(c))) {
    return 'Boyacá-Centro';
  }
  return 'General';
}

// ============================================================================
// MAIN ACTION
// ============================================================================

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

  // Cuarentena Operativa: Forzar región si no se provee
  const detectedRegion = lead.city || 'Boyacá';
  const regionalHub = detectRegionalHub(detectedRegion);
  
  // Lógica de Rechazo Silencioso (Bouncer)
  const isLocal = regionalHub === 'Boyacá-Centro' || detectedRegion === 'Boyacá';
  const waitlistTag = isLocal ? 'activo' : 'waitlist_silenciosa';
  
  const triggerUpsell = lead.plan_interest === 'free' && (lead.room_count || 1) > 1;

  // Mapeo al schema existente de hunted_leads
  const notes = [
    `Nombre: ${lead.name}`,
    `Email: ${lead.email}`,
    `Plan interés: ${lead.plan_interest || 'No especificado'}`,
    `Habitaciones: ${lead.room_count || 1}`,
    `Regional Hub: ${regionalHub}`,
    `Status: ${waitlistTag}`,
    `Trigger Upsell: ${triggerUpsell}`,
    `Fuente: Landing /software`,
  ].join(' | ');

  // 1. Guardar en DB interna (Siempre guardamos, incluso waitlist para análisis futuro)
  const dbResult = createLeadAction({
    business_name: lead.business_name,
    phone: lead.phone,
    notes,
    city_search: detectedRegion,
  });

  // 2. Push a Klaviyo Real API -> SOLO SI ES LOCAL (Cuarentena Operativa)
  if (isLocal) {
    pushToKlaviyoMcp({
      email: lead.email,
      phone: lead.phone,
      properties: {
        city: detectedRegion,
        roomCount: lead.room_count || 1,
        attackLine: triggerUpsell ? 'UPSELL' : 'LINE_1_ORGULLO',
      },
    }).catch((err) => console.error('[Klaviyo] Sync failed:', err));
  } else {
    console.log(`[Bouncer] Lead externo (${detectedRegion}) enviado a lista de espera silenciosa.`);
  }

  return dbResult;
}
