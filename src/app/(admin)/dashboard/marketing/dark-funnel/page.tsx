import DarkFunnelMetrics from '@/components/dashboard/DarkFunnelMetrics';

export const dynamic = 'force-dynamic';

export default function DarkFunnelDashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dark Funnel Analytics</h1>
          <p className="text-gray-400 mt-1">
            Métricas de adquisición silenciosa: tráfico de IA, interceptos de crisis y leads capturados.
          </p>
        </div>
      </div>

      <DarkFunnelMetrics />
    </div>
  );
}
