import { describe, it, expect } from 'vitest';
import {
  calculateSplitPayment,
  calculatePartnerCommission,
} from '../split-payment-calculator';

describe('calculateSplitPayment', () => {
  it('calcula split correcto para reserva de $100.000', () => {
    const result = calculateSplitPayment({
      totalAmount: 100000,
      platformPercentage: 8,
      hotelPercentage: 92,
      wompiFeeRate: 0.03,
      retentionRate: 0.11,
    });

    expect(result.hotelGrossAmount).toBe(92000);
    expect(result.platformGrossAmount).toBe(8000);
    expect(result.hotelWompiFee).toBe(2760);
    expect(result.platformWompiFee).toBe(240);
    expect(result.retentionOnPlatform).toBe(880);
    expect(result.hotelNetAmount).toBe(89240);
    expect(result.platformNetAmount).toBe(6880);
  });

  it('lanza error si totalAmount es 0', () => {
    expect(() =>
      calculateSplitPayment({
        totalAmount: 0,
        platformPercentage: 8,
        hotelPercentage: 92,
        wompiFeeRate: 0.03,
        retentionRate: 0.11,
      })
    ).toThrow('totalAmount must be positive');
  });

  it('lanza error si totalAmount es negativo', () => {
    expect(() =>
      calculateSplitPayment({
        totalAmount: -50000,
        platformPercentage: 8,
        hotelPercentage: 92,
        wompiFeeRate: 0.03,
        retentionRate: 0.11,
      })
    ).toThrow('totalAmount must be positive');
  });

  it('lanza error si porcentajes no suman 100', () => {
    expect(() =>
      calculateSplitPayment({
        totalAmount: 100000,
        platformPercentage: 10,
        hotelPercentage: 92,
        wompiFeeRate: 0.03,
        retentionRate: 0.11,
      })
    ).toThrow('Percentages must sum to 100');
  });

  it('maneja montos grandes correctamente', () => {
    const result = calculateSplitPayment({
      totalAmount: 10000000, // 10 millones
      platformPercentage: 8,
      hotelPercentage: 92,
      wompiFeeRate: 0.03,
      retentionRate: 0.11,
    });

    expect(result.hotelNetAmount + result.platformNetAmount + result.totalFees).toBe(10000000);
  });

  it('calcula totalFees correctamente', () => {
    const result = calculateSplitPayment({
      totalAmount: 100000,
      platformPercentage: 8,
      hotelPercentage: 92,
      wompiFeeRate: 0.03,
      retentionRate: 0.11,
    });

    const expectedTotalFees =
      result.hotelWompiFee + result.platformWompiFee + result.retentionOnPlatform;
    expect(result.totalFees).toBe(expectedTotalFees);
  });

  it('calcula totalDistributed correctamente', () => {
    const result = calculateSplitPayment({
      totalAmount: 100000,
      platformPercentage: 8,
      hotelPercentage: 92,
      wompiFeeRate: 0.03,
      retentionRate: 0.11,
    });

    expect(result.totalDistributed).toBe(result.hotelNetAmount + result.platformNetAmount);
  });

  it('verifica que totalDistributed + totalFees = totalAmount', () => {
    const result = calculateSplitPayment({
      totalAmount: 250000,
      platformPercentage: 8,
      hotelPercentage: 92,
      wompiFeeRate: 0.03,
      retentionRate: 0.11,
    });

    expect(result.totalDistributed + result.totalFees).toBe(250000);
  });
});

describe('calculatePartnerCommission', () => {
  it('calcula comisión de suscripción (20%)', () => {
    const result = calculatePartnerCommission({
      baseAmount: 99000,
      commissionType: 'subscription',
      subscriptionRate: 0.2,
      reservationRate: 0.03,
      clawbackDays: 90,
    });

    expect(result.commissionAmount).toBe(19800);
    expect(result.commissionRate).toBe(0.2);
    expect(result.type).toBe('subscription');
  });

  it('calcula comisión de reserva (3%)', () => {
    const result = calculatePartnerCommission({
      baseAmount: 8000, // 8% de 100000
      commissionType: 'reservation',
      subscriptionRate: 0.2,
      reservationRate: 0.03,
      clawbackDays: 90,
    });

    expect(result.commissionAmount).toBe(240);
    expect(result.commissionRate).toBe(0.03);
    expect(result.type).toBe('reservation');
  });

  it('calcula clawback deadline correcto', () => {
    const result = calculatePartnerCommission({
      baseAmount: 99000,
      commissionType: 'subscription',
      subscriptionRate: 0.2,
      reservationRate: 0.03,
      clawbackDays: 90,
    });

    const expectedDeadline = new Date();
    expectedDeadline.setDate(expectedDeadline.getDate() + 90);

    expect(result.clawbackDeadline.toDateString()).toBe(expectedDeadline.toDateString());
  });

  it('lanza error si baseAmount es 0', () => {
    expect(() =>
      calculatePartnerCommission({
        baseAmount: 0,
        commissionType: 'subscription',
        subscriptionRate: 0.2,
        reservationRate: 0.03,
        clawbackDays: 90,
      })
    ).toThrow('baseAmount must be positive');
  });

  it('lanza error si baseAmount es negativo', () => {
    expect(() =>
      calculatePartnerCommission({
        baseAmount: -10000,
        commissionType: 'reservation',
        subscriptionRate: 0.2,
        reservationRate: 0.03,
        clawbackDays: 90,
      })
    ).toThrow('baseAmount must be positive');
  });

  it('maneja montos grandes correctamente', () => {
    const result = calculatePartnerCommission({
      baseAmount: 10000000, // 10 millones
      commissionType: 'subscription',
      subscriptionRate: 0.2,
      reservationRate: 0.03,
      clawbackDays: 90,
    });

    expect(result.commissionAmount).toBe(2000000);
  });
});
