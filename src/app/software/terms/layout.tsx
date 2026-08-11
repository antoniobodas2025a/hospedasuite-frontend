import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Términos y Condiciones — HospedaSuite',
  description: 'Términos y Condiciones de uso de la plataforma HospedaSuite. Condiciones del servicio, responsabilidades, pagos, cancelaciones.',
  openGraph: {
    title: 'Términos y Condiciones — HospedaSuite',
    description: 'Términos y Condiciones de uso de HospedaSuite.',
    type: 'article',
  },
  alternates: {
    canonical: 'https://hospedasuite.com/software/terms',
  },
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
