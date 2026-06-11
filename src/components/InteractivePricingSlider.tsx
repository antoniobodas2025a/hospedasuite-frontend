'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { ArrowRight, Check, ShieldCheck, TrendingUp } from 'lucide-react';

// ============================================================================
// INTERACTIVE PRICING SLIDER — Physics-based room gating with progressive disclosure
//
// Replaces the static 4-column layout. User slides to select room count,
// and the system dynamically reveals the correct plan, price, and features.
// Enforces strict room-gating invariants:
//   1 room → Free ($0)
//   2-4 rooms → Starter ($49.000)
//   5-14 rooms → Pro ($99.000)
//   15-30 rooms → Enterprise ($199.000)
// ============================================================================

export interface TierConfig {
  id: string;
  label: string;
  price: number;
  priceDisplay: string;
  rooms: string;
  minRooms: number;
  maxRooms: number;
  features: string[];
  badge?: string;
  badgeColor?: string;
}

const TIERS: TierConfig[] = [
  {
    id: 'free',
    label: 'Free',
    price: 0,
    priceDisplay: 'Gratis',
    rooms: '1 habitación',
    minRooms: 1,
    maxRooms: 1,
    features: [
      'PMS Core completo',
      '1 habitación activa',
      'Link Directo (WhatsApp + Wompi)',
      'Motor de reservas bilingüe (ES/EN)',
      'Gratis para siempre (1 habitación)',
    ],
    badge: 'Sin Tarjeta',
    badgeColor: '#0071e3',
  },
  {
    id: 'starter',
    label: 'Starter',
    price: 49000,
    priceDisplay: '49.000',
    rooms: '1-4 habitaciones',
    minRooms: 2,
    maxRooms: 4,
    features: [
      'Todo lo de Free',
      'Hasta 4 habitaciones',
      'Link Directo (WhatsApp + Wompi)',
      'Motor de reservas bilingüe (ES/EN)',
      'Reviews moderadas',
    ],
  },
  {
    id: 'pro',
    label: 'Pro',
    price: 99000,
    priceDisplay: '99.000',
    rooms: '5-14 habitaciones',
    minRooms: 5,
    maxRooms: 14,
    features: [
      'Todo lo de Starter',
      'Channel Manager (3 canales)',
      'Carta Digital QR',
      'POS (Punto de Venta)',
      'Libro Registro Forense',
    ],
    badge: 'Más Popular',
    badgeColor: '#34c759',
  },
  {
    id: 'enterprise',
    label: 'Enterprise',
    price: 199000,
    priceDisplay: '199.000',
    rooms: '15-30 habitaciones',
    minRooms: 15,
    maxRooms: 30,
    features: [
      'Todo lo de Pro',
      'Hasta 30 habitaciones',
      '6 canales conectados',
      '15 cuentas de staff',
      'Soporte prioritario',
    ],
  },
];

function getTierForRooms(rooms: number): TierConfig {
  if (rooms <= 1) return TIERS[0];
  if (rooms <= 4) return TIERS[1];
  if (rooms <= 14) return TIERS[2];
  return TIERS[3];
}

function formatCOP(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);
}

interface InteractivePricingSliderProps {
  onCtaClick: (tierId: string, roomCount: number) => void;
}

export default function InteractivePricingSlider({ onCtaClick }: InteractivePricingSliderProps) {
  const [roomCount, setRoomCount] = useState(2); // S1: Default to Starter (2 rooms)
  const [isSliding, setIsSliding] = useState(false);

  const tier = useMemo(() => getTierForRooms(roomCount), [roomCount]);

  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setRoomCount(Number(e.target.value));
  }, []);

  const handlePointerDown = () => setIsSliding(true);
  const handlePointerUp = () => setIsSliding(false);

  // Visual segment markers for the slider track
  const segments = [
    { label: 'Free', range: [1, 1], color: '#0071e3' },
    { label: 'Starter', range: [2, 4], color: '#1d1d1f' },
    { label: 'Pro', range: [5, 14], color: '#34c759' },
    { label: 'Enterprise', range: [15, 30], color: '#8e8e93' },
  ];

  return (
    <div className="bg-[#f5f5f7] rounded-[28px] p-8 sm:p-12 md:p-16 shadow-inner border border-white/50 relative overflow-hidden">
      {/* Background blur */}
      <div className="absolute top-0 right-0 p-32 bg-white/40 blur-3xl rounded-full pointer-events-none" />

      <div className="relative z-10">
        {/* Header */}
        <div className="text-center mb-10">
          <h3 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[#1d1d1f] mb-3">
            ¿Cuántas habitaciones tenés?
          </h3>
          <p className="text-[17px] text-[#1d1d1f]/50">
            Mové el control y mirá cómo se adapta tu plan automáticamente.
          </p>
        </div>

        {/* Slider Control */}
        <div className="mb-12 px-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[13px] text-[#1d1d1f]/40 font-semibold uppercase tracking-wide">1</span>
            <span className="text-[13px] text-[#1d1d1f]/40 font-semibold uppercase tracking-wide">30</span>
          </div>
          <input
            type="range"
            min={1}
            max={30}
            step={1}
            value={roomCount}
            onChange={handleSliderChange}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            className="w-full h-3 bg-white rounded-full appearance-none cursor-pointer accent-[#0071e3] shadow-[inset_0_1px_3px_rgba(0,0,0,0.08)]"
            style={{
              background: `linear-gradient(to right, #0071e3 0%, #0071e3 ${((roomCount - 1) / 29) * 100}%, white ${((roomCount - 1) / 29) * 100}%, white 100%)`,
            }}
          />
          {/* Segment labels */}
          <div className="flex justify-between mt-3 px-1">
            {segments.map((seg) => (
              <div
                key={seg.label}
                className={`text-[11px] font-semibold transition-colors duration-200 ${
                  roomCount >= seg.range[0] && roomCount <= seg.range[1]
                    ? 'text-[#1d1d1f]'
                    : 'text-[#1d1d1f]/25'
                }`}
                style={{ color: roomCount >= seg.range[0] && roomCount <= seg.range[1] ? seg.color : undefined }}
              >
                {seg.label}
              </div>
            ))}
          </div>
        </div>

        {/* Dynamic Room Count Display */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 px-6 py-3 bg-white rounded-full shadow-sm border border-black/[0.04]">
            <span className="text-[13px] text-[#1d1d1f]/40 font-semibold uppercase tracking-wide">Habitaciones:</span>
            <span className="text-2xl font-bold text-[#1d1d1f]">{roomCount}</span>
          </div>
        </div>

        {/* Plan Card — Progressive Disclosure */}
        <div
          className={`bg-white rounded-[24px] p-8 sm:p-10 border-2 transition-all duration-300 ${
            isSliding ? 'scale-[0.98] opacity-90' : 'scale-100 opacity-100'
          } ${tier.badgeColor ? '' : 'border-black/[0.04] shadow-[0_2px_12px_rgba(0,0,0,0.04)]'}`}
          style={tier.badgeColor ? { borderColor: tier.badgeColor } : {}}
        >
          {/* Badge */}
          {tier.badge && (
            <div className="inline-flex items-center gap-2 text-white px-3 py-1 rounded-full mb-6 shadow-sm" style={{ backgroundColor: tier.badgeColor }}>
              <span className="text-[11px] font-bold tracking-wide uppercase">{tier.badge}</span>
            </div>
          )}

          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-10">
            {/* Left — Features */}
            <div className="flex-1">
              <h4 className="text-3xl font-semibold mb-2 tracking-tight text-[#1d1d1f]">{tier.label}</h4>
              <p className="text-[13px] text-[#0071e3] font-semibold mb-3">{tier.rooms}</p>
              <p className="text-[17px] text-[#1d1d1f]/50 mb-8 font-medium">
                {tier.id === 'free'
                  ? 'Probá el PMS con 1 habitación. Sin tarjeta, sin compromiso.'
                  : tier.id === 'starter'
                  ? 'Ideal para arrancar con lo esencial. 1 mes gratis.'
                  : tier.id === 'pro'
                  ? 'El estándar para hoteles boutique. Todo lo esencial + más.'
                  : 'Para hoteles que necesitan más capacidad y soporte.'}
              </p>

              <div className="h-px bg-black/[0.06] w-full mb-8" />

              <ul className="space-y-3">
                {tier.features.map((feat, i) => (
                  <li key={i} className="flex items-center gap-3 text-[15px] text-[#1d1d1f]/70">
                    <div className="w-5 h-5 rounded-full bg-[#34c759]/15 flex items-center justify-center flex-shrink-0">
                      <Check size={12} className="text-[#34c759]" strokeWidth={3} />
                    </div>
                    <span className="font-medium">{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Right — Price + CTA */}
            <div className="md:text-right flex flex-col md:items-end">
              {tier.price === 0 ? (
                <div className="mb-1">
                  <span className="text-5xl sm:text-6xl font-semibold tracking-tighter text-[#34c759]">Gratis</span>
                </div>
              ) : (
                <div className="flex items-start gap-1 mb-1">
                  <span className="text-xl font-normal text-[#1d1d1f]/30 mt-2">$</span>
                  <span className="text-5xl sm:text-6xl font-semibold tracking-tighter text-[#1d1d1f]">{tier.priceDisplay}</span>
                </div>
              )}
              <p className="text-[13px] text-[#1d1d1f]/30 mb-8 font-medium">
                {tier.price === 0 ? 'Para siempre. Sin tarjeta.' : 'COP / mes (después del mes gratis)'}
              </p>

              <button
                onClick={() => onCtaClick(tier.id, roomCount)}
                className="w-full md:w-auto bg-[#1d1d1f] text-white px-8 py-4 rounded-full font-semibold text-[15px] hover:bg-black transition-all duration-200 shadow-[0_4px_16px_rgba(0,0,0,0.12)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.16)] hover:-translate-y-0.5 active:scale-[0.97] flex items-center justify-center gap-2"
              >
                Empezar Gratis
                <ArrowRight size={16} className="text-white/50" />
              </button>

              <div className="mt-4 flex items-center gap-2 text-[13px] text-[#1d1d1f]/40 font-medium justify-end w-full">
                <ShieldCheck size={16} className="text-[#34c759]" />
                Cancelá en cualquier momento
              </div>
            </div>
          </div>
        </div>

        {/* Transparency Block */}
        <div className="mt-8 bg-[#0071e3]/[0.04] border border-[#0071e3]/[0.08] rounded-[20px] p-6">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp size={18} className="text-[#0071e3]" />
            <p className="text-[14px] font-semibold text-[#1d1d1f]">Transparencia en Comisiones</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
            <div className="bg-white rounded-[12px] p-3 border border-black/[0.04]">
              <p className="text-[11px] text-[#1d1d1f]/40 font-semibold uppercase">Tu Motor Propio</p>
              <p className="text-2xl font-bold text-[#34c759]">0%</p>
            </div>
            <div className="bg-white rounded-[12px] p-3 border border-[#0071e3]/[0.12]">
              <p className="text-[11px] text-[#0071e3] font-semibold uppercase">Motor de Reservas</p>
              <p className="text-2xl font-bold text-[#0071e3]">10%</p>
            </div>
            <div className="bg-white rounded-[12px] p-3 border border-black/[0.04] opacity-60">
              <p className="text-[11px] text-[#1d1d1f]/40 font-semibold uppercase">Intermediarios tradicionales</p>
              <p className="text-2xl font-bold text-[#1d1d1f]/40">15-25%</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
