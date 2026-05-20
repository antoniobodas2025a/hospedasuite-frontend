'use client'

import { Clock, TrendingUp } from 'lucide-react'
import { motion } from 'framer-motion'
import { springGentle } from '@/lib/mac2026/spring'
import { GlassPill } from '@/components/ui/glass'
import { useTranslations } from 'next-intl'

// ============================================================================
// RECENT ACTIVITY — Indicador de actividad reciente para generar urgencia social
//
// Lee mensajes configurables desde el dashboard. Si no hay config, usa defaults.
// Se oculta completamente cuando show_recent_activity es false.
// Usa tokens semanticos del Mac 2026 Design System (success, warning, trust, urgent).
// Animaciones con spring physics via framer-motion.
// ============================================================================

interface ActivityMessage {
  icon: string
  text: string
  color: string // semantic token: text-success | text-warning | text-trust | text-urgent
}

const ICON_MAP: Record<string, React.ElementType> = {
  TrendingUp,
  Clock,
}

const DEFAULT_MESSAGES: ActivityMessage[] = [
  { icon: 'TrendingUp', text: '3 reservas en las ultimas 24 horas', color: 'text-success' },
  { icon: 'Clock', text: '2 personas estan viendo esta propiedad ahora', color: 'text-warning' },
]

// Derives container bg + border from the semantic text color token
const MUTED_MAP: Record<string, string> = {
  'text-success': 'bg-success-muted border-success-border',
  'text-warning': 'bg-warning-muted border-warning-border',
  'text-trust': 'bg-trust-muted border-trust-border',
  'text-urgent': 'bg-urgent-muted border-urgent-border',
}

interface RecentActivityProps {
  messages?: ActivityMessage[] | null
}

export default function RecentActivity({ messages }: RecentActivityProps) {
  const t = useTranslations()
  const DEFAULT_MESSAGES: ActivityMessage[] = [
    { icon: 'TrendingUp', text: t('ota.recentActivity.bookings24h'), color: 'text-success' },
    { icon: 'Clock', text: t('ota.recentActivity.viewingNow'), color: 'text-warning' },
  ]
  const activityMessages = messages && messages.length > 0 ? messages : DEFAULT_MESSAGES

  return (
    <div className="flex flex-wrap gap-3 mb-6">
      {activityMessages.map((item, i) => {
        const Icon = ICON_MAP[item.icon] || TrendingUp
        const mutedClasses = MUTED_MAP[item.color] || 'bg-muted border-border'
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springGentle(), delay: i * 0.15 }}
          >
            <GlassPill className={`flex items-center gap-2 px-4 py-2 ${mutedClasses}`}>
              <Icon size={14} className={item.color} />
              <span className={`text-xs font-bold ${item.color}`}>{item.text}</span>
            </GlassPill>
          </motion.div>
        )
      })}
    </div>
  )
}
