'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { createSuperadminAction } from '@/app/actions/super-admin';
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
import { UserPlus, Loader2, Mail, Lock } from 'lucide-react';

// ─── Zod schema ────────────────────────────────────────────────────────

const createSuperadminSchema = z.object({
  email: z
    .string()
    .min(1, 'El email es requerido.')
    .email('Ingresá un email válido.'),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres.')
    .max(72, 'La contraseña no puede exceder 72 caracteres.'),
});

type FormErrors = {
  email?: string;
  password?: string;
};

interface CreateSuperadminModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateSuperadminModal({
  open,
  onOpenChange,
}: CreateSuperadminModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const handleSubmit = async () => {
    // Validate with Zod
    const result = createSuperadminSchema.safeParse({ email, password });
    if (!result.success) {
      const errors: FormErrors = {};
      for (const issue of result.error.issues) {
        const path = issue.path[0] as string;
        if (!errors[path as keyof FormErrors]) {
          errors[path as keyof FormErrors] = issue.message;
        }
      }
      setFieldErrors(errors);
      setServerError(null);
      return;
    }

    setFieldErrors({});
    setServerError(null);

    startTransition(async () => {
      const actionResult = await createSuperadminAction(email.trim(), password);
      if (actionResult.success) {
        setEmail('');
        setPassword('');
        onOpenChange(false);
        router.refresh();
      } else {
        setServerError(actionResult.error ?? 'Error al crear el superadmin.');
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
            <UserPlus className="size-5 text-emerald-400" />
            Crear Superadmin
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Creá un nuevo usuario con rol de superadministrador. Se creará una
            cuenta en Auth y se le asignará el rol automáticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="create-email" className="text-zinc-300">
              Email
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
              <Input
                id="create-email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, email: undefined }));
                  setServerError(null);
                }}
                placeholder="nuevo@ejemplo.com"
                className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-zinc-500"
              />
            </div>
            {fieldErrors.email && (
              <p className="text-rose-400 text-[10px]">{fieldErrors.email}</p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <Label htmlFor="create-password" className="text-zinc-300">
              Contraseña
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
              <Input
                id="create-password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, password: undefined }));
                  setServerError(null);
                }}
                placeholder="Mínimo 8 caracteres"
                className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-zinc-500"
              />
            </div>
            {fieldErrors.password && (
              <p className="text-rose-400 text-[10px]">
                {fieldErrors.password}
              </p>
            )}
          </div>

          {serverError && (
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-[var(--radius-squircle-lg)] px-3 py-2">
              <p className="text-rose-400 text-xs">{serverError}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setEmail('');
              setPassword('');
              setFieldErrors({});
              setServerError(null);
              onOpenChange(false);
            }}
            disabled={isPending}
            className="border-white/10 text-zinc-400 hover:text-white"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending}
            className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2"
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <UserPlus className="size-4" />
            )}
            Crear Superadmin
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
