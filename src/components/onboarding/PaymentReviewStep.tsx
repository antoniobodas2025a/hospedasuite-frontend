'use client';

import { motion } from 'framer-motion';
import { CheckCircle2, Clock, ShieldCheck, Gift } from 'lucide-react';
import { useOnboardingStore } from '@/store/useOnboardingStore';

export default function PaymentReviewStep() {
  const { paymentMethod, paymentTransactionId, manualReceiptUrl, startProvisioning, setCurrentStep } = useOnboardingStore();

  const isManual = paymentMethod === 'manual';
  const isFree = paymentMethod === 'free';
  const isDone = paymentMethod === 'free'
    ? true
    : paymentMethod === 'wompi'
      ? !!paymentTransactionId
      : !!manualReceiptUrl;

  if (!isDone) {
    return (
      <div className="py-16 text-center space-y-4">
        <ShieldCheck className="mx-auto text-zinc-600" size={48} />
        <p className="text-zinc-500 text-sm">Completá el pago en el paso anterior para continuar.</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      className="py-12 space-y-10 max-w-lg mx-auto text-center"
    >
      {/* Status icon */}
      {isFree ? (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.2 }}
          className="relative w-20 h-20 mx-auto"
        >
          <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl" />
          <div className="relative w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
            <Gift className="text-emerald-400" size={36} />
          </div>
        </motion.div>
      ) : isManual ? (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.2 }}
          className="relative w-20 h-20 mx-auto"
        >
          <div className="absolute inset-0 bg-amber-500/20 rounded-full blur-xl" />
          <div className="relative w-20 h-20 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
            <Clock className="text-amber-400" size={36} />
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.2 }}
          className="relative w-20 h-20 mx-auto"
        >
          <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl" />
          <div className="relative w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
            <CheckCircle2 className="text-emerald-400" size={36} />
          </div>
        </motion.div>
      )}

      {/* Status message */}
      {isFree ? (
        <div className="space-y-4">
          <h3 className="text-2xl font-black text-white tracking-tight">
            Activación gratuita
          </h3>
          <div className="glass-card p-6 space-y-3">
            <p className="text-zinc-300 text-sm leading-relaxed">
              30 días de prueba gratis. Sin pago, sin tarjeta.
            </p>
            <div className="border-t border-white/5 pt-3">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Próximos pasos</p>
              <ol className="text-zinc-400 text-xs space-y-1.5 list-decimal list-inside">
                <li>Activá tu propiedad ahora mismo</li>
                <li>Probá todas las funciones por 30 días</li>
                <li>Si te gusta, elegí un plan al finalizar el período</li>
              </ol>
            </div>
          </div>
          <p className="text-emerald-400/70 text-xs flex items-center justify-center gap-1.5">
            <Gift size={12} />
            Sin compromiso — cancelá cuando quieras.
          </p>
        </div>
      ) : isManual ? (
        <div className="space-y-4">
          <h3 className="text-2xl font-black text-white tracking-tight">
            Pago pendiente de aprobación
          </h3>
          <div className="glass-card p-6 space-y-3">
            <p className="text-zinc-300 text-sm leading-relaxed">
              Tu comprobante de pago fue recibido. Nuestro equipo lo revisará en las próximas horas.
            </p>
            <div className="border-t border-white/5 pt-3">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Próximos pasos</p>
              <ol className="text-zinc-400 text-xs space-y-1.5 list-decimal list-inside">
                <li>Un administrador revisará tu comprobante</li>
                <li>Recibirás un email cuando sea aprobado</li>
                <li>Mientras tanto, puedes seguir configurando tu propiedad</li>
              </ol>
            </div>
          </div>
          <p className="text-amber-400/70 text-xs flex items-center justify-center gap-1.5">
            <Clock size={12} />
            Tus datos se guardarán — puedes cerrar esta página y volver después.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <h3 className="text-2xl font-black text-white tracking-tight">
            ¡Pago exitoso!
          </h3>
          <p className="text-zinc-400 text-sm">
            Tu suscripción al Plan Pionero está confirmada. Activá tu propiedad para empezar.
          </p>
        </div>
      )}

      {/* Activate button */}
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={startProvisioning}
        className={`w-full py-4 font-bold rounded-[var(--radius-squircle-xl)] uppercase tracking-widest text-[10px] shadow-lg transition-all ${
          isFree
            ? 'bg-emerald-600 text-white shadow-emerald-600/20 hover:bg-emerald-500'
            : isManual
              ? 'bg-amber-500/20 border border-amber-500/30 text-amber-400 hover:bg-amber-500/30'
              : 'bg-indigo-600 text-white shadow-indigo-600/20 hover:bg-indigo-500'
        }`}
      >
        {isFree ? 'Activar propiedad (prueba gratis)' : isManual ? 'Activar propiedad (pendiente de pago)' : 'Activar propiedad'}
      </motion.button>

      {/* Back button — returns to PaymentStep (step 6) */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => setCurrentStep(6)}
        className="w-full border border-white/10 text-zinc-500 py-4 rounded-[var(--radius-squircle-xl)] font-bold uppercase tracking-widest text-[10px] hover:bg-white/5 transition-all"
      >
        ← Volver
      </motion.button>
    </motion.div>
  );
}
