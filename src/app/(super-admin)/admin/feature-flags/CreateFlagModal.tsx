'use client';

import React, { useState } from 'react';
import { z } from 'zod/v4';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Loader2 } from 'lucide-react';
import type { CreateFlagInput } from '@/app/actions/superadmin-feature-flags';

// ============================================================================
// CreateFlagModal — Modal form for creating a new feature flag.
// Validates required fields client-side via Zod before calling the server action.
// ============================================================================

const createFlagSchema = z.object({
  flag_key: z
    .string()
    .min(1, 'flag_key es requerido')
    .trim()
    .regex(
      /^[A-Z][A-Z0-9_]*$/,
      'Debe empezar con mayúscula, solo letras, números y _',
    ),
  flag_name: z.string().min(1, 'flag_name es requerido').trim(),
  description: z.string().optional().or(z.literal('')),
  enabled: z.boolean().default(false),
  hotel_id: z.string().optional().or(z.literal('')),
});

type CreateFlagForm = z.infer<typeof createFlagSchema>;

interface CreateFlagModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateFlag: (
    data: CreateFlagInput,
  ) => Promise<{ success: boolean; error?: string }>;
  hotels: { id: string; name: string }[];
}

export default function CreateFlagModal({
  open,
  onOpenChange,
  onCreateFlag,
  hotels,
}: CreateFlagModalProps) {
  const [form, setForm] = useState<CreateFlagForm>({
    flag_key: '',
    flag_name: '',
    description: '',
    enabled: false,
    hotel_id: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const resetForm = () => {
    setForm({
      flag_key: '',
      flag_name: '',
      description: '',
      enabled: false,
      hotel_id: '',
    });
    setErrors({});
    setServerError(null);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) resetForm();
    onOpenChange(open);
  };

  const updateField = (field: keyof CreateFlagForm, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (field !== 'enabled' && errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    setServerError(null);
  };

  const handleSubmit = async () => {
    const result = createFlagSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const path = issue.path[0] as string;
        if (!fieldErrors[path]) {
          fieldErrors[path] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    setServerError(null);

    try {
      const response = await onCreateFlag({
        flag_key: result.data.flag_key,
        flag_name: result.data.flag_name,
        description: result.data.description || undefined,
        enabled: result.data.enabled,
        hotel_id: result.data.hotel_id || null,
      });

      if (response.success) {
        resetForm();
        onOpenChange(false);
      } else {
        setServerError(response.error ?? 'Error al crear el flag');
      }
    } catch {
      setServerError('Error inesperado al crear el flag');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-md bg-card border border-white/10 rounded-[var(--radius-squircle-2xl)]"
        showCloseButton
      >
        <DialogHeader>
          <DialogTitle className="text-white text-lg font-bold flex items-center gap-2">
            <Plus className="size-5 text-indigo-400" />
            Nuevo Feature Flag
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Flag Key */}
          <div>
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              Flag Key *
            </label>
            <Input
              value={form.flag_key}
              onChange={(e) => updateField('flag_key', e.target.value)}
              placeholder="Ej: WIZARD_WOMPI_SUBSCRIPTION"
              className="mt-1 bg-white/5 border-white/10 text-white font-mono placeholder:text-zinc-500"
              aria-invalid={!!errors.flag_key}
            />
            {errors.flag_key && (
              <p className="text-rose-400 text-xs mt-1">{errors.flag_key}</p>
            )}
          </div>

          {/* Flag Name */}
          <div>
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              Nombre *
            </label>
            <Input
              value={form.flag_name}
              onChange={(e) => updateField('flag_name', e.target.value)}
              placeholder="Ej: Wizard Wompi Subscription"
              className="mt-1 bg-white/5 border-white/10 text-white placeholder:text-zinc-500"
              aria-invalid={!!errors.flag_name}
            />
            {errors.flag_name && (
              <p className="text-rose-400 text-xs mt-1">{errors.flag_name}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              Descripción
            </label>
            <textarea
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              rows={3}
              className="mt-1 w-full p-3 bg-white/5 border border-white/10 rounded-[var(--radius-squircle-lg)] text-white text-sm resize-none outline-none focus:ring-2 focus:ring-indigo-500/50 placeholder:text-zinc-600"
              placeholder="Descripción del feature flag..."
            />
          </div>

          {/* Enabled toggle */}
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              Habilitado
            </label>
            <button
              type="button"
              onClick={() => updateField('enabled', !form.enabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-[#09090b] cursor-pointer ${
                form.enabled ? 'bg-blue-600' : 'bg-white/10'
              }`}
              role="switch"
              aria-checked={form.enabled}
            >
              <span
                className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${
                  form.enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Hotel ID (optional) */}
          <div>
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              Hotel (opcional)
            </label>
            <Select
              value={form.hotel_id || 'none'}
              onValueChange={(v) => updateField('hotel_id', v === 'none' ? '' : v)}
            >
              <SelectTrigger className="mt-1 w-full bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Global (sin hotel)" />
              </SelectTrigger>
              <SelectContent className="bg-card border-white/10 max-h-[200px] overflow-y-auto">
                <SelectItem value="none" className="text-zinc-400">
                  Global (sin hotel)
                </SelectItem>
                {hotels.map((hotel) => (
                  <SelectItem key={hotel.id} value={hotel.id} className="text-white">
                    {hotel.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.hotel_id && (
              <p className="text-rose-400 text-xs mt-1">{errors.hotel_id}</p>
            )}
          </div>
        </div>

        {/* Server error */}
        {serverError && (
          <p className="text-rose-400 text-xs bg-rose-500/10 border border-rose-500/20 rounded-[var(--radius-squircle-md)] px-3 py-2">
            {serverError}
          </p>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={submitting}
            className="border-white/10 text-zinc-400 hover:text-white"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2"
          >
            {submitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            {submitting ? 'Creando...' : 'Crear Flag'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
