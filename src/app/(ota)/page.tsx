import ChannelDashboard from '@/components/ota/ChannelDashboard';
import { fetchChannelHotelsAction } from '@/app/actions/ota'; // Importamos la nueva acción

export const dynamic = 'force-dynamic';

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
      <ChannelDashboard 
        initialHotels={initialHotels} 
        initialHasMore={initialHasMore} // Pasamos la nueva propiedad al cliente
      />
    </main>
  );
}