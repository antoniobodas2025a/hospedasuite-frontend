import { Clock, TrendingUp } from 'lucide-react';

// ============================================================================
// RECENT ACTIVITY — Indicador de actividad reciente para generar urgencia social
//
// Lee mensajes configurables desde el dashboard. Si no hay config, usa defaults.
// Se oculta completamente cuando show_recent_activity es false.
// ============================================================================

interface ActivityMessage {
  icon: string;
  text: string;
  color: string;
}

const ICON_MAP: Record<string, React.ElementType> = {
  TrendingUp,
  Clock,
};

const DEFAULT_MESSAGES: ActivityMessage[] = [
  { icon: 'TrendingUp', text: '3 reservas en las ultimas 24 horas', color: 'text-emerald-600' },
  { icon: 'Clock', text: '2 personas estan viendo esta propiedad ahora', color: 'text-amber-600' },
];

const COLOR_BG_MAP: Record<string, { bg: string; border: string }> = {
  'text-emerald-600': { bg: 'bg-emerald-50', border: 'border-emerald-200' },
  'text-amber-600': { bg: 'bg-amber-50', border: 'border-amber-200' },
  'text-blue-600': { bg: 'bg-blue-50', border: 'border-blue-200' },
  'text-rose-600': { bg: 'bg-rose-50', border: 'border-rose-200' },
  'text-purple-600': { bg: 'bg-purple-50', border: 'border-purple-200' },
};

interface RecentActivityProps {
  messages?: ActivityMessage[] | null;
}

export default function RecentActivity({ messages }: RecentActivityProps) {
  const activityMessages = (messages && messages.length > 0) ? messages : DEFAULT_MESSAGES;

  return (
    <div className="flex flex-wrap gap-3 mb-6">
      {activityMessages.map((item, i) => {
        const Icon = ICON_MAP[item.icon] || TrendingUp;
        const colors = COLOR_BG_MAP[item.color] || { bg: 'bg-zinc-50', border: 'border-zinc-200' };
        return (
          <div
            key={i}
            className={`flex items-center gap-2 px-4 py-2 rounded-full ${colors.bg} border ${colors.border} animate-in fade-in slide-in-from-bottom-2 duration-500`}
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
