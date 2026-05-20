import Link from 'next/link';
import { Lock, ArrowUpRight, ShieldCheck, AlertTriangle, CreditCard } from 'lucide-react';
import { PLAN_LEVELS, PLAN_LABELS, type PlanKey, hasPlanAccess } from '@/config/saas-plans';

/**
 * PlanGuard — Server component que protege rutas según el plan de suscripción.
 * Si el plan actual no alcanza, muestra un upgrade prompt en vez del contenido.
 * También verifica el estado de la suscripción (past_due, cancelled).
 * 
 * Uso:
 *   <PlanGuard currentPlan={hotel.subscription_plan} requiredPlan="pro">
 *     <ProtectedContent />
 *   </PlanGuard>
 */

type Plan = PlanKey;

const PLAN_COLORS: Record<Plan, string> = {
  starter: 'text-muted-foreground',
  pro: 'text-indigo-400',
  enterprise: 'text-amber-400',
};

interface PlanGuardProps {
  children: React.ReactNode;
  currentPlan?: string;
  subscriptionStatus?: string;
  requiredPlan: Plan;
  featureName: string;
  featureDescription?: string;
}

export default function PlanGuard({
  children,
  currentPlan = 'starter',
  subscriptionStatus = 'active',
  requiredPlan,
  featureName,
  featureDescription,
}: PlanGuardProps) {
  const currentPlanKey = (currentPlan as PlanKey) || 'starter';

  // 🚨 Caso 1: Suscripción cancelada
  if (subscriptionStatus === 'cancelled') {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="max-w-md w-full glass-card rounded-[var(--radius-squircle-3xl)] p-10 border border-red-500/30 text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20">
            <AlertTriangle className="size-7 text-red-400" strokeWidth={1.5} />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-foreground">
              Suscripción Cancelada
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Tu suscripción fue cancelada. Tus datos están disponibles por 30 días para exportar.
            </p>
          </div>
          <Link
            href="/dashboard/billing"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-bold text-sm rounded-[var(--radius-squircle-xl)] hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
          >
            <CreditCard size={16} />
            Reactivar suscripción
            <ArrowUpRight size={14} />
          </Link>
        </div>
      </div>
    );
  }

  // ⚠️ Caso 2: Pago pendiente (past_due)
  if (subscriptionStatus === 'past_due') {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="max-w-md w-full glass-card rounded-[var(--radius-squircle-3xl)] p-10 border border-amber-500/30 text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
            <AlertTriangle className="size-7 text-amber-400" strokeWidth={1.5} />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-foreground">
              Pago Pendiente
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Tu último pago fue rechazado. Regularizá tu facturación para seguir usando {featureName}.
            </p>
          </div>
          <Link
            href="/dashboard/billing"
            className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 text-white font-bold text-sm rounded-[var(--radius-squircle-xl)] hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/20"
          >
            <CreditCard size={16} />
            Ir a Facturación
            <ArrowUpRight size={14} />
          </Link>
        </div>
      </div>
    );
  }

  // 🔒 Caso 3: Plan insuficiente
  if (!hasPlanAccess(currentPlanKey, requiredPlan)) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="max-w-md w-full glass-card rounded-[var(--radius-squircle-3xl)] p-10 border border-border/50 text-center space-y-6">
          {/* Icono de bloqueo */}
          <div className="mx-auto w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center border border-border">
            <Lock className="size-7 text-muted-foreground" strokeWidth={1.5} />
          </div>

          {/* Título y descripción */}
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-foreground">
              {featureName} requiere Plan {PLAN_LABELS[requiredPlan]}
            </h3>
            {featureDescription && (
              <p className="text-sm text-muted-foreground leading-relaxed">
                {featureDescription}
              </p>
            )}
          </div>

          {/* Plan actual vs requerido */}
          <div className="flex items-center justify-center gap-3 py-3">
            <span className={`text-xs font-bold uppercase tracking-wider ${PLAN_COLORS[currentPlanKey]}`}>
              {PLAN_LABELS[currentPlanKey]}
            </span>
            <span className="text-muted-foreground/30">→</span>
            <span className={`text-xs font-bold uppercase tracking-wider ${PLAN_COLORS[requiredPlan]}`}>
              {PLAN_LABELS[requiredPlan]}
            </span>
          </div>

          {/* CTA de upgrade */}
          <div className="space-y-3 pt-2">
            <Link
              href="/dashboard/billing"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-bold text-sm rounded-[var(--radius-squircle-xl)] hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
            >
              <ShieldCheck size={16} />
              Ver planes y actualizar
              <ArrowUpRight size={14} />
            </Link>

            <p className="text-xs text-muted-foreground/60">
              1 mes gratis en cualquier plan. Cancelá cuando quieras.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ✅ Plan y estado OK — renderizar contenido
  return <>{children}</>;
}
