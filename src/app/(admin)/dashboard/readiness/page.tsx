import { getCurrentHotel } from '@/lib/hotel-context';
import { redirect } from 'next/navigation';
import { getReadinessAction } from '@/app/actions/readiness';
import ReadinessScore from '@/components/dashboard/ReadinessScore';
import ReadinessChecklist from '@/components/dashboard/ReadinessChecklist';
import GoLiveCTA from '@/components/dashboard/GoLiveCTA';

export const dynamic = 'force-dynamic';

export default async function ReadinessPage() {
  const hotel = await getCurrentHotel();
  if (!hotel) redirect('/login');

  const result = await getReadinessAction(hotel.id);

  if (!result.success || !result.data) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 font-poppins">
        <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-[var(--radius-squircle-2xl)] max-w-md text-center">
          <p className="text-sm text-rose-400 font-medium">
            {result.error ?? 'No se pudo cargar el estado de readiness.'}
          </p>
        </div>
      </div>
    );
  }

  const { score, completedCount, totalCount, isGoLiveReady, planLabel, items } = result.data;

  // After migration 020, hotels.* includes go_live and go_live_at columns
  const isAlreadyLive = !!(hotel as unknown as Record<string, unknown>).go_live;

  return (
    <div className="h-full space-y-10 font-poppins">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Listo para Vender</h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          Verificá que tu hotel cumpla con todos los requisitos antes de publicar.
        </p>
      </div>

      {/* Score gauge */}
      <div className="flex justify-center">
        <ReadinessScore
          score={score}
          completedCount={completedCount}
          totalCount={totalCount}
          isGoLiveReady={isGoLiveReady}
          planLabel={planLabel}
        />
      </div>

      {/* Go Live CTA */}
      <div className="flex justify-center">
        <GoLiveCTA
          hotelId={hotel.id}
          isGoLiveReady={isGoLiveReady}
          isAlreadyLive={isAlreadyLive}
          items={items}
        />
      </div>

      {/* Checklist */}
      <ReadinessChecklist items={items} className="max-w-2xl" />
    </div>
  );
}
