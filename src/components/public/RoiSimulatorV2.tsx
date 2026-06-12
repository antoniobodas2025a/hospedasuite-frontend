'use client';

import React, { useState, useMemo } from 'react';
import { Shield, Clock, TrendingUp, Calculator, ArrowRight } from 'lucide-react';
import { calculateROIV2, formatCOP } from '@/lib/roi-calculator-v2';

// ============================================================================
// ROI SIMULATOR V2 — Pedagogical Simulator
//
// Consolidates value equation:
// (Commission Savings) + (SIRE/TRA Time Saved) + ($40 USD Upselling)
//
// Ley de Hick: Atomic interaction, no manual math.
// ============================================================================

interface RoiSimulatorV2Props {
  onCtaClick?: () => void;
}

export default function RoiSimulatorV2({ onCtaClick }: RoiSimulatorV2Props) {
  const [reservations, setReservations] = useState(10);
  const [avgRate, setAvgRate] = useState(250000);

  const roi = useMemo(() => calculateROIV2(avgRate, reservations), [avgRate, reservations]);

  return (
    <div className="bg-white rounded-[28px] p-8 sm:p-10 shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-black/[0.04] relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-[14px] bg-[#f5f5f7] flex items-center justify-center">
          <Calculator size={20} className="text-[#1d1d1f]" strokeWidth={1.5} />
        </div>
        <div>
          <h3 className="text-lg font-semibold tracking-tight text-[#1d1d1f]">
            Calculadora de Rentabilidad Total
          </h3>
          <p className="text-[13px] text-[#1d1d1f]/40 font-medium">
            Descubrí cuánto valor real genera tu Motor Propio
          </p>
        </div>
      </div>

      {/* Input */}
      <div className="mb-8">
        <label className="block text-[13px] font-semibold text-[#1d1d1f]/60 mb-2 uppercase tracking-wide">
          Reservas por mes
        </label>
        <input
          type="range"
          min={1}
          max={60}
          step={1}
          value={reservations}
          onChange={(e) => setReservations(Number(e.target.value))}
          className="w-full h-2 bg-[#f5f5f7] rounded-full appearance-none cursor-pointer accent-[#0071e3]"
        />
        <p className="text-3xl font-semibold tracking-tight text-[#1d1d1f] mt-2">
          {reservations} reservas
        </p>
      </div>

      {/* Results Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {/* Commission Savings */}
        <div className="bg-[#f5f5f7] rounded-[20px] p-5 flex flex-col items-center text-center">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mb-3">
            <TrendingUp size={20} className="text-green-600" />
          </div>
          <p className="text-[11px] font-bold text-[#1d1d1f]/40 uppercase tracking-wide mb-1">
            Ahorro en Comisiones
          </p>
          <p className="text-xl font-bold text-green-600">
            {formatCOP(roi.commissionSavings)}
          </p>
        </div>

        {/* Time Savings */}
        <div className="bg-[#f5f5f7] rounded-[20px] p-5 flex flex-col items-center text-center">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mb-3">
            <Clock size={20} className="text-blue-600" />
          </div>
          <p className="text-[11px] font-bold text-[#1d1d1f]/40 uppercase tracking-wide mb-1">
            Tiempo SIRE Recuperado
          </p>
          <p className="text-xl font-bold text-blue-600">
            {roi.timeSavedHours.toFixed(1)} horas
          </p>
        </div>

        {/* Upselling */}
        <div className="bg-[#f5f5f7] rounded-[20px] p-5 flex flex-col items-center text-center">
          <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center mb-3">
            <Shield size={20} className="text-purple-600" />
          </div>
          <p className="text-[11px] font-bold text-[#1d1d1f]/40 uppercase tracking-wide mb-1">
            Ingresos Extra (Upselling)
          </p>
          <p className="text-xl font-bold text-purple-600">
            {formatCOP(roi.upsellingRevenue)}
          </p>
        </div>
      </div>

      {/* Total Value */}
      <div className="bg-gradient-to-r from-[#0071e3]/[0.08] to-[#0071e3]/[0.04] rounded-[20px] p-6 border border-[#0071e3]/[0.10] text-center mb-6">
        <p className="text-[13px] font-bold text-[#0071e3] uppercase tracking-wider mb-2">
          Valor Total Generado por Mes
        </p>
        <p className="text-5xl sm:text-6xl font-bold text-[#0071e3] tracking-tighter">
          {formatCOP(roi.totalValue)}
        </p>
        <p className="text-[12px] text-[#1d1d1f]/40 mt-2">
          Sin contar el costo de tu plan ({formatCOP(99000)}/mes)
        </p>
      </div>

      {/* CTA */}
      {onCtaClick && (
        <button
          onClick={onCtaClick}
          className="w-full flex items-center justify-center gap-2 text-[#0071e3] text-[14px] font-medium hover:bg-[#0071e3]/5 py-3 rounded-[14px] transition-colors duration-200"
        >
          <span>Activar mi Escudo Regulatorio</span>
          <ArrowRight size={16} />
        </button>
      )}
    </div>
  );
}
