'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { extendTrialAction } from '@/app/actions/super-admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Clock, Loader2, Calendar } from 'lucide-react';

interface ExtendTrialModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscriptionId: string;
  currentTrialEnd: string;
  hotelName: string;
}

export default function ExtendTrialModal({
  open,
  onOpenChange,
  subscriptionId,
  currentTrialEnd,
  hotelName,
}: ExtendTrialModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [days, setDays] = useState('7');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const daysNum = parseInt(days, 10);
    if (isNaN(daysNum) || daysNum <= 0) {
      setError('Ingresá un número válido de días (mayor a 0).');
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await extendTrialAction(subscriptionId, daysNum);
      if (result.success) {
        onOpenChange(false);
        router.refresh();
      } else {
        setError(result.error ?? 'Error al extender el período de prueba.');
      }
    });
  };

  const trialEndDate = new Date(currentTrialEnd);
  const isValidDate = !isNaN(trialEndDate.getTime());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md bg-card border border-white/10 rounded-[var(--radius-squircle-2xl)]"
        showCloseButton
      >
        <DialogHeader>
          <DialogTitle className="text-white text-lg font-bold flex items-center gap-2">
            <Clock className="size-5 text-amber-400" />
            Extender Período de Prueba
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Extendé el período de prueba de{' '}
            <span className="text-white font-medium">{hotelName}</span> por la
            cantidad de días especificada.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isValidDate && (
            <div className="bg-white/5 border border-white/10 rounded-[var(--radius-squircle-lg)] p-3">
              <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-1">
                Fin de prueba actual
              </p>
              <p className="text-white text-sm flex items-center gap-2">
                <Calendar className="size-3.5 text-zinc-400" />
                {trialEndDate.toLocaleDateString('es-CO', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="trial-days" className="text-zinc-300">
              Días a extender
            </Label>
            <Input
              id="trial-days"
              type="number"
              min="1"
              max="365"
              value={days}
              onChange={(e) => {
                setDays(e.target.value);
                setError(null);
              }}
              className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500"
              placeholder="7"
            />
            <p className="text-[10px] text-zinc-500">
              Mínimo 1 día, máximo 365 días.
            </p>
          </div>

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
            disabled={isPending}
            className="bg-amber-600 hover:bg-amber-500 text-white gap-2"
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Clock className="size-4" />
            )}
            Extender
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
