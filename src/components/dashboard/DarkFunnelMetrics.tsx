'use client';

import { useState, useEffect } from 'react';
import { getDarkFunnelMetrics, DarkFunnelMetrics } from '@/app/actions/dark-funnel';
import { TrendingUp, Users, MapPin, Bot, AlertTriangle } from 'lucide-react';

export default function DarkFunnelMetrics() {
  const [metrics, setMetrics] = useState<DarkFunnelMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDarkFunnelMetrics().then((res) => {
      if (res.success && res.data) {
        setMetrics(res.data);
      }
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-gray-400">Cargando métricas...</div>;
  }

  if (!metrics) {
    return <div className="p-8 text-center text-red-400">Error al cargar métricas</div>;
  }

  return (
    <div className="space-y-6">
      {/* Top Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card icon={<Users size={20} />} label="Leads Capturados" value={metrics.totalLeads} color="blue" />
        <Card icon={<Bot size={20} />} label="Referidos de IA" value={metrics.aiReferrals.total} color="purple" />
        <Card icon={<AlertTriangle size={20} />} label="Interceptos de Crisis" value={metrics.trendIntercepts} color="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI Referrals Breakdown */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6">
          <h3 className="text-white font-bold mb-4 flex items-center gap-2">
            <Bot size={18} className="text-purple-400" />
            Tráfico de Inteligencia Artificial
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-300">ChatGPT</span>
              <span className="text-white font-mono">{metrics.aiReferrals.chatgpt}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Perplexity</span>
              <span className="text-white font-mono">{metrics.aiReferrals.perplexity}</span>
            </div>
            <div className="pt-3 border-t border-gray-700 flex justify-between items-center">
              <span className="text-gray-400">Total</span>
              <span className="text-white font-bold">{metrics.aiReferrals.total}</span>
            </div>
          </div>
        </div>

        {/* Top Cities */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6">
          <h3 className="text-white font-bold mb-4 flex items-center gap-2">
            <MapPin size={18} className="text-blue-400" />
            Ciudades con Más Leads
          </h3>
          <div className="space-y-3">
            {metrics.topCities.length === 0 ? (
              <p className="text-gray-500 text-sm">Sin datos aún</p>
            ) : (
              metrics.topCities.map((c, i) => (
                <div key={c.city} className="flex justify-between items-center">
                  <span className="text-gray-300">{i + 1}. {c.city}</span>
                  <span className="text-white font-mono">{c.leads}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent Leads Table */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6">
        <h3 className="text-white font-bold mb-4 flex items-center gap-2">
          <TrendingUp size={18} className="text-green-400" />
          Leads Recientes
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-gray-400 border-b border-gray-700">
              <tr>
                <th className="pb-3 font-medium">Email</th>
                <th className="pb-3 font-medium">Ciudad</th>
                <th className="pb-3 font-medium">Línea de Ataque</th>
                <th className="pb-3 font-medium">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {metrics.recentLeads.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-gray-500">Sin leads registrados</td>
                </tr>
              ) : (
                metrics.recentLeads.map((lead) => (
                  <tr key={lead.id} className="text-gray-300">
                    <td className="py-3">{lead.email}</td>
                    <td className="py-3">{lead.city}</td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded text-xs font-mono ${
                        lead.attack_line.includes('ORGULLO') ? 'bg-blue-500/20 text-blue-300' :
                        lead.attack_line.includes('RIESGO') ? 'bg-green-500/20 text-green-300' :
                        lead.attack_line.includes('RESCATE') ? 'bg-amber-500/20 text-amber-300' :
                        'bg-gray-700 text-gray-300'
                      }`}>
                        {lead.attack_line}
                      </span>
                    </td>
                    <td className="py-3 text-gray-500">{new Date(lead.created_at).toLocaleDateString('es-CO')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Card({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  };

  return (
    <div className={`p-6 rounded-2xl border ${colorClasses[color] || colorClasses.blue}`}>
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-lg bg-white/5">{icon}</div>
        <span className="text-sm font-medium text-gray-300">{label}</span>
      </div>
      <div className="text-3xl font-bold text-white">{value}</div>
    </div>
  );
}
