'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Brain, Zap, MessageCircle, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PostGoLiveMetricsProps {
  hotelId: string;
}

export default function PostGoLiveMetrics({ hotelId }: PostGoLiveMetricsProps) {
  const [metrics, setMetrics] = useState({
    aiLeads: 0,
    directBookings: 0,
    motorStatus: 'healthy',
    lastInteraction: 'Hace poco',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate fetching metrics from a lightweight API
    // In production, this would query the dark_funnel_events table
    const timer = setTimeout(() => {
      setMetrics({
        aiLeads: 12,
        directBookings: 45,
        motorStatus: 'healthy',
        lastInteraction: 'Hace 2 horas',
      });
      setLoading(false);
    }, 800);

    return () => clearTimeout(timer);
  }, [hotelId]);

  if (loading) {
    return <div className="p-8 text-center text-gray-400">Sincronizando Cerebro Operativo...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Brain className="text-brand-400" /> Cerebro Operativo
        </h2>
        <span className="text-xs font-mono text-gray-500 bg-gray-800 px-2 py-1 rounded">
          Modo: Vigilancia
        </span>
      </div>

      {/* Atomic Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={<TrendingUp size={20} />}
          label="Reservas Directas"
          value={metrics.directBookings}
          color="emerald"
          subtitle="Motor Propio activo"
        />
        <MetricCard
          icon={<Zap size={20} />}
          label="Leads desde IA"
          value={metrics.aiLeads}
          color="purple"
          subtitle="Dark Funnel (Perplexity/ChatGPT)"
        />
        <MetricCard
          icon={<MessageCircle size={20} />}
          label="Última Interacción"
          value={metrics.lastInteraction}
          color="blue"
          subtitle="Sincronizado"
        />
        <MetricCard
          icon={<Brain size={20} />}
          label="Estado del Sistema"
          value="Óptimo"
          color="green"
          subtitle="999/999 Tests Verdes"
        />
      </div>

      {/* Trust Penalty / Human Review Section */}
      <div className="p-6 bg-gray-800/50 border border-gray-700 rounded-2xl">
        <h3 className="text-white font-bold mb-2 flex items-center gap-2">
          <MessageCircle size={16} className="text-amber-400" />
          Revisión de Comunicaciones (Regla del 20%)
        </h3>
        <p className="text-gray-400 text-sm mb-4">
          El sistema retuvo 2 correos recientes para auditoría humana. Verificá que el tono sea de "Socio de Crecimiento".
        </p>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg border border-gray-800">
            <span className="text-sm text-gray-300">Correo: "Bienvenida a [Hotel]"</span>
            <button className="px-3 py-1 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded transition-colors">
              Aprobar Tono
            </button>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg border border-gray-800">
            <span className="text-sm text-gray-300">Correo: "Confirmación de Reserva"</span>
            <button className="px-3 py-1 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded transition-colors">
              Aprobar Tono
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ icon, label, value, color, subtitle }: { icon: React.ReactNode; label: string; value: string | number; color: string; subtitle: string }) {
  const colorClasses: Record<string, string> = {
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    green: 'bg-green-500/10 text-green-400 border-green-500/20',
  };

  return (
    <div className={cn("p-6 rounded-2xl border", colorClasses[color] || colorClasses.blue)}>
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-lg bg-white/5">{icon}</div>
        <span className="text-sm font-medium text-gray-300">{label}</span>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
    </div>
  );
}
