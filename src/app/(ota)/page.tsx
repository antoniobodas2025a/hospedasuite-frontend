import type { Metadata } from 'next';
import OTADashboard from '@/components/ota/OTADashboard';
import { fetchChannelHotelsAction } from '@/app/actions/ota';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Encuentra Hoteles Boutique y Glampings en Colombia | HospedaSuite',
  description: 'Descubre hoteles boutique, glampings y cabañas en Colombia. Reserva directa sin comisiones. Villa de Leyva, Paipa, Tunja y más.',
  openGraph: {
    title: 'Hoteles Boutique en Colombia | HospedaSuite',
    description: 'Descubre y reserva hoteles boutique y glampings en Colombia.',
    type: 'website',
  },
};

export default async function ChannelEcosistemaPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedParams = await searchParams;
  const location = (resolvedParams?.location as string) || '';

  // Solicitamos la Página 0 con límite de 24
  const response = await fetchChannelHotelsAction(0, 24, 'all', '', location);
  
  const initialHotels = response.success ? response.data : [];
  const initialHasMore = response.success ? response.hasMore : false;

  return (
    <main>
      <OTADashboard 
        initialHotels={initialHotels} 
        initialHasMore={initialHasMore} // Pasamos la nueva propiedad al cliente
      />
    </main>
  );
}