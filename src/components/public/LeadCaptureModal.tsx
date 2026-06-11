'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { X, Loader2, ArrowRight } from 'lucide-react';
import { createPublicLeadAction } from '@/app/actions/public-lead';

// ============================================================================
// LEAD CAPTURE MODAL — Formulario de baja fricción para "Mes Gratis"
//
// Máximo 4 campos obligatorios (Tesler's Law).
// Tras capturar el lead, redirige al wizard de onboarding para configurar
// el hotel completo (habitaciones, galería, pagos, etc.).
// ============================================================================

interface LeadCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPlan?: string;
  roomCount?: number; // S3: Dynamic room count from slider
}

export default function LeadCaptureModal({
  isOpen,
  onClose,
  defaultPlan = 'pro',
  roomCount = 1,
}: LeadCaptureModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    business_name: '',
    city: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Requerido';
    if (!formData.email.trim()) newErrors.email = 'Requerido';
    else if (!formData.email.includes('@')) newErrors.email = 'Email inválido';
    if (!formData.phone.trim()) newErrors.phone = 'Requerido';
    if (!formData.business_name.trim())
      newErrors.business_name = 'Requerido';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    startTransition(async () => {
      const result = await createPublicLeadAction({
        ...formData,
        plan_interest: defaultPlan,
        room_count: roomCount, // S3: Inject room count into payload
      });

      if (result.success) {
        // Cierre del bucle: Inyectar evento en dataLayer para Analytics/Klaviyo
        if (typeof window !== 'undefined' && window.dataLayer) {
          window.dataLayer.push({
            event: 'lead_captured',
            city: formData.city,
            roomCount: roomCount,
            plan: defaultPlan,
            attackLine: result.attackLine, // Viene del server action
          });
        }

        // S1: Lead capturado → redirect al wizard con datos pre-hidratados
        const params = new URLSearchParams({
          plan: defaultPlan,
          email: formData.email,
          rooms: String(roomCount),
        });
        router.push(`/software/onboarding?${params.toString()}`);
      } else {
        setErrors({ form: result.error || 'Error al enviar. Intentá de nuevo.' });
      }
    });
  };

  const handleClose = () => {
    setFormData({ name: '', email: '', phone: '', business_name: '', city: '' });
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-[28px] p-8 sm:p-10 max-w-md w-full shadow-[0_24px_80px_rgba(0,0,0,0.12)] border border-black/[0.04]">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#f5f5f7] flex items-center justify-center hover:bg-[#e8e8ed] transition-colors"
        >
          <X size={16} className="text-[#1d1d1f]/40" />
        </button>

        {/* Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#34c759]/10 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-[#34c759] animate-pulse" />
            <span className="text-[11px] font-semibold text-[#34c759] tracking-wide uppercase">
              1 Mes Gratis — Sin compromiso
            </span>
          </div>
          <h3 className="text-2xl font-semibold tracking-tight text-[#1d1d1f] mb-2">
            Activá tu prueba gratuita
          </h3>
          <p className="text-[14px] text-[#1d1d1f]/50">
            Completá estos datos y te configuramos todo. Sin tarjeta de crédito.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Nombre */}
          <div>
            <label className="block text-[13px] font-semibold text-[#1d1d1f]/60 mb-1.5 uppercase tracking-wide">
              Tu nombre
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`w-full px-4 py-3 rounded-[14px] bg-[#f5f5f7] border text-[15px] text-[#1d1d1f] placeholder:text-[#1d1d1f]/25 focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 transition-all ${
                errors.name ? 'border-red-400' : 'border-black/[0.06]'
              }`}
              placeholder="Ej: María García"
            />
            {errors.name && <p className="text-[12px] text-red-500 mt-1">{errors.name}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="block text-[13px] font-semibold text-[#1d1d1f]/60 mb-1.5 uppercase tracking-wide">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className={`w-full px-4 py-3 rounded-[14px] bg-[#f5f5f7] border text-[15px] text-[#1d1d1f] placeholder:text-[#1d1d1f]/25 focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 transition-all ${
                errors.email ? 'border-red-400' : 'border-black/[0.06]'
              }`}
              placeholder="maria@tuhotel.com"
            />
            {errors.email && <p className="text-[12px] text-red-500 mt-1">{errors.email}</p>}
          </div>

          {/* Teléfono + Negocio (2 cols) */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] font-semibold text-[#1d1d1f]/60 mb-1.5 uppercase tracking-wide">
                WhatsApp
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className={`w-full px-4 py-3 rounded-[14px] bg-[#f5f5f7] border text-[15px] text-[#1d1d1f] placeholder:text-[#1d1d1f]/25 focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 transition-all ${
                  errors.phone ? 'border-red-400' : 'border-black/[0.06]'
                }`}
                placeholder="+57 300 123 4567"
              />
              {errors.phone && <p className="text-[12px] text-red-500 mt-1">{errors.phone}</p>}
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-[#1d1d1f]/60 mb-1.5 uppercase tracking-wide">
                Alojamiento
              </label>
              <input
                type="text"
                value={formData.business_name}
                onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                className={`w-full px-4 py-3 rounded-[14px] bg-[#f5f5f7] border text-[15px] text-[#1d1d1f] placeholder:text-[#1d1d1f]/25 focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 transition-all ${
                  errors.business_name ? 'border-red-400' : 'border-black/[0.06]'
                }`}
                placeholder="Glamping Sol"
              />
              {errors.business_name && (
                <p className="text-[12px] text-red-500 mt-1">{errors.business_name}</p>
              )}
            </div>
          </div>

          {/* Ciudad (opcional) */}
          <div>
            <label className="block text-[13px] font-semibold text-[#1d1d1f]/60 mb-1.5 uppercase tracking-wide">
              Ciudad <span className="text-[#1d1d1f]/25 normal-case">(opcional)</span>
            </label>
            <input
              type="text"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              className="w-full px-4 py-3 rounded-[14px] bg-[#f5f5f7] border border-black/[0.06] text-[15px] text-[#1d1d1f] placeholder:text-[#1d1d1f]/25 focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 transition-all"
              placeholder="Ej: Salento, Eje Cafetero"
            />
          </div>

          {/* Form error */}
          {errors.form && (
            <p className="text-[13px] text-red-500 text-center">{errors.form}</p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-[#0071e3] text-white py-4 rounded-full text-[15px] font-semibold hover:bg-[#0077ED] transition-all duration-200 shadow-[0_4px_16px_rgba(0,113,227,0.25)] hover:shadow-[0_8px_32px_rgba(0,113,227,0.35)] hover:-translate-y-0.5 active:scale-[0.97] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center gap-2"
          >
            {isPending ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                Activar Mes Gratis
                <ArrowRight size={16} />
              </>
            )}
          </button>

          <p className="text-[12px] text-[#1d1d1f]/30 text-center font-medium">
            Sin tarjeta de crédito · Instalación VIP incluida
          </p>
        </form>
      </div>
    </div>
  );
}
