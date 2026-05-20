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
    features: ['PMS Core', 'Agenda', 'Inventario', 'Limpieza', 'Huéspedes', 'OTA bilingüe (ES/EN)', '3 meses gratis'],
  },
  pro: {
    key: 'pro',
    label: 'Pro',
    priceCOP: 99_000,
    level: 1,
    features: ['Todo Starter', 'Channel Manager (iCal)', 'Carta Digital', 'POS', 'Libro Registro', '3 meses gratis'],
  },
  enterprise: {
    key: 'enterprise',
    label: 'Enterprise',
    priceCOP: 199_000,
    level: 2,
    features: ['Todo Pro', 'Hasta 30 unidades', '6 OTAs', '15 staff', '20 GB storage', 'Soporte prioritario', '3 meses gratis'],
  },
};

/** Orden jerárquico de planes para comparaciones */
export const PLAN_LEVELS: Record<PlanKey, number> = {
  starter: 0,
  pro: 1,
  enterprise: 2,
} as const;

/** Límites por plan */
export const PLAN_LIMITS = {
  starter: { maxUnits: 4, maxOTAs: 0, maxStaff: 2, storageMB: 500 },
  pro: { maxUnits: 14, maxOTAs: 3, maxStaff: 5, storageMB: 5120 },
  enterprise: { maxUnits: 30, maxOTAs: 6, maxStaff: 15, storageMB: 20480 },
};

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
