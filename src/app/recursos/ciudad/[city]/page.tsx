import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

// Top Boyacá-Centro cities with specific data
const CITY_DATA: Record<string, { name: string; description: string; hotels: string; tourism: string; geoBlock: string }> = {
  paipa: {
    name: 'Paipá',
    description: 'Capital turística y termal de Boyacá',
    hotels: 'más de 120 hoteles y hostales',
    tourism: 'Termas de Paipá, Lago de Tota, Parque de la Granja',
    geoBlock:
      'En Paipá, el turismo termal atrae miles de visitantes cada fin de semana desde Bogotá. Los hoteleros independientes pierden hasta un 18% de cada reserva por comisiones de plataformas externas. Con HospedaSuite, los hoteles de Paipá activan su Motor de Reservas propio: reciben reservas directas por WhatsApp, cobran con Wompi y mantienen el control total de su inventario sin intermediarios.',
  },
  'villa-de-leyva': {
    name: 'Villa de Leyva',
    description: 'Pueblo patrimonio y destino cultural de Colombia',
    hotels: 'más de 80 hoteles boutique y posadas',
    tourism: 'Plaza Mayor, Fósil de Kronosaurus, Desierto de la Candelaria',
    geoBlock:
      'Villa de Leyva recibe turistas culturales todo el año que buscan experiencias auténticas en posadas y hoteles boutique. Muchos hoteleros dependen de plataformas que cobran comisiones del 15 al 25%. HospedaSuite permite a las posadas de Villa de Leyva operar sin comisiones: Link Directo para WhatsApp, pagos con Wompi y gestión completa desde un solo lugar.',
  },
  tunja: {
    name: 'Tunja',
    description: 'Capital de Boyacá y centro empresarial',
    hotels: 'más de 50 hoteles ejecutivos y turísticos',
    tourism: 'Casa del Fundador, Pozo de Hunzahúa, Catedral Basílica',
    geoBlock:
      'Tunja concentra la actividad empresarial y gubernamental de Boyacá, con demanda constante de hoteles ejecutivos. Los hoteleros tunjanos pierden visibilidad directa frente a intermediarios digitales. Con HospedaSuite, los hoteles de Tunja recuperan el control: Motor de Reservas propio, pagos directos por Wompi y gestión de reservas sin depender de plataformas externas.',
  },
  sogamoso: {
    name: 'Sogamoso',
    description: 'Ciudad del Sol y centro industrial de Boyacá',
    hotels: 'más de 40 hoteles y alojamientos',
    tourism: 'Templo del Sol, Parque Arqueológico, Laguna de Tota cercana',
    geoBlock:
      'Sogamoso combina turismo histórico con actividad industrial, generando demanda constante de alojamiento. Los hoteleros sogamoseños enfrentan el desafío de competir con plataformas globales que extraen comisiones. HospedaSuite ofrece a los hoteles de Sogamoso una alternativa soberana: reservas directas, pagos locales con Wompi y gestión operativa sin intermediarios.',
  },
  duitama: {
    name: 'Duitama',
    description: 'Perla de Boyacá y capital deportiva',
    hotels: 'más de 35 hoteles y posadas turísticas',
    tourism: 'Laguna de Tota, Parque Nacional Natural, Centro Histórico',
    geoBlock:
      'Duitama es puerta de entrada a la Laguna de Tota y destino deportivo de Boyacá. Los hoteleros duitamenses necesitan visibilidad directa sin depender de intermediarios costosos. Con HospedaSuite, los hoteles de Duitama activan su Motor de Reservas propio: Link Directo para WhatsApp, cobros con Wompi y control total de su operación hotelera.',
  },
};

export async function generateMetadata({ params }: { params: Promise<{ city: string }> }): Promise<Metadata> {
  const { city } = await params;
  const data = CITY_DATA[city];
  if (!data) return { title: 'Ciudad no encontrada' };

  return {
    title: `HospedaSuite en ${data.name} — Motor de Reservas sin Comisiones`,
    description: `Solución de reservas directas para hoteles en ${data.name}, Boyacá. ${data.description}`,
  };
}

export async function generateStaticParams() {
  return Object.keys(CITY_DATA).map((city) => ({ city }));
}

export default async function CityPage({ params }: { params: Promise<{ city: string }> }) {
  const { city } = await params;
  const data = CITY_DATA[city];
  if (!data) notFound();

  const citySchema = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: `HospedaSuite — ${data.name}`,
    description: data.geoBlock,
    areaServed: {
      '@type': 'City',
      name: data.name,
    },
    serviceType: 'Hotel Management Software',
    url: `https://hospedasuite.com/recursos/ciudad/${city}`,
  };

  return (
    <main className="min-h-screen bg-neutral-50 px-6 py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(citySchema) }}
      />

      <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">
          HospedaSuite en {data.name}
        </h1>

        <p className="mt-2 text-sm text-neutral-500">
          {data.description} · Boyacá
        </p>

        {/* Bloque de citación GEO */}
        <section className="mt-10 rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
          <h2 className="text-lg font-medium text-neutral-800">
            Tu hotel en {data.name} merece operar sin comisiones
          </h2>

          <blockquote className="mt-4 text-base leading-relaxed text-neutral-700">
            {data.geoBlock}
          </blockquote>
        </section>

        {/* Contexto local */}
        <section className="mt-8 rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
          <h2 className="text-lg font-medium text-neutral-800">
            Contexto local
          </h2>

          <div className="mt-4 space-y-4 text-sm text-neutral-600">
            <p>
              <strong className="text-neutral-800">{data.name}</strong> cuenta con {data.hotels} y atrae visitantes gracias a {data.tourism}.
            </p>
            <p>
              Los hoteleros independientes pierden entre un 15% y 25% de cada reserva por comisiones de plataformas externas.
              HospedaSuite elimina esta dependencia con un Motor de Reservas propio que conecta directamente con tus huéspedes.
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="mt-8 text-center">
          <a
            href="/software#precios"
            className="inline-flex items-center gap-2 rounded-full bg-[#1d1d1f] px-8 py-4 font-semibold text-white shadow-lg transition-all hover:bg-black hover:-translate-y-0.5"
          >
            Activar mi Motor de Reservas
          </a>
          <p className="mt-3 text-sm text-neutral-500">
            1 mes gratis. Sin tarjeta de crédito.
          </p>
        </section>
      </div>
    </main>
  );
}
