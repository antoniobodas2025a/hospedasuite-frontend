// ============================================================================
// ORGANIZATION JSON-LD — Structured data for Brand Identity & Social Profiles
// ============================================================================
// Injects Organization schema with sameAs links to validate social presence
// for search engines and AI crawlers (E-E-A-T compliance).

export default function OrganizationJsonLd() {
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': 'https://hospedasuite.com/#organization',
    name: 'HospedaSuite',
    url: 'https://hospedasuite.com',
    logo: 'https://hospedasuite.com/logo.png',
    sameAs: [
      'https://instagram.com/suitehospeda',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      url: 'https://hospedasuite.com/software',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
    />
  );
}
