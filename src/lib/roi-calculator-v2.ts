/**
 * ROI Calculator Logic V2 — Pedagogical Simulator
 * 
 * Calculates the total value of HospedaSuite based on three pillars:
 * 1. Commission Savings (vs Traditional Channels)
 * 2. Regulatory Time Savings (SIRE/TRA automation)
 * 3. Agentic Upselling (Ancillary revenue)
 */

export const TRADITIONAL_CHANNEL_RATE = 0.18; // 18% average commission
export const PRO_PLAN_COST = 99000; // COP per month
export const UPSSELLING_PER_RESERVATION_USD = 40; // $40 USD potential
export const USD_TO_COP = 4000; // Conservative exchange rate
export const UPSSELLING_PER_RESERVATION_COP = UPSSELLING_PER_RESERVATION_USD * USD_TO_COP; // 160,000 COP
export const SIRE_TIME_PER_RESERVATION_MINS = 15;

export interface ROIV2Result {
  totalRevenue: number;
  commissionSavings: number;
  timeSavedMinutes: number;
  timeSavedHours: number;
  upsellingRevenue: number;
  totalValue: number;
}

export function calculateROIV2(
  avgNightlyRate: number,
  reservationsPerMonth: number
): ROIV2Result {
  const totalRevenue = avgNightlyRate * reservationsPerMonth;
  
  // 1. Commission Savings
  const commissionSavings = totalRevenue * TRADITIONAL_CHANNEL_RATE;
  
  // 2. Time Savings (SIRE/TRA)
  const timeSavedMinutes = reservationsPerMonth * SIRE_TIME_PER_RESERVATION_MINS;
  const timeSavedHours = timeSavedMinutes / 60;
  
  // 3. Upselling Revenue
  const upsellingRevenue = reservationsPerMonth * UPSSELLING_PER_RESERVATION_COP;
  
  // Total Value = Savings + Upselling
  // (We don't subtract plan cost here to show "Gross Value Generated", 
  // but we can show Net Value if needed. Prompt asks for "Ahorro + Tiempo + Upselling")
  const totalValue = commissionSavings + upsellingRevenue;

  return {
    totalRevenue,
    commissionSavings,
    timeSavedMinutes,
    timeSavedHours,
    upsellingRevenue,
    totalValue,
  };
}

export function formatCOP(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);
}
