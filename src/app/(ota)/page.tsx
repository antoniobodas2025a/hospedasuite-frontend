import OTADashboard from '@/components/ota/OTADashboard';
import { fetchOTAHotelsAction } from '@/app/actions/ota'; // Importamos la nueva acción

export const dynamic = 'force-dynamic';

export default async function OTAMarketplacePage() {
  // Solicitamos la Página 0 con límite de 24
  const response = await fetchOTAHotelsAction(0, 24);
  
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