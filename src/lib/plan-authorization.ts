/**
 * 🛡️ Plan Authorization Middleware
 *
 * Verifica que un hotel tenga el plan requerido Y un estado activo
 * antes de permitir acceso a funcionalidades protegidas.
 *
 * Uso:
 *   await requirePlan(hotelId, 'pro');
 */

import { PLAN_LEVELS, type PlanKey } from '@/config/saas-plans';
import { supabaseAdmin } from '@/lib/supabase-admin';

export interface AuthorizationResult {
  allowed: boolean;
  reason?: 'missing_plan' | 'past_due' | 'cancelled' | 'trial_expired' | 'pending_approval';
  currentPlan?: string;
  status?: string;
}

/**
 * Verifica si un hotel cumple con el plan mínimo requerido.
 * Lanza Error si no cumple (para usar en server actions).
 */
export async function requirePlan(
  hotelId: string,
  requiredPlan: PlanKey
): Promise<void> {
  const result = await checkPlanAccess(hotelId, requiredPlan);

  if (!result.allowed) {
    switch (result.reason) {
      case 'cancelled':
        throw new Error('Suscripción cancelada. Contactá a soporte para reactivar.');
      case 'past_due':
        throw new Error('Pago pendiente. Actualizá tu facturación para seguir usando esta función.');
      case 'trial_expired':
        throw new Error('Período de prueba finalizado. Seleccioná un plan para continuar.');
      case 'missing_plan':
      default:
        throw new Error(`Plan ${requiredPlan} requerido para acceder a esta función.`);
    }
  }
}

/**
 * Verifica acceso sin lanzar error. Retorna objeto con resultado.
 */
export async function checkPlanAccess(
  hotelId: string,
  requiredPlan: PlanKey
): Promise<AuthorizationResult> {
  const { data: hotel, error } = await supabaseAdmin
    .from('hotels')
    .select('id, subscription_plan, subscription_status, trial_ends_at')
    .eq('id', hotelId)
    .single();

  if (error || !hotel) {
    return { allowed: false, reason: 'missing_plan' };
  }

  // 1. Verificar estado de suscripción
  if (hotel.subscription_status === 'cancelled') {
    return { allowed: false, reason: 'cancelled', currentPlan: hotel.subscription_plan, status: hotel.subscription_status };
  }

  if (hotel.subscription_status === 'past_due') {
    return { allowed: false, reason: 'past_due', currentPlan: hotel.subscription_plan, status: hotel.subscription_status };
  }

  // pending_approval: pago manual registrado, esperando aprobación.
  // Se permite acceso mientras tanto (el hotelier ya pagó).
  if (hotel.subscription_status === 'pending_approval') {
    // Procede al check de plan level normalmente
  }

  // 2. Verificar trial expirado
  if (hotel.subscription_status === 'trialing' && hotel.trial_ends_at) {
    const trialEnd = new Date(hotel.trial_ends_at);
    if (trialEnd <= new Date()) {
      return { allowed: false, reason: 'trial_expired', currentPlan: hotel.subscription_plan, status: hotel.subscription_status };
    }
  }

  // 3. Verificar nivel de plan
  const currentLevel = PLAN_LEVELS[hotel.subscription_plan as PlanKey] ?? 0;
  const requiredLevel = PLAN_LEVELS[requiredPlan];

  if (currentLevel < requiredLevel) {
    return { allowed: false, reason: 'missing_plan', currentPlan: hotel.subscription_plan, status: hotel.subscription_status };
  }

  return { allowed: true, currentPlan: hotel.subscription_plan, status: hotel.subscription_status };
}
