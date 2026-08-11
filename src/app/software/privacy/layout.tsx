import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Política de Privacidad — HospedaSuite',
  description: 'Política de Tratamiento de Datos Personales de HospedaSuite. Cumplimiento Ley 1581 de 2012, Decreto 1377 de 2013. Derechos ARCO, finalidades, transferencia internacional.',
  openGraph: {
    title: 'Política de Privacidad — HospedaSuite',
    description: 'Política de Tratamiento de Datos Personales. Ley 1581/2012.',
    type: 'article',
  },
  alternates: {
    canonical: 'https://hospedasuite.com/software/privacy',
  },
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
