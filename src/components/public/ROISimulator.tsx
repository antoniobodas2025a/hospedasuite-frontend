'use client';

import React, { useState, useMemo } from 'react';
import { Calculator, ArrowRight, TrendingUp, Info } from 'lucide-react';
import { calculateROI, formatCOP, TRADITIONAL_Channel_RATE, PRO_PLAN_COST } from '@/lib/roi-calculator';

// ============================================================================
// ROI SIMULATOR — Calculadora educativa de ahorro por canal de adquisición
//
// Muestra la fórmula completa para eliminar ambigüedad matemática:
//   Ahorro = (Ingreso Total × 18%) - Costo del Plan
//
// Heurística #1: El usuario siempre ve la base del cálculo.
// Ley de Postel: Sliders suaves, salida matemática explicada.
// ============================================================================

interface ROISimulatorProps {
  onCtaClick?: () => void;
}

export default function ROISimulator({ onCtaClick }: ROISimulatorProps) {
  const [avgNightlyRate, setAvgNightlyRate] = useState(250000);
  const [directBookingsPerMonth, setDirectBookingsPerMonth] = useState(15);

  const savings = useMemo(() => {
    return calculateROI(avgNightlyRate, directBookingsPerMonth);
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
            Compará cuánto cuesta adquirir un cliente por cada canal
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
          <input
            type="range"
            min={80000}
            max={800000}
            step={10000}
            value={avgNightlyRate}
            onChange={(e) => setAvgNightlyRate(Number(e.target.value))}
            className="w-full h-2 bg-[#f5f5f7] rounded-full appearance-none cursor-pointer accent-[#0071e3]"
          />
          <p className="text-2xl font-semibold tracking-tight text-[#1d1d1f] mt-2">
            {formatCOP(avgNightlyRate)}
          </p>
        </div>

        {/* Reservas */}
        <div>
          <label className="block text-[13px] font-semibold text-[#1d1d1f]/60 mb-2 uppercase tracking-wide">
            Reservas / mes
          </label>
          <input
            type="range"
            min={1}
            max={60}
            step={1}
            value={directBookingsPerMonth}
            onChange={(e) => setDirectBookingsPerMonth(Number(e.target.value))}
            className="w-full h-2 bg-[#f5f5f7] rounded-full appearance-none cursor-pointer accent-[#34c759]"
          />
          <p className="text-2xl font-semibold tracking-tight text-[#1d1d1f] mt-2">
            {directBookingsPerMonth} reservas
          </p>
        </div>
      </div>

      {/* ─── INGRESO TChannelL — Heurística #1: base del cálculo visible ─── */}
      <div className="mb-6 px-4 py-3 bg-[#f5f5f7]/50 rounded-[12px] border border-black/[0.04] flex items-center justify-between">
        <span className="text-[13px] text-[#1d1d1f]/50 font-medium">Ingreso total mensual</span>
        <span className="text-[15px] font-semibold text-[#1d1d1f]">{formatCOP(savings.totalRevenue)}</span>
      </div>

      {/* ─── RESULTADOS — 3 canales ─── */}
      <div className="bg-[#f5f5f7] rounded-[20px] p-6 space-y-4 mb-6">
        {/* Canal 1: Canales tradicionales */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[13px] font-semibold text-[#1d1d1f]/40 uppercase tracking-wide">
              Canales tradicionales ({savings.traditionalCommissionRate}%)
            </p>
            <p className="text-[13px] text-[#1d1d1f]/30 mt-0.5">
              Booking, Airbnb, Expedia
            </p>
          </div>
          <p className="text-xl font-semibold text-red-500/80">
            −{formatCOP(savings.traditionalOtaCommission)}
          </p>
        </div>

        <div className="h-px bg-black/[0.06]" />

        {/* Canal 2: Red de Descubrimiento */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[13px] font-semibold text-[#0071e3]/70 uppercase tracking-wide">
              Red de Descubrimiento ({savings.discoveryCommissionRate}%)
            </p>
            <p className="text-[13px] text-[#1d1d1f]/30 mt-0.5">
              Costo por adquisición de cliente nuevo
            </p>
          </div>
          <p className="text-xl font-semibold text-[#0071e3]/70">
            −{formatCOP(savings.hospedaSuiteDiscoveryCost)}
          </p>
        </div>

        <div className="h-px bg-black/[0.06]" />

        {/* Canal 3: Motor Propio (0%) */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[13px] font-semibold text-[#34c759] uppercase tracking-wide">
              Tu Motor Propio (0%)
            </p>
            <p className="text-[13px] text-[#1d1d1f]/40 mt-0.5 leading-snug">
              Tu link personal para WhatsApp, IG y Facebook. Tus clientes reservan directo, <strong className="text-[#34c759]/80">sin que nadie te quite comisión</strong>.
            </p>
            <p className="text-[11px] text-[#1d1d1f]/25 mt-1">
              Solo el plan ({formatCOP(PRO_PLAN_COST)}/mes) — el resto es tuyo.
            </p>
          </div>
          <p className="text-xl font-semibold text-[#34c759]">
            −{formatCOP(savings.ownMotorCost)}
          </p>
        </div>
      </div>

      {/* ─── FÓRMULA EXPLICADA — Ley de Postel: salida matemática clara ─── */}
      <div className="mb-6 px-5 py-4 bg-[#34c759]/[0.06] rounded-[16px] border border-[#34c759]/[0.12]">
        <p className="text-[11px] text-[#34c759]/70 font-semibold uppercase tracking-wider mb-2">
          ¿Cuánto te deja cada reserva?
        </p>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-[13px] text-[#1d1d1f]/50">
            <span className="text-red-500/60">✕</span>
            <span>Con Channel: te quedás con <span className="text-red-500/70 font-semibold">{formatCOP(savings.totalRevenue - savings.traditionalOtaCommission)}</span> de {formatCOP(savings.totalRevenue)}</span>
          </div>
          <div className="flex items-center gap-2 text-[13px] text-[#34c759]">
            <span>✓</span>
            <span>Con tu link: te quedás con <span className="font-bold">{formatCOP(savings.totalRevenue - PRO_PLAN_COST)}</span> de {formatCOP(savings.totalRevenue)}</span>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-[#34c759]/[0.10] flex items-center gap-2 text-[13px] text-[#1d1d1f]/60 font-mono flex-wrap">
          <span className="text-red-500/70 font-semibold">{formatCOP(savings.traditionalOtaCommission)}</span>
          <span>que le das a la Channel</span>
          <span className="text-[#1d1d1f]/25">−</span>
          <span className="text-[#34c759] font-semibold">{formatCOP(PRO_PLAN_COST)}</span>
          <span>tu plan</span>
          <span className="text-[#1d1d1f]/25">=</span>
          <span className="text-[#34c759] font-bold text-[15px]">{formatCOP(savings.netSavings)}</span>
          <span className="text-[#1d1d1f]/40">más en tu bolsillo</span>
        </div>
      </div>

      {/* ─── AHORRO — Fitts's Law: elemento más prominente ─── */}
      <div className="bg-gradient-to-r from-[#34c759]/[0.08] to-[#34c759]/[0.04] rounded-[20px] p-6 border border-[#34c759]/[0.10] text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-[#34c759]/15 flex items-center justify-center">
            <TrendingUp size={18} className="text-[#34c759]" strokeWidth={2.5} />
          </div>
          <p className="text-[14px] font-bold text-[#34c759] uppercase tracking-wider">
            Tu ahorro mensual vs Channels
          </p>
        </div>
        <p className="text-5xl sm:text-6xl font-bold text-[#34c759] tracking-tighter">
          {formatCOP(savings.netSavings)}
        </p>
        {savings.netSavings < 0 && (
          <p className="text-[12px] text-[#1d1d1f]/30 mt-2">
            Con más reservas el ahorro se vuelve positivo. Tu punto de equilibrio: {savings.breakEvenBookings} reservas/mes.
          </p>
        )}
      </div>

      {/* CTA */}
      {onCtaClick && (
        <button
          onClick={onCtaClick}
          className="mt-6 w-full flex items-center justify-center gap-2 text-[#0071e3] text-[14px] font-medium hover:bg-[#0071e3]/5 py-3 rounded-[14px] transition-colors duration-200"
        >
          <span>Empezá a ahorrar hoy</span>
          <ArrowRight size={16} />
        </button>
      )}
    </div>
  );
}
