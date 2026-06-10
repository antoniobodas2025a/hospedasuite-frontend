'use client';

import React, { useState, useMemo } from 'react';
import { Calculator, ArrowRight, TrendingUp } from 'lucide-react';
import { calculateROI, formatCOP, OTA_COMMISSION_RATE, PRO_PLAN_COST } from '@/lib/roi-calculator';

// ============================================================================
// ROI SIMULATOR — Calculadora de ahorro por reservas directas
//
// Muestra cuánto ahorra el hotelero al recibir reservas por WhatsApp
// con Link Directo (0% comisión) vs recibir las mismas reservas por una OTA
// tradicional (15-20% comisión).
// ============================================================================

export default function ROISimulator() {
  const [avgNightlyRate, setAvgNightlyRate] = useState(250000);
  const [directBookingsPerMonth, setDirectBookingsPerMonth] = useState(15);

  const savings = useMemo(() => {
    const totalRevenue = avgNightlyRate * directBookingsPerMonth;
    const otaCommission = totalRevenue * OTA_COMMISSION_RATE;
    const hospedaSuiteCost = 99000; // Plan Pro
    const netSavings = otaCommission - hospedaSuiteCost;
    return {
      totalRevenue,
      otaCommission,
      hospedaSuiteCost,
      netSavings,
      commissionRate: OTA_COMMISSION_RATE * 100,
    };
  }, [avgNightlyRate, directBookingsPerMonth]);

  return (
    <div className="bg-white rounded-[28px] p-8 sm:p-10 shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-black/[0.04] relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-[14px] bg-[#f5f5f7] flex items-center justify-center">
          <Calculator size={20} className="text-[#1d1d1f]" strokeWidth={1.5} />
        </div>
        <div>
          <h3 className="text-lg font-semibold tracking-tight text-[#1d1d1f]">
            Calculadora de Ahorro
          </h3>
          <p className="text-[13px] text-[#1d1d1f]/40 font-medium">
            Cuánto dejás de pagar con reservas directas
          </p>
        </div>
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
        {/* Tarifa promedio */}
        <div>
          <label className="block text-[13px] font-semibold text-[#1d1d1f]/60 mb-2 uppercase tracking-wide">
            Tarifa promedio por noche
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#1d1d1f]/30 text-sm font-medium">$</span>
            <input
              type="range"
              min={80000}
              max={800000}
              step={10000}
              value={avgNightlyRate}
              onChange={(e) => setAvgNightlyRate(Number(e.target.value))}
              className="w-full h-2 bg-[#f5f5f7] rounded-full appearance-none cursor-pointer accent-[#0071e3]"
            />
          </div>
          <p className="text-2xl font-semibold tracking-tight text-[#1d1d1f] mt-2">
            {formatCOP(avgNightlyRate)}
          </p>
        </div>

        {/* Reservas directas */}
        <div>
          <label className="block text-[13px] font-semibold text-[#1d1d1f]/60 mb-2 uppercase tracking-wide">
            Reservas directas / mes
          </label>
          <div className="relative">
            <input
              type="range"
              min={1}
              max={60}
              step={1}
              value={directBookingsPerMonth}
              onChange={(e) => setDirectBookingsPerMonth(Number(e.target.value))}
              className="w-full h-2 bg-[#f5f5f7] rounded-full appearance-none cursor-pointer accent-[#34c759]"
            />
          </div>
          <p className="text-2xl font-semibold tracking-tight text-[#1d1d1f] mt-2">
            {directBookingsPerMonth} reservas
          </p>
        </div>
      </div>

      {/* Results */}
      <div className="bg-[#f5f5f7] rounded-[20px] p-6 space-y-4">
        {/* OTA Scenario */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[13px] font-semibold text-[#1d1d1f]/40 uppercase tracking-wide">
              Con OTA tradicional ({savings.commissionRate}% comisión)
            </p>
            <p className="text-[13px] text-[#1d1d1f]/30 mt-0.5">
                {formatCOP(savings.totalRevenue)} en reservas × {savings.commissionRate}%
            </p>
          </div>
          <p className="text-xl font-semibold text-red-500/80">
            −{formatCOP(savings.otaCommission)}
          </p>
        </div>

        <div className="h-px bg-black/[0.06]" />

        {/* HospedaSuite Scenario */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[13px] font-semibold text-[#1d1d1f]/40 uppercase tracking-wide">
              Con HospedaSuite (0% comisión)
            </p>
            <p className="text-[13px] text-[#1d1d1f]/30 mt-0.5">
              Solo el costo del plan Pro
            </p>
          </div>
          <p className="text-xl font-semibold text-[#1d1d1f]/60">
            −{formatCOP(savings.hospedaSuiteCost)}
          </p>
        </div>

        <div className="h-px bg-black/[0.06]" />

        {/* Net Savings */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-[#34c759]/15 flex items-center justify-center">
              <TrendingUp size={14} className="text-[#34c759]" strokeWidth={2.5} />
            </div>
            <p className="text-[13px] font-bold text-[#34c759] uppercase tracking-wide">
              Tu ahorro mensual
            </p>
          </div>
          <p className="text-2xl font-semibold text-[#34c759] tracking-tight">
            {formatCOP(savings.netSavings)}
          </p>
        </div>
      </div>

      {/* CTA */}
      <div className="mt-6 flex items-center justify-center gap-2 text-[#0071e3] text-[14px] font-medium">
        <span>Empezá a ahorrar hoy</span>
        <ArrowRight size={16} />
      </div>
    </div>
  );
}
