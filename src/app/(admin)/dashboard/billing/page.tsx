import { getCurrentHotel } from '@/lib/hotel-context';
import PlanUpgradeSection from '@/components/billing/PlanUpgradeSection';
import { SAAS_PLANS, normalizePlan, PLAN_LABELS } from '@/config/saas-plans';
import { isTrialActive, getTrialEndDateDisplay, daysRemainingInTrial, type TrialHotel } from '@/lib/trial-check';
import Link from 'next/link';
import {
  Shield,
  CreditCard,
  Calendar,
  Check,
  ExternalLink,
  FileText,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

// ——— Helpers ———

const STATUS_LABEL: Record<string, string> = {
  trialing: 'En Prueba',
  active: 'Activo',
  past_due: 'Pago Pendiente',
  cancelled: 'Cancelado',
};

const STATUS_COLOR: Record<string, string> = {
  trialing: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  active: 'text-brand-400 bg-brand-500/10 border-brand-500/20',
  past_due: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  cancelled: 'text-muted-foreground bg-muted border-border',
};

// ——— Component ———

export default async function BillingPage() {
  const hotel = await getCurrentHotel();

  if (!hotel) {
    return (
      <div className="flex items-center justify-center h-[80vh] text-muted-foreground font-medium">
        No se encontró información del hotel.
      </div>
    );
  }

  const planKey = normalizePlan(hotel.subscription_plan);
  const plan = SAAS_PLANS[planKey];
  const status = (hotel.subscription_status as string) || 'trialing';
  const billingCycleStart = hotel.billing_cycle_start as string | null;
  const datePaid = hotel.date_paid as string | null;

  // 🧪 Trial helpers
  const trialHotel: TrialHotel = {
    subscription_status: hotel.subscription_status,
    subscription_plan: hotel.subscription_plan,
    trial_ends_at: hotel.trial_ends_at,
  };
  const trialActive = isTrialActive(trialHotel);
  const trialEndDate = getTrialEndDateDisplay(trialHotel);
  const trialDaysLeft = daysRemainingInTrial(trialHotel);

  // Próxima fecha de facturación (estimada: inicio del ciclo + 1 mes)
  const nextBillingDate = billingCycleStart
    ? new Date(billingCycleStart).toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  return (
    <div className="h-full space-y-[var(--space-breath)]">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-sidebar-foreground">
            Facturación y Plan
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestioná tu suscripción y revisá tus cargos mensuales.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/billing/invoices"
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-sidebar-foreground transition-colors font-medium"
          >
            <FileText size={14} />
            Historial de Facturas
            <ExternalLink size={12} />
          </Link>
          <Link
            href="/software/terms"
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-sidebar-foreground transition-colors font-medium"
            target="_blank"
          >
            <Shield size={14} />
            Términos del Servicio
            <ExternalLink size={12} />
          </Link>
        </div>
      </div>

      {/* Status Card */}
      <div className="glass-card p-[var(--space-breath)] rounded-[var(--radius-squircle-3xl)] border border-border shadow-2xl ring-1 ring-inset ring-border">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          {/* Plan + Status */}
          <div className="flex items-center gap-4">
            <div className="size-14 rounded-[var(--radius-squircle-xl)] bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
              <CreditCard size={24} className="text-brand-400 stroke-[1.5]" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="text-xl font-bold tracking-tight text-sidebar-foreground">
                  Plan {PLAN_LABELS[planKey]}
                </span>
                <span
                  className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full border ${STATUS_COLOR[status] || STATUS_COLOR.trialing}`}
                >
                  {STATUS_LABEL[status] || 'Desconocido'}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {trialActive
                  ? 'Período de prueba gratis'
                  : `$${plan.priceCOP.toLocaleString('es-CO')} COP / mes`}
                {status === 'trialing' && trialDaysLeft !== null &&
                  ` — Quedan ${trialDaysLeft} días`}
                {status === 'trialing' && trialDaysLeft === null &&
                  ' — Facturación inicia al terminar el mes gratis'}
              </p>
            </div>
          </div>

          {/* Timeline */}
          <div className="flex flex-wrap items-center gap-4 text-sm">
            {status === 'trialing' && trialEndDate && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar size={15} className="text-emerald-400" />
                <span>
                  Prueba gratuita hasta{' '}
                  <strong className="text-sidebar-foreground">{trialEndDate}</strong>
                </span>
              </div>
            )}

            {status === 'active' && nextBillingDate && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar size={15} className="text-brand-400" />
                <span>
                  Próxima facturación:{' '}
                  <strong className="text-sidebar-foreground">{nextBillingDate}</strong>
                </span>
              </div>
            )}

            {datePaid && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Check size={15} className="text-emerald-400" />
                <span>
                  Último pago:{' '}
                  <strong className="text-sidebar-foreground">
                    {new Date(datePaid).toLocaleDateString('es-CO', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </strong>
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Charges Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-[var(--space-focus)]">
        <div className="glass-card p-6 rounded-[var(--radius-squircle-2xl)] border border-border shadow-xl">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
            Plan Mensual
          </p>
          <p className="text-3xl font-semibold tracking-tight text-sidebar-foreground">
            {trialActive ? '$0' : `$${plan.priceCOP.toLocaleString('es-CO')}`}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {trialActive ? 'Trial activo — sin cargo' : 'COP / mes'}
          </p>
        </div>

        <div className="glass-card p-6 rounded-[var(--radius-squircle-2xl)] border border-border shadow-xl">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
            Comisiones Estimadas
          </p>
          <p className="text-3xl font-semibold tracking-tight text-sidebar-foreground">
            Variable
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            10% OTA · Facturado a fin de mes
          </p>
        </div>

        <div className="glass-card p-6 rounded-[var(--radius-squircle-2xl)] border border-border shadow-xl">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
            Total Estimado
          </p>
          <p className="text-3xl font-semibold tracking-tight text-sidebar-foreground">
            {trialActive ? '$0' : `$${plan.priceCOP.toLocaleString('es-CO')}`}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            + comisiones del período (se calculan al cierre)
          </p>
        </div>
      </div>

      {/* Payment CTA — Solo visible si no está en trial activo */}
      {status !== 'trialing' && (
        <div className="glass-panel p-[var(--space-breath)] rounded-[var(--radius-squircle-3xl)] border border-border shadow-2xl ring-1 ring-inset ring-border">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-sidebar-foreground mb-1">
                ¿Listo para pagar?
              </h2>
              <p className="text-sm text-muted-foreground">
                La facturación es manual vía Wompi. Más abajo podés elegir tu plan
                y pagar directamente con Wompi.
              </p>
            </div>
            <Link
              href="#cambiar-plan"
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-brand-500 text-white font-semibold text-sm hover:bg-brand-600 transition-all shadow-lg shadow-brand-500/20 active:scale-95 flex-shrink-0"
            >
              Ver Planes
              <ExternalLink size={16} />
            </Link>
          </div>
        </div>
      )}

      {/* Sección de Cambio de Plan */}
      <div id="cambiar-plan" className="mt-8">
        <PlanUpgradeSection
          hotelId={hotel.id}
          currentPlan={planKey}
          hotelName={hotel.name || 'Hotel'}
        />
      </div>

      {/* Footer Note */}
      <p className="text-[11px] text-muted-foreground/50 text-center pt-4">
        ¿Necesitás ayuda con la facturación? Escribinos a{' '}
        <a
          href="mailto:soporte@hospedasuite.com"
          className="text-brand-400 hover:underline"
        >
          soporte@hospedasuite.com
        </a>
      </p>
    </div>
  );
}
