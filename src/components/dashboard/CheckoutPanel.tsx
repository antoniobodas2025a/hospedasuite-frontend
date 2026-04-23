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
// BLOQUE 2: COMPONENTE PRESENTACIONAL (UI Claude 2026)
// ==========================================

const CheckoutPanelView: React.FC<CheckoutPanelViewProps> = ({
  bookings, selectedBooking, statement, isLoading, onLoadAccount,
  paymentForm, setPaymentForm, onProcessPayment, onFinalizeCheckout,
  wompiPublicKey
}) => {
  return (
    <div className='h-[calc(100vh-8rem)] flex flex-col lg:flex-row gap-6 pb-4 font-poppins text-zinc-100'>
      
      {/* 1. NAVEGADOR DE UNIDADES ACTIVAS (Liquid Glass Sidebar) */}
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
          {bookings.length === 0 ? (
            <div className='h-full flex flex-col items-center justify-center text-center p-10 text-zinc-600'>
              <User size={48} className="mb-4 opacity-10 stroke-[1]" />
              <p className="text-xs font-bold uppercase tracking-widest">Silencio Operativo</p>
            </div>
          ) : (
            bookings.map((booking) => (
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
                  <span className={cn(
                    'font-bold text-lg tracking-tight',
                    selectedBooking?.id === booking.id ? 'text-white' : 'text-zinc-100'
                  )}>
                    {booking.room.name}
                  </span>
                  <span className={cn(
                    "text-[9px] px-2 py-0.5 rounded-lg font-bold uppercase tracking-widest border",
                    selectedBooking?.id === booking.id 
                      ? "bg-white/20 border-white/30 text-white" 
                      : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                  )}>
                    Ocupada
                  </span>
                </div>
                <div className='flex items-center gap-2 text-xs mb-2 opacity-80 font-medium relative z-10'>
                  <User size={14} className="opacity-50" /> {booking.guest.full_name}
                </div>
                <div className='flex items-center gap-2 text-[10px] opacity-50 font-mono relative z-10'>
                  <CalendarCheck size={12} /> OUT: {booking.check_out}
                </div>
                {selectedBooking?.id === booking.id && (
                  <div className="absolute right-0 top-0 h-full w-1 bg-white shadow-[0_0_15px_rgba(255,255,255,0.5)]" />
                )}
              </motion.button>
            ))
          )}
        </div>
      </div>

      {/* 2. BÓVEDA DE LIQUIDACIÓN (Liquid Glass Main Panel) */}
      <div className='flex-1 bg-zinc-950/60 backdrop-blur-3xl rounded-[2.5rem] shadow-2xl border border-white/5 flex flex-col relative overflow-hidden ring-1 ring-white/10'>
        <AnimatePresence mode='wait'>
          {!selectedBooking || !statement ? (
            <motion.div 
              key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className='h-full flex flex-col items-center justify-center text-zinc-700'
            >
              <div className="p-10 bg-zinc-900/50 rounded-full mb-6 border border-white/5 shadow-inner">
                <Receipt size={64} className='stroke-[1] opacity-20' />
              </div>
              <p className='text-sm font-bold uppercase tracking-[0.3em] opacity-40'>Aguardando Selección de Nodo</p>
            </motion.div>
          ) : (
            <motion.div 
              key={selectedBooking.id} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, y: -20 }}
              className="flex flex-col h-full"
            >
              {/* Header Factura Digital */}
              <div className='p-8 bg-zinc-900/40 border-b border-white/5 flex flex-col sm:flex-row justify-between items-start gap-6'>
                <div>
                  <h3 className='text-3xl font-bold text-zinc-50 tracking-tight'>
                    {selectedBooking.guest.full_name}
                  </h3>
                  <div className='flex items-center gap-3 mt-2'>
                    <span className='text-zinc-500 font-mono text-[10px] uppercase tracking-widest bg-zinc-950 px-2 py-1 rounded-md border border-white/5'>
                      DOC: {selectedBooking.guest.doc_number}
                    </span>
                    <span className='text-indigo-400 font-mono text-[10px] uppercase tracking-widest'>
                      ID: {selectedBooking.id.split('-')[0]}
                    </span>
                  </div>
                </div>
                <div className='text-right bg-zinc-950/50 p-4 rounded-3xl border border-white/5 shadow-inner min-w-[220px]'>
                  <div className='text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1'>
                    Balance Pendiente
                  </div>
                  <div className={cn(
                    "text-4xl font-bold tabular-nums tracking-tighter",
                    statement.balance > 0 ? "text-rose-400" : "text-emerald-400"
                  )}>
                    ${statement.balance.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Cuerpo: Ledger de Transacciones */}
              <div className='flex-1 overflow-y-auto p-8 grid grid-cols-1 xl:grid-cols-2 gap-10 custom-scrollbar'>
                
                {/* Lado A: Cargos Operativos */}
                <div className='space-y-6'>
                  <h4 className='text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2'>
                    <ArrowRight size={14} className="text-indigo-500" /> Libro de Cargos
                  </h4>

                  <div className='space-y-3'>
                    <div className='flex justify-between items-center p-4 bg-zinc-900/40 border border-white/5 rounded-2xl'>
                      <div className='flex items-center gap-4'>
                        <div className='p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20'>
                          <BedDouble size={18} />
                        </div>
                        <div>
                          <div className='font-bold text-zinc-200 text-sm'>Alojamiento Base</div>
                          <div className='text-[10px] text-zinc-500 font-medium uppercase'>Noches Verificadas</div>
                        </div>
                      </div>
                      <span className='font-bold text-zinc-100 tabular-nums'>
                        ${statement.roomArgs.toLocaleString()}
                      </span>
                    </div>

                    {statement.details.services.map((svc: any) => (
                      <div key={svc.id} className='flex justify-between items-center p-4 bg-zinc-900/20 border border-white/5 rounded-2xl'>
                        <div className='flex items-center gap-4'>
                          <div className='p-2.5 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20'>
                            <Receipt size={18} />
                          </div>
                          <div>
                            <div className='font-bold text-zinc-200 text-sm'>Consumo Punto de Venta</div>
                            <div className='text-[10px] text-zinc-500 font-mono'>{new Date(svc.created_at).toLocaleDateString()}</div>
                          </div>
                        </div>
                        <span className='font-bold text-zinc-100 tabular-nums'>
                          ${svc.total_price.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className='pt-4 flex justify-between items-center px-4'>
                    <span className='text-xs font-bold text-zinc-500 uppercase tracking-widest'>Monto Bruto</span>
                    <span className='text-2xl font-bold text-zinc-100 tabular-nums'>
                      ${(statement.roomArgs + statement.serviceCharges).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Lado B: Ledger de Abonos & Caja */}
                <div className='space-y-6'>
                  <div className='bg-zinc-900/40 p-8 rounded-[2.5rem] border border-white/5 shadow-inner space-y-6 h-fit'>
                    <h4 className='text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2'>
                      <History size={14} className="text-emerald-500" /> Historial de Abonos
                    </h4>
                    
                    <div className="space-y-3">
                      {statement.details.payments.length === 0 ? (
                        <div className='py-4 text-[10px] text-zinc-600 font-bold uppercase tracking-widest text-center border border-dashed border-white/5 rounded-xl'>
                          Sin registros de ingreso
                        </div>
                      ) : (
                        statement.details.payments.map((pay: any) => (
                          <div key={pay.id} className='flex justify-between items-center bg-zinc-950/40 p-3 rounded-xl border border-white/5'>
                            <div className='flex items-center gap-3 text-xs font-medium'>
                              <div className="size-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                              <span className='text-zinc-400 capitalize'>{pay.method}</span>
                              <span className="text-[10px] text-zinc-600 font-mono">({new Date(pay.created_at).toLocaleDateString()})</span>
                            </div>
                            <span className='font-bold text-emerald-400 tabular-nums'>
                              -${pay.amount.toLocaleString()}
                            </span>
                          </div>
                        ))
                      )}
                    </div>

                    {statement.balance > 0 && (
                      <div className='pt-6 border-t border-white/5 space-y-4'>
                        <label className='text-[9px] font-bold uppercase text-zinc-500 tracking-[0.2em] ml-2'>
                          Inyectar Abono Manual
                        </label>
                        <div className='flex gap-3'>
                          <div className='relative flex-1'>
                            <DollarSign className='absolute left-4 top-1/2 -translate-y-1/2 size-4 text-zinc-500' />
                            <input
                              type='number'
                              className='w-full pl-10 pr-4 py-4 bg-zinc-950 border border-white/10 rounded-2xl font-bold text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all shadow-inner'
                              value={paymentForm.amount || ''}
                              placeholder="0"
                              onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })}
                            />
                          </div>
                          <select
                            className='px-4 rounded-2xl border border-white/10 font-bold text-[10px] uppercase tracking-widest bg-zinc-950 text-zinc-300 outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer appearance-none'
                            value={paymentForm.method}
                            onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
                          >
                            <option value='cash'>Efectivo</option>
                            <option value='transfer'>Transfer</option>
                            <option value='wompi'>Wompi</option>
                          </select>
                        </div>

                        {paymentForm.method === 'wompi' ? (
                          wompiPublicKey ? (
                            <WompiButton
                              amount={paymentForm.amount}
                              reference={selectedBooking.id}
                              publicKey={wompiPublicKey}
                              onSuccess={() => {
                                alert('🔄 Sincronizando Ledger Central...');
                                setTimeout(() => onLoadAccount(selectedBooking), 2500);
                              }}
                            />
                          ) : (
                            <div className="p-4 bg-rose-500/10 text-rose-400 text-[10px] font-bold rounded-2xl text-center border border-rose-500/20 uppercase tracking-widest">
                              Vault Error: Wompi Key Missing
                            </div>
                          )
                        ) : (
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={onProcessPayment}
                            disabled={isLoading || paymentForm.amount <= 0}
                            className='w-full py-4 bg-zinc-100 text-zinc-900 font-bold rounded-2xl hover:bg-white transition-all shadow-xl flex justify-center items-center gap-2 disabled:opacity-20'
                          >
                            {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Wallet size={18} />}
                            {isLoading ? 'Firmando Transacción...' : 'Registrar en Caja'}
                          </motion.button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer de Acción Final: Liquidación de Nodo */}
              <div className='p-8 bg-zinc-900/60 border-t border-white/5 flex flex-col sm:flex-row justify-end gap-6 items-center backdrop-blur-xl'>
                {statement.balance > 0 && (
                  <div className="flex items-center gap-2 text-[10px] font-bold text-amber-400 bg-amber-400/10 px-4 py-2 rounded-full border border-amber-400/20 uppercase tracking-widest">
                    <ShieldAlert size={14} /> Saldo pendiente: Requiere Autorización
                  </div>
                )}
                <button
                  onClick={onFinalizeCheckout}
                  disabled={isLoading}
                  className={cn(
                    "px-10 py-5 rounded-[1.5rem] font-bold shadow-2xl flex items-center gap-3 transition-all duration-300 active:scale-95 disabled:opacity-50",
                    statement.balance > 0
                      ? "bg-transparent border border-amber-400/40 text-amber-400 hover:bg-amber-400/10"
                      : "bg-indigo-600 text-white hover:bg-indigo-500 shadow-indigo-500/25"
                  )}
                >
                  {isLoading ? <Loader2 className="animate-spin" /> : <LogOut size={22} />}
                  {statement.balance > 0 ? 'Checkout Forzado (Auditor)' : 'Cerrar Folio y Liberar Habitación'}
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
// BLOQUE 3: COMPONENTE CONTENEDOR (Máquina de Estados)
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

  // 🛡️ Zero-Trust Data Parsing
  const safeBookings = useMemo(() => Array.isArray(bookings) ? bookings : [], [bookings]);

  return (
    <CheckoutPanelView 
      bookings={safeBookings}
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

// Icono auxiliar no importado arriba
function ShieldAlert({ size }: { size: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>;
}