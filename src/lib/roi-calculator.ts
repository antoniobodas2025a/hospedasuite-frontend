// ============================================================================
// ROI CALCULATOR — Pure functions para el simulador de ahorro
//
// Lógica de cálculo separada del componente React para permitir testing
// unitario sin dependencias de UI.
// ============================================================================

// Constantes declaradas — Soberanía del Dato
export const TRADITIONAL_OTA_RATE = 0.18; // 18% promedio OTA tradicional (Booking, Airbnb)
export const HOSPEDASUITE_DISCOVERY_RATE = 0.10; // 10% Red de Descubrimiento (costo de adquisición)
export const OWN_MOTOR_RATE = 0.0; // 0% Motor Propio (WhatsApp, IG, FB)
export const PRO_PLAN_COST = 99000; // Plan Pro mensual en COP

// Backwards compatibility aliases
export const OTA_COMMISSION_RATE = TRADITIONAL_OTA_RATE;

export interface ROICalculation {
  totalRevenue: number;
  traditionalOtaCommission: number;
  hospedaSuiteDiscoveryCost: number;
  ownMotorCost: number;
  netSavings: number;
  traditionalCommissionRate: number;
  discoveryCommissionRate: number;
  breakEvenBookings: number;
}

/**
 * Calcula el ahorro mensual al usar Motor Propio (0%) vs OTA tradicional.
 *
 * @param avgNightlyRate - Tarifa promedio por noche en COP
 * @param directBookingsPerMonth - Cantidad de reservas directas por mes
 * @param traditionalOtaRate - Tasa OTA tradicional (default: 0.18)
 * @param discoveryRate - Tasa Red de Descubrimiento (default: 0.10)
 * @param planCost - Costo mensual del plan HospedaSuite (default: 99000)
 */
export function calculateROI(
  avgNightlyRate: number,
  directBookingsPerMonth: number,
  traditionalOtaRate: number = TRADITIONAL_OTA_RATE,
  discoveryRate: number = HOSPEDASUITE_DISCOVERY_RATE,
  planCost: number = PRO_PLAN_COST,
): ROICalculation {
  const totalRevenue = avgNightlyRate * directBookingsPerMonth;
  const traditionalOtaCommission = Math.round(totalRevenue * traditionalOtaRate);
  const hospedaSuiteDiscoveryCost = Math.round(totalRevenue * discoveryRate);
  const ownMotorCost = planCost; // Solo costo del plan, 0% comisión
  const netSavings = traditionalOtaCommission - planCost;

  const breakEvenBookings =
    avgNightlyRate > 0 && traditionalOtaRate > 0
      ? Math.ceil(planCost / (avgNightlyRate * traditionalOtaRate))
      : Infinity;

  return {
    totalRevenue,
    traditionalOtaCommission,
    hospedaSuiteDiscoveryCost,
    ownMotorCost,
    netSavings,
    traditionalCommissionRate: traditionalOtaRate * 100,
    discoveryCommissionRate: discoveryRate * 100,
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
