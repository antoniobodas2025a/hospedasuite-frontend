'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, User, Calendar, BedDouble, ShieldCheck, 
  Trash2, Save, CreditCard, Smartphone, Hash, 
  Sparkles, Moon, Hammer, ScanBarcode 
} from 'lucide-react';
import { calculateStayPrice } from '@/utils/supabase/pricing';
import ScannerModal from './ScannerModal';
import { cn } from '@/lib/utils';
import { BookingForm } from '@/hooks/useCalendar';

// ==========================================
// BLOQUE 1: INTERFACES ESTRICTAS
// ==========================================

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

// ==========================================
// BLOQUE 2: COMPONENTE PRESENTACIONAL (Liquid Glass)
// ==========================================

const BookingWizardModalView: React.FC<BookingWizardModalProps & {
  pricingDetails: PricingDetails;
  showScanner: boolean;
  setShowScanner: (v: boolean) => void;
  handleScanSuccess: (data: any) => void;
}> = ({
  bookingForm, setBookingForm, availableRoomsList, handleCreateBooking,
  onDelete, onClose, pricingDetails, showScanner, setShowScanner, handleScanSuccess
}) => {
  const isEditing = !!bookingForm.id;
  const isMaintenance = bookingForm.type === 'maintenance';

  return (
    <div className='fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl'>
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className='bg-[#09090b]/95 border border-white/10 w-full max-w-5xl rounded-[2.5rem] shadow-2xl overflow-hidden ring-1 ring-white/10 flex flex-col max-h-[90vh]'
      >
        {/* HEADER ESTRATÉGICO */}
        <div className='p-8 border-b border-white/5 flex justify-between items-start bg-zinc-900/40 backdrop-blur-md'>
          <div>
            <div className='flex items-center gap-3 mb-1'>
              <Sparkles className="size-5 text-indigo-400" />
              <h3 className='text-2xl font-bold text-zinc-50 tracking-tight'>
                {isEditing ? 'Detalles de Ocupación' : 'Apertura de Nodo (Reserva)'}
              </h3>
            </div>
            <p className='text-[10px] font-mono text-zinc-500 uppercase tracking-widest'>
              {isEditing ? `NODE_ID: ${bookingForm.id?.split('-')[0].toUpperCase()}` : 'NUEVO REGISTRO OPERATIVO'}
            </p>
          </div>
          <button onClick={onClose} className='p-2 text-zinc-500 hover:text-white hover:bg-white/5 rounded-full transition-colors'>
            <X size={24} />
          </button>
        </div>

        {/* BODY: SCROLLABLE LEDGER */}
        <form id="booking-wizard-form" onSubmit={handleCreateBooking} className='p-8 grid grid-cols-1 lg:grid-cols-12 gap-10 overflow-y-auto custom-scrollbar'>
          
          {/* LADO IZQUIERDO: CONFIGURACIÓN LOGÍSTICA (7/12) */}
          <div className='lg:col-span-7 space-y-8'>
            {/* Tipo de Operación */}
            <div className='bg-zinc-950/80 p-1.5 rounded-2xl flex border border-white/5 shadow-inner'>
              <button 
                type="button" 
                onClick={() => setBookingForm({...bookingForm, type: 'booking'})} 
                className={cn(
                  "flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                  !isMaintenance ? "bg-zinc-800 text-zinc-100 shadow-md ring-1 ring-white/10" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                <User className="size-4" /> Huésped
              </button>
              <button 
                type="button" 
                onClick={() => setBookingForm({...bookingForm, type: 'maintenance'})} 
                className={cn(
                  "flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                  isMaintenance ? "bg-amber-500/20 text-amber-400 shadow-md ring-1 ring-amber-500/30" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                <Hammer className="size-4" /> Mantenimiento
              </button>
            </div>

            {/* Ventana de Tiempo */}
            <div className='space-y-4'>
              <h4 className='text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2'>
                <Calendar size={14} className="text-indigo-500" /> Ventana de Ocupación
              </h4>
              <div className='grid grid-cols-2 gap-4'>
                <div className='space-y-2'>
                  <label className='text-[10px] text-zinc-600 ml-2 font-bold uppercase'>In</label>
                  <input type="date" required value={bookingForm.checkIn} onChange={(e) => setBookingForm({...bookingForm, checkIn: e.target.value})}
                    className='w-full p-4 bg-zinc-950 border border-white/10 rounded-2xl text-zinc-200 font-mono text-sm outline-none focus:ring-2 focus:ring-indigo-500/50 shadow-inner'
                  />
                </div>
                <div className='space-y-2'>
                  <label className='text-[10px] text-zinc-600 ml-2 font-bold uppercase'>Out</label>
                  <input type="date" required value={bookingForm.checkOut} min={bookingForm.checkIn} onChange={(e) => setBookingForm({...bookingForm, checkOut: e.target.value})}
                    className='w-full p-4 bg-zinc-950 border border-white/10 rounded-2xl text-zinc-200 font-mono text-sm outline-none focus:ring-2 focus:ring-indigo-500/50 shadow-inner'
                  />
                </div>
              </div>
            </div>

            {/* Asignación de Unidad */}
            <div className='space-y-4'>
              <h4 className='text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2'>
                <BedDouble size={14} className="text-sky-500" /> Asignación de Unidad
              </h4>
              <select required value={bookingForm.roomId} onChange={(e) => setBookingForm({...bookingForm, roomId: e.target.value})}
                className='w-full p-4 bg-zinc-950 border border-white/10 rounded-2xl text-zinc-200 font-bold outline-none focus:ring-2 focus:ring-sky-500/50 transition-all appearance-none cursor-pointer'
              >
                <option value="">Seleccionar unidad física...</option>
                {availableRoomsList.map(r => (
                  <option key={r.id} value={r.id}>{r.name} — ${(Number(r.price) || 0).toLocaleString()} / noche</option>
                ))}
              </select>
            </div>
          </div>

          {/* LADO DERECHO: IDENTIDAD Y FINANZAS (5/12) */}
          <div className='lg:col-span-5'>
            <AnimatePresence mode="wait">
              {!isMaintenance ? (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-6">
                  {/* Identidad OCR */}
                  <div className='bg-zinc-900/40 p-6 rounded-[2rem] border border-white/5 space-y-4'>
                    <div className='flex justify-between items-center'>
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Identidad del Huésped</label>
                      <button type="button" onClick={() => setShowScanner(true)} className='p-2 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 rounded-lg border border-indigo-500/20 transition-all flex items-center gap-2 text-[10px] font-bold uppercase'>
                        <ScanBarcode size={14} /> Scan OCR
                      </button>
                    </div>
                    <div className='space-y-3'>
                      <div className='relative'>
                        <User className='absolute left-4 top-1/2 -translate-y-1/2 size-4 text-zinc-600' />
                        <input placeholder="Nombre Completo" value={bookingForm.guestName} onChange={(e) => setBookingForm({...bookingForm, guestName: e.target.value})}
                          className='w-full pl-11 p-4 bg-zinc-950 border border-white/10 rounded-2xl text-zinc-200 font-bold outline-none focus:ring-2 focus:ring-emerald-500/50 shadow-inner'
                        />
                      </div>
                      <div className='relative'>
                        <Hash className='absolute left-4 top-1/2 -translate-y-1/2 size-4 text-zinc-600' />
                        <input placeholder="Número de Documento" value={bookingForm.guestDoc} onChange={(e) => setBookingForm({...bookingForm, guestDoc: e.target.value})}
                          className='w-full pl-11 p-4 bg-zinc-950 border border-white/10 rounded-2xl text-zinc-200 font-mono text-sm outline-none focus:ring-2 focus:ring-emerald-500/50 shadow-inner'
                        />
                      </div>
                    </div>
                  </div>

                  {/* Bóveda Financiera (Pricing Breakdown) */}
                  <div className='bg-indigo-600/10 border border-indigo-500/20 p-8 rounded-[2rem] relative overflow-hidden ring-1 ring-indigo-500/10'>
                    <div className="absolute -right-10 -bottom-10 size-40 bg-indigo-500/10 rounded-full blur-3xl" />
                    <h4 className='text-[10px] font-bold text-indigo-400 uppercase tracking-[0.2em] flex items-center gap-2 mb-6'>
                      <CreditCard size={14} /> Auditoría Financiera
                    </h4>
                    <div className='space-y-3 mb-8 font-mono text-xs'>
                      <div className='flex justify-between text-zinc-400'>
                        <span>Noches Estándar:</span>
                        <span className='text-zinc-100 font-bold'>{pricingDetails.weekdayNights}</span>
                      </div>
                      <div className='flex justify-between text-emerald-400/70'>
                        <span>Noches Fin de Sem.:</span>
                        <span className='text-emerald-400 font-bold'>{pricingDetails.weekendNights}</span>
                      </div>
                      <div className='flex justify-between text-zinc-500 pt-2 border-t border-white/5'>
                        <span>Tasa por Unidad:</span>
                        <span className='text-zinc-200'>${(bookingForm.price / (pricingDetails.totalNights || 1)).toLocaleString()}</span>
                      </div>
                    </div>
                    <div className='flex justify-between items-end'>
                      <div>
                        <span className='text-[10px] font-bold text-indigo-300 uppercase tracking-widest block mb-1'>Obligación Total</span>
                        <span className='text-4xl font-bold text-indigo-400 tracking-tighter tabular-nums'>
                          ${pricingDetails.totalPrice.toLocaleString()}
                        </span>
                      </div>
                      <Moon className="size-8 text-indigo-500/20" strokeWidth={1} />
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className='h-full flex flex-col items-center justify-center bg-amber-500/5 border border-amber-500/10 rounded-[2rem] p-10 text-center space-y-4'>
                  <Hammer className="size-16 text-amber-500/30" />
                  <p className='font-bold uppercase tracking-widest text-sm text-amber-500'>Bloqueo Operativo</p>
                  <p className='text-[10px] font-mono text-zinc-500 leading-relaxed'>La unidad no generará activos financieros durante el mantenimiento.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </form>

        {/* ACCIONES DE CIERRE */}
        <div className='p-8 bg-[#09090b]/90 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4 backdrop-blur-xl'>
          {isEditing ? (
            <button type="button" onClick={onDelete} className='w-full sm:w-auto px-6 py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-2xl font-bold text-[10px] uppercase tracking-widest transition-all border border-rose-500/20 flex items-center justify-center gap-2'>
              <Trash2 size={16} /> Anular Registro
            </button>
          ) : <div />}

          <div className='flex items-center gap-4 w-full sm:w-auto'>
            <button type="button" onClick={onClose} className='flex-1 sm:flex-none px-6 py-3 text-zinc-500 hover:text-zinc-300 font-bold text-sm transition-colors'>
              Cancelar
            </button>
            <button type="submit" form="booking-wizard-form" className='flex-[2] sm:flex-none px-10 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold text-sm shadow-[0_20px_50px_rgba(79,70,229,0.3)] transition-all active:scale-95 flex items-center justify-center gap-3 ring-1 ring-white/20'>
              {isEditing ? <><Save size={18} /> Persistir Cambios</> : <><ShieldCheck size={18} /> Confirmar Reserva</>}
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

// ==========================================
// BLOQUE 3: COMPONENTE CONTENEDOR (Máquina de Inteligencia)
// ==========================================

export default function BookingWizardModal(props: BookingWizardModalProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [pricingDetails, setPricingDetails] = useState<PricingDetails>({
    totalNights: 0, weekendNights: 0, weekdayNights: 0, totalPrice: 0
  });

  useEffect(() => { setIsMounted(true); }, []);

  // 🛡️ MOTOR FINANCIERO: Cálculo de precios con blindaje de fin de semana
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