/**
 * Split Payment Calculator
 *
 * Calculates how to divide a payment between hotel and platform,
 * including Wompi fees and tax retentions.
 */

export interface SplitPaymentInput {
  totalAmount: number; // Total de la reserva en COP
  platformPercentage: number; // 8 (porcentaje de la plataforma)
  hotelPercentage: number; // 92 (porcentaje del hotel)
  wompiFeeRate: number; // 0.03 (3% comisión Wompi)
  retentionRate: number; // 0.11 (11% retención en la fuente)
}

export interface SplitPaymentResult {
  // Montos brutos
  hotelGrossAmount: number; // 92% del total
  platformGrossAmount: number; // 8% del total

  // Deducciones
  hotelWompiFee: number; // 3% del monto del hotel
  platformWompiFee: number; // 3% del monto de la plataforma
  retentionOnPlatform: number; // 11% de la comisión de plataforma

  // Montos netos
  hotelNetAmount: number; // Lo que recibe el hotel
  platformNetAmount: number; // Lo que recibe la plataforma

  // Totales
  totalFees: number; // Suma de todas las comisiones
  totalDistributed: number; // hotelNet + platformNet
}

export function calculateSplitPayment(input: SplitPaymentInput): SplitPaymentResult {
  const { totalAmount, platformPercentage, hotelPercentage, wompiFeeRate, retentionRate } = input;

  // Validaciones
  if (totalAmount <= 0) {
    throw new Error('totalAmount must be positive');
  }
  if (platformPercentage + hotelPercentage !== 100) {
    throw new Error('Percentages must sum to 100');
  }

  // Montos brutos
  const hotelGrossAmount = Math.round(totalAmount * (hotelPercentage / 100));
  const platformGrossAmount = Math.round(totalAmount * (platformPercentage / 100));

  // Deducciones
  const hotelWompiFee = Math.round(hotelGrossAmount * wompiFeeRate);
  const platformWompiFee = Math.round(platformGrossAmount * wompiFeeRate);
  const retentionOnPlatform = Math.round(platformGrossAmount * retentionRate);

  // Montos netos
  const hotelNetAmount = hotelGrossAmount - hotelWompiFee;
  const platformNetAmount = platformGrossAmount - platformWompiFee - retentionOnPlatform;

  // Totales
  const totalFees = hotelWompiFee + platformWompiFee + retentionOnPlatform;
  const totalDistributed = hotelNetAmount + platformNetAmount;

  return {
    hotelGrossAmount,
    platformGrossAmount,
    hotelWompiFee,
    platformWompiFee,
    retentionOnPlatform,
    hotelNetAmount,
    platformNetAmount,
    totalFees,
    totalDistributed,
  };
}

/**
 * Calcula la comisión de un partner (vendedor/aliado)
 */
export interface PartnerCommissionInput {
  baseAmount: number; // Monto base (suscripción o reserva)
  commissionType: 'subscription' | 'reservation';
  subscriptionRate: number; // 0.20 (20% para suscripción)
  reservationRate: number; // 0.03 (3% para reserva)
  clawbackDays: number; // 90 días
}

export interface PartnerCommissionResult {
  commissionAmount: number;
  commissionRate: number;
  clawbackDeadline: Date;
  type: 'subscription' | 'reservation';
}

export function calculatePartnerCommission(
  input: PartnerCommissionInput
): PartnerCommissionResult {
  const { baseAmount, commissionType, subscriptionRate, reservationRate, clawbackDays } = input;

  if (baseAmount <= 0) {
    throw new Error('baseAmount must be positive');
  }

  const commissionRate = commissionType === 'subscription' ? subscriptionRate : reservationRate;
  const commissionAmount = Math.round(baseAmount * commissionRate);

  const clawbackDeadline = new Date();
  clawbackDeadline.setDate(clawbackDeadline.getDate() + clawbackDays);

  return {
    commissionAmount,
    commissionRate,
    clawbackDeadline,
    type: commissionType,
  };
}
