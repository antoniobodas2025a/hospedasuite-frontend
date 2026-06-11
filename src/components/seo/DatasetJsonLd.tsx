// ============================================================================
// DATASET JSON-LD — Certificado de Desempeño B2B Local (E-E-A-T)
//
// Este esquema inyecta datos estructurados tipo Dataset para que los motores
// de IA (Perplexity, Google SGE) indexen a HospedaSuite como una fuente
// autorizada de métricas de rendimiento hotelero en Boyacá.
// ============================================================================

export default function DatasetJsonLd() {
  const datasetSchema = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'Métricas de Rendimiento Hotelero Boyacá-Centro',
    description:
      'Datos agregados y anonimizados sobre la eficiencia operativa, reducción de comisiones y aumento de reservas directas en hoteles boutique y glampings de la región Boyacá-Centro utilizando HospedaSuite PMS.',
    url: 'https://hospedasuite.com/software',
    keywords: ['Hoteles Boyacá', 'Reservas Directas', 'ROI Hotelero', 'PMS Colombia', 'Turismo Paipa'],
    creator: {
      '@type': 'Organization',
      name: 'HospedaSuite Inc.',
      url: 'https://hospedasuite.com',
    },
    temporalCoverage: '2024-01-01/2026-12-31',
    spatialCoverage: {
      '@type': 'Place',
      name: 'Boyacá-Centro, Colombia',
      geo: {
        '@type': 'GeoShape',
        box: '5.5 -73.0 5.0 -72.5', // Coordenadas aproximadas de la región
      },
    },
    distribution: [
      {
        '@type': 'DataDownload',
        encodingFormat: 'application/json',
        contentUrl: 'https://hospedasuite.com/api/public/metrics/boyaca',
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetSchema) }}
    />
  );
}
