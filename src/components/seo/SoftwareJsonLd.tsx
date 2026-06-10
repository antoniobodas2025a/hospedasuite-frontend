// ============================================================================
// SOFTWARE JSON-LD — Structured data para SEO de la landing /software
//
// Combina SoftwareApplication (categoría BusinessApplication) + FAQPage
// para rich snippets en Google. Inyecta las FAQs obligatorias del blueprint:
// - ¿Qué es el Channel Manager? (seguro anti-sobreventa)
// - ¿Cómo funciona el pago? (100% directo a cuenta Wompi)
// ============================================================================

export default function SoftwareJsonLd() {
  const softwareSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'SoftwareApplication',
        '@id': 'https://hospedasuite.com/software#software',
        name: 'HospedaSuite PMS',
        description:
          'HospedaSuite es un PMS y Channel Manager diseñado para que hoteles boutique y glampings centralicen su operación. Funciona como el cerebro del hotel, permitiendo recibir reservas directas vía WhatsApp con cero por ciento de comisión y bloqueando automáticamente el inventario en plataformas como Booking y Airbnb para evitar sobreventas.',
        url: 'https://hospedasuite.com/software',
        image: 'https://hospedasuite.com/logo.png',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        offers: [
          {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'COP',
            description: 'Plan Free: 1 habitación gratis para siempre. Sin tarjeta de crédito.',
          },
          {
            '@type': 'Offer',
            price: '49000',
            priceCurrency: 'COP',
            description: 'Plan Starter desde $49.000 COP/mes para 1-4 habitaciones. 1 mes gratis.',
          },
          {
            '@type': 'Offer',
            price: '99000',
            priceCurrency: 'COP',
            description: 'Plan Pro desde $99.000 COP/mes para 5-14 habitaciones. Channel Manager incluido.',
          },
          {
            '@type': 'Offer',
            price: '199000',
            priceCurrency: 'COP',
            description: 'Plan Enterprise desde $199.000 COP/mes para 15-30 habitaciones. Soporte prioritario.',
          },
        ],
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: '4.8',
          ratingCount: '120',
          bestRating: '5',
          worstRating: '1',
        },
        featureList: [
          '0% comisión en canales propios (WhatsApp, Teléfono, Web)',
          'Channel Manager integrado (Booking, Airbnb)',
          '1 Mes Gratis de Garantía de Extensión',
          'POS (Punto de Venta) integrado',
          'Carta Digital QR',
          'Libro de Registro Forense',
        ],
        publisher: {
          '@type': 'Organization',
          name: 'HospedaSuite Inc.',
          url: 'https://hospedasuite.com',
        },
      },
      {
        '@type': 'FAQPage',
        '@id': 'https://hospedasuite.com/software#faq',
        mainEntity: [
          {
            '@type': 'Question',
            name: '¿Cuál es la diferencia entre el Motor Propio y la Red de Descubrimiento?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'El Motor Propio (0% comisión) es tu link personal para compartir en WhatsApp, Instagram o Facebook. Las reservas que llegan por ahí son 100% tuyas. La Red de Descubrimiento (10%) es el marketplace de HospedaSuite donde viajeros nuevos encuentran tu hotel. El 10% es un costo por adquisición de cliente nuevo, no una comisión extractiva como las OTAs tradicionales (15-25%).',
            },
          },
          {
            '@type': 'Question',
            name: '¿Qué es el Channel Manager?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Es un seguro anti-sobreventa conectado a Booking.com y Airbnb. Nuestro sistema se sincroniza en tiempo real: si vendés una habitación en HospedaSuite, se bloquea automáticamente en las otras plataformas para evitar sobreventas.',
            },
          },
          {
            '@type': 'Question',
            name: '¿Cómo funciona el pago?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Tu hotel recibe el 100% del dinero de las reservas directamente en tu cuenta de Wompi. HospedaSuite no retiene ningún porcentaje de tus reservas directas. Al finalizar cada mes, se genera una factura con el costo de tu plan.',
            },
          },
          {
            '@type': 'Question',
            name: '¿Cuánto cuesta HospedaSuite?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'El Plan Free es gratis para siempre con 1 habitación. El Plan Starter cuesta $49.000 COP/mes para 1-4 habitaciones. El Plan Pro (recomendado) cuesta $99.000 COP/mes para 5-14 habitaciones. El Plan Enterprise es $199.000 COP/mes para 15-30 habitaciones. Todos incluyen 1 mes gratis.',
            },
          },
          {
            '@type': 'Question',
            name: '¿Qué pasa si agrego una segunda habitación?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'El Plan Free incluye 1 habitación. Al agregar una segunda, el sistema te sugiere escalar al Plan Starter ($49.000 COP/mes para hasta 4 habitaciones). El upgrade es inmediato y solo pagás desde el mes siguiente.',
            },
          },
          {
            '@type': 'Question',
            name: '¿Qué pasa si no tengo reservas en el primer mes?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Si en 30 días no te generamos al menos 1 reserva, te regalamos 1 mes adicional de forma gratuita hasta que lo logremos. Esta es nuestra Garantía de Extensión.',
            },
          },
        ],
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
    />
  );
}
