/**
 * 🧪 Lógica de Trial — Verificación de período de prueba
 *
 * Centraliza todas las reglas relacionadas con el trial de 30 días.
 * Esto evita que un hotel esté en "trial eterno" sin pagar.
 */

import { SAAS_PLANS, normalizePlan, type PlanKey } from '@/config/saas-plans';

export interface TrialHotel {
  subscription_status?: string | null;
  subscription_plan?: string | null;
  trial_ends_at?: string | null;
}

/**
 * ¿El trial está activo ahora?
 *
 * Un trial está activo solo si:
 * 1. El status es 'trialing'
 * 2. trial_ends_at existe y es una fecha futura
 */
export function isTrialActive(hotel: TrialHotel): boolean {
  if (hotel.subscription_status !== 'trialing') return false;
  if (!hotel.trial_ends_at) return false;

  const trialEnd = new Date(hotel.trial_ends_at);
  if (isNaN(trialEnd.getTime())) return false; // fecha inválida

  return trialEnd > new Date();
}

/**
 * ¿El trial ya expiró?
 */
export function isTrialExpired(hotel: TrialHotel): boolean {
  if (hotel.subscription_status !== 'trialing') return false;
  if (!hotel.trial_ends_at) return false;

  const trialEnd = new Date(hotel.trial_ends_at);
  if (isNaN(trialEnd.getTime())) return false;

  return trialEnd <= new Date();
}

/**
 * ¿Cuántos días quedan de trial?
 * Retorna null si no está en trial.
 */
export function daysRemainingInTrial(hotel: TrialHotel): number | null {
  if (!isTrialActive(hotel)) return null;

  const now = new Date();
  const trialEnd = new Date(hotel.trial_ends_at!);
  const diffMs = trialEnd.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  return Math.max(0, diffDays);
}

/**
 * ¿Cuánto cuesta el plan para este hotel AHORA?
 *
 * Si está en trial → $0
 * Si no → precio del plan según saas-plans.ts
 */
export function getEffectivePlanCost(hotel: TrialHotel): number {
  if (isTrialActive(hotel)) return 0;

  const planKey = normalizePlan(hotel.subscription_plan);
  return SAAS_PLANS[planKey].priceCOP;
}

/**
 * Fecha formateada de fin de trial para mostrar en UI.
 * Retorna null si no aplica.
 */
export function getTrialEndDateDisplay(hotel: TrialHotel): string | null {
  if (!hotel.trial_ends_at) return null;

  const trialEnd = new Date(hotel.trial_ends_at);
  if (isNaN(trialEnd.getTime())) return null;

  return trialEnd.toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
