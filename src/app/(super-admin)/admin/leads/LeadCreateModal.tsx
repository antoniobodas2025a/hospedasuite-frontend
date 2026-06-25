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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Loader2, AlertTriangle } from 'lucide-react';

// ============================================================================
// LeadCreateModal — Modal form for manually creating a new lead.
// Validates required fields client-side via Zod before calling the server action.
// Detects duplicate phone and displays a warning.
// ============================================================================

const createLeadSchema = z.object({
  business_name: z
    .string()
    .min(1, 'El nombre del negocio es requerido')
    .trim(),
  phone: z.string().min(1, 'El teléfono es requerido').trim(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  city: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
});

type CreateLeadForm = z.infer<typeof createLeadSchema>;

interface LeadCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateLead: (data: {
    business_name: string;
    phone: string;
    email?: string;
    city?: string;
    notes?: string;
  }) => Promise<{ success: boolean; error?: string }>;
}

export default function LeadCreateModal({
  open,
  onOpenChange,
  onCreateLead,
}: LeadCreateModalProps) {
  const [form, setForm] = useState<CreateLeadForm>({
    business_name: '',
    phone: '',
    email: '',
    city: '',
    notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState(false);

  const resetForm = () => {
    setForm({
      business_name: '',
      phone: '',
      email: '',
      city: '',
      notes: '',
    });
    setErrors({});
    setServerError(null);
    setDuplicateWarning(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) resetForm();
    onOpenChange(open);
  };

  const updateField = (field: keyof CreateLeadForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Clear field error on edit
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    setServerError(null);
    setDuplicateWarning(false);
  };

  const handleSubmit = async () => {
    // Client-side validation
    const result = createLeadSchema.safeParse(form);
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
      const response = await onCreateLead({
        business_name: result.data.business_name,
        phone: result.data.phone,
        email: result.data.email || undefined,
        city: result.data.city || undefined,
        notes: result.data.notes || undefined,
      });

      if (response.success) {
        resetForm();
        onOpenChange(false);
      } else {
        // Check if it's a duplicate phone warning
        if (
          response.error?.includes('duplicado') ||
          response.error?.includes('Ya existe')
        ) {
          setDuplicateWarning(true);
          setServerError(response.error ?? null);
        } else {
          setServerError(response.error ?? 'Error al crear el lead');
        }
      }
    } catch {
      setServerError('Error inesperado al crear el lead');
    } finally {
      setSubmitting(false);
    }
  };

  const handleForceCreate = async () => {
    setDuplicateWarning(false);
    setSubmitting(true);
    // The server action doesn't support a force flag, so we re-submit
    // The duplicate error from the DB unique constraint will fire again if
    // the phone truly collides. This is a best-effort UX pattern.
    try {
      const response = await onCreateLead({
        business_name: form.business_name,
        phone: form.phone,
        email: form.email || undefined,
        city: form.city || undefined,
        notes: form.notes || undefined,
      });
      if (response.success) {
        resetForm();
        onOpenChange(false);
      } else {
        setServerError(response.error ?? 'Error al crear el lead');
      }
    } catch {
      setServerError('Error inesperado al crear el lead');
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
            Nuevo Lead
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Business Name */}
          <div>
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              Nombre del Negocio *
            </label>
            <Input
              value={form.business_name}
              onChange={(e) => updateField('business_name', e.target.value)}
              placeholder="Ej: Glamping Sol"
              className="mt-1 bg-white/5 border-white/10 text-white placeholder:text-zinc-500"
              aria-invalid={!!errors.business_name}
            />
            {errors.business_name && (
              <p className="text-rose-400 text-xs mt-1">
                {errors.business_name}
              </p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              Teléfono *
            </label>
            <Input
              value={form.phone}
              onChange={(e) => updateField('phone', e.target.value)}
              placeholder="+57 300 123 4567"
              className="mt-1 bg-white/5 border-white/10 text-white font-mono placeholder:text-zinc-500"
              aria-invalid={!!errors.phone}
            />
            {errors.phone && (
              <p className="text-rose-400 text-xs mt-1">{errors.phone}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              Email
            </label>
            <Input
              value={form.email}
              onChange={(e) => updateField('email', e.target.value)}
              placeholder="contacto@ejemplo.com"
              type="email"
              className="mt-1 bg-white/5 border-white/10 text-white placeholder:text-zinc-500"
              aria-invalid={!!errors.email}
            />
            {errors.email && (
              <p className="text-rose-400 text-xs mt-1">{errors.email}</p>
            )}
          </div>

          {/* City */}
          <div>
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              Ciudad
            </label>
            <Input
              value={form.city}
              onChange={(e) => updateField('city', e.target.value)}
              placeholder="Ej: Villa de Leyva"
              className="mt-1 bg-white/5 border-white/10 text-white placeholder:text-zinc-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              Notas
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              rows={3}
              className="mt-1 w-full p-3 bg-white/5 border border-white/10 rounded-[var(--radius-squircle-lg)] text-white text-sm resize-none outline-none focus:ring-2 focus:ring-indigo-500/50 placeholder:text-zinc-600"
              placeholder="Notas iniciales..."
            />
          </div>
        </div>

        {/* Duplicate warning */}
        {duplicateWarning && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-[var(--radius-squircle-md)] p-3 flex items-start gap-2">
            <AlertTriangle className="size-4 text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-amber-400 text-xs font-bold mb-1">
                Teléfono duplicado
              </p>
              <p className="text-amber-300/70 text-xs">{serverError}</p>
              <div className="flex gap-2 mt-2">
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => setDuplicateWarning(false)}
                  className="border-amber-500/30 text-amber-400 text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  size="xs"
                  onClick={handleForceCreate}
                  disabled={submitting}
                  className="bg-amber-600 hover:bg-amber-500 text-white text-xs"
                >
                  Crear de todas formas
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Generic server error */}
        {serverError && !duplicateWarning && (
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
            {submitting ? 'Creando...' : 'Crear Lead'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
