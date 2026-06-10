// ============================================================================
// ROI CALCULATOR — Pure functions para el simulador de ahorro
//
// Lógica de cálculo separada del componente React para permitir testing
// unitario sin dependencias de UI.
// ============================================================================

export const OTA_COMMISSION_RATE = 0.18; // 18% promedio OTA tradicional
export const PRO_PLAN_COST = 99000; // Plan Pro mensual en COP

export interface ROICalculation {
  totalRevenue: number;
  otaCommission: number;
  hospedaSuiteCost: number;
  netSavings: number;
  commissionRate: number;
  breakEvenBookings: number;
}

/**
 * Calcula el ahorro mensual al usar reservas directas vs OTA tradicional.
 *
 * @param avgNightlyRate - Tarifa promedio por noche en COP
 * @param directBookingsPerMonth - Cantidad de reservas directas por mes
 * @param otaCommissionRate - Tasa de comisión OTA (default: 0.18)
 * @param planCost - Costo mensual del plan HospedaSuite (default: 99000)
 */
export function calculateROI(
  avgNightlyRate: number,
  directBookingsPerMonth: number,
  otaCommissionRate: number = OTA_COMMISSION_RATE,
  planCost: number = PRO_PLAN_COST,
): ROICalculation {
  const totalRevenue = avgNightlyRate * directBookingsPerMonth;
  const otaCommission = Math.round(totalRevenue * otaCommissionRate);
  const netSavings = otaCommission - planCost;

  // Cuántas reservas directas necesitás para que el ahorro sea positivo
  // (otaCommission >= planCost) => bookings >= planCost / (avgNightlyRate * commissionRate)
  const breakEvenBookings =
    avgNightlyRate > 0 && otaCommissionRate > 0
      ? Math.ceil(planCost / (avgNightlyRate * otaCommissionRate))
      : Infinity;

  return {
    totalRevenue,
    otaCommission,
    hospedaSuiteCost: planCost,
    netSavings,
    commissionRate: otaCommissionRate * 100,
    breakEvenBookings,
  };
}

/**
 * Formatea un número como peso colombiano.
 */
export function formatCOP(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);
}
