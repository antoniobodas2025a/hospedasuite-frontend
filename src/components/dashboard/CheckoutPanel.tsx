'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Receipt, 
  DollarSign, 
  CalendarCheck, 
  BedDouble, 
  User, 
  LogOut, 
  CreditCard,
  Loader2 
} from 'lucide-react';
import { useCheckout, BookingSummary } from '@/hooks/useCheckout';
import WompiButton from '@/components/payments/WompiButton';

interface CheckoutPanelProps {
  bookings: BookingSummary[];
  wompiPublicKey?: string;
}

const CheckoutPanel = ({ bookings, wompiPublicKey }: CheckoutPanelProps) => {
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
    <div className='h-[calc(100vh-8rem)] flex gap-6 pb-4'>
      {/* 1. LISTA DE HUÉSPEDES ACTIVOS (macOS Sidebar Style) */}
      <div className='w-1/3 bg-white rounded-[2rem] shadow-sm border border-slate-100 flex flex-col overflow-hidden'>
        <div className='p-6 border-b border-slate-100 bg-slate-50/50'>
          <h2 className='text-xl font-display font-bold text-slate-800 flex items-center gap-2'>
            <LogOut className='text-hospeda-600' size={20} /> Check-out
          </h2>
          <p className='text-xs text-slate-500 font-medium'>
            Selecciona una habitación para liquidar cuenta.
          </p>
        </div>

        <div className='flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar'>
          {bookings.length === 0 ? (
            <div className='h-40 flex flex-col items-center justify-center text-center p-10 text-slate-400'>
              <User size={32} className="mb-2 opacity-20" />
              <p className="text-sm font-medium">No hay huéspedes para salida.</p>
            </div>
          ) : (
            bookings.map((booking) => (
              <button
                key={booking.id}
                onClick={() => loadAccountForBooking(booking)}
                className={`w-full text-left p-5 rounded-2xl border transition-all duration-300 ${
                  selectedBooking?.id === booking.id
                    ? 'bg-hospeda-900 border-hospeda-900 shadow-lg scale-[1.02] text-white'
                    : 'bg-white border-slate-100 hover:border-hospeda-200 text-slate-600'
                }`}
              >
                <div className='flex justify-between items-start mb-2'>
                  <span className='font-bold text-lg tracking-tight'>
                    {booking.room.name}
                  </span>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                    selectedBooking?.id === booking.id ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    OCUPADA
                  </span>
                </div>
                <div className={`flex items-center gap-2 text-sm mb-1 opacity-80 font-medium`}>
                  <User size={14} /> {booking.guest.full_name}
                </div>
                <div className='flex items-center gap-2 text-[11px] opacity-60 font-medium'>
                  <CalendarCheck size={12} /> Salida: {booking.check_out}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* 2. DETALLE DE CUENTA (macOS Main Panel Style) */}
      <div className='flex-1 bg-white rounded-[2rem] shadow-2xl border border-slate-100 flex flex-col relative overflow-hidden'>
        <AnimatePresence mode='wait'>
          {!selectedBooking || !statement ? (
            <motion.div 
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className='h-full flex flex-col items-center justify-center text-slate-300'
            >
              <div className="p-8 bg-slate-50 rounded-full mb-4">
                <Receipt size={64} className='stroke-1 opacity-20' />
              </div>
              <p className='text-lg font-bold text-slate-400 tracking-tight'>Selecciona una reserva para facturar</p>
            </motion.div>
          ) : (
            <motion.div 
              key={selectedBooking.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col h-full"
            >
              {/* Header Factura */}
              <div className='p-8 bg-slate-50/50 border-b border-slate-100 flex justify-between items-start'>
                <div>
                  <h3 className='text-3xl font-bold text-slate-900 tracking-tight'>
                    {selectedBooking.guest.full_name}
                  </h3>
                  <p className='text-slate-500 font-mono text-xs mt-1 uppercase tracking-widest'>
                    Documento: {selectedBooking.guest.doc_number}
                  </p>
                </div>
                <div className='text-right'>
                  <div className='text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1'>
                    Saldo Pendiente
                  </div>
                  <div className={`text-4xl font-display font-bold tabular-nums ${statement.balance > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                    ${statement.balance.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Cuerpo: Cargos y Abonos */}
              <div className='flex-1 overflow-y-auto p-8 grid grid-cols-2 gap-12 custom-scrollbar'>
                {/* Cargos */}
                <div className='space-y-6'>
                  <h4 className='text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-3'>
                    Detalle de Cargos
                  </h4>

                  <div className='flex justify-between items-center group'>
                    <div className='flex items-center gap-4'>
                      <div className='p-3 bg-blue-50 text-blue-600 rounded-2xl'>
                        <BedDouble size={18} />
                      </div>
                      <div>
                        <div className='font-bold text-slate-800'>Hospedaje</div>
                        <div className='text-[11px] text-slate-400 font-medium'>Alojamiento Verificado</div>
                      </div>
                    </div>
                    <span className='font-bold text-slate-900 tabular-nums'>
                      ${statement.roomArgs.toLocaleString()}
                    </span>
                  </div>

                  {statement.details.services.map((svc) => (
                    <div key={svc.id} className='flex justify-between items-center group'>
                      <div className='flex items-center gap-4'>
                        <div className='p-3 bg-amber-50 text-amber-600 rounded-2xl'>
                          <Receipt size={18} />
                        </div>
                        <div>
                          <div className='font-bold text-slate-800 text-sm'>Consumo POS</div>
                          <div className='text-[11px] text-slate-400 font-medium'>{new Date(svc.created_at).toLocaleDateString()}</div>
                        </div>
                      </div>
                      <span className='font-bold text-slate-900 tabular-nums'>
                        ${svc.total_price.toLocaleString()}
                      </span>
                    </div>
                  ))}

                  <div className='border-t border-dashed border-slate-200 pt-6 flex justify-between items-center'>
                    <span className='text-sm font-bold text-slate-500 uppercase tracking-wider'>Subtotal Bruto</span>
                    <span className='text-xl font-bold text-slate-900 tabular-nums'>
                      ${(statement.roomArgs + statement.serviceCharges).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Abonos y Caja */}
                <div className='bg-slate-50/50 p-8 rounded-[2rem] border border-slate-100 h-fit'>
                  <h4 className='text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-3 mb-6'>
                    Pagos & Abonos
                  </h4>
                  
                  <div className="space-y-4 mb-8">
                    {statement.details.payments.length === 0 ? (
                      <p className='text-xs text-slate-400 font-medium italic'>No se han registrado abonos previos.</p>
                    ) : (
                      statement.details.payments.map((pay) => (
                        <div key={pay.id} className='flex justify-between items-center text-sm font-medium'>
                          <span className='text-slate-500 capitalize flex items-center gap-2'>
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            {pay.method} <span className="text-[10px] opacity-60">({new Date(pay.created_at).toLocaleDateString()})</span>
                          </span>
                          <span className='font-bold text-emerald-600 tabular-nums'>
                            -${pay.amount.toLocaleString()}
                          </span>
                        </div>
                      ))
                    )}
                  </div>

                  {statement.balance > 0 && (
                    <div className='pt-6 border-t border-slate-200'>
                      <label className='text-[10px] font-bold uppercase text-slate-400 mb-3 block tracking-widest'>
                        Cargar Abono a Cuenta
                      </label>
                      <div className='flex gap-3 mb-4'>
                        <div className='relative flex-1'>
                          <span className='absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold'>$</span>
                          <input
                            type='number'
                            className='w-full pl-8 p-4 bg-white rounded-2xl border border-slate-200 font-bold outline-none focus:ring-2 focus:ring-hospeda-500 transition-all'
                            value={paymentForm.amount || ''}
                            placeholder="0"
                            onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })}
                          />
                        </div>
                        <select
                          className='p-4 rounded-2xl border border-slate-200 font-bold text-xs bg-white outline-none focus:ring-2 focus:ring-hospeda-500 cursor-pointer'
                          value={paymentForm.method}
                          onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
                        >
                          <option value='cash'>Efectivo</option>
                          <option value='transfer'>Transferencia</option>
                          <option value='wompi'>Tarjeta (Wompi)</option>
                        </select>
                      </div>

                      {paymentForm.method === 'wompi' ? (
                        wompiPublicKey ? (
                          <WompiButton
                            amount={paymentForm.amount}
                            reference={selectedBooking.id}
                            publicKey={wompiPublicKey}
                            onSuccess={() => {
                              alert('🔄 Sincronizando pago con la base de datos...');
                              setTimeout(() => loadAccountForBooking(selectedBooking), 2500);
                            }}
                          />
                        ) : (
                          <div className="p-4 bg-red-50 text-red-500 text-[10px] font-bold rounded-2xl text-center border border-red-100">
                            Llave de Wompi no configurada en Ajustes.
                          </div>
                        )
                      ) : (
                        <button
                          onClick={processPayment}
                          disabled={isLoading || paymentForm.amount <= 0}
                          className='w-full py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-black transition-all shadow-lg flex justify-center items-center gap-2 disabled:opacity-30 active:scale-95'
                        >
                          {isLoading ? <Loader2 className="animate-spin" size={18} /> : <DollarSign size={18} />}
                          {isLoading ? 'Procesando...' : 'Registrar Pago Manual'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer Acción Final (macOS Control Bar Style) */}
              <div className='p-8 bg-white border-t border-slate-100 flex justify-end gap-4 items-center'>
                {statement.balance > 0 && (
                  <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-4 py-2 rounded-full border border-amber-100">
                    ⚠️ Saldo pendiente de liquidación
                  </span>
                )}
                <button
                  onClick={finalizeCheckout}
                  disabled={isLoading}
                  className={`px-10 py-5 rounded-[1.5rem] font-bold shadow-2xl flex items-center gap-3 transition-all duration-300 hover:-translate-y-1 active:scale-95 disabled:opacity-50 disabled:hover:translate-y-0 ${
                    statement.balance > 0
                      ? 'bg-white border-2 border-amber-200 text-amber-700 hover:bg-amber-50'
                      : 'bg-hospeda-900 text-white hover:bg-black'
                  }`}
                >
                  {isLoading ? <Loader2 className="animate-spin" /> : <LogOut size={22} />}
                  {statement.balance > 0
                    ? 'Cerrar con Deuda (Checkout Forzado)'
                    : 'Finalizar Estadía & Liberar Habitación'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default CheckoutPanel;