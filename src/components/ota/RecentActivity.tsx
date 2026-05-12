import { Clock, TrendingUp } from 'lucide-react';

// ============================================================================
// RECENT ACTIVITY — Indicador de actividad reciente para generar urgencia social
//
// Muestra actividad simulada hasta que exista tabla de bookings real.
// Cuando exista el sistema real, se reemplaza por datos de la DB.
// ============================================================================

interface RecentActivityProps {
  hotelName: string;
}

// Datos placeholder — REEMPLAZAR con consulta real a bookings
const ACTIVITY_MESSAGES = [
  { icon: TrendingUp, text: '3 reservas en las ultimas 24 horas', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  { icon: Clock, text: '2 personas estan viendo esta propiedad ahora', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
];

export default function RecentActivity({ hotelName }: RecentActivityProps) {
  return (
    <div className="flex flex-wrap gap-3 mb-6">
      {ACTIVITY_MESSAGES.map((item, i) => {
        const Icon = item.icon;
        return (
          <div
            key={i}
            className={`flex items-center gap-2 px-4 py-2 rounded-full ${item.bg} border ${item.border} animate-in fade-in slide-in-from-bottom-2 duration-500`}
            style={{ animationDelay: `${i * 200}ms` }}
          >
            <Icon size={14} className={item.color} />
            <span className={`text-xs font-bold ${item.color}`}>{item.text}</span>
          </div>
        );
      })}
    </div>
  );
}
