'use client';

import React, { useState, useEffect } from 'react';
import { Menu, X, ArrowUpRight } from 'lucide-react';
import LeadCaptureModal from '@/components/public/LeadCaptureModal';
import RoiSimulatorV2 from '@/components/public/RoiSimulatorV2';
import InteractivePricingSlider from '@/components/InteractivePricingSlider';

interface SoftwareClientShellProps {
  children: React.ReactNode;
}

export default function SoftwareClientShell({ children }: SoftwareClientShellProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const [sliderTier, setSliderTier] = useState('starter');
  const [sliderRoomCount, setSliderRoomCount] = useState(2);

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

  const handleSliderCtaClick = (tierId: string, roomCount: number) => {
    setSliderTier(tierId);
    setSliderRoomCount(roomCount);
    setLeadModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f] font-sans antialiased selection:bg-[#0071e3]/20">
      
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

      {/* Main Content */}
      {children}

      {/* ─── ROI SIMULATOR SECTION ─── */}
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
          <RoiSimulatorV2 onCtaClick={() => setLeadModalOpen(true)} />
        </div>
      </section>

      {/* ─── PRICING — Interactive Slider (Progressive Disclosure) ─── */}
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

          <InteractivePricingSlider onCtaClick={handleSliderCtaClick} />

          {/* ─── FAQ — Progressive Disclosure ─── */}
          <div className="mt-20 max-w-3xl mx-auto">
            <h3 className="text-2xl font-semibold tracking-tight mb-8 text-center text-[#1d1d1f]">Preguntas Frecuentes</h3>
            <div className="space-y-3">
              {[
                { id: 'q1', q: '¿Cómo funciona el pago?', a: 'Tu hotel recibe el 100% del dinero de las reservas directamente en tu cuenta de Wompi. Al finalizar cada mes, HospedaSuite genera una factura con el costo de tu plan + comisiones aplicables.' },
                { id: 'q2', q: '¿Qué es el Channel Manager?', a: 'Es un seguro anti-sobreventa. Nuestro sistema se conecta con Booking.com y Airbnb. Si vendés una habitación en HospedaSuite, se bloquea automáticamente en las otras plataformas.' },
                { id: 'q3', q: '¿Qué pasa si agrego una segunda habitación?', a: 'El Plan Free incluye 1 habitación. Al agregar una segunda, el sistema te sugiere automáticamente escalar al Plan Starter ($49.000 COP/mes para hasta 4 habitaciones). El upgrade es inmediato y solo pagás desde el mes siguiente.' },
                { id: 'q4', q: '¿El motor de reservas es bilingüe?', a: 'Sí. Tu página de hotel se muestra automáticamente en español o inglés según el idioma del visitante. Los turistas extranjeros ven tu hotel en su idioma.' },
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
        defaultPlan={sliderTier}
        roomCount={sliderRoomCount}
      />
    </div>
  );
}
