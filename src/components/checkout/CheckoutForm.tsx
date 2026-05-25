'use client';

import React, { useState, useEffect } from 'react';
import { Wine, Coffee, HeartHandshake, ShieldCheck, ArrowRight, ArrowLeft, User, Mail, Phone, CreditCard, Loader2, Check } from 'lucide-react';
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

const UPSELL_OPTIONS = [
  { id: 'wine', title: 'Botella de Vino Tinto', description: 'Te espera en tu habitacion al llegar.', price: 75000, icon: Wine },
  { id: 'breakfast', title: 'Desayuno a la Cama', description: 'Servicio exclusivo para 2 personas.', price: 45000, icon: Coffee },
  { id: 'romantic', title: 'Decoracion Romantica', description: 'Petalos, velas y fresas.', price: 120000, icon: HeartHandshake },
];

/**
 * Mac 2026 — Ley de Hick: 1 decision por pantalla.
 * Step 1: Extras (una decision: que agregar) — opcional, skip claro
 * Step 2: Datos personales (una decision: quien reserva) — obligatorio
 * Step 3: Pago (una decision: confirmar y pagar)
 *
 * Guest checkout eliminado: el hotel necesita datos reales para
 * confirmaciones, contacto de emergencia y cumplimiento legal.
 */

export default function CheckoutForm({ hotel, room, checkIn, checkOut, nights, basePrice, isOta }: CheckoutFormProps) {
  const [step, setStep] = useState<1 | 2 | 3>(() => {
    try {
      const saved = sessionStorage.getItem('checkout-state');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.step >= 1 && parsed.step <= 3) return parsed.step;
      }
    } catch { /* private browsing fallback */ }
    return 1;
  });
  const [selectedUpsells, setSelectedUpsells] = useState<string[]>(() => {
    try {
      const saved = sessionStorage.getItem('checkout-state');
      if (saved) return JSON.parse(saved).selectedUpsells || [];
    } catch { /* private browsing fallback */ }
    return [];
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState(() => {
    try {
      const saved = sessionStorage.getItem('checkout-state');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.formData) return parsed.formData;
      }
    } catch { /* private browsing fallback */ }
    return { fullName: '', email: '', phone: '', document: '' };
  });
  const [formError, setFormError] = useState<string | null>(null);

  const upsellsTotal = UPSELL_OPTIONS
    .filter(opt => selectedUpsells.includes(opt.id))
    .reduce((sum, opt) => sum + opt.price, 0);

  // Mac 2026: Price coherence with RoomCard — IVA 19% included in total
  // so consumer sees the same price everywhere on the OTA
  const subtotal = basePrice + upsellsTotal;
  const taxes = Math.round(subtotal * 0.19);
  const grandTotal = subtotal + taxes;

  // Persist state to sessionStorage on every change
  useEffect(() => {
    try {
      sessionStorage.setItem('checkout-state', JSON.stringify({
        step, formData, selectedUpsells,
      }));
    } catch { /* private browsing fallback — form works without persistence */ }
  }, [step, formData, selectedUpsells]);

  const toggleUpsell = (id: string) => {
    setSelectedUpsells(prev => prev.includes(id) ? prev.filter(u => u !== id) : [...prev, id]);
  };

  const handleNext = () => {
    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      if (!formData.fullName || !formData.email || !formData.document || !formData.phone) {
        setFormError("Por favor, completa todos tus datos personales.");
        shakeHaptic();
        return;
      }
      setFormError(null);
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setFormError(null);
      setStep((step - 1) as 1 | 2 | 3);
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
      upsells: selectedUpsells
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
      {/* Step Indicator — Mac 2026: visible on all screens, icon-only on mobile */}
      <div className="flex items-center justify-center mb-[var(--space-breath)]">
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Step 1: Extras */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className={`size-7 sm:size-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold transition-all ${
              step === 1 ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/30' : step > 1 ? 'bg-brand-100 text-brand-600' : 'bg-muted text-muted-foreground'
            }`}>
              {step > 1 ? <Check size={12} /> : '1'}
            </div>
            <span className={`text-[10px] sm:text-sm font-bold ${step === 1 ? 'text-foreground' : 'text-muted-foreground'}`}>
              Extras
            </span>
          </div>

          <div className={`w-6 sm:w-10 h-0.5 transition-all ${step > 1 ? 'bg-brand-500' : 'bg-border'}`} />

          {/* Step 2: Datos */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className={`size-7 sm:size-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold transition-all ${
              step === 2 ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/30' : step > 2 ? 'bg-brand-100 text-brand-600' : 'bg-muted text-muted-foreground'
            }`}>
              {step > 2 ? <Check size={12} /> : '2'}
            </div>
            <span className={`text-[10px] sm:text-sm font-bold ${step === 2 ? 'text-foreground' : 'text-muted-foreground'}`}>
              Datos
            </span>
          </div>

          <div className={`w-6 sm:w-10 h-0.5 transition-all ${step > 2 ? 'bg-brand-500' : 'bg-border'}`} />

          {/* Step 3: Pago */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className={`size-7 sm:size-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold transition-all ${
              step === 3 ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/30' : 'bg-muted text-muted-foreground'
            }`}>
              3
            </div>
            <span className={`text-[10px] sm:text-sm font-bold ${step === 3 ? 'text-foreground' : 'text-muted-foreground'}`}>
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
          {selectedUpsells.length > 0 && (
            <p className="text-[10px] text-brand-400 font-bold mt-1">+ {selectedUpsells.length} extra{selectedUpsells.length > 1 ? 's' : ''}</p>
          )}
        </div>
      </div>

      <div id="checkout-form" className="grid grid-cols-1 lg:grid-cols-12 gap-[var(--space-breath)] items-start">
        <div className="lg:col-span-7">
          <AnimatePresence mode="wait">
            {step === 1 ? (
              /* STEP 1: Upsells — 1 decision: que extras agregar */
              <motion.section
                key="step1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={springGentle()}
                className="bg-card p-6 sm:p-8 rounded-[var(--radius-squircle-3xl)] shadow-sm border border-border"
              >
                <h2 className="text-xl font-bold text-foreground mb-2">Mejora tu Experiencia</h2>
                <p className="text-muted-foreground text-sm mb-6">Selecciona los extras que quieras agregar. Puedes saltar este paso si no necesitas nada.</p>
                <div className="space-y-[var(--space-focus)]">
                  {UPSELL_OPTIONS.map(opt => {
                    const isSelected = selectedUpsells.includes(opt.id);
                    const Icon = opt.icon;
                    return (
                      <div key={opt.id} onClick={() => toggleUpsell(opt.id)} className={`flex items-center justify-between p-4 rounded-[var(--radius-squircle-xl)] border-2 cursor-pointer transition-all min-h-[56px] ${isSelected ? 'border-brand-500 bg-brand-50' : 'border-border hover:border-border/80'}`}>
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-[var(--radius-squircle-lg)] ${isSelected ? 'bg-brand-100 text-brand-600' : 'bg-muted text-muted-foreground/40'}`}>
                            <Icon size={24} strokeWidth={1.5} />
                          </div>
                          <div>
                            <h4 className={`font-bold ${isSelected ? 'text-brand-900' : 'text-foreground/80'}`}>{opt.title}</h4>
                            <p className="text-xs text-muted-foreground">{opt.description}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-black ${isSelected ? 'text-brand-600' : 'text-foreground'}`}>+${opt.price.toLocaleString()}</p>
                          <div className={`text-[10px] font-bold uppercase tracking-wider mt-1 ${isSelected ? 'text-brand-500' : 'text-muted-foreground/30'}`}>{isSelected ? 'Agregado' : 'Agregar'}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Navigation — Mac 2026: skip is the primary action on mobile */}
                <div className="flex flex-col-reverse sm:flex-row justify-between items-center gap-3 mt-8 pt-6 border-t border-border">
                  <motion.button
                    type="button"
                    onClick={handleNext}
                    whileTap={{ scale: 0.97 }}
                    transition={springSnappy()}
                    className="w-full sm:w-auto px-6 py-4 text-muted-foreground hover:text-foreground rounded-[var(--radius-squircle-xl)] font-bold flex items-center justify-center gap-2 transition-all min-h-[48px]"
                  >
                    Sin extras, continuar <ArrowRight size={16} />
                  </motion.button>
                  {selectedUpsells.length > 0 && (
                    <motion.button
                      type="button"
                      onClick={handleNext}
                      whileTap={{ scale: 0.97 }}
                      transition={springSnappy()}
                      className="w-full sm:w-auto px-8 py-4 bg-foreground text-background rounded-[var(--radius-squircle-xl)] font-bold flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-cta min-h-[48px]"
                    >
                      Continuar con {selectedUpsells.length} extra{selectedUpsells.length > 1 ? 's' : ''} <ArrowRight size={18} />
                    </motion.button>
                  )}
                </div>
              </motion.section>
            ) : step === 2 ? (
              /* STEP 2: Personal data — 1 decision: quien reserva */
              <motion.section
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
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

                {/* Navigation — Mac 2026: stacked on mobile, side-by-side on desktop */}
                <div className="flex flex-col-reverse sm:flex-row justify-between items-center gap-3 mt-8 pt-6 border-t border-border">
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
              /* STEP 3: Payment confirmation — 1 decision: pagar */
              <motion.section
                key="step3"
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

                <div id="checkout-form-step3">
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
                {selectedUpsells.length > 0 && (
                  <div className="flex justify-between items-start animate-in fade-in duration-300 text-brand-400">
                    <p className="text-sm font-bold">Extras ({selectedUpsells.length})</p>
                    <p className="font-bold">${upsellsTotal.toLocaleString()}</p>
                  </div>
                )}
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
