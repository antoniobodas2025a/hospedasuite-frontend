'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { grantSuperadminRoleAction } from '@/app/actions/super-admin';
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
import { ShieldCheck, Loader2, Mail } from 'lucide-react';

interface GrantRoleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function GrantRoleModal({
  open,
  onOpenChange,
}: GrantRoleModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      setError('Ingresá un email válido.');
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await grantSuperadminRoleAction(trimmed);
      if (result.success) {
        setEmail('');
        onOpenChange(false);
        router.refresh();
      } else {
        setError(result.error ?? 'Error al otorgar el rol.');
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
            <ShieldCheck className="size-5 text-blue-400" />
            Otorgar Rol Superadmin
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Ingresá el email del usuario al que querés dar acceso de
            superadministrador.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="grant-email" className="text-zinc-300">
              Email del usuario
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
              <Input
                id="grant-email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                }}
                placeholder="usuario@ejemplo.com"
                className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-zinc-500"
              />
            </div>
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
            onClick={() => {
              setEmail('');
              setError(null);
              onOpenChange(false);
            }}
            disabled={isPending}
            className="border-white/10 text-zinc-400 hover:text-white"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending || !email.trim()}
            className="bg-blue-600 hover:bg-blue-500 text-white gap-2"
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ShieldCheck className="size-4" />
            )}
            Otorgar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
