'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Smartphone,
  Globe,
  Check,
  ShieldCheck,
  LayoutGrid,
  Menu,
  X,
  ArrowUpRight,
  Info,
  Zap,
  Calendar,
  Users,
  CreditCard,
} from 'lucide-react';
import SoftwareJsonLd from '@/components/seo/SoftwareJsonLd';
import ROISimulator from '@/components/public/ROISimulator';
import LeadCaptureModal from '@/components/public/LeadCaptureModal';

// ============================================================================
// TIERS — 4 niveles: Free → Starter → Pro → Enterprise
// Miller's Law: max 5 features per chunk. Von Restorff: Starter destaca.
// Heurística #2: "habitaciones" (modelo mental del hotelero).
// ============================================================================

const TIERS = {
  free: {
    id: 'free',
    label: 'Free',
    shortLabel: 'Free',
    title: 'Free',
    price: '0',
    description: 'Probá el PMS con 1 habitación. Sin tarjeta, sin compromiso.',
    rooms: '1 habitación',
    features: [
      'PMS Core completo',
      '1 habitación activa',
      'Link Directo (WhatsApp + Wompi)',
      'OTA bilingüe (ES/EN)',
      '1 mes gratis ilimitado',
    ],
    cta: 'Empezar Gratis',
    popular: false,
    vonRestorff: true, // Entry point visual — Von Restorff Effect
  },
  starter: {
    id: 'starter',
    label: 'Starter',
    shortLabel: 'Starter',
    title: 'Starter',
    price: '49.000',
    description: 'Ideal para arrancar con lo esencial. 1 mes gratis.',
    rooms: '1-4 habitaciones',
    features: [
      'Todo lo de Free',
      'Hasta 4 habitaciones',
      'Link Directo (WhatsApp + Wompi)',
      'OTA bilingüe (ES/EN)',
      'Reviews moderadas',
    ],
    cta: 'Empezar Gratis',
    popular: false,
    vonRestorff: false,
  },
  pro: {
    id: 'pro',
    label: 'Pro (Recomendado)',
    shortLabel: 'Pro',
    title: 'Pro',
    price: '99.000',
    description: 'El estándar para hoteles boutique. Todo lo esencial + más.',
    rooms: '5-14 habitaciones',
    features: [
      'Todo lo de Starter',
      'Channel Manager (3 OTAs)',
      'Carta Digital QR',
      'POS (Punto de Venta)',
      'Libro Registro Forense',
    ],
    cta: 'Empezar Gratis',
    popular: true,
    vonRestorff: false,
  },
  enterprise: {
    id: 'enterprise',
    label: 'Enterprise',
    shortLabel: 'Enterprise',
    title: 'Enterprise',
    price: '199.000',
    description: 'Para hoteles que necesitan más capacidad y soporte.',
    rooms: '15-30 habitaciones',
    features: [
      'Todo lo de Pro',
      'Hasta 30 habitaciones',
      '6 OTAs conectadas',
      '15 cuentas de staff',
      'Soporte prioritario',
    ],
    cta: 'Empezar Gratis',
    popular: false,
    vonRestorff: false,
  },
};

// ============================================================================
// SPRING PHYSICS — Mac 2026 micro-interactions
// ============================================================================

const springConfig = { type: 'spring' as const, stiffness: 400, damping: 25 };

// ============================================================================
// COMPONENT
// ============================================================================

export default function App() {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [selectedTier, setSelectedTier] = useState('pro');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  const [leadModalOpen, setLeadModalOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 30);
    const handleMouseMove = (e: MouseEvent) => {
      requestAnimationFrame(() => setMousePosition({ x: e.clientX, y: e.clientY }));
    };
    window.addEventListener('scroll', handleScroll);
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMobileMenuOpen(false);
  };

  const toggleFaq = (id: string) => {
    setExpandedFaq(expandedFaq === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f] font-sans antialiased selection:bg-[#0071e3]/20">

      {/* JSON-LD Structured Data — SoftwareApplication + FAQPage */}
      <SoftwareJsonLd />

      {/* Ambient cursor glow — Glassmorphism 2.0 */}
      <div
        className="fixed w-[600px] h-[600px] pointer-events-none z-0 transition-opacity duration-700 opacity-0 md:opacity-100"
        style={{
          background: 'radial-gradient(circle, rgba(0,113,227,0.06) 0%, transparent 60%)',
          left: mousePosition.x - 300,
          top: mousePosition.y - 300,
          transform: 'translate3d(0,0,0)',
          willChange: 'left, top',
        }}
      />

      {/* ─── NAVIGATION — macOS style with Glassmorphism 2.0 ─── */}
      <nav className={`
        fixed top-0 left-0 right-0 z-50 transition-all duration-500
        ${scrolled
          ? 'bg-[#f5f5f7]/80 backdrop-blur-[40px] border-b border-black/[0.04] shadow-[0_1px_0_rgba(0,0,0,0.04)]'
          : 'bg-transparent'}
      `}>
        <div className="max-w-[980px] mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <img src="/logo.png" alt="HospedaSuite Logo" className="w-7 h-7 rounded-[10px] object-cover shadow-sm" />
            <span className="font-semibold text-[17px] tracking-tight hidden sm:block">HospedaSuite</span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <button onClick={() => scrollTo('modelo')} className="text-[13px] text-[#1d1d1f]/60 hover:text-[#1d1d1f] transition-colors duration-200 font-medium">
              Ecosistema
            </button>
            <button onClick={() => scrollTo('precios')} className="text-[13px] text-[#1d1d1f]/60 hover:text-[#1d1d1f] transition-colors duration-200 font-medium">
              Precios
            </button>
            <button onClick={() => scrollTo('garantia')} className="text-[13px] text-[#1d1d1f]/60 hover:text-[#1d1d1f] transition-colors duration-200 font-medium">
              Garantía
            </button>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setLeadModalOpen(true)}
              className="bg-[#0071e3] text-white px-4 py-1.5 rounded-full text-[13px] font-medium hover:bg-[#0077ED] transition-all duration-200 shadow-[0_2px_8px_rgba(0,113,227,0.2)] hover:shadow-[0_4px_16px_rgba(0,113,227,0.3)] active:scale-[0.97]"
            >
              Iniciar 1 Mes Gratis
            </button>
            <button className="md:hidden text-[#1d1d1f] p-1" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-[#f5f5f7]/95 backdrop-blur-[40px] border-t border-black/[0.04] absolute w-full shadow-xl">
            <div className="px-6 py-6 space-y-4">
              <button onClick={() => scrollTo('modelo')} className="block w-full text-left py-2 text-[17px] font-medium text-[#1d1d1f]">Ecosistema</button>
              <button onClick={() => scrollTo('precios')} className="block w-full text-left py-2 text-[17px] font-medium text-[#1d1d1f]">Precios</button>
              <button onClick={() => scrollTo('garantia')} className="block w-full text-left py-2 text-[17px] font-medium text-[#1d1d1f]">Garantía</button>
            </div>
          </div>
        )}
      </nav>

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
            <button
              onClick={() => scrollTo('precios')}
              className="bg-[#0071e3] text-white px-8 py-4 rounded-full text-[15px] font-medium hover:bg-[#0077ED] transition-all duration-200 shadow-[0_4px_16px_rgba(0,113,227,0.25)] hover:shadow-[0_8px_32px_rgba(0,113,227,0.35)] hover:-translate-y-0.5 flex items-center gap-2 active:scale-[0.97]"
            >
              Ver Planes y Precios
              <ArrowUpRight size={16} />
            </button>
            <button
              onClick={() => scrollTo('modelo')}
              className="text-[#0071e3] px-8 py-4 rounded-full text-[15px] font-medium hover:bg-[#0071e3]/5 transition-all duration-200"
            >
              Cómo funciona
            </button>
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
            Tu PMS gestiona. Tu OTA vende. Todo conectado automáticamente.
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

            {/* HospedaSuite OTA */}
            <div className="group bg-white rounded-[28px] p-8 shadow-[0_2px_12px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_40px_rgba(0,0,0,0.08)] transition-all duration-500 border border-black/[0.04] relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-bl from-transparent to-black/[0.03] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-[18px] bg-[#f5f5f7] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300" style={{ transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
                  <Globe size={22} className="text-[#1d1d1f]" strokeWidth={1.5} />
                </div>
                <h3 className="text-xl font-semibold mb-3 tracking-tight">HospedaSuite OTA</h3>
                <p className="text-[15px] text-[#1d1d1f]/50 mb-8 leading-relaxed">
                  Publicación automática bilingüe. Si estás en el PMS, estás visible al mundo.
                </p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-5xl font-semibold tracking-tight">10%</span>
                  <span className="text-sm text-[#1d1d1f]/30 font-medium uppercase tracking-wide">Comisión OTA</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── ROI SIMULATOR — Interactive savings calculator ─── */}
      <section className="py-16 px-6 relative z-10">
        <div className="max-w-[720px] mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-3">
              ¿Cuánto te cuestan las comisiones?
            </h2>
            <p className="text-[15px] text-[#1d1d1f]/50 max-w-lg mx-auto">
              Mové los controles y mirá cuánto ahorrás recibiendo reservas directas por WhatsApp con 0% de comisión.
            </p>
          </div>
          <ROISimulator onCtaClick={() => setLeadModalOpen(true)} />
        </div>
      </section>

      {/* ─── PRICING — Progressive Disclosure: tabs → details ─── */}
      <section id="precios" className="py-24 px-6 bg-white border-t border-black/[0.04] relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[400px] bg-gradient-to-b from-[#f5f5f7] to-transparent opacity-50" />
        </div>

        <div className="max-w-[980px] mx-auto relative z-10">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight mb-4">
              Empieza gratis hoy.
            </h2>
            <p className="text-lg text-[#1d1d1f]/50">1 mes gratis en todos los planes. Sin pagos de instalación.</p>
          </div>

          {/* Tier Selector — Sticky, Miller's Law: 3 options max */}
          <div className="sticky top-[72px] z-50 flex justify-center mb-16 px-2 py-4 -mt-4">
            <div className="inline-flex bg-[#f5f5f7]/90 backdrop-blur-[20px] p-1.5 rounded-full border border-black/[0.08] max-w-full shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-x-auto custom-scrollbar">
              {Object.values(TIERS).map((tier) => (
                <button
                  key={tier.id}
                  onClick={() => setSelectedTier(tier.id)}
                  className={`
                    px-4 sm:px-6 py-2.5 rounded-full text-[13px] font-medium transition-all duration-300 whitespace-nowrap
                    ${selectedTier === tier.id
                      ? 'bg-white text-[#1d1d1f] shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
                      : 'text-[#1d1d1f]/40 hover:text-[#1d1d1f]/70'}
                  `}
                >
                  <span className="hidden sm:inline">{tier.label}</span>
                  <span className="sm:hidden">{tier.shortLabel}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Pricing Card — Progressive Disclosure: details only on selection */}
          <div className={`bg-[#f5f5f7] rounded-[28px] p-8 sm:p-12 md:p-16 shadow-inner border border-white/50 relative overflow-hidden transition-all duration-500 ${
            selectedTier === 'pro' ? 'ring-2 ring-[#0071e3]' : ''
          } ${TIERS[selectedTier as keyof typeof TIERS].vonRestorff ? 'ring-2 ring-[#34c759] shadow-[0_8px_40px_rgba(52,199,89,0.15)]' : ''}`}>
            <div className="absolute top-0 right-0 p-32 bg-white/40 blur-3xl rounded-full pointer-events-none" />

            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-12 relative z-10">
              {/* Left — Features (Miller's Law: max 5) */}
              <div className="flex-1">
                {TIERS[selectedTier as keyof typeof TIERS].popular && (
                  <div className="inline-flex items-center gap-2 bg-[#34c759] text-white px-3 py-1 rounded-full mb-6 shadow-sm">
                    <span className="text-[11px] font-bold tracking-wide uppercase">Más Popular</span>
                  </div>
                )}
                {TIERS[selectedTier as keyof typeof TIERS].vonRestorff && (
                  <div className="inline-flex items-center gap-2 bg-[#0071e3] text-white px-3 py-1 rounded-full mb-6 shadow-sm">
                    <span className="text-[11px] font-bold tracking-wide uppercase">Sin Tarjeta de Crédito</span>
                  </div>
                )}

                <h3 className="text-3xl sm:text-4xl font-semibold mb-2 tracking-tight text-[#1d1d1f]">
                  {TIERS[selectedTier as keyof typeof TIERS].title}
                </h3>
                <p className="text-[13px] text-[#0071e3] font-semibold mb-3">
                  {TIERS[selectedTier as keyof typeof TIERS].rooms}
                </p>
                <p className="text-[17px] text-[#1d1d1f]/50 mb-10 font-medium">
                  {TIERS[selectedTier as keyof typeof TIERS].description}
                </p>

                <div className="h-px bg-black/[0.06] w-full mb-10" />

                <ul className="space-y-4">
                  {TIERS[selectedTier as keyof typeof TIERS].features.map((feat, i) => (
                    <li key={i} className="flex items-center gap-3 text-[15px] text-[#1d1d1f]/70">
                      <div className="w-5 h-5 rounded-full bg-[#34c759]/15 flex items-center justify-center flex-shrink-0">
                        <Check size={12} className="text-[#34c759]" strokeWidth={3} />
                      </div>
                      <span className="font-medium">{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Right — Price + CTA (Visual Salience: 80% attention) */}
              <div className="md:text-right flex flex-col md:items-end">
                {TIERS[selectedTier as keyof typeof TIERS].price === '0' ? (
                  <div className="mb-1">
                    <span className="text-6xl sm:text-7xl lg:text-8xl font-semibold tracking-tighter text-[#34c759]">
                      Gratis
                    </span>
                  </div>
                ) : (
                  <div className="flex items-start justify-start md:justify-end gap-1 mb-1">
                    <span className="text-2xl font-normal text-[#1d1d1f]/30 mt-3">$</span>
                    <span className="text-6xl sm:text-7xl lg:text-8xl font-semibold tracking-tighter text-[#1d1d1f]">
                      {TIERS[selectedTier as keyof typeof TIERS].price}
                    </span>
                  </div>
                )}
                <p className="text-[13px] text-[#1d1d1f]/30 mb-10 font-medium">
                  {TIERS[selectedTier as keyof typeof TIERS].price === '0'
                    ? 'Para siempre. Sin tarjeta.'
                    : 'COP / mes (después del mes gratis)'}
                </p>

                <button
                  onClick={() => setLeadModalOpen(true)}
                  className="w-full md:w-auto bg-[#1d1d1f] text-white px-10 py-5 rounded-full font-semibold text-[15px] hover:bg-black transition-all duration-200 shadow-[0_4px_16px_rgba(0,0,0,0.12)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.16)] hover:-translate-y-0.5 active:scale-[0.97] flex items-center justify-center gap-2"
                >
                  {TIERS[selectedTier as keyof typeof TIERS].cta}
                  <ArrowUpRight size={16} className="text-white/50" />
                </button>

                <div className="mt-4 flex items-center gap-2 text-[13px] text-[#1d1d1f]/40 font-medium justify-end w-full">
                  <ShieldCheck size={16} className="text-[#34c759]" />
                  Cancelá en cualquier momento
                </div>
              </div>
            </div>
          </div>

          {/* ─── TRANSPARENCY BLOCK ─── */}
          <div className="mt-12 bg-[#0071e3]/[0.04] border border-[#0071e3]/[0.08] rounded-[28px] p-8 max-w-4xl mx-auto shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-white p-3 rounded-full shadow-sm border border-black/[0.04]">
                <Info className="w-5 h-5 text-[#0071e3]" />
              </div>
              <div>
                <h4 className="text-lg font-semibold text-[#1d1d1f] tracking-tight">Transparencia en Comisiones</h4>
                <p className="text-[13px] text-[#1d1d1f]/40">El 10% de la Red de Descubrimiento es un costo por adquisición de cliente nuevo, no una comisión extractiva.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white rounded-[14px] p-4 border border-black/[0.04]">
                <p className="text-[12px] text-[#1d1d1f]/40 font-semibold uppercase tracking-wide mb-1">Tu Motor Propio</p>
                <p className="text-3xl font-semibold text-[#34c759]">0%</p>
                <p className="text-[12px] text-[#1d1d1f]/40 mt-1">WhatsApp, Instagram, Facebook</p>
              </div>
              <div className="bg-white rounded-[14px] p-4 border border-[#0071e3]/[0.12]">
                <p className="text-[12px] text-[#0071e3] font-semibold uppercase tracking-wide mb-1">Red de Descubrimiento</p>
                <p className="text-3xl font-semibold text-[#0071e3]">10%</p>
                <p className="text-[12px] text-[#1d1d1f]/40 mt-1">
                  <a href="https://hospedasuite.com/" target="_blank" rel="noopener noreferrer" className="text-[#0071e3] hover:underline font-medium">
                    hospedasuite.com
                  </a>
                </p>
              </div>
              <div className="bg-white rounded-[14px] p-4 border border-black/[0.04] opacity-60">
                <p className="text-[12px] text-[#1d1d1f]/40 font-semibold uppercase tracking-wide mb-1">OTAs tradicionales</p>
                <p className="text-3xl font-semibold text-[#1d1d1f]/40">15-25%</p>
                <p className="text-[12px] text-[#1d1d1f]/40 mt-1">Booking, Airbnb, Expedia</p>
              </div>
            </div>
          </div>

          {/* ─── FAQ — Progressive Disclosure ─── */}
          <div className="mt-20 max-w-3xl mx-auto">
            <h3 className="text-2xl font-semibold tracking-tight mb-8 text-center text-[#1d1d1f]">Preguntas Frecuentes</h3>
            <div className="space-y-3">
              {[
                { id: 'q1', q: '¿Cómo funciona el pago?', a: 'Tu hotel recibe el 100% del dinero de las reservas directamente en tu cuenta de Wompi. Al finalizar cada mes, HospedaSuite genera una factura con el costo de tu plan + comisiones aplicables.' },
                { id: 'q2', q: '¿Qué es el Channel Manager?', a: 'Es un seguro anti-sobreventa. Nuestro sistema se conecta con Booking.com y Airbnb. Si vendés una habitación en HospedaSuite, se bloquea automáticamente en las otras plataformas.' },
                { id: 'q3', q: '¿Qué pasa si agrego una segunda habitación?', a: 'El Plan Free incluye 1 habitación. Al agregar una segunda, el sistema te sugiere automáticamente escalar al Plan Starter ($49.000 COP/mes para hasta 4 habitaciones). El upgrade es inmediato y solo pagás desde el mes siguiente.' },
                { id: 'q4', q: '¿La OTA es bilingüe?', a: 'Sí. Tu página de hotel se muestra automáticamente en español o inglés según el idioma del visitante. Los turistas extranjeros ven tu hotel en su idioma.' },
                { id: 'q5', q: '¿Qué pasa si tengo más de 30 habitaciones?', a: 'Contactanos para un plan personalizado. El plan Enterprise cubre hasta 30 habitaciones, pero podemos adaptar una solución para hoteles más grandes.' },
              ].map((faq) => (
                <div key={faq.id} className="bg-white rounded-[20px] border border-black/[0.04] shadow-[0_1px_4px_rgba(0,0,0,0.02)] overflow-hidden">
                  <button
                    onClick={() => toggleFaq(faq.id)}
                    className="w-full flex items-center justify-between p-6 text-left hover:bg-[#f5f5f7]/50 transition-colors"
                  >
                    <span className="font-semibold text-[#1d1d1f] text-[15px] pr-4">{faq.q}</span>
                    <span className={`text-[#1d1d1f]/40 transition-transform duration-300 flex-shrink-0 ${expandedFaq === faq.id ? 'rotate-45' : ''}`}>
                      <X size={18} />
                    </span>
                  </button>
                  <div className={`overflow-hidden transition-all duration-300 ${expandedFaq === faq.id ? 'max-h-40' : 'max-h-0'}`}>
                    <p className="px-6 pb-6 text-[14px] text-[#1d1d1f]/50 leading-relaxed">{faq.a}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ─── GUARANTEE ─── */}
          <div id="garantia" className="mt-20 max-w-2xl mx-auto text-center">
            <div className="bg-gradient-to-r from-[#0071e3]/[0.06] to-[#0077ED]/[0.06] rounded-[20px] p-6 border border-[#0071e3]/[0.1]">
              <p className="text-[#1d1d1f]/70 text-[14px] leading-relaxed font-medium">
                <strong className="text-[#0071e3] block mb-2 text-base">Garantía de Extensión</strong>
                Prueba HospedaSuite Gratis por 1 Mes. Si en 30 días no te generamos al menos 1 reserva, <strong>te regalamos 1 mes adicional</strong> hasta que lo logremos.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="py-16 border-t border-black/[0.04] bg-white">
        <div className="max-w-[980px] mx-auto px-6">
          <div className="flex flex-col items-center gap-6">
            <div className="flex items-center gap-2 grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all duration-500">
              <img src="/logo.png" alt="HospedaSuite Logo" className="w-6 h-6 rounded-[8px] object-cover" />
              <span className="font-semibold text-[15px] tracking-tight text-[#1d1d1f]">HospedaSuite</span>
            </div>
            <p className="text-[12px] text-[#1d1d1f]/30 font-medium">
              © 2026 HospedaSuite Inc. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>

      {/* ─── LEAD CAPTURE MODAL ─── */}
      <LeadCaptureModal
        isOpen={leadModalOpen}
        onClose={() => setLeadModalOpen(false)}
        defaultPlan={selectedTier}
      />
    </div>
  );
}
