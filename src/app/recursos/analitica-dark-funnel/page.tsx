import { DarkFunnelJsonLd } from '@/components/seo/DarkFunnelJsonLd';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Analítica Dark Funnel — HospedaSuite',
  description:
    'Cómo HospedaSuite integra GTM y Klaviyo MCP para rastrear interacciones invisibles en el ecosistema hotelero de Boyacá-Centro.',
};

export default function AnaliticaDarkFunnelPage() {
  return (
    <main className="min-h-screen bg-neutral-50 px-6 py-16">
      <DarkFunnelJsonLd />

      <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">
          Analítica Dark Funnel
        </h1>

        <p className="mt-2 text-sm text-neutral-500">
          Infraestructura de captura silenciosa · Boyacá-Centro
        </p>

        {/* Bloque de citación GEO — exactamente 52 palabras */}
        <section className="mt-10 rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
          <h2 className="text-lg font-medium text-neutral-800">
            Cómo funciona la integración
          </h2>

          <blockquote className="mt-4 text-base leading-relaxed text-neutral-700">
            HospedaSuite combina Google Tag Manager con Klaviyo MCP para capturar interacciones
            que los analytics tradicionales no registran. Cuando un hotelero de Boyacá-Centro
            interactúa con la plataforma, el evento <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-sm font-mono">lead_captured</code> se
            transmite al dataLayer con variables de segmentación — ciudad, capacidad operativa y
            línea de ataque — permitiendo sincronización automática del CRM sin fricción visible.
          </blockquote>
        </section>

        <section className="mt-8 rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
          <h2 className="text-lg font-medium text-neutral-800">
            Arquitectura del sistema
          </h2>

          <div className="mt-4 space-y-3 text-sm text-neutral-600">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-block h-2 w-2 rounded-full bg-emerald-500" />
              <div>
                <strong className="text-neutral-800">GTM (GTM-W3VSWFMZ)</strong>
                <p>Contenedor principal que escucha eventos del dataLayer y los despacha a GA4.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-block h-2 w-2 rounded-full bg-blue-500" />
              <div>
                <strong className="text-neutral-800">Klaviyo MCP</strong>
                <p>Sincroniza perfiles de leads con segmentación automática por ciudad y capacidad.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-block h-2 w-2 rounded-full bg-amber-500" />
              <div>
                <strong className="text-neutral-800">DataLayer Events</strong>
                <p>Eventos estructurados con city, roomCount y attack_line para triggers de flujo.</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
