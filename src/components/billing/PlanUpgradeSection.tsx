'use client';

import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowUpRight, ArrowDownRight, Check, Lock, ShieldCheck } from 'lucide-react';
import { generateBillingPaymentLinkAction } from '@/app/actions/billing';
import { cn } from '@/lib/utils';

// ——— Tipos ———

interface PlanCard {
  id: string;
  name: string;
  price: string;
  period: string;
  features: string[];
  badgeClass: string;
  recommended?: boolean;
}

// ——— Datos de planes (espejo de la página server para el componente cliente) ———

const PLANS: PlanCard[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: '$49.000',
    period: 'COP / mes',
    features: [
      'Motor de Reservas Básico',
      'Calendario Interactivo',
      'Gestión de Huéspedes',
      'Channel Manager (Manual)',
    ],
    badgeClass: 'bg-muted text-muted-foreground border-border',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$99.000',
    period: 'COP / mes',
    features: [
      'Todo lo del Plan Starter',
      'Channel Manager Automatizado (iCal)',
      'Sincronización con Booking/Airbnb',
      'POS (Punto de Venta)',
    ],
    badgeClass: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    recommended: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: '$169.000',
    period: 'COP / mes',
    features: [
      'Todo lo del Plan Pro',
      'Motor de Upselling Inteligente (IA)',
      'Reportes Financieros Avanzados',
      'Facturación Automática',
    ],
    badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  },
];

// ——— Props ———

interface PlanUpgradeSectionProps {
  hotelId: string;
  currentPlan: string;
  hotelName: string;
}

export default function PlanUpgradeSection({
  hotelId,
  currentPlan,
  hotelName,
}: PlanUpgradeSectionProps) {
  const [selectedPlan, setSelectedPlan] = useState<PlanCard | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpgradeClick = useCallback((plan: PlanCard) => {
    setSelectedPlan(plan);
    setError(null);
    setConfirmOpen(true);
  }, []);

  const handlePay = useCallback(async () => {
    if (!selectedPlan) return;

    setLoading(true);
    setError(null);

    try {
      const isUpgrade = selectedPlan.id !== currentPlan;
      const result = await generateBillingPaymentLinkAction(hotelId, isUpgrade);

      if (!result.success || !result.link) {
        setError(result.error || 'Error al generar el enlace de pago.');
        setLoading(false);
        return;
      }

      // Redirigir a Wompi checkout en la misma ventana
      window.location.href = result.link.paymentUrl;
    } catch (err: any) {
      setError('Error inesperado al conectar con Wompi.');
      setLoading(false);
    }
  }, [selectedPlan, hotelId, currentPlan]);

  return (
    <>
      {/* Título de sección */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold tracking-tight text-sidebar-foreground">
          Cambiar de Plan
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Elegí el plan que mejor se adapte a tu propiedad. El pago se procesa por Wompi.
        </p>
      </div>

      {/* Grilla de planes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-[var(--space-focus)]">
        {PLANS.map((plan) => {
          const isCurrent = plan.id === currentPlan;
          const isUpgrade =
            (currentPlan === 'starter' && (plan.id === 'pro' || plan.id === 'enterprise')) ||
            (currentPlan === 'pro' && plan.id === 'enterprise');
          const isDowngrade =
            (currentPlan === 'enterprise' && (plan.id === 'pro' || plan.id === 'starter')) ||
            (currentPlan === 'pro' && plan.id === 'starter');

          return (
            <div
              key={plan.id}
              className={cn(
                'glass-card rounded-[var(--radius-squircle-2xl)] border shadow-xl relative overflow-hidden flex flex-col',
                isCurrent
                  ? 'border-brand-500/30 ring-1 ring-brand-500/20'
                  : 'border-border'
              )}
            >
              {/* Badges superiores */}
              {isCurrent && (
                <div className="absolute top-3 right-3 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20">
                  Plan Actual
                </div>
              )}

              {plan.recommended && !isCurrent && (
                <div className="absolute top-3 right-3 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  Recomendado
                </div>
              )}

              <div className="p-6 flex-1 flex flex-col">
                {/* Nombre del plan */}
                <span
                  className={cn(
                    'text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full border w-fit mb-4',
                    plan.badgeClass
                  )}
                >
                  {plan.name}
                </span>

                {/* Precio */}
                <div className="mb-6">
                  <span className="text-3xl font-semibold tracking-tight text-sidebar-foreground">
                    {plan.price}
                  </span>
                  <span className="text-xs text-muted-foreground ml-1">
                    {plan.period}
                  </span>
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feat, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2.5 text-[13px] text-muted-foreground"
                    >
                      <Check
                        size={14}
                        className="text-emerald-400 flex-shrink-0 mt-0.5"
                        strokeWidth={2.5}
                      />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>

                {/* Botón de acción */}
                <div>
                  {isCurrent ? (
                    <button
                      disabled
                      className="w-full py-2.5 rounded-full text-xs font-semibold border border-border text-muted-foreground flex items-center justify-center gap-2 cursor-not-allowed"
                    >
                      <Lock size={12} />
                      Plan Actual
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUpgradeClick(plan)}
                      className={cn(
                        'w-full py-2.5 rounded-full text-white text-xs font-semibold transition-all flex items-center justify-center gap-2 active:scale-95',
                        isUpgrade
                          ? 'bg-brand-500 hover:bg-brand-600 shadow-lg shadow-brand-500/20'
                          : 'bg-muted-foreground/20 hover:bg-muted-foreground/30 text-sidebar-foreground'
                      )}
                    >
                      {isUpgrade ? (
                        <>
                          Subir a {plan.name}
                          <ArrowUpRight size={12} />
                        </>
                      ) : (
                        <>
                          Bajar a {plan.name}
                          <ArrowDownRight size={12} />
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de confirmación */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold tracking-tight text-sidebar-foreground">
              {selectedPlan?.id === currentPlan
                ? 'Confirmar plan actual'
                : `Cambiar a Plan ${selectedPlan?.name}`}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {selectedPlan?.id === currentPlan
                ? 'Ya estás en este plan. No se realizará ningún cargo.'
                : `Estás por cambiar tu suscripción al plan ${selectedPlan?.name}.`}
            </DialogDescription>
          </DialogHeader>

          {selectedPlan && (
            <div className="space-y-4 py-2">
              {/* Resumen del plan */}
              <div className="glass-card p-4 rounded-[var(--radius-squircle-xl)] border border-border">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-sidebar-foreground">
                    Plan {selectedPlan.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {selectedPlan.period}
                  </span>
                </div>
                <div className="text-2xl font-bold tracking-tight text-sidebar-foreground">
                  {selectedPlan.price}
                </div>
              </div>

              {/* Features incluidas */}
              <ul className="space-y-2">
                {selectedPlan.features.map((feat, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-[13px] text-muted-foreground"
                  >
                    <Check
                      size={14}
                      className="text-emerald-400 flex-shrink-0 mt-0.5"
                      strokeWidth={2.5}
                    />
                    {feat}
                  </li>
                ))}
              </ul>

              {/* Mensaje de error */}
              {error && (
                <p className="text-xs text-red-400 bg-red-500/5 border border-red-500/10 rounded-lg p-3">
                  {error}
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handlePay}
              disabled={loading || selectedPlan?.id === currentPlan}
              className="gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Conectando con Wompi…
                </>
              ) : (
                <>
                  <ShieldCheck size={14} />
                  Pagar con Wompi
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
