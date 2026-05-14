/**
 * ⚠️ SubscriptionBanner — Banner persistente para hoteles con problemas de suscripción
 *
 * Se muestra en el dashboard cuando:
 * - subscription_status = 'past_due' (pago pendiente)
 * - subscription_status = 'cancelled' (cancelado)
 * - trial está por expirar (≤3 días)
 */

import Link from 'next/link';
import { AlertTriangle, CreditCard, Clock, ArrowUpRight } from 'lucide-react';
import { isTrialActive, daysRemainingInTrial, type TrialHotel } from '@/lib/trial-check';

interface SubscriptionBannerProps {
  subscriptionStatus?: string | null;
  trialHotel?: TrialHotel;
}

export default function SubscriptionBanner({
  subscriptionStatus,
  trialHotel,
}: SubscriptionBannerProps) {
  // 🚨 Caso 1: Cancelado
  if (subscriptionStatus === 'cancelled') {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-[var(--radius-squircle-xl)] p-4 flex items-center gap-3">
        <AlertTriangle className="size-5 text-red-400 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-red-400">
            Suscripción cancelada
          </p>
          <p className="text-xs text-red-400/70">
            Tus datos estarán disponibles por 30 días. Reactivá para seguir usando HospedaSuite.
          </p>
        </div>
        <Link
          href="/dashboard/billing"
          className="flex items-center gap-1 text-xs font-bold text-red-400 hover:text-red-300 transition-colors flex-shrink-0"
        >
          Reactivar
          <ArrowUpRight size={12} />
        </Link>
      </div>
    );
  }

  // ⚠️ Caso 2: Pago pendiente
  if (subscriptionStatus === 'past_due') {
    return (
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-[var(--radius-squircle-xl)] p-4 flex items-center gap-3">
        <AlertTriangle className="size-5 text-amber-400 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-amber-400">
            Pago pendiente
          </p>
          <p className="text-xs text-amber-400/70">
            Tu último pago fue rechazado. Algunas funciones están limitadas hasta regularizar.
          </p>
        </div>
        <Link
          href="/dashboard/billing"
          className="flex items-center gap-1 text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors flex-shrink-0"
        >
          Pagar ahora
          <ArrowUpRight size={12} />
        </Link>
      </div>
    );
  }

  // ⏰ Caso 3: Trial por expirar (≤3 días)
  if (trialHotel && isTrialActive(trialHotel)) {
    const daysLeft = daysRemainingInTrial(trialHotel);
    if (daysLeft !== null && daysLeft <= 3) {
      return (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-[var(--radius-squircle-xl)] p-4 flex items-center gap-3">
          <Clock className="size-5 text-blue-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-blue-400">
              {daysLeft === 0
                ? 'Tu trial expira hoy'
                : `Tu trial expira en ${daysLeft} día${daysLeft > 1 ? 's' : ''}`}
            </p>
            <p className="text-xs text-blue-400/70">
              Seleccioná un plan para seguir disfrutando de HospedaSuite sin interrupciones.
            </p>
          </div>
          <Link
            href="/dashboard/billing"
            className="flex items-center gap-1 text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors flex-shrink-0"
          >
            Ver planes
            <ArrowUpRight size={12} />
          </Link>
        </div>
      );
    }
  }

  // ✅ Sin problemas — no mostrar banner
  return null;
}
