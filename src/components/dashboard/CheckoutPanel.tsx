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
    <div className='h-[calc(100vh-8rem)] flex flex-col lg:flex-row gap-6 pb-4 font-poppins text-foreground'>
      
      {/* 1. NAVEGADOR DE UNIDADES ACTIVAS */}
      <div className='w-full lg:w-1/3 glass-card rounded-[var(--radius-squircle-3xl)] border border-border shadow-2xl flex flex-col overflow-hidden ring-1 ring-inset ring-border'>
        <div className='p-6 border-b border-border bg-muted'>
          <h2 className='text-xl font-bold text-foreground flex items-center gap-3 tracking-tight'>
            <LogOut className='text-indigo-400 size-5' /> Auditoría de Salida
          </h2>
          <p className='text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1'>
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
                "w-full text-left p-5 rounded-[var(--radius-squircle-2xl)] border transition-all duration-300 relative overflow-hidden group",
                selectedBooking?.id === booking.id
                  ? "bg-indigo-600 border-indigo-400 shadow-lg shadow-indigo-500/20 text-white"
                  : "bg-muted border-border text-muted-foreground hover:border-indigo-500/30"
              )}
            >
              <div className='flex justify-between items-start mb-3 relative z-10'>
                <span className={cn('font-bold text-lg tracking-tight', selectedBooking?.id === booking.id ? 'text-white' : 'text-foreground')}>
                  {booking.room.name}
                </span>
                <span className="text-[9px] px-2 py-0.5 rounded-[var(--radius-squircle-md)] font-bold uppercase tracking-widest border bg-emerald-500/10 border-emerald-500/20 text-emerald-400">
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
      <div className='flex-1 glass-panel flex flex-col relative overflow-hidden'>
        <AnimatePresence mode='wait'>
          {!selectedBooking || !statement ? (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className='h-full flex flex-col items-center justify-center text-muted-foreground'>
              <Receipt size={64} className='stroke-[1] opacity-20 mb-6' />
              <p className='text-sm font-bold uppercase tracking-extreme opacity-40 text-muted-foreground'>Aguardando Selección de Nodo</p>
            </motion.div>
          ) : (
            <motion.div key={selectedBooking.id} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col h-full">
              <div className='p-8 bg-muted border-b border-border flex flex-col sm:flex-row justify-between items-start gap-6'>
                <div>
                  <h3 className='text-3xl font-bold text-foreground tracking-tight'>{selectedBooking.guest.full_name}</h3>
                  <p className='text-muted-foreground font-mono text-[10px] uppercase tracking-widest mt-2'>DOC: {selectedBooking.guest.doc_number}</p>
                </div>
                <div className='text-right bg-muted p-4 rounded-[var(--radius-squircle-3xl)] border border-border shadow-inner min-w-[220px]'>
                  <div className='text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1'>Balance Pendiente</div>
                  <div className={cn("text-4xl font-bold tabular-nums tracking-tighter", statement.balance > 0 ? "text-rose-400" : "text-emerald-400")}>
                    ${statement.balance.toLocaleString()}
                  </div>
                </div>
              </div>

              <div className='flex-1 overflow-y-auto p-8 grid grid-cols-1 xl:grid-cols-2 gap-10 custom-scrollbar'>
                {/* Lado A: Cargos */}
                <div className='space-y-6'>
                  <h4 className='text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2'>
                    <ArrowRight size={14} className="text-indigo-500" /> Libro de Cargos
                  </h4>
                  <div className='space-y-3'>
                    <div className='flex justify-between items-center p-4 bg-muted border border-border rounded-[var(--radius-squircle-2xl)]'>
                      <div className='flex items-center gap-4'>
                        <div className='p-2 bg-indigo-500/10 text-indigo-400 rounded-[var(--radius-squircle-lg)]'><BedDouble size={18} /></div>
                        <div className='font-bold text-foreground text-sm'>Alojamiento Base</div>
                      </div>
                      <span className='font-bold text-foreground tabular-nums'>${statement.roomArgs.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Lado B: Abonos */}
                <div className='space-y-6'>
                  <div className='bg-muted p-8 rounded-[var(--radius-squircle-3xl)] border border-border shadow-inner space-y-6'>
                    <h4 className='text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2'>
                      <History size={14} className="text-emerald-500" /> Historial de Abonos
                    </h4>
                    
                    <div className='pt-6 border-t border-border space-y-4'>
                      <div className='flex gap-3'>
                        <input
                          type='number'
                          className='flex-1 p-4 bg-background border border-border rounded-[var(--radius-squircle-2xl)] font-bold text-foreground outline-none'
                          value={paymentForm.amount || ''}
                          placeholder="Monto"
                          onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })}
                        />
                        <select
                          className='px-4 rounded-[var(--radius-squircle-2xl)] border border-border bg-background text-foreground font-bold'
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
                          publicKey={wompiPublicKey ?? ''}
                          onSuccess={() => {
                            // 🛡️ REFACTORIZADO: Uso de la referencia de ámbito correcta 'onLoadAccount'
                            alert('✅ Pago Certificado. Procesando...'); 
                            onLoadAccount(selectedBooking); 
                          }}
                        />
                      ) : (
                        <button onClick={onProcessPayment} className='w-full py-4 bg-foreground text-background font-bold rounded-[var(--radius-squircle-2xl)] flex justify-center items-center gap-2'>
                          <Wallet size={18} /> Registrar en Caja
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className='p-8 bg-muted border-t border-border flex justify-end items-center'>
                <button
                  onClick={onFinalizeCheckout}
                  disabled={isLoading || statement.balance > 0}
                  className={cn(
                    "px-10 py-5 rounded-[1.5rem] font-bold shadow-cta flex items-center gap-3 transition-all",
                    statement.balance > 0 ? "bg-muted text-muted-foreground cursor-not-allowed" : "bg-indigo-600 text-white hover:bg-indigo-500"
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