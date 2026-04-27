'use client';

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Receipt, DollarSign, CalendarCheck, BedDouble, User, 
  LogOut, CreditCard, Loader2, ArrowRight, Wallet, History
} from 'lucide-react';
import { useCheckout, BookingSummary } from '@/hooks/useCheckout';
import WompiButton from '@/components/payments/WompiButton';
import { cn } from '@/lib/utils';

// ==========================================
// BLOQUE 1: INTERFACES ESTRICTAS
// ==========================================

interface CheckoutPanelProps {
  bookings: BookingSummary[];
  wompiPublicKey?: string;
}

interface CheckoutPanelViewProps {
  bookings: BookingSummary[];
  selectedBooking: any;
  statement: any;
  isLoading: boolean;
  onLoadAccount: (booking: BookingSummary) => void;
  paymentForm: any;
  setPaymentForm: (form: any) => void;
  onProcessPayment: () => void;
  onFinalizeCheckout: () => void;
  wompiPublicKey?: string;
}

// ==========================================
// BLOQUE 2: COMPONENTE PRESENTACIONAL
// ==========================================

const CheckoutPanelView: React.FC<CheckoutPanelViewProps> = ({
  bookings, selectedBooking, statement, isLoading, onLoadAccount,
  paymentForm, setPaymentForm, onProcessPayment, onFinalizeCheckout,
  wompiPublicKey
}) => {
  return (
    <div className='h-[calc(100vh-8rem)] flex flex-col lg:flex-row gap-6 pb-4 font-poppins text-zinc-100'>
      
      {/* 1. NAVEGADOR DE UNIDADES ACTIVAS */}
      <div className='w-full lg:w-1/3 bg-zinc-900/40 backdrop-blur-2xl rounded-[2.5rem] border border-white/5 shadow-2xl flex flex-col overflow-hidden ring-1 ring-inset ring-white/10'>
        <div className='p-6 border-b border-white/5 bg-zinc-950/40'>
          <h2 className='text-xl font-bold text-zinc-50 flex items-center gap-3 tracking-tight'>
            <LogOut className='text-indigo-400 size-5' /> Auditoría de Salida
          </h2>
          <p className='text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1'>
            {bookings.length} Unidades en Operación
          </p>
        </div>

        <div className='flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar'>
          {bookings.map((booking) => (
            <motion.button
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
              key={booking.id}
              onClick={() => onLoadAccount(booking)}
              className={cn(
                "w-full text-left p-5 rounded-2xl border transition-all duration-300 relative overflow-hidden group",
                selectedBooking?.id === booking.id
                  ? "bg-indigo-600 border-indigo-400 shadow-lg shadow-indigo-500/20 text-white"
                  : "bg-zinc-950/40 border-white/5 text-zinc-400 hover:border-indigo-500/30"
              )}
            >
              <div className='flex justify-between items-start mb-3 relative z-10'>
                <span className={cn('font-bold text-lg tracking-tight', selectedBooking?.id === booking.id ? 'text-white' : 'text-zinc-100')}>
                  {booking.room.name}
                </span>
                <span className="text-[9px] px-2 py-0.5 rounded-lg font-bold uppercase tracking-widest border bg-emerald-500/10 border-emerald-500/20 text-emerald-400">
                  Ocupada
                </span>
              </div>
              <div className='flex items-center gap-2 text-xs mb-2 opacity-80 font-medium relative z-10'>
                <User size={14} className="opacity-50" /> {booking.guest.full_name}
              </div>
              <div className='flex items-center gap-2 text-[10px] opacity-50 font-mono relative z-10'>
                <CalendarCheck size={12} /> OUT: {booking.check_out}
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* 2. BÓVEDA DE LIQUIDACIÓN */}
      <div className='flex-1 bg-zinc-950/60 backdrop-blur-3xl rounded-[2.5rem] shadow-2xl border border-white/5 flex flex-col relative overflow-hidden ring-1 ring-white/10'>
        <AnimatePresence mode='wait'>
          {!selectedBooking || !statement ? (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className='h-full flex flex-col items-center justify-center text-zinc-700'>
              <Receipt size={64} className='stroke-[1] opacity-20 mb-6' />
              <p className='text-sm font-bold uppercase tracking-[0.3em] opacity-40'>Aguardando Selección de Nodo</p>
            </motion.div>
          ) : (
            <motion.div key={selectedBooking.id} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col h-full">
              <div className='p-8 bg-zinc-900/40 border-b border-white/5 flex flex-col sm:flex-row justify-between items-start gap-6'>
                <div>
                  <h3 className='text-3xl font-bold text-zinc-50 tracking-tight'>{selectedBooking.guest.full_name}</h3>
                  <p className='text-zinc-500 font-mono text-[10px] uppercase tracking-widest mt-2'>DOC: {selectedBooking.guest.doc_number}</p>
                </div>
                <div className='text-right bg-zinc-950/50 p-4 rounded-3xl border border-white/5 shadow-inner min-w-[220px]'>
                  <div className='text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1'>Balance Pendiente</div>
                  <div className={cn("text-4xl font-bold tabular-nums tracking-tighter", statement.balance > 0 ? "text-rose-400" : "text-emerald-400")}>
                    ${statement.balance.toLocaleString()}
                  </div>
                </div>
              </div>

              <div className='flex-1 overflow-y-auto p-8 grid grid-cols-1 xl:grid-cols-2 gap-10 custom-scrollbar'>
                {/* Lado A: Cargos */}
                <div className='space-y-6'>
                  <h4 className='text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2'>
                    <ArrowRight size={14} className="text-indigo-500" /> Libro de Cargos
                  </h4>
                  <div className='space-y-3'>
                    <div className='flex justify-between items-center p-4 bg-zinc-900/40 border border-white/5 rounded-2xl'>
                      <div className='flex items-center gap-4'>
                        <div className='p-2 bg-indigo-500/10 text-indigo-400 rounded-xl'><BedDouble size={18} /></div>
                        <div className='font-bold text-zinc-200 text-sm'>Alojamiento Base</div>
                      </div>
                      <span className='font-bold text-zinc-100 tabular-nums'>${statement.roomArgs.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Lado B: Abonos */}
                <div className='space-y-6'>
                  <div className='bg-zinc-900/40 p-8 rounded-[2.5rem] border border-white/5 shadow-inner space-y-6'>
                    <h4 className='text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2'>
                      <History size={14} className="text-emerald-500" /> Historial de Abonos
                    </h4>
                    
                    <div className='pt-6 border-t border-white/5 space-y-4'>
                      <div className='flex gap-3'>
                        <input
                          type='number'
                          className='flex-1 p-4 bg-zinc-950 border border-white/10 rounded-2xl font-bold text-zinc-100 outline-none'
                          value={paymentForm.amount || ''}
                          placeholder="Monto"
                          onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })}
                        />
                        <select
                          className='px-4 rounded-2xl border border-white/10 bg-zinc-950 text-zinc-300 font-bold'
                          value={paymentForm.method}
                          onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
                        >
                          <option value='cash'>Efectivo</option>
                          <option value='wompi'>Wompi</option>
                        </select>
                      </div>

                      {paymentForm.method === 'wompi' ? (
                        <WompiButton
                          amount={paymentForm.amount}
                          reference={selectedBooking.id}
                          publicKey={wompiPublicKey}
                          onSuccess={() => {
                            // 🛡️ REFACTORIZADO: Uso de la referencia de ámbito correcta 'onLoadAccount'
                            alert('✅ Pago Certificado. Sincronizando Ledger...'); 
                            onLoadAccount(selectedBooking); 
                          }}
                        />
                      ) : (
                        <button onClick={onProcessPayment} className='w-full py-4 bg-zinc-100 text-zinc-900 font-bold rounded-2xl flex justify-center items-center gap-2'>
                          <Wallet size={18} /> Registrar en Caja
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className='p-8 bg-zinc-900/60 border-t border-white/5 flex justify-end items-center'>
                <button
                  onClick={onFinalizeCheckout}
                  disabled={isLoading || statement.balance > 0}
                  className={cn(
                    "px-10 py-5 rounded-[1.5rem] font-bold shadow-2xl flex items-center gap-3 transition-all",
                    statement.balance > 0 ? "bg-zinc-800 text-zinc-500 cursor-not-allowed" : "bg-indigo-600 text-white hover:bg-indigo-500"
                  )}
                >
                  <LogOut size={22} /> {statement.balance > 0 ? 'Saldo Pendiente' : 'Cerrar Folio y Liberar'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// ==========================================
// BLOQUE 3: COMPONENTE CONTENEDOR (HOC)
// ==========================================

export default function CheckoutPanel({ bookings, wompiPublicKey }: CheckoutPanelProps) {
  const {
    selectedBooking,
    statement,
    isLoading,
    loadAccountForBooking,
    paymentForm,
    setPaymentForm,
    processPayment,
    finalizeCheckout,
  } = useCheckout(bookings);

  return (
    <CheckoutPanelView 
      bookings={Array.isArray(bookings) ? bookings : []}
      selectedBooking={selectedBooking}
      statement={statement}
      isLoading={isLoading}
      onLoadAccount={loadAccountForBooking}
      paymentForm={paymentForm}
      setPaymentForm={setPaymentForm}
      onProcessPayment={processPayment}
      onFinalizeCheckout={finalizeCheckout}
      wompiPublicKey={wompiPublicKey}
    />
  );
}