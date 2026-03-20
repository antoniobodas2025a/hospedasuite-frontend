'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard,
  User,
  LogOut,
  Receipt,
  DollarSign,
  CalendarCheck,
  BedDouble,
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
      {/* 1. LISTA DE HUÉSPEDES ACTIVOS (En Casa) */}
      <div className='w-1/3 bg-white rounded-[2rem] shadow-sm border border-slate-100 flex flex-col overflow-hidden'>
        <div className='p-6 border-b border-slate-100'>
          <h2 className='text-xl font-display font-bold text-slate-800 flex items-center gap-2'>
            <LogOut className='text-hospeda-600' /> Check-out
          </h2>
          <p className='text-sm text-slate-500'>
            Selecciona una habitación para cerrar cuenta.
          </p>
        </div>

        <div className='flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar'>
          {bookings.length === 0 ? (
            <div className='text-center p-10 text-slate-400'>
              No hay huéspedes para salida.
            </div>
          ) : (
            bookings.map((booking) => (
              <button
                key={booking.id}
                onClick={() => loadAccountForBooking(booking)}
                className={`w-full text-left p-4 rounded-2xl border transition-all ${
                  selectedBooking?.id === booking.id
                    ? 'bg-hospeda-50 border-hospeda-300 shadow-md'
                    : 'bg-white border-slate-100 hover:border-hospeda-200'
                }`}
              >
                <div className='flex justify-between items-start mb-2'>
                  <span className='font-bold text-slate-800 text-lg'>
                    {booking.room.name}
                  </span>
                  <span className='text-[10px] bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-bold'>
                    EN CASA
                  </span>
                </div>
                <div className='flex items-center gap-2 text-slate-500 text-sm mb-1'>
                  <User size={14} /> {booking.guest.full_name}
                </div>
                <div className='flex items-center gap-2 text-slate-400 text-xs'>
                  <CalendarCheck size={12} /> Salida: {booking.check_out}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* 2. DETALLE DE CUENTA (FACTURA) */}
      <div className='flex-1 bg-white rounded-[2rem] shadow-xl border border-slate-100 flex flex-col relative overflow-hidden'>
        {!selectedBooking || !statement ? (
          <div className='h-full flex flex-col items-center justify-center text-slate-300 opacity-50'>
            <Receipt
              size={64}
              className='mb-4 stroke-1'
            />
            <p className='text-xl font-bold'>Selecciona una reserva</p>
          </div>
        ) : (
          <>
            {/* Header Factura */}
            <div className='p-8 bg-slate-50 border-b border-slate-100 flex justify-between items-start'>
              <div>
                <h3 className='text-2xl font-bold text-slate-800'>
                  {selectedBooking.guest.full_name}
                </h3>
                <p className='text-slate-500 font-mono text-sm'>
                  DOC: {selectedBooking.guest.doc_number}
                </p>
              </div>
              <div className='text-right'>
                <div className='text-sm font-bold text-slate-400 uppercase tracking-widest'>
                  Saldo Pendiente
                </div>
                <div
                  className={`text-4xl font-display font-bold ${statement.balance > 0 ? 'text-red-500' : 'text-emerald-500'}`}
                >
                  ${statement.balance.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Cuerpo: Cargos y Abonos */}
            <div className='flex-1 overflow-y-auto p-8 grid grid-cols-2 gap-12 custom-scrollbar'>
              {/* Columna IZQ: Cargos */}
              <div className='space-y-6'>
                <h4 className='font-bold text-slate-800 border-b pb-2'>
                  Detalle de Cargos
                </h4>

                {/* 1. Hospedaje */}
                <div className='flex justify-between items-center py-2'>
                  <div className='flex items-center gap-3'>
                    <div className='p-2 bg-blue-50 text-blue-600 rounded-lg'>
                      <BedDouble size={16} />
                    </div>
                    <div>
                      <div className='font-bold text-slate-700'>Hospedaje</div>
                      <div className='text-xs text-slate-400'>
                        Tarifa Habitación
                      </div>
                    </div>
                  </div>
                  <span className='font-bold text-slate-800'>
                    ${statement.roomArgs.toLocaleString()}
                  </span>
                </div>

                {/* 2. Consumos */}
                {statement.details.services.map((svc: any) => (
                  <div
                    key={svc.id}
                    className='flex justify-between items-center py-2'
                  >
                    <div className='flex items-center gap-3'>
                      <div className='p-2 bg-amber-50 text-amber-600 rounded-lg'>
                        <Receipt size={16} />
                      </div>
                      <div>
                        <div className='font-bold text-slate-700'>
                          Consumo Bar/Rest
                        </div>
                        <div className='text-xs text-slate-400'>
                          {svc.created_at.substring(0, 10)}
                        </div>
                      </div>
                    </div>
                    <span className='font-bold text-slate-800'>
                      ${svc.total_price.toLocaleString()}
                    </span>
                  </div>
                ))}

                <div className='border-t pt-4 flex justify-between items-center text-lg'>
                  <span className='font-bold text-slate-500'>Total Cargos</span>
                  <span className='font-bold text-slate-800'>
                    $
                    {(
                      statement.roomArgs + statement.serviceCharges
                    ).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Columna DER: Pagos y Caja */}
              <div className='space-y-6 bg-slate-50 p-6 rounded-2xl h-fit'>
                <h4 className='font-bold text-slate-800 border-b pb-2'>
                  Pagos Realizados
                </h4>
                {statement.details.payments.length === 0 && (
                  <p className='text-sm text-slate-400'>
                    No hay abonos registrados.
                  </p>
                )}

                {statement.details.payments.map((pay: any) => (
                  <div
                    key={pay.id}
                    className='flex justify-between items-center text-sm'
                  >
                    <span className='text-slate-600 capitalize'>
                      {pay.method} ({pay.created_at.substring(0, 10)})
                    </span>
                    <span className='font-bold text-emerald-600'>
                      -${pay.amount.toLocaleString()}
                    </span>
                  </div>
                ))}

                {/* Formulario de Pago Rápido */}
                {statement.balance > 0 && (
                  <div className='mt-8 pt-6 border-t border-slate-200'>
                    <label className='text-xs font-bold uppercase text-slate-400 mb-2 block'>
                      Registrar Nuevo Pago
                    </label>
                    <div className='flex gap-2 mb-3'>
                      <div className='relative flex-1'>
                        <span className='absolute left-3 top-3 text-slate-400'>
                          $
                        </span>
                        <input
                          type='number'
                          className='w-full pl-6 p-3 rounded-xl border border-slate-200 font-bold outline-none'
                          value={paymentForm.amount}
                          onChange={(e) =>
                            setPaymentForm({
                              ...paymentForm,
                              amount: Number(e.target.value),
                            })
                          }
                        />
                      </div>
                      <select
                        className='p-3 rounded-xl border border-slate-200 font-bold text-sm bg-white'
                        value={paymentForm.method}
                        onChange={(e) =>
                          setPaymentForm({
                            ...paymentForm,
                            method: e.target.value,
                          })
                        }
                      >
                        <option value='cash'>Efectivo (Manual)</option>
                        <option value='transfer'>Transf. (Manual)</option>
                        <option value='wompi'>Tarjeta (Wompi)</option>
                      </select>
                    </div>

                    {/* LÓGICA DE RENDERIZADO CONDICIONAL DEL BOTÓN */}
                    {paymentForm.method === 'wompi' ? (
                      wompiPublicKey ? (
                        <WompiButton
                          amount={paymentForm.amount}
                          reference={selectedBooking.id}
                          publicKey={wompiPublicKey}
                          onSuccess={() => {
                            alert('🔄 Sincronizando pago con la base de datos...');
                            setTimeout(() => {
                              loadAccountForBooking(selectedBooking);
                            }, 2500);
                          }}
                        />
                      ) : (
                        <div className="p-3 bg-red-50 text-red-500 text-xs font-bold rounded-xl text-center border border-red-100">
                          Falta configurar la llave pública de Wompi en Ajustes.
                        </div>
                      )
                    ) : (
                      <button
                        onClick={processPayment}
                        className='w-full py-3 bg-slate-800 text-white font-bold rounded-xl hover:bg-black transition-colors flex justify-center gap-2'
                      >
                        <DollarSign size={16} /> Cobrar Manualmente
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Footer Acción Final */}
            <div className='p-6 bg-white border-t border-slate-100 flex justify-end'>
              <button
                onClick={finalizeCheckout}
                className={`px-8 py-4 rounded-xl font-bold shadow-lg flex items-center gap-2 transition-transform hover:scale-105 ${
                  statement.balance > 0
                    ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                    : 'bg-hospeda-900 text-white'
                }`}
              >
                <LogOut size={20} />
                {statement.balance > 0
                  ? 'Cerrar con Deuda (Riesgo)'
                  : 'Finalizar Estadía y Liberar'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CheckoutPanel;