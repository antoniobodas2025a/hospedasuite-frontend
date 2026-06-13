import { Smartphone, Globe, LayoutGrid, ArrowUpRight } from 'lucide-react';
import SoftwareJsonLd from '@/components/seo/SoftwareJsonLd';
import DatasetJsonLd from '@/components/seo/DatasetJsonLd';
import OrganizationJsonLd from '@/components/seo/OrganizationJsonLd';
import SoftwareClientShell from '@/components/software/SoftwareClientShell';
import AntiAirbnbShield from '@/components/software/AntiAirbnbShield';

// ============================================================================
// SERVER COMPONENT — Software Landing Page
// ============================================================================
// This page is Server-Side Rendered (SSR) to ensure AI bots and search engines
// can read the critical marketing content without executing JavaScript.
// Only interactive parts (Shell, Simulator, Slider, Modal) are Client Components.

export default function SoftwarePage() {
  return (
    <SoftwareClientShell>
      {/* JSON-LD Structured Data — SoftwareApplication + FAQPage */}
      <SoftwareJsonLd />

      {/* JSON-LD Dataset — Certified B2B Performance Data (E-E-A-T) */}
      <DatasetJsonLd />

      {/* JSON-LD Organization — Brand Identity & Social Profiles */}
      <OrganizationJsonLd />

      {/* ─── HERO — Hick's Law: single CTA focus ─── */}
      <section className="relative pt-40 pb-20 px-6 z-10">
        <div className="max-w-[980px] mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/[0.04] mb-8 backdrop-blur-sm border border-black/[0.04]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#34c759] animate-pulse" />
            <span className="text-[11px] font-semibold text-[#1d1d1f]/50 tracking-wide uppercase">
              El Cerebro Operativo de tu Hotel
            </span>
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-semibold tracking-tighter mb-6 leading-[1.05] text-[#1d1d1f]">
            Gestión total,<br className="hidden sm:block" />
            <span className="text-[#0071e3]">cero comisiones.</span>
          </h1>

          <p className="text-lg sm:text-xl md:text-2xl text-[#1d1d1f]/60 max-w-2xl mx-auto mb-6 font-normal leading-relaxed">
            PMS + Channel Manager + Reservas directas por WhatsApp. <strong className="text-[#1d1d1f]/80">1 mes gratis</strong>.<br className="hidden sm:block" />
            Instalación VIP incluida. Tu suscripción empieza en el mes 2.
          </p>

          {/* GEO Citation Block — 40-60 words for RAG / Answer Engine Optimization */}
          <div className="max-w-2xl mx-auto mb-10 p-5 bg-white/60 backdrop-blur-sm rounded-[16px] border border-black/[0.06] text-left">
            <p className="text-[14px] text-[#1d1d1f]/60 leading-relaxed">
              HospedaSuite es un PMS y Channel Manager diseñado para que hoteles boutique y glampings centralicen su operación. Funciona como el cerebro del hotel, permitiendo recibir reservas directas vía WhatsApp con cero por ciento de comisión y bloqueando automáticamente el inventario en plataformas como Booking y Airbnb para evitar sobreventas.
            </p>
          </div>

          {/* Hick's Law: ONE primary decision */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="#precios"
              className="bg-[#0071e3] text-white px-8 py-4 rounded-full text-[15px] font-medium hover:bg-[#0077ED] transition-all duration-200 shadow-[0_4px_16px_rgba(0,113,227,0.25)] hover:shadow-[0_8px_32px_rgba(0,113,227,0.35)] hover:-translate-y-0.5 flex items-center gap-2 active:scale-[0.97]"
            >
              Ver Planes y Precios
              <ArrowUpRight size={16} />
            </a>
            <a
              href="#modelo"
              className="text-[#0071e3] px-8 py-4 rounded-full text-[15px] font-medium hover:bg-[#0071e3]/5 transition-all duration-200"
            >
              Cómo funciona
            </a>
          </div>
        </div>
      </section>

      {/* ─── ECOSYSTEM — Miller's Law: 3 cards, 1 message each ─── */}
      <section id="modelo" className="py-24 px-6 relative z-10">
        <div className="max-w-[980px] mx-auto">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-center mb-4">
            Un sistema. Dos motores.
          </h2>
          <p className="text-[17px] text-[#1d1d1f]/50 text-center max-w-xl mx-auto mb-16">
            Tu PMS gestiona. Tu motor de reservas vende. Todo conectado automáticamente.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Link Directo */}
            <div className="group bg-white rounded-[28px] p-8 shadow-[0_2px_12px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_40px_rgba(0,0,0,0.08)] transition-all duration-500 border border-black/[0.04] relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-transparent to-black/[0.03] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-[18px] bg-[#f5f5f7] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300" style={{ transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
                  <Smartphone size={22} className="text-[#1d1d1f]" strokeWidth={1.5} />
                </div>
                <h3 className="text-xl font-semibold mb-3 tracking-tight">Link Directo</h3>
                <p className="text-[15px] text-[#1d1d1f]/50 mb-8 leading-relaxed">
                  Tu link para WhatsApp. El cliente paga vía Wompi, el inventario se bloquea solo.
                </p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-5xl font-semibold tracking-tight">0%</span>
                  <span className="text-sm text-[#1d1d1f]/30 font-medium uppercase tracking-wide">Comisión</span>
                </div>
              </div>
            </div>

            {/* PMS Central — Featured */}
            <div className="group rounded-[28px] p-8 shadow-[0_8px_40px_rgba(0,113,227,0.2)] hover:shadow-[0_16px_64px_rgba(0,113,227,0.3)] hover:-translate-y-1 transition-all duration-500 relative overflow-hidden" style={{ backgroundColor: '#0071e3' }}>
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
              <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-500" style={{ backgroundColor: 'rgba(255,255,255,0.10)' }} />
              <div className="relative z-10 h-full flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-[18px] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300" style={{ backgroundColor: 'rgba(255,255,255,0.20)', backdropFilter: 'blur(20px)' }}>
                    <LayoutGrid size={22} color="white" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-xl font-semibold mb-3 tracking-tight" style={{ color: 'white' }}>PMS Central</h3>
                  <p className="text-[15px] mb-8 leading-relaxed font-medium" style={{ color: 'rgba(255,255,255,0.90)' }}>
                    El cerebro de la operación. Tarifas, POS, huéspedes y Channel Manager desde una sola pantalla.
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full w-fit border" style={{ backgroundColor: 'rgba(255,255,255,0.20)', backdropFilter: 'blur(20px)', borderColor: 'rgba(255,255,255,0.10)' }}>
                  <span className="text-sm font-semibold" style={{ color: 'white' }}>1 Mes Gratis</span>
                  <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.70)' }}>Luego suscripción</span>
                </div>
              </div>
            </div>

            {/* Motor de Reservas */}
            <div className="group bg-white rounded-[28px] p-8 shadow-[0_2px_12px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_40px_rgba(0,0,0,0.08)] transition-all duration-500 border border-black/[0.04] relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-bl from-transparent to-black/[0.03] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-[18px] bg-[#f5f5f7] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300" style={{ transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
                  <Globe size={22} className="text-[#1d1d1f]" strokeWidth={1.5} />
                </div>
                <h3 className="text-xl font-semibold mb-3 tracking-tight">Motor de Reservas</h3>
                <p className="text-[15px] text-[#1d1d1f]/50 mb-8 leading-relaxed">
                  Publicación automática bilingüe. Si estás en el PMS, estás visible al mundo.
                </p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-5xl font-semibold tracking-tight">10%</span>
                  <span className="text-sm text-[#1d1d1f]/30 font-medium uppercase tracking-wide">Costo de adquisición</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── REGULATORY SHIELD — SIRE/TRA Automation ─── */}
      <section className="py-16 px-6 bg-[#f5f5f7]/50 border-t border-black/[0.04]">
        <div className="max-w-[980px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight mb-4 text-[#1d1d1f]">
                Tu escudo contra multas de 20 SMLMV
              </h2>
              <p className="text-[17px] text-[#1d1d1f]/60 leading-relaxed mb-6">
                Cumplir con la Tarjeta de Registro de Alojamiento y el SIRE toma 15 minutos manuales por huésped. 
                HospedaSuite genera el reporte gubernamental automáticamente, listo para que lo subas en segundos.
              </p>
              <ul className="space-y-3 text-[15px] text-[#1d1d1f]/70">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#34c759]" />
                  <span>Reportes automáticos a Migración Colombia</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#34c759]" />
                  <span>Cero riesgo de sanciones por olvido</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#34c759]" />
                  <span>Blindaje contra estafas cibernéticas</span>
                </li>
              </ul>
            </div>
            <div className="bg-white rounded-[28px] p-8 shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-black/[0.04]">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-[14px] bg-[#f5f5f7] flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                </div>
                <span className="text-sm font-bold text-[#1d1d1f]/40 uppercase tracking-wide">Automatización Legal</span>
              </div>
              <p className="text-[15px] text-[#1d1d1f]/70 leading-relaxed">
                "Su pasarela nativa Wompi elimina comisiones y bloquea estafas cibernéticas frecuentes en glampings de Colombia."
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── ANTI-AIRBNB SHIELD — Comparison & GEO Citation ─── */}
      <AntiAirbnbShield />
    </SoftwareClientShell>
  );
}
