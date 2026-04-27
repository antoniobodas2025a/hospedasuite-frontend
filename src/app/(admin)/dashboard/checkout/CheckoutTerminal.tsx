'use client';

import React, { useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Receipt, DollarSign, BedDouble, LogOut, User,
  History, ArrowRight, CheckCircle, Smartphone,
  Info, Wallet 
} from 'lucide-react';
import { useCheckout } from '@/hooks/useCheckout';
import WompiButton from '@/components/payments/WompiButton';
import { calculateStayPrice } from '@/utils/supabase/pricing';
import { cn } from '@/lib/utils';

interface CheckoutTerminalProps {
  bookings: any[];
  initialSelectedId?: string;
  wompiPublicKey?: string;
}

export default function CheckoutTerminal({ 
  bookings, 
  initialSelectedId, 
  wompiPublicKey 
}: CheckoutTerminalProps) {
  
  const { 
    selectedBooking,
    statement, 
    isLoading, 
    paymentForm, 
    setPaymentForm, 
    processPayment, 
    finalizeCheckout,
    loadAccountForBooking 
  } = useCheckout(bookings);

  const hasAutoLoaded = useRef(false);

  // 🛡️ MOTOR DE DESGLOSE DE AUDITORÍA (Local Compute)
  const nightBreakdown = useMemo(() => {
    if (!selectedBooking || !selectedBooking.room) return null;
    
    // Soporte para datos polimórficos de habitación
    const roomData = Array.isArray(selectedBooking.room) ? selectedBooking.room[0] : selectedBooking.room;
    
    return calculateStayPrice(
      selectedBooking.check_in,
      selectedBooking.check_out,
      roomData?.price || 0,
      roomData?.weekend_price || (roomData?.price * 1.2)
    );
  }, [selectedBooking]);

  useEffect(() => {
    if (initialSelectedId && !hasAutoLoaded.current) {
      const target = bookings.find(b => b.id === initialSelectedId);
      if (target) loadAccountForBooking(target);
      hasAutoLoaded.current = true;
    }
  }, [initialSelectedId, bookings, loadAccountForBooking]);

  return (
    <div className='h-[calc(100vh-8rem)] flex flex-col lg:flex-row gap-6 font-poppins text-zinc-100 pb-4'>
      
      {/* 1. SIDEBAR DE SELECCIÓN */}
      <div className='w-full lg:w-80 bg-zinc-900/40 backdrop-blur-2xl rounded-[2.5rem] border border-white/5 shadow-2xl flex flex-col overflow-hidden ring-1 ring-white/10'>
        <div className='p-6 border-b border-white/5 bg-zinc-950/40'>
          <h3 className='text-xs font-bold uppercase tracking-[0.2em] text-zinc-500'>Ocupación Activa</h3>
        </div>
        <div className='flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar'>
          {bookings.map((booking) => (
            <motion.button
              key={booking.id}
              onClick={() => loadAccountForBooking(booking)}
              className={cn(
                "w-full text-left p-4 rounded-2xl border transition-all duration-300 relative overflow-hidden group",
                selectedBooking?.id === booking.id
                  ? "bg-indigo-600 border-indigo-400 shadow-lg text-white"
                  : "bg-zinc-950/40 border-white/5 text-zinc-400 hover:border-indigo-500/30"
              )}
            >
              <div className='flex justify-between items-start mb-1'>
                <span className='font-bold text-sm tracking-tight'>{booking.room?.name || 'Habitación'}</span>
                <div className={cn("size-2 rounded-full", selectedBooking?.id === booking.id ? "bg-white animate-pulse" : "bg-emerald-500")} />
              </div>
              <p className='text-[10px] font-medium opacity-70 truncate'>{booking.guest?.full_name}</p>
            </motion.button>
          ))}
          {bookings.length === 0 && (
            <div className='p-8 text-center opacity-30'>
              <p className='text-xs font-bold uppercase tracking-widest'>Sin registros activos</p>
            </div>
          )}
        </div>
      </div>

      {/* 2. PANEL FINANCIERO UNIFICADO */}
      <div className='flex-1 bg-zinc-950/60 backdrop-blur-3xl rounded-[2.5rem] border border-white/5 shadow-2xl flex flex-col relative overflow-hidden ring-1 ring-white/10'>
        <AnimatePresence mode='wait'>
          {!selectedBooking ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className='h-full flex flex-col items-center justify-center text-zinc-700'>
              <Receipt size={64} className='stroke-[1] opacity-20 mb-6' />
              <p className='text-xs font-bold uppercase tracking-[0.3em] opacity-40'>Aguardando Selección de Nodo</p>
            </motion.div>
          ) : (
            <motion.div key={selectedBooking.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col h-full">
              
              {/* Header: Identidad y Balance */}
              <div className='p-8 bg-zinc-900/40 border-b border-white/5 flex flex-col md:flex-row justify-between items-center gap-6'>
                <div className='flex items-center gap-5'>
                  <div className='p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/20'>
                    <User className="size-6 text-indigo-400" />
                  </div>
                  <div>
                    <h2 className='text-2xl font-bold tracking-tight'>{selectedBooking.guest?.full_name}</h2>
                    <div className='flex items-center gap-2 mt-1'>
                      <span className='text-zinc-500 font-mono text-[9px] uppercase tracking-widest bg-zinc-950 px-2 py-0.5 rounded'>ID: {selectedBooking.id.split('-')[0].toUpperCase()}</span>
                      <span className='text-indigo-400 text-[10px] font-bold uppercase'>{selectedBooking.room?.name}</span>
                    </div>
                  </div>
                </div>
                <div className='bg-zinc-950/50 p-6 rounded-3xl border border-white/5 shadow-inner min-w-[240px] text-right'>
                  <div className='text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1'>Balance Final</div>
                  <div className={cn("text-4xl font-bold tabular-nums tracking-tighter", (statement?.balance || 0) > 0 ? "text-rose-400" : "text-emerald-400")}>
                    ${(statement?.balance || 0).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Detalle Operativo (Ledger Granular) */}
              <div className='flex-1 overflow-y-auto p-8 grid grid-cols-1 xl:grid-cols-2 gap-10 custom-scrollbar'>
                
                {/* LADO IZQUIERDO: LIBRO DE CARGOS */}
                <div className='space-y-6'>
                  <h4 className='text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2 ml-4'>
                    <ArrowRight size={14} className="text-indigo-500" /> Auditoría de Consumos y Alojamiento
                  </h4>

                  <div className='space-y-4'>
                    {/* 1. DESGLOSE DE NOCHES */}
                    <div className='bg-zinc-900/40 border border-white/5 rounded-3xl overflow-hidden'>
                      <div className='p-5 flex justify-between items-center border-b border-white/5 bg-zinc-950/20'>
                        <div className='flex items-center gap-4'>
                          <div className='p-3 bg-indigo-500/10 text-indigo-400 rounded-2xl'><BedDouble size={20} /></div>
                          <div>
                            <div className='font-bold text-zinc-200'>Alojamiento Base</div>
                            <div className='text-[10px] text-zinc-500 uppercase font-bold'>{nightBreakdown?.totalNights} Noches Totales</div>
                          </div>
                        </div>
                        <span className='font-bold text-zinc-100 tabular-nums text-lg'>${(statement?.roomArgs || 0).toLocaleString()}</span>
                      </div>
                      <div className='p-4 bg-black/20 space-y-2'>
                        <div className='flex justify-between text-[11px] text-zinc-500 px-2'>
                          <span>Tarifas aplicadas según estacionalidad y calendario.</span>
                        </div>
                      </div>
                    </div>

                    {/* 2. CONSUMOS EXTRA */}
                    {statement?.details.services && statement.details.services.length > 0 ? (
                      <div className='space-y-2'>
                        <p className='text-[9px] font-bold text-zinc-600 uppercase tracking-widest ml-4'>Consumos Extra y Servicios</p>
                        {statement.details.services.map((svc: any) => (
                          <div key={svc.id} className='flex justify-between items-center p-5 bg-zinc-900/20 border border-white/5 rounded-3xl'>
                            <div className='flex items-center gap-4'>
                              <div className='p-3 bg-amber-500/10 text-amber-400 rounded-2xl'><Smartphone size={20} /></div>
                              <div>
                                <div className='font-bold text-zinc-200 text-sm'>{svc.description || 'Servicio Adicional'}</div>
                                <div className='text-[10px] text-zinc-500 font-mono'>{new Date(svc.created_at).toLocaleDateString()} — {svc.quantity || 1} ud.</div>
                              </div>
                            </div>
                            <span className='font-bold text-indigo-300 tabular-nums'>${svc.total_price.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className='p-8 border border-dashed border-white/5 rounded-[2rem] text-center'>
                        <p className='text-[10px] text-zinc-600 font-bold uppercase tracking-widest'>Sin consumos adicionales</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* LADO DERECHO: TERMINAL DE COBRO */}
                <div className='space-y-6'>
                  <div className='bg-zinc-900/40 p-8 rounded-[3rem] border border-white/5 shadow-2xl space-y-6'>
                    <h4 className='text-[10px] font-bold text-white uppercase tracking-widest text-center flex items-center justify-center gap-2'>
                      <Wallet size={14} className="text-emerald-500" /> Terminal de Cobro
                    </h4>
                    <div className='space-y-5'>
                      <div className='relative'>
                        <DollarSign className='absolute left-4 top-1/2 -translate-y-1/2 size-5 text-zinc-600' />
                        <input type="number" value={paymentForm.amount || ''} onChange={(e) => setPaymentForm({...paymentForm, amount: Number(e.target.value)})}
                          className='w-full pl-11 pr-4 py-5 bg-zinc-950 border border-white/10 rounded-2xl text-white font-bold text-xl outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all shadow-inner' placeholder="Monto a cobrar"
                        />
                      </div>
                      <div className='grid grid-cols-2 gap-3'>
                        {['cash', 'transfer', 'card', 'wompi'].map((m) => (
                          <button key={m} onClick={() => setPaymentForm({...paymentForm, method: m})}
                            className={cn("py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-all",
                              paymentForm.method === m ? "bg-indigo-600 border-indigo-400 text-white shadow-lg" : "bg-zinc-950 border-white/5 text-zinc-500 hover:text-zinc-300"
                            )}>{m === 'card' ? 'Datáfono' : m}</button>
                        ))}
                      </div>
                      {paymentForm.method === 'wompi' && wompiPublicKey ? (
                        <WompiButton amount={paymentForm.amount} reference={selectedBooking.id} publicKey={wompiPublicKey} onSuccess={() => loadAccountForBooking(selectedBooking)} />
                      ) : (
                        // 🛡️ REPARACIÓN SEMÁNTICA: Integración de etiqueta de producción corregida
                        <button 
                          onClick={processPayment} 
                          disabled={isLoading || paymentForm.amount <= 0}
                          className='w-full py-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold text-sm shadow-xl flex items-center justify-center gap-3 transition-all disabled:opacity-20'
                        >
                          <CheckCircle size={20} />
                          {isLoading ? 'Procesando...' : 'Confirmar Registro de Pago'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Acción de Cierre */}
              <div className='p-8 bg-zinc-900/60 border-t border-white/5 flex justify-end gap-6 items-center backdrop-blur-xl'>
                {(statement?.balance || 0) > 1 && (
                  <div className='flex items-center gap-2 text-[10px] font-bold text-rose-400 bg-rose-400/10 px-4 py-2 rounded-full border border-rose-400/20 uppercase tracking-widest'>
                    <Info size={12} /> Saldo pendiente requerido
                  </div>
                )}
                <button onClick={finalizeCheckout} disabled={isLoading || (statement?.balance || 0) > 1}
                  className={cn("px-10 py-5 rounded-2xl font-bold text-sm transition-all active:scale-95 shadow-2xl flex items-center gap-3",
                    (statement?.balance || 0) > 1 ? "bg-zinc-900 text-zinc-700 border border-white/5" : "bg-rose-600 hover:bg-rose-500 text-white"
                  )}>
                  <LogOut size={20} /> Finalizar y Liberar {selectedBooking.room?.name}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}