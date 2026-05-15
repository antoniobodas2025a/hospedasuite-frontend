/**
 * 📝 Audit Logger — Registra cambios críticos en el sistema SaaS
 *
 * Cada llamada crea una fila inmutable en `audit_logs`.
 * Se usa en webhooks, cron jobs, y server actions.
 *
 * Uso:
 *   await logAuditEvent({
 *     actor_type: 'webhook',
 *     action: 'payment_received',
 *     entity_type: 'hotel',
 *     entity_id: hotelId,
 *     new_value: { amount: 99000, plan: 'pro' },
 *   });
 */

import { supabaseAdmin } from '@/lib/supabase-admin';

export interface AuditEvent {
  /** Quién hizo el cambio: user, webhook, cron, api, system */
  actor_type: 'user' | 'webhook' | 'cron' | 'api' | 'system';
  /** ID del actor (user ID o nombre del sistema) */
  actor_id?: string;
  /** Email del actor (si aplica) */
  actor_email?: string;
  /** Qué se hizo */
  action: string;
  /** Tipo de entidad afectada */
  entity_type: 'hotel' | 'invoice' | 'subscription';
  /** ID de la entidad afectada */
  entity_id: string;
  /** Valor antes del cambio (opcional) */
  old_value?: Record<string, unknown>;
  /** Valor después del cambio (opcional) */
  new_value?: Record<string, unknown>;
  /** IP del actor (opcional, se auto-detecta en server actions) */
  ip_address?: string;
  /** User agent (opcional) */
  user_agent?: string;
}

/**
 * Registra un evento de auditoría en la base de datos.
 * Nunca lanza error — si falla, solo loguea en consola.
 */
export async function logAuditEvent(event: AuditEvent): Promise<void> {
  try {
    const { error } = await supabaseAdmin.from('audit_logs').insert({
      actor_type: event.actor_type,
      actor_id: event.actor_id || null,
      actor_email: event.actor_email || null,
      action: event.action,
      entity_type: event.entity_type,
      entity_id: event.entity_id,
      old_value: event.old_value || null,
      new_value: event.new_value || null,
      ip_address: event.ip_address || null,
      user_agent: event.user_agent || null,
    });

    if (error) {
      console.error('[AUDIT] Error registrando evento:', error.message);
    }
  } catch (err: any) {
    // Error de logging no debe romper el flujo principal
    console.error('[AUDIT] Fallo en logAuditEvent:', err.message);
  }
}
