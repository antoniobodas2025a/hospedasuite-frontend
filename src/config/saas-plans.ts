/**
 * 💰 Single Source of Truth — Planes SaaS HospedaSuite
 *
 * Todos los módulos importan de acá. Si un precio cambia, un solo commit
 * actualiza todo el sistema (billing, gating, UI, HQ).
 */

export type PlanKey = 'starter' | 'pro' | 'enterprise';

export interface SaasPlan {
  key: PlanKey;
  label: string;
  priceCOP: number;
  level: number;
  /** Funcionalidades incluidas en este plan */
  features: string[];
}

export const SAAS_PLANS: Record<PlanKey, SaasPlan> = {
  starter: {
    key: 'starter',
    label: 'Starter',
    priceCOP: 49_000,
    level: 0,
    features: ['PMS Core', 'Agenda', 'Inventario', 'Limpieza', 'Huéspedes', 'OTA Channel Manager'],
  },
  pro: {
    key: 'pro',
    label: 'Pro',
    priceCOP: 99_000,
    level: 1,
    features: ['Todo Starter', 'Carta Digital (POS)', 'Libro Registro (Forensic Book)'],
  },
  enterprise: {
    key: 'enterprise',
    label: 'Enterprise',
    priceCOP: 169_000,
    level: 2,
    features: ['Todo Pro', 'Reportes Avanzados', 'Marketing y Leads'],
  },
} as const;

/** Orden jerárquico de planes para comparaciones */
export const PLAN_LEVELS: Record<PlanKey, number> = {
  starter: 0,
  pro: 1,
  enterprise: 2,
} as const;

/** Labels para UI */
export const PLAN_LABELS: Record<PlanKey, string> = {
  starter: 'Starter',
  pro: 'Pro',
  enterprise: 'Enterprise',
} as const;

/**
 * Verifica si un plan cumple con el mínimo requerido.
 * Ej: hasPlanAccess('pro', 'starter') → true
 *     hasPlanAccess('starter', 'pro') → false
 */
export function hasPlanAccess(
  currentPlan: PlanKey | string | undefined,
  requiredPlan: PlanKey
): boolean {
  const current = PLAN_LEVELS[currentPlan as PlanKey] ?? 0;
  const required = PLAN_LEVELS[requiredPlan];
  return current >= required;
}

/**
 * Retorna el plan key a partir de un string arbitrario.
 * Fallback a 'starter' si no coincide.
 */
export function normalizePlan(plan: string | undefined | null): PlanKey {
  const key = plan?.toLowerCase();
  if (key === 'pro' || key === 'enterprise') return key;
  return 'starter';
}
