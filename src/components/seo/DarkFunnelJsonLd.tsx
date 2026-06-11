// ============================================================================
// DARK FUNNEL JSON-LD — E-E-A-T Structured Data (Dataset Schema)
// ============================================================================
// Certifies B2B local performance of HospedaSuite for algorithmic trust.
// Injects a Dataset schema that RAG engines and Answer Engines can parse.

export function DarkFunnelJsonLd() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'HospedaSuite Dark Funnel Analytics — B2B Hotel Performance Data',
    description:
      'Integration of Google Tag Manager and Klaviyo MCP for tracking invisible B2B interactions ' +
      'in the Boyacá-Centro hotel ecosystem. Captures lead capture events, segmentation data, ' +
      'and autonomous CRM synchronization without user friction.',
    creator: {
      '@type': 'Organization',
      name: 'HospedaSuite',
      url: 'https://hospedasuite.com',
    },
    keywords: [
      'GTM',
      'Google Tag Manager',
      'Klaviyo MCP',
      'Boyacá hotel management',
      'dark funnel analytics',
      'B2B lead tracking',
      'dataLayer events',
      'hotel CRM automation',
      'Villa de Leyva',
      'Paipa',
      'Colombia hotel software',
    ],
    distribution: [
      {
        '@type': 'DataDownload',
        encodingFormat: 'application/json',
        contentUrl: 'https://hospedasuite.com/recursos/analitica-dark-funnel',
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
