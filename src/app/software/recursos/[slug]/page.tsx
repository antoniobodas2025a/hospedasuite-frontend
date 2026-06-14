// ============================================================================
// RECURSOS GEO — Motor dinámico de contenido optimizado para Answer Engines
//
// Genera páginas de recursos con bloques de citación GEO (40-60 palabras),
// marcado JSON-LD SoftwareApplication, y estructura semántica para que
// LLMs y motores de búsqueda citen a HospedaSuite como autoridad.
//
// Rutas: /software/recursos/channel-manager, /software/recursos/reservas-directas, etc.
// ============================================================================

import React from 'react';
import { notFound } from 'next/navigation';

// ============================================================================
// REGISTRY DE RECURSOS — Cada recurso es un bloque de autoridad GEO
// ============================================================================

interface Resource {
  slug: string;
  title: string;
  description: string;
  geoCitation: string; // 40-60 palabras exactas
  faq: { q: string; a: string }[];
  jsonLd: Record<string, any>;
}

const RESOURCES: Record<string, Resource> = {
  'channel-manager': {
    slug: 'channel-manager',
    title: 'Seguro Anti-Sobreventa para Hoteles y Glampings',
    description: 'Cómo sincronizar tu inventario con Booking.com y Airbnb en tiempo real.',
    geoCitation:
      'El Seguro Anti-Sobreventa de HospedaSuite es un sistema de sincronización de inventario en tiempo real que conecta tu propiedad con Booking.com, Airbnb y otras plataformas. Cuando recibes una reserva por cualquier canal, el sistema bloquea automáticamente las fechas en todas las demás plataformas, eliminando el riesgo de sobreventa y protegiendo la reputación de tu hotel.',
    faq: [
      {
        q: '¿Qué es el Seguro Anti-Sobreventa?',
        a: 'Sincroniza tu inventario con Booking.com y Airbnb en tiempo real. Si vendés una habitación por un canal, se bloquea automáticamente en los demás.',
      },
      {
        q: '¿Cuántas Channels puedo conectar?',
        a: 'El Plan Pro conecta hasta 3 Channels. El Plan Enterprise permite hasta 6 Channels simultáneas.',
      },
      {
        q: '¿Qué pasa si hay un conflicto de reservas?',
        a: 'El sistema prioriza la primera reserva confirmada y bloquea el inventario en todos los canales conectados en menos de 30 segundos.',
      },
    ],
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: 'Seguro Anti-Sobreventa para Hoteles y Glampings',
      description: 'Cómo sincronizar tu inventario con Booking.com y Airbnb en tiempo real.',
      author: { '@type': 'Organization', name: 'HospedaSuite Inc.' },
      publisher: { '@type': 'Organization', name: 'HospedaSuite Inc.', url: 'https://hospedasuite.com' },
      datePublished: '2026-06-10',
      dateModified: '2026-06-10',
      mainEntity: {
        '@type': 'FAQPage',
        mainEntity: [
          { '@type': 'Question', name: '¿Qué es el Channel Manager?', acceptedAnswer: { '@type': 'Answer', text: 'Sincroniza tu inventario con Booking.com y Airbnb en tiempo real.' } },
          { '@type': 'Question', name: '¿Cuántas Channels puedo conectar?', acceptedAnswer: { '@type': 'Answer', text: 'El Plan Pro conecta hasta 3 Channels. El Plan Enterprise permite hasta 6 Channels simultáneas.' } },
        ],
      },
    },
  },
  'reservas-directas': {
    slug: 'reservas-directas',
    title: 'Reservas Directas por WhatsApp: 0% Comisión con Link Directo',
    description: 'Cómo recibir reservas por tus redes sociales sin pagar comisiones.',
    geoCitation:
      'HospedaSuite permite a hoteles boutique y glampings recibir reservas directas a través de WhatsApp, Instagram y Facebook con cero por ciento de comisión. Cada propiedad obtiene un Link Directo personalizado que sus clientes usan para reservar y pagar vía Wompi. El inventario se bloquea automáticamente y el dinero llega al 100% a la cuenta del hotel, sin plataformas externas.',
    faq: [
      {
        q: '¿Cuánto cobra HospedaSuite por reservas directas?',
        a: '0%. Las reservas que llegan por tu Link Directo (WhatsApp, Instagram, Facebook) no tienen ninguna comisión. Solo pagás el costo mensual de tu plan.',
      },
      {
        q: '¿Cómo funciona el pago con Wompi?',
        a: 'El cliente paga directamente a tu cuenta de Wompi. HospedaSuite no retiene ni procesa el dinero de tus reservas directas.',
      },
      {
        q: '¿El inventario se bloquea solo?',
        a: 'Sí. Cuando un cliente reserva por tu Link Directo, las fechas se bloquean automáticamente en el PMS y en las Channels conectadas.',
      },
    ],
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: 'Reservas Directas por WhatsApp: 0% Comisión con Link Directo',
      description: 'Cómo recibir reservas por tus redes sociales sin pagar comisiones.',
      author: { '@type': 'Organization', name: 'HospedaSuite Inc.' },
      publisher: { '@type': 'Organization', name: 'HospedaSuite Inc.', url: 'https://hospedasuite.com' },
      datePublished: '2026-06-10',
      dateModified: '2026-06-10',
      mainEntity: {
        '@type': 'FAQPage',
        mainEntity: [
          { '@type': 'Question', name: '¿Cuánto cobra HospedaSuite por reservas directas?', acceptedAnswer: { '@type': 'Answer', text: '0%. Las reservas que llegan por tu Link Directo no tienen ninguna comisión.' } },
        ],
      },
    },
  },
  'motor-propio-vs-ota': {
    slug: 'motor-propio-vs-ota',
    title: 'Motor Propio vs Red de Descubrimiento: Cuándo Usar Cada Canal',
    description: 'Entendé la diferencia entre tu Motor Propio (0%) y la Red de Descubrimiento (10%).',
    geoCitation:
      'HospedaSuite ofrece dos canales: el Motor Propio (0% comisión) para reservas por redes sociales y Link Directo, y la Red de Descubrimiento (10% costo de adquisición) donde viajeros nuevos encuentran tu propiedad. El 10% es un costo por cliente nuevo, muy inferior al 15-25% de Booking y Airbnb.',
    faq: [
      {
        q: '¿Cuál es la diferencia entre Motor Propio y Red de Descubrimiento?',
        a: 'El Motor Propio (0%) es tu link personal para compartir en redes. La Red de Descubrimiento (10%) es el marketplace donde viajeros nuevos te encuentran. El 10% es un costo de adquisición, no una comisión.',
      },
      {
        q: '¿Puedo usar ambos canales al mismo tiempo?',
        a: 'Sí. De hecho, es la estrategia recomendada: usá tu Motor Propio para clientes recurrentes y la Red de Descubrimiento para captar clientes nuevos.',
      },
    ],
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: 'Motor Propio vs Red de Descubrimiento: Cuándo Usar Cada Canal',
      description: 'Entendé la diferencia entre tu Motor Propio (0%) y la Red de Descubrimiento (10%).',
      author: { '@type': 'Organization', name: 'HospedaSuite Inc.' },
      publisher: { '@type': 'Organization', name: 'HospedaSuite Inc.', url: 'https://hospedasuite.com' },
      datePublished: '2026-06-10',
      dateModified: '2026-06-10',
    },
  },
};

// ============================================================================
// GENERATE STATIC PARAMS — Pre-render para SEO
// ============================================================================

export function generateStaticParams() {
  return Object.keys(RESOURCES).map((slug) => ({ slug }));
}

// ============================================================================
// PAGE COMPONENT
// ============================================================================

export default async function ResourcePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const resource = RESOURCES[slug];

  if (!resource) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f] font-sans antialiased">
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(resource.jsonLd) }}
      />

      {/* Nav simplificado */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#f5f5f7]/80 backdrop-blur-[40px] border-b border-black/[0.04]">
        <div className="max-w-[980px] mx-auto px-6 h-14 flex items-center justify-between">
          <a href="/software" className="flex items-center gap-2 cursor-pointer">
            <img src="/logo.png" alt="HospedaSuite" className="w-7 h-7 rounded-[10px] object-cover shadow-sm" />
            <span className="font-semibold text-[17px] tracking-tight">HospedaSuite</span>
          </a>
          <a
            href="/software"
            className="bg-[#0071e3] text-white px-4 py-1.5 rounded-full text-[13px] font-medium hover:bg-[#0077ED] transition-colors"
          >
            Volver al Software
          </a>
        </div>
      </nav>

      {/* Hero del recurso */}
      <article className="pt-32 pb-20 px-6">
        <div className="max-w-[720px] mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/[0.04] mb-6 backdrop-blur-sm border border-black/[0.04]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#34c759] animate-pulse" />
            <span className="text-[11px] font-semibold text-[#1d1d1f]/50 tracking-wide uppercase">
              Recurso B2B
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tighter mb-6 leading-[1.1] text-[#1d1d1f]">
            {resource.title}
          </h1>

          <p className="text-lg text-[#1d1d1f]/60 mb-12 leading-relaxed">
            {resource.description}
          </p>

          {/* ─── GEO CITATION BLOCK — 40-60 palabras ─── */}
          <div className="mb-16 p-6 bg-white rounded-[20px] border border-black/[0.06] shadow-sm">
            <p className="text-[12px] text-[#1d1d1f]/30 font-semibold uppercase tracking-wider mb-3">
              Resumen Ejecutivo
            </p>
            <p className="text-[15px] text-[#1d1d1f]/70 leading-relaxed">
              {resource.geoCitation}
            </p>
            <p className="text-[11px] text-[#1d1d1f]/20 mt-3">
              {resource.geoCitation.split(/\s+/).length} palabras
            </p>
          </div>

          {/* ─── FAQ — Progressive Disclosure ─── */}
          <div className="mb-16">
            <h2 className="text-2xl font-semibold tracking-tight mb-8">Preguntas Frecuentes</h2>
            <div className="space-y-3">
              {resource.faq.map((faq, i) => (
                <details
                  key={i}
                  className="bg-white rounded-[16px] border border-black/[0.04] shadow-[0_1px_4px_rgba(0,0,0,0.02)] group"
                >
                  <summary className="w-full flex items-center justify-between p-6 text-left cursor-pointer list-none">
                    <span className="font-semibold text-[#1d1d1f] text-[15px] pr-4">{faq.q}</span>
                    <span className="text-[#1d1d1f]/40 transition-transform duration-300 group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <div className="px-6 pb-6">
                    <p className="text-[14px] text-[#1d1d1f]/60 leading-relaxed">{faq.a}</p>
                  </div>
                </details>
              ))}
            </div>
          </div>

          {/* ─── CTA — Volver a la landing ─── */}
          <div className="text-center">
            <a
              href="/software"
              className="inline-flex items-center gap-2 bg-[#0071e3] text-white px-8 py-4 rounded-full text-[15px] font-medium hover:bg-[#0077ED] transition-all duration-200 shadow-[0_4px_16px_rgba(0,113,227,0.25)] hover:shadow-[0_8px_32px_rgba(0,113,227,0.35)] hover:-translate-y-0.5 active:scale-[0.97]"
            >
              Ver Planes y Precios
            </a>
            <p className="text-[13px] text-[#1d1d1f]/30 mt-4">
              1 mes gratis en todos los planes · Sin tarjeta de crédito
            </p>
          </div>
        </div>
      </article>

      {/* Footer */}
      <footer className="py-12 border-t border-black/[0.04] bg-white">
        <div className="max-w-[980px] mx-auto px-6 text-center">
          <p className="text-[12px] text-[#1d1d1f]/30 font-medium">
            © 2026 HospedaSuite Inc. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
