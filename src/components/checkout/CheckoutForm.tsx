'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck, ArrowRight, ArrowLeft, User, Mail, Phone, CreditCard, Loader2, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPendingBookingAction } from '@/app/actions/bookings';
import { Hotel, Room } from '@/types';
import { shakeHaptic, desaturateFeedback, springSnappy, springGentle } from '@/lib/mac2026/spring';

interface CheckoutFormProps {
  hotel: Hotel;
  room: Room;
  checkIn: string;
  checkOut: string;
  nights: number;
  basePrice: number;
  isOta: boolean;
}

/**
 * Deterministic hash for booking-scoped sessionStorage keys.
 * Same roomId + checkIn + checkOut produces the same key,
 * so state survives refresh but not a different booking.
 */
function hashBookingKey(roomId: string, checkIn: string, checkOut: string): string {
  const raw = `${roomId}:${checkIn}:${checkOut}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) - hash) + raw.charCodeAt(i);
    hash |= 0;
  }
  return `checkout-${Math.abs(hash).toString(36).slice(0, 12)}`;
}

/**
 * Mac 2026 — Ley de Hick: 1 decision por pantalla.
 * Step 1: Datos personales (quien reserva) — obligatorio
 * Step 2: Pago (confirmar y pagar)
 *
 * Upsells removed (R5): never had a revenue backend, zero revenue impact.
 */
export default function CheckoutForm({ hotel, room, checkIn, checkOut, nights, basePrice, isOta }: CheckoutFormProps) {
  const storageKey = hashBookingKey(room.id, checkIn, checkOut);

  const [step, setStep] = useState<1 | 2>(() => {
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.step === 1 || parsed.step === 2) return parsed.step;
      }
    } catch { /* private browsing fallback */ }
    return 1;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState(() => {
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.formData) return parsed.formData;
      }
    } catch { /* private browsing fallback */ }
    return { fullName: '', email: '', phone: '', document: '' };
  });
  const [formError, setFormError] = useState<string | null>(null);

  // Mac 2026: Price coherence with RoomCard — IVA 19% included in total
  const subtotal = basePrice;
  const taxes = Math.round(subtotal * 0.19);
  const grandTotal = subtotal + taxes;

  // Persist state to sessionStorage on every change (booking-scoped key)
  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify({ step, formData }));
    } catch { /* private browsing fallback */ }
  }, [step, formData, storageKey]);

  const handleNext = () => {
    if (step === 1) {
      if (!formData.fullName || !formData.email || !formData.document || !formData.phone) {
        setFormError("Por favor, completa todos tus datos personales.");
        shakeHaptic();
        return;
      }
      setFormError(null);
      setStep(2);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setFormError(null);
      setStep(1);
    }
  };

  const handlePayment = async () => {
    setFormError(null);
    setIsSubmitting(true);

    const payload = {
      ...formData,
      amount: grandTotal,
      roomId: room.id,
      checkin: checkIn,
      checkout: checkOut,
      source: (isOta ? 'ota' : 'direct') as 'ota' | 'direct',
      upsells: [],
    };

    const result = await createPendingBookingAction(payload);

    if (!result?.success || !result?.bookingId) {
      setFormError(`Ocurrio un error al procesar tu solicitud: ${result?.error || 'Desconocido'}`);
      shakeHaptic();
      setIsSubmitting(false);
      return;
    }

    const amountInCents = Math.round(Number(grandTotal) * 100);
    const rawKey = process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY || '';
    const cleanPublicKey = rawKey.replace(/['"\s\r\n]+/g, '');

    if (!cleanPublicKey) {
      setFormError("Error del sistema: Pasarela de pago no configurada.");
      shakeHaptic();
      setIsSubmitting(false);
      return;
    }

    const redirectUrl = `${window.location.origin}/book/success?id=${result.bookingId}`;

    const wompiUrl = new URL('https://checkout.wompi.co/p/');
    wompiUrl.searchParams.append('public-key', cleanPublicKey);
    wompiUrl.searchParams.append('currency', 'COP');
    wompiUrl.searchParams.append('amount-in-cents', amountInCents.toString());
    wompiUrl.searchParams.append('reference', result.bookingId);
    wompiUrl.searchParams.append('redirect-url', redirectUrl);

    window.location.href = wompiUrl.toString();
  };

  return (
    <motion.div
      animate={formError ? desaturateFeedback.animate : desaturateFeedback.initial}
      transition={desaturateFeedback.transition}
    >
      {/* Step Indicator — 2 steps: Datos → Pago */}
      <div className="flex items-center justify-center mb-[var(--space-breath)]">
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Step 1: Datos */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className={`size-7 sm:size-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold transition-all ${
              step === 1 ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/30' : step > 1 ? 'bg-brand-100 text-brand-600' : 'bg-muted text-muted-foreground'
            }`}>
              {step > 1 ? <Check size={12} /> : '1'}
            </div>
            <span className={`text-[10px] sm:text-sm font-bold ${step === 1 ? 'text-foreground' : 'text-muted-foreground'}`}>
              Datos
            </span>
          </div>

          <div className={`w-6 sm:w-10 h-0.5 transition-all ${step > 1 ? 'bg-brand-500' : 'bg-border'}`} />

          {/* Step 2: Pago */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className={`size-7 sm:size-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold transition-all ${
              step === 2 ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/30' : 'bg-muted text-muted-foreground'
            }`}>
              2
            </div>
            <span className={`text-[10px] sm:text-sm font-bold ${step === 2 ? 'text-foreground' : 'text-muted-foreground'}`}>
              Pago
            </span>
          </div>
        </div>
      </div>

      {/* Mobile: compact summary bar at top */}
      <div className="lg:hidden mb-6">
        <div className="bg-foreground p-4 rounded-[var(--radius-squircle-2xl)] text-background">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold">{room.name}</p>
              <p className="text-xs text-background/60">{nights} {nights === 1 ? 'noche' : 'noches'} · {checkIn} → {checkOut}</p>
            </div>
            <p className="text-lg font-black">${grandTotal.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div id="checkout-form" className="grid grid-cols-1 lg:grid-cols-12 gap-[var(--space-breath)] items-start">
        <div className="lg:col-span-7">
          <AnimatePresence mode="wait">
            {step === 1 ? (
              /* STEP 1: Personal data — 1 decision: quien reserva */
              <motion.section
                key="step1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={springGentle()}
                className="bg-card p-6 sm:p-8 rounded-[var(--radius-squircle-3xl)] shadow-sm border border-border"
              >
                <h2 className="text-xl font-bold text-foreground mb-2">Tus Datos</h2>
                <p className="text-muted-foreground text-sm mb-6">Necesitamos tus datos para confirmar la reserva. Tu informacion esta segura.</p>
                <div className="space-y-[var(--space-focus)]">
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                    <input required type="text" placeholder="Nombre Completo" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} className="w-full pl-12 pr-4 py-4 bg-muted/50 border border-border rounded-[var(--radius-squircle-xl)] text-foreground font-bold outline-none focus:ring-2 focus:ring-brand-400 transition-all min-h-[56px]" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-[var(--space-focus)]">
                    <div className="relative">
                      <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                      <input required type="text" placeholder="Documento (CC/Pasaporte)" value={formData.document} onChange={e => setFormData({...formData, document: e.target.value})} className="w-full pl-12 pr-4 py-4 bg-muted/50 border border-border rounded-[var(--radius-squircle-xl)] text-foreground font-bold outline-none focus:ring-2 focus:ring-brand-400 transition-all min-h-[56px]" />
                    </div>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                      <input required type="tel" placeholder="WhatsApp" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full pl-12 pr-4 py-4 bg-muted/50 border border-border rounded-[var(--radius-squircle-xl)] text-foreground font-bold outline-none focus:ring-2 focus:ring-brand-400 transition-all min-h-[56px]" />
                    </div>
                  </div>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                    <input required type="email" placeholder="Correo Electronico" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full pl-12 pr-4 py-4 bg-muted/50 border border-border rounded-[var(--radius-squircle-xl)] text-foreground font-bold outline-none focus:ring-2 focus:ring-brand-400 transition-all min-h-[56px]" />
                  </div>
                </div>

                {/* Error feedback */}
                <AnimatePresence>
                  {formError && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-[var(--radius-squircle-xl)] text-sm text-red-400 text-center"
                    >
                      {formError}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Navigation */}
                <div className="flex justify-end items-center gap-3 mt-8 pt-6 border-t border-border">
                  <motion.button
                    type="button"
                    onClick={handleNext}
                    whileTap={{ scale: 0.97 }}
                    transition={springSnappy()}
                    className="w-full sm:w-auto px-8 py-4 bg-foreground text-background rounded-[var(--radius-squircle-xl)] font-bold flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-cta min-h-[48px]"
                  >
                    Continuar <ArrowRight size={18} />
                  </motion.button>
                </div>
              </motion.section>
            ) : (
              /* STEP 2: Payment confirmation — 1 decision: pagar */
              <motion.section
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={springGentle()}
                className="bg-card p-6 sm:p-8 rounded-[var(--radius-squircle-3xl)] shadow-sm border border-border"
              >
                <h2 className="text-xl font-bold text-foreground mb-2">Confirmar y Pagar</h2>
                <p className="text-muted-foreground text-sm mb-6">Revisa los datos y confirma. Seras redirigido a Wompi para completar el pago seguro.</p>

                {/* Guest summary */}
                <div className="bg-muted/30 p-5 rounded-[var(--radius-squircle-xl)] border border-border mb-6">
                  <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">
                    Huesped
                  </p>
                  <p className="font-bold text-foreground">{formData.fullName}</p>
                  <p className="text-sm text-muted-foreground">{formData.document} · {formData.phone}</p>
                  <p className="text-sm text-muted-foreground">{formData.email}</p>
                </div>

                <div id="checkout-form-step2">
                  {/* Error feedback */}
                  <AnimatePresence>
                    {formError && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-[var(--radius-squircle-xl)] text-sm text-red-400 text-center"
                      >
                        {formError}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Navigation */}
                  <div className="flex flex-col-reverse sm:flex-row justify-between items-center gap-3">
                    <motion.button
                      type="button"
                      onClick={handleBack}
                      whileTap={{ scale: 0.97 }}
                      transition={springSnappy()}
                      className="w-full sm:w-auto px-6 py-4 text-muted-foreground hover:text-foreground rounded-[var(--radius-squircle-xl)] font-bold flex items-center justify-center gap-2 transition-all min-h-[48px]"
                    >
                      <ArrowLeft size={18} /> Volver
                    </motion.button>
                    <motion.button
                      type="button"
                      onClick={handlePayment}
                      disabled={isSubmitting}
                      whileTap={{ scale: 0.97 }}
                      transition={springSnappy()}
                      style={{ backgroundColor: hotel.primary_color || '#0ea5e9' }}
                      className="w-full sm:w-auto px-8 py-4 text-background rounded-[var(--radius-squircle-xl)] font-bold flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-cta disabled:opacity-50 disabled:scale-100 min-h-[48px]"
                    >
                      {isSubmitting ? <><Loader2 className="animate-spin" size={20}/> Procesando...</> : <>Pagar Seguro <ArrowRight size={18}/></>}
                    </motion.button>
                  </div>
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </div>

        {/* Summary Panel — desktop only (mobile has compact bar above) */}
        <div className="hidden lg:block lg:col-span-5">
          <div className="sticky top-8">
            <section className="bg-foreground p-8 rounded-[var(--radius-squircle-3xl)] shadow-2xl text-background">
              <h2 className="text-xl font-bold mb-6">Resumen de Reserva</h2>
              <div className="space-y-[var(--space-focus)] mb-[var(--space-breath)] border-b border-background/20 pb-[var(--space-breath)]">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-background/60 text-sm">{room.name}</p>
                    <p className="font-bold">{nights} {nights === 1 ? 'Noche' : 'Noches'}</p>
                    <p className="text-xs text-background/40 mt-1">{checkIn} al {checkOut}</p>
                  </div>
                  <p className="font-bold">${basePrice.toLocaleString()}</p>
                </div>
                {/* IVA breakdown — Mac 2026: price coherence with RoomCard */}
                <div className="flex justify-between items-start text-background/40">
                  <p className="text-xs">IVA (19%)</p>
                  <p className="text-xs font-bold">${taxes.toLocaleString()}</p>
                </div>
              </div>
              <div className="flex justify-between items-end mb-8">
                <p className="text-background/60">Total a Pagar</p>
                <p className="text-3xl font-black">${grandTotal.toLocaleString()} <span className="text-sm text-background/40 font-medium">COP</span></p>
              </div>

              {/* Error feedback — Mac 2026: organic haptic response */}
              <AnimatePresence>
                {formError && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-[var(--radius-squircle-xl)] text-sm text-red-400 text-center"
                  >
                    {formError}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="mt-6 flex items-center justify-center gap-2 text-xs text-background/60 font-medium">
                <ShieldCheck size={16} className="text-secondary" /> Transaccion 100% segura
              </div>
              {hotel.cancellation_policy && (
                <div className="mt-4 p-4 bg-background/10 rounded-[var(--radius-squircle-xl)] text-xs text-background/60 leading-relaxed border border-background/20">
                  <span className="font-bold text-background/80 block mb-1">Politica de Cancelacion:</span>
                  {hotel.cancellation_policy}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
