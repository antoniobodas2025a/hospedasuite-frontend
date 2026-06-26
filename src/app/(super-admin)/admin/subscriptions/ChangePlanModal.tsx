'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { changePlanAction } from '@/app/actions/super-admin';
import { SAAS_PLANS, type PlanKey } from '@/config/saas-plans';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { ArrowLeftRight, Loader2, Zap } from 'lucide-react';

interface ChangePlanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscriptionId: string;
  currentPlan: PlanKey;
  hotelName: string;
}

const planKeys: PlanKey[] = ['starter', 'pro', 'enterprise'];

export default function ChangePlanModal({
  open,
  onOpenChange,
  subscriptionId,
  currentPlan,
  hotelName,
}: ChangePlanModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedPlan, setSelectedPlan] = useState<PlanKey>(currentPlan);
  const [error, setError] = useState<string | null>(null);

  const currentPlanDef = SAAS_PLANS[currentPlan];
  const selectedPlanDef = SAAS_PLANS[selectedPlan];

  const handleSubmit = async () => {
    setError(null);
    startTransition(async () => {
      const result = await changePlanAction(subscriptionId, selectedPlan);
      if (result.success) {
        onOpenChange(false);
        router.refresh();
      } else {
        setError(result.error ?? 'Error al cambiar el plan.');
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md bg-card border border-white/10 rounded-[var(--radius-squircle-2xl)]"
        showCloseButton
      >
        <DialogHeader>
          <DialogTitle className="text-white text-lg font-bold flex items-center gap-2">
            <ArrowLeftRight className="size-5 text-indigo-400" />
            Cambiar Plan
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Cambiá el plan de suscripción de{' '}
            <span className="text-white font-medium">{hotelName}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {currentPlanDef && (
            <div className="bg-white/5 border border-white/10 rounded-[var(--radius-squircle-lg)] p-3">
              <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-1">
                Plan actual
              </p>
              <p className="text-white text-sm flex items-center gap-2">
                <Zap className="size-3.5 text-indigo-400" />
                {currentPlanDef.label} — $
                {currentPlanDef.priceCOP.toLocaleString()} COP/mes
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-300">
              Nuevo plan
            </label>
            <Select
              value={selectedPlan}
              onValueChange={(v) => {
                setSelectedPlan(v as PlanKey);
                setError(null);
              }}
            >
              <SelectTrigger className="w-full bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Seleccionar plan" />
              </SelectTrigger>
              <SelectContent className="bg-card border-white/10">
                {planKeys.map((key) => {
                  const plan = SAAS_PLANS[key];
                  return (
                    <SelectItem key={key} value={key} className="text-white">
                      <span className="flex items-center justify-between w-full gap-4">
                        <span>{plan.label}</span>
                        <span className="text-zinc-400 text-xs">
                          ${plan.priceCOP.toLocaleString()} COP/mes
                        </span>
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {selectedPlanDef &&
            currentPlanDef &&
            selectedPlan !== currentPlan && (
              <div
                className={`${
                  selectedPlanDef.level > currentPlanDef.level
                    ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
                    : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                } border rounded-[var(--radius-squircle-lg)] px-3 py-2`}
              >
                <p className="text-xs">
                  {selectedPlanDef.level > currentPlanDef.level
                    ? '⚠️ Esto es un upgrade — el hotel obtendrá más funcionalidades.'
                    : '⚠️ Esto es un downgrade — el hotel perderá funcionalidades.'}
                </p>
              </div>
            )}

          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-[var(--radius-squircle-lg)] px-3 py-2">
              <p className="text-rose-400 text-xs">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            className="border-white/10 text-zinc-400 hover:text-white"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending || selectedPlan === currentPlan}
            className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2"
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ArrowLeftRight className="size-4" />
            )}
            Cambiar Plan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
