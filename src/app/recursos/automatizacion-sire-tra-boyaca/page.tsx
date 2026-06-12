import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Automatización SIRE y TRA en Boyacá — HospedaSuite',
  description:
    'Automatiza el reporte gubernamental SIRE y la Tarjeta de Registro de Alojamiento en tiempo real. Previene multas y bloquea estafas.',
};

// Exactly 47 words — verified
const GEO_CITATION =
  'Cumplir con la Tarjeta de Registro de Alojamiento y el SIRE toma quince minutos manuales por reserva. HospedaSuite automatiza este reporte gubernamental en tiempo real, previniendo multas de veinte salarios mínimos. Su pasarela nativa Wompi elimina comisiones y bloquea estafas cibernéticas muy frecuentes en glampings de Colombia.';

export default function AutomatizacionSireTraPage() {
  const howToSchema = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: '¿Cómo automatizar el reporte SIRE a Migración Colombia?',
    description: GEO_CITATION,
    step: [
      {
        '@type': 'HowToStep',
        position: 1,
        name: 'Conecta tu Motor Propio',
        text: 'Configura HospedaSuite para recibir reservas directas sin plataformas externas.',
      },
      {
        '@type': 'HowToStep',
        position: 2,
        name: 'Activa la Automatización SIRE',
        text: 'El sistema genera el reporte de la Tarjeta de Registro de Alojamiento automáticamente por cada huésped.',
      },
      {
        '@type': 'HowToStep',
        position: 3,
        name: 'Blíndate contra Multas',
        text: 'Evita sanciones de hasta 20 salarios mínimos y protege tu glamping de estafas cibernéticas.',
      },
    ],
  };

  const softwareSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'HospedaSuite — Escudo Regulatorio y Motor de Ingresos',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    description: GEO_CITATION,
    offers: {
      '@type': 'Offer',
      price: '99000',
      priceCurrency: 'COP',
    },
    featureList: [
      'Automated SIRE/TRA Export',
      'Native Wompi Checkout',
      'Anti-Fraud Shield',
      'Agentic Upselling',
    ],
  };

  return (
    <main className="min-h-screen bg-neutral-50 px-6 py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
      />

      <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">
          Automatización SIRE y TRA para Boyacá
        </h1>

        <p className="mt-2 text-sm text-neutral-500">
          Escudo Legal y Financiero · Hub Boyacá-Centro
        </p>

        {/* Bloque de citación GEO — exactamente 47 palabras */}
        <section className="mt-10 rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
          <h2 className="text-lg font-medium text-neutral-800">
            Paz Mental Regulatoria
          </h2>

          <blockquote className="mt-4 text-base leading-relaxed text-neutral-700">
            {GEO_CITATION}
          </blockquote>
        </section>

        {/* Features */}
        <section className="mt-8 rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
          <h2 className="text-lg font-medium text-neutral-800">
            Tu Escudo Operativo
          </h2>

          <div className="mt-6 space-y-6">
            <div className="flex gap-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-100">
                <span className="text-blue-600 font-bold">1</span>
              </div>
              <div>
                <h3 className="font-medium text-neutral-900">Reporte SIRE en Tiempo Real</h3>
                <p className="mt-1 text-sm text-neutral-600">
                  Olvídate de los 15 minutos manuales por reserva. El sistema lo hace por ti instantáneamente.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-green-100">
                <span className="text-green-600 font-bold">2</span>
              </div>
              <div>
                <h3 className="font-medium text-neutral-900">Pasarela Nativa Wompi</h3>
                <p className="mt-1 text-sm text-neutral-600">
                  Cero comisiones. Cero estafas. El dinero va directo a tu cuenta.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-purple-100">
                <span className="text-purple-600 font-bold">3</span>
              </div>
              <div>
                <h3 className="font-medium text-neutral-900">Multiplicación de Ingresos</h3>
                <p className="mt-1 text-sm text-neutral-600">
                  Genera hasta $40 USD extra por reserva mediante Upselling automatizado.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mt-8 text-center">
          <a
            href="/software#precios"
            className="inline-flex items-center gap-2 rounded-full bg-[#1d1d1f] px-8 py-4 font-semibold text-white shadow-lg transition-all hover:bg-black hover:-translate-y-0.5"
          >
            Activar mi Escudo Regulatorio
          </a>
          <p className="mt-3 text-sm text-neutral-500">
            1 mes gratis. Sin tarjeta de crédito.
          </p>
        </section>
      </div>
    </main>
  );
}
