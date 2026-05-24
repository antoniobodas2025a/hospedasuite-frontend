'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, User, Calendar, BedDouble, ShieldCheck, 
  Trash2, Save, CreditCard, Hash, 
  Sparkles, Moon, Hammer, ScanBarcode, AlertTriangle, Check, ArrowRight, ArrowLeft
} from 'lucide-react';
import { calculateStayPrice } from '@/utils/supabase/pricing';
import ScannerModal from './ScannerModal';
import { cn } from '@/lib/utils';
import { BookingForm } from '@/hooks/useCalendar';
import { desaturateFeedback, springSnappy, springGentle } from '@/lib/mac2026/spring';

interface PricingDetails {
  totalNights: number;
  weekendNights: number;
  weekdayNights: number;
  totalPrice: number;
}

interface BookingWizardModalProps {
  bookingForm: BookingForm;
  setBookingForm: (form: any) => void;
  availableRoomsList: any[];
  handleCreateBooking: (e: React.FormEvent) => void;
  onDelete?: () => void;
  onClose: () => void;
}

/**
 * Mac 2026 — Ley de Hick: 1 decision por paso.
 * Step 1: Fechas (una decision: cuando)
 * Step 2: Unidad (una decision: cual habitacion)
 * Step 3: Huesped (una decision: quien) — solo para booking, no maintenance
 */

const BookingWizardModalView: React.FC<BookingWizardModalProps & {
  pricingDetails: PricingDetails;
  showScanner: boolean;
  setShowScanner: (v: boolean) => void;
  handleScanSuccess: (data: any) => void;
}> = ({
  bookingForm, setBookingForm, availableRoomsList, handleCreateBooking,
  onDelete, onClose, pricingDetails, showScanner, setShowScanner, handleScanSuccess
}) => {
  const router = useRouter(); 
  const isEditing = !!bookingForm.id;
  const isMaintenance = bookingForm.type === 'maintenance';

  // Determine max steps based on type
  const maxSteps = isMaintenance ? 2 : 3;
  const [step, setStep] = useState(isEditing ? maxSteps : 1);

  const canGoNext = () => {
    if (step === 1) return bookingForm.checkIn && bookingForm.checkOut;
    if (step === 2) return bookingForm.roomId;
    return true;
  };

  const handleNext = () => {
    if (canGoNext() && step < maxSteps) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  // Reset to step 1 when type changes (new booking only)
  useEffect(() => {
    if (!isEditing) setStep(1);
  }, [bookingForm.type, isEditing]);

  return (
    <div className='fixed inset-0 z-[calc(var(--z-modal)+1)] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl'>
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className='glass-panel w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]'
      >
        <div className='p-8 border-b border-white/5 flex justify-between items-start glass-card !rounded-none'>
          <div>
            <div className='flex items-center gap-3 mb-1'>
              <Sparkles className="size-5 text-indigo-400" />
              <h3 className='text-2xl font-bold text-zinc-50 tracking-tight'>
                {isEditing ? 'Detalles de Ocupacion' : 'Nueva Reserva'}
              </h3>
            </div>
            <p className='text-[10px] font-mono text-zinc-500 uppercase tracking-widest'>
              {isEditing ? `Reserva: ${bookingForm.id?.split('-')[0].toUpperCase()}` : 'NUEVO REGISTRO'}
            </p>
          </div>
          <button onClick={onClose} className='p-2 text-zinc-500 hover:text-white hover:bg-white/5 rounded-full transition-colors'>
            <X size={24} />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="px-8 py-4 border-b border-white/5 bg-zinc-900/20">
          <div className="flex items-center justify-center gap-3">
            {/* Type toggle — always visible */}
            <div className='bg-zinc-950/80 p-1 rounded-[var(--radius-squircle-md)] flex border border-white/5'>
              <button type="button" onClick={() => { setBookingForm({...bookingForm, type: 'booking', roomId: ''}); if (!isEditing) setStep(1); }} className={cn("px-4 py-1.5 rounded-[var(--radius-squircle-sm)] text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5", !isMaintenance ? "bg-zinc-800 text-zinc-100" : "text-zinc-600 hover:text-zinc-400")}>
                <User className="size-3" /> Huesped
              </button>
              <button type="button" onClick={() => { setBookingForm({...bookingForm, type: 'maintenance', roomId: ''}); if (!isEditing) setStep(1); }} className={cn("px-4 py-1.5 rounded-[var(--radius-squircle-sm)] text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5", isMaintenance ? "bg-amber-500/20 text-amber-400" : "text-zinc-600 hover:text-zinc-400")}>
                <Hammer className="size-3" /> Mant.
              </button>
            </div>

            {!isMaintenance && (
              <>
                <div className={`w-8 h-0.5 transition-all ${step >= 1 ? 'bg-brand-500' : 'bg-zinc-800'}`} />
                {/* Step 1: Fechas */}
                <div className="flex items-center gap-1.5">
                  <div className={`size-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${step === 1 ? 'bg-brand-600 text-white' : step > 1 ? 'bg-brand-100 text-brand-600' : 'bg-zinc-800 text-zinc-600'}`}>
                    {step > 1 ? <Check size={10} /> : '1'}
                  </div>
                  <span className={`text-[10px] font-bold hidden sm:inline ${step === 1 ? 'text-zinc-300' : 'text-zinc-600'}`}>Fechas</span>
                </div>

                <div className={`w-8 h-0.5 transition-all ${step >= 2 ? 'bg-brand-500' : 'bg-zinc-800'}`} />
                {/* Step 2: Unidad */}
                <div className="flex items-center gap-1.5">
                  <div className={`size-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${step === 2 ? 'bg-brand-600 text-white' : step > 2 ? 'bg-brand-100 text-brand-600' : 'bg-zinc-800 text-zinc-600'}`}>
                    {step > 2 ? <Check size={10} /> : '2'}
                  </div>
                  <span className={`text-[10px] font-bold hidden sm:inline ${step === 2 ? 'text-zinc-300' : 'text-zinc-600'}`}>Unidad</span>
                </div>

                <div className={`w-8 h-0.5 transition-all ${step >= 3 ? 'bg-brand-500' : 'bg-zinc-800'}`} />
                {/* Step 3: Huesped */}
                <div className="flex items-center gap-1.5">
                  <div className={`size-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${step === 3 ? 'bg-brand-600 text-white' : 'bg-zinc-800 text-zinc-600'}`}>
                    3
                  </div>
                  <span className={`text-[10px] font-bold hidden sm:inline ${step === 3 ? 'text-zinc-300' : 'text-zinc-600'}`}>Huesped</span>
                </div>
              </>
            )}

            {isMaintenance && (
              <>
                <div className={`w-8 h-0.5 transition-all ${step >= 1 ? 'bg-amber-500' : 'bg-zinc-800'}`} />
                <div className="flex items-center gap-1.5">
                  <div className={`size-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${step === 1 ? 'bg-amber-600 text-white' : step > 1 ? 'bg-amber-100 text-amber-600' : 'bg-zinc-800 text-zinc-600'}`}>
                    {step > 1 ? <Check size={10} /> : '1'}
                  </div>
                  <span className={`text-[10px] font-bold hidden sm:inline ${step === 1 ? 'text-zinc-300' : 'text-zinc-600'}`}>Fechas</span>
                </div>
                <div className={`w-8 h-0.5 transition-all ${step >= 2 ? 'bg-amber-500' : 'bg-zinc-800'}`} />
                <div className="flex items-center gap-1.5">
                  <div className={`size-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${step === 2 ? 'bg-amber-600 text-white' : 'bg-zinc-800 text-zinc-600'}`}>
                    2
                  </div>
                  <span className={`text-[10px] font-bold hidden sm:inline ${step === 2 ? 'text-zinc-300' : 'text-zinc-600'}`}>Unidad</span>
                </div>
              </>
            )}
          </div>
        </div>

        <motion.div
          animate={availableRoomsList.length === 0 && step === 2 ? desaturateFeedback.animate : desaturateFeedback.initial}
          transition={desaturateFeedback.transition}
        >
          <form id="booking-wizard-form" onSubmit={handleCreateBooking} className='p-[var(--space-breath)] grid grid-cols-1 lg:grid-cols-12 gap-[var(--space-pause)] overflow-y-auto custom-scrollbar'>
          
          <div className='lg:col-span-7'>
            <AnimatePresence mode="wait">
              {/* STEP 1: Fechas */}
              {step === 1 && (
                <motion.div key="step1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={springGentle()} className='space-y-[var(--space-focus)]'>
                  <h4 className='text-[10px] font-bold text-zinc-500 uppercase tracking-ultra flex items-center gap-2'>
                    <Calendar size={14} className="text-indigo-500" /> Ventana de Ocupacion
                  </h4>
                  <p className="text-sm text-zinc-500">Selecciona las fechas de entrada y salida.</p>
                  <div className='grid grid-cols-2 gap-4'>
                    <div className='space-y-2'>
                      <label className='text-[10px] text-zinc-600 ml-2 font-bold uppercase'>Entrada</label>
                      <input type="date" required value={bookingForm.checkIn} onChange={(e) => setBookingForm({...bookingForm, checkIn: e.target.value, roomId: ''})}
                        className='w-full p-4 bg-zinc-950 border border-white/10 rounded-[var(--radius-squircle-xl)] text-zinc-200 font-mono text-sm outline-none focus:ring-2 focus:ring-indigo-500/50 shadow-inner'
                      />
                    </div>
                    <div className='space-y-2'>
                      <label className='text-[10px] text-zinc-600 ml-2 font-bold uppercase'>Salida</label>
                      <input type="date" required value={bookingForm.checkOut} min={bookingForm.checkIn ? (() => {
                        const d = new Date(bookingForm.checkIn);
                        d.setDate(d.getDate() + 1);
                        return d.toISOString().split('T')[0];
                      })() : undefined} onChange={(e) => setBookingForm({...bookingForm, checkOut: e.target.value, roomId: ''})}
                        className='w-full p-4 bg-zinc-950 border border-white/10 rounded-[var(--radius-squircle-xl)] text-zinc-200 font-mono text-sm outline-none focus:ring-2 focus:ring-indigo-500/50 shadow-inner'
                      />
                    </div>
                  </div>
                  <div className="flex justify-end pt-4">
                    <motion.button type="button" onClick={handleNext} disabled={!canGoNext()} whileTap={{ scale: 0.97 }} transition={springSnappy()} className="px-6 py-3 bg-zinc-100 text-zinc-900 rounded-[var(--radius-squircle-lg)] font-bold text-sm flex items-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed">
                      Continuar <ArrowRight size={16} />
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {/* STEP 2: Unidad (booking + maintenance) */}
              {step === 2 && (
                <motion.div key="step2" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={springGentle()} className='space-y-[var(--space-focus)]'>
                  <h4 className='text-[10px] font-bold text-zinc-500 uppercase tracking-ultra flex items-center gap-2'>
                    <BedDouble size={14} className={isMaintenance ? "text-amber-500" : "text-sky-500"} /> {isMaintenance ? 'Bloqueo de Unidad' : 'Asignacion de Unidad'}
                  </h4>
                  <p className="text-sm text-zinc-500">{isMaintenance ? 'Selecciona la habitacion para bloqueo por mantenimiento.' : 'Elige la habitacion o unidad fisica.'}</p>
                  
                  {availableRoomsList.length === 0 ? (
                    <div className='w-full p-4 bg-rose-500/10 border border-rose-500/20 rounded-[var(--radius-squircle-xl)] flex items-center justify-center gap-3 text-rose-400 font-bold'>
                      <AlertTriangle size={18} /> Sin disponibilidad para estas fechas.
                    </div>
                  ) : (
                    <select required value={bookingForm.roomId} onChange={(e) => setBookingForm({...bookingForm, roomId: e.target.value})}
                      className='w-full p-4 bg-zinc-950 border border-white/10 rounded-[var(--radius-squircle-xl)] text-zinc-200 font-bold outline-none focus:ring-2 focus:ring-sky-500/50 transition-all appearance-none cursor-pointer'
                    >
                      <option value="">Seleccionar unidad fisica...</option>
                      {availableRoomsList.map(r => (
                        <option key={r.id} value={r.id}>{r.name} — ${(Number(r.price) || 0).toLocaleString()} / noche</option>
                      ))}
                    </select>
                  )}
                  <div className="flex justify-between pt-4">
                    <motion.button type="button" onClick={handleBack} whileTap={{ scale: 0.97 }} transition={springSnappy()} className="px-6 py-3 text-zinc-500 hover:text-zinc-300 rounded-[var(--radius-squircle-lg)] font-bold text-sm flex items-center gap-2">
                      <ArrowLeft size={16} /> Volver
                    </motion.button>
                    {isMaintenance ? (
                      /* Maintenance: step 2 is last step → submit */
                      <motion.button type="submit" form="booking-wizard-form" disabled={availableRoomsList.length === 0} whileTap={{ scale: 0.97 }} transition={springSnappy()} className="px-8 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-[var(--radius-squircle-lg)] font-bold text-sm flex items-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed shadow-cta">
                        <><Hammer size={16} /> Registrar Mantenimiento</>
                      </motion.button>
                    ) : (
                      /* Booking: step 2 → go to step 3 */
                      <motion.button type="button" onClick={handleNext} disabled={!canGoNext()} whileTap={{ scale: 0.97 }} transition={springSnappy()} className="px-6 py-3 bg-zinc-100 text-zinc-900 rounded-[var(--radius-squircle-lg)] font-bold text-sm flex items-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed">
                        Continuar <ArrowRight size={16} />
                      </motion.button>
                    )}
                  </div>
                </motion.div>
              )}

              {/* STEP 3: Huesped (booking only) */}
              {step === 3 && !isMaintenance && (
                <motion.div key="step3" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={springGentle()} className='space-y-[var(--space-focus)]'>
                  <div className='flex justify-between items-center'>
                    <h4 className='text-[10px] font-bold text-zinc-500 uppercase tracking-ultra flex items-center gap-2'>
                      <User size={14} className="text-emerald-500" /> Identidad del Huesped
                    </h4>
                    <button type="button" onClick={() => setShowScanner(true)} className='p-2 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 rounded-[var(--radius-squircle-md)] border border-indigo-500/20 transition-all flex items-center gap-2 text-[10px] font-bold uppercase'>
                      <ScanBarcode size={14} /> Scan OCR
                    </button>
                  </div>
                  <p className="text-sm text-zinc-500">Ingresa los datos del huesped principal.</p>
                  <div className='space-y-3'>
                    <div className='relative'>
                      <User className='absolute left-4 top-1/2 -translate-y-1/2 size-4 text-zinc-600' />
                      <input placeholder="Nombre Completo" value={bookingForm.guestName} onChange={(e) => setBookingForm({...bookingForm, guestName: e.target.value})}
                        className='w-full pl-11 p-4 bg-zinc-950 border border-white/10 rounded-[var(--radius-squircle-xl)] text-zinc-200 font-bold outline-none focus:ring-2 focus:ring-emerald-500/50 shadow-inner'
                      />
                    </div>
                    <div className='relative'>
                      <Hash className='absolute left-4 top-1/2 -translate-y-1/2 size-4 text-zinc-600' />
                      <input placeholder="Numero de Documento" value={bookingForm.guestDoc} onChange={(e) => setBookingForm({...bookingForm, guestDoc: e.target.value})}
                        className='w-full pl-11 p-4 bg-zinc-950 border border-white/10 rounded-[var(--radius-squircle-xl)] text-zinc-200 font-mono text-sm outline-none focus:ring-2 focus:ring-emerald-500/50 shadow-inner'
                      />
                    </div>
                  </div>
                  <div className="flex justify-between pt-4">
                    <motion.button type="button" onClick={handleBack} whileTap={{ scale: 0.97 }} transition={springSnappy()} className="px-6 py-3 text-zinc-500 hover:text-zinc-300 rounded-[var(--radius-squircle-lg)] font-bold text-sm flex items-center gap-2">
                      <ArrowLeft size={16} /> Volver
                    </motion.button>
                    {/* Submit on last step */}
                    <motion.button type="submit" form="booking-wizard-form" disabled={availableRoomsList.length === 0} whileTap={{ scale: 0.97 }} transition={springSnappy()} className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[var(--radius-squircle-lg)] font-bold text-sm flex items-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed shadow-cta">
                      {isEditing ? <><Save size={16} /> Guardar</> : <><ShieldCheck size={16} /> Confirmar</>}
                    </motion.button>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>

          {/* Right Panel: Pricing — always visible */}
          <div className='lg:col-span-5'>
            <AnimatePresence mode="wait">
              {!isMaintenance ? (
                <motion.div key="pricing" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-[var(--space-breath)]">
                  <div className='bg-indigo-600/10 border border-indigo-500/20 p-[var(--space-breath)] rounded-[var(--radius-squircle-3xl)] relative overflow-hidden ring-1 ring-indigo-500/10'>
                    <h4 className='text-[10px] font-bold text-indigo-400 uppercase tracking-ultra flex items-center gap-2 mb-6'>
                      <CreditCard size={14} /> Auditoria Financiera
                    </h4>
                    <div className='space-y-3 mb-8 font-mono text-xs'>
                      <div className='flex justify-between text-zinc-400'>
                        <span>Noches Estandar:</span>
                        <span className='text-zinc-100 font-bold'>{pricingDetails.weekdayNights}</span>
                      </div>
                      <div className='flex justify-between text-emerald-400/70'>
                        <span>Noches Fin de Sem.:</span>
                        <span className='text-emerald-400 font-bold'>{pricingDetails.weekendNights}</span>
                      </div>
                    </div>
                    <div className='flex justify-between items-end'>
                      <div>
                        <span className='text-[10px] font-bold text-indigo-300 uppercase tracking-widest block mb-1'>Obligacion Total</span>
                        <span className='text-4xl font-bold text-indigo-400 tracking-tighter tabular-nums'>
                          ${pricingDetails.totalPrice.toLocaleString()}
                        </span>
                      </div>
                      <Moon className="size-8 text-indigo-500/20" strokeWidth={1} />
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="maint-placeholder" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className='h-full flex flex-col items-center justify-center bg-amber-500/5 border border-amber-500/10 rounded-[var(--radius-squircle-3xl)] p-[var(--space-pause)] text-center space-y-[var(--space-focus)]'>
                  <Hammer className="size-16 text-amber-500/30" />
                  <p className='font-bold uppercase tracking-widest text-sm text-amber-400'>Bloqueo Operativo</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </form>
        </motion.div>

        {/* Footer */}
        <div className='p-[var(--space-breath)] border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-[var(--space-focus)] glass-card !rounded-none'>
          <div className='flex flex-wrap items-center gap-3 w-full sm:w-auto'>
            {isEditing && (
              <>
                <button type="button" onClick={onDelete} className='px-6 py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-[var(--radius-squircle-xl)] font-bold text-[10px] uppercase tracking-widest transition-all border border-rose-500/20 flex items-center gap-2'>
                  <Trash2 size={16} /> Anular
                </button>
                <button type="button" onClick={() => router.push(`/dashboard/checkout?id=${bookingForm.id}`)} className='px-6 py-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-[var(--radius-squircle-xl)] font-bold text-[10px] uppercase tracking-widest transition-all border border-emerald-500/20 flex items-center gap-2'>
                  <CreditCard size={16} /> Checkout / Cobro
                </button>
              </>
            )}
          </div>
          <div className="flex items-center gap-4">
            {/* Keyboard shortcuts hint */}
            <div className="hidden sm:flex items-center gap-2 text-[10px] text-zinc-600">
              <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded-[var(--radius-squircle-sm)] border border-white/10 font-mono">Esc</kbd>
              <span>Cerrar</span>
              <span className="mx-1">·</span>
              <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded-[var(--radius-squircle-sm)] border border-white/10 font-mono">Enter</kbd>
              <span>Guardar</span>
            </div>
            <button type="button" onClick={onClose} className='flex-1 sm:flex-none px-6 py-3 text-zinc-500 hover:text-zinc-300 font-bold text-sm transition-colors'>
              Cancelar
            </button>
          </div>
        </div>

        {showScanner && (
          <ScannerModal onScanSuccess={handleScanSuccess} onClose={() => setShowScanner(false)} />
        )}
      </motion.div>
    </div>
  );
};

export default function BookingWizardModal(props: BookingWizardModalProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [pricingDetails, setPricingDetails] = useState<PricingDetails>({
    totalNights: 0, weekendNights: 0, weekdayNights: 0, totalPrice: 0
  });

  useEffect(() => { setIsMounted(true); }, []);

  // Mac 2026 — Keyboard shortcuts (Nielsen #7)
  useEffect(() => {
    if (!isMounted) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape: close modal
      if (e.key === 'Escape') {
        e.preventDefault();
        props.onClose();
      }
      // Enter: submit form (when not in input)
      if (e.key === 'Enter' && !['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        const form = document.getElementById('booking-wizard-form') as HTMLFormElement | null;
        if (form) form.requestSubmit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMounted, props.onClose]);

  useEffect(() => {
    const { bookingForm, availableRoomsList, setBookingForm } = props;
    if (bookingForm.roomId && bookingForm.checkIn && bookingForm.checkOut && bookingForm.type !== 'maintenance') {
      const room = availableRoomsList.find((r) => r.id === bookingForm.roomId);
      if (room) {
        const breakdown = calculateStayPrice(bookingForm.checkIn, bookingForm.checkOut, room.price, room.weekend_price || 0);
        setPricingDetails(breakdown);
        if (bookingForm.price !== breakdown.totalPrice) {
          setBookingForm({ ...bookingForm, price: breakdown.totalPrice });
        }
      }
    } else if (bookingForm.type === 'maintenance') {
      setPricingDetails({ totalNights: 0, weekendNights: 0, weekdayNights: 0, totalPrice: 0 });
      if (props.bookingForm.price !== 0) props.setBookingForm({ ...props.bookingForm, price: 0 });
    }
  }, [props.bookingForm.roomId, props.bookingForm.checkIn, props.bookingForm.checkOut, props.bookingForm.type, props.availableRoomsList, props.setBookingForm]);

  const handleScanSuccess = (data: any) => {
    props.setBookingForm({ ...props.bookingForm, guestName: data.fullName || props.bookingForm.guestName, guestDoc: data.docNumber || props.bookingForm.guestDoc });
    setShowScanner(false);
  };

  if (!isMounted) return null;

  return createPortal(
    <BookingWizardModalView 
      {...props}
      pricingDetails={pricingDetails}
      showScanner={showScanner}
      setShowScanner={setShowScanner}
      handleScanSuccess={handleScanSuccess}
    />,
    document.body
  );
}
