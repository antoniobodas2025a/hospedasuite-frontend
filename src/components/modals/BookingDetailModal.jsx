import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { supabase } from '../../supabaseClient';
import {
  X,
  Edit,
  CreditCard,
  Plus,
  Banknote,
  ScanBarcode,
  MessageCircle,
  CheckCircle2,
  Trash2,
  User,
} from 'lucide-react';

const BookingDetailModal = ({
  booking,
  rooms,
  onClose,
  onRefresh,
  onUpdateBooking,
  onCheckOut,
  onWhatsApp,
}) => {
  const [activeDetailTab, setActiveDetailTab] = useState('info');
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    method: 'EFECTIVO',
  });
  const [chargeForm, setChargeForm] = useState({ concept: '', price: '' });
  const [currentBookingOrders, setCurrentBookingOrders] = useState([]);

  useEffect(() => {
    const fetchBookingOrders = async () => {
      if (!booking) return;
      const { data } = await supabase
        .from('service_orders')
        .select('*')
        .eq('room_id', booking.room_id)
        .gte(
          'created_at',
          new Date(
            new Date(booking.check_in).getTime() - 86400000,
          ).toISOString(),
        )
        .order('created_at', { ascending: false });

      setCurrentBookingOrders(data || []);
    };
    fetchBookingOrders();
  }, [booking]);

  const calculateFinancials = (b) => {
    if (!b) return { total: 0, paid: 0, pending: 0 };
    const basePrice = Number(b.total_price) || 0;
    const manualCharges =
      b.charges?.reduce((sum, c) => sum + (Number(c.price) || 0), 0) || 0;
    const totalPaid =
      b.payments?.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) || 0;
    const grandTotal = basePrice + manualCharges;
    return {
      total: grandTotal,
      paid: totalPaid,
      pending: grandTotal - totalPaid,
    };
  };

  const handleRegisterPayment = async (e) => {
    e.preventDefault();
    if (!paymentForm.amount) return;

    const { error } = await supabase.from('payments').insert([
      {
        booking_id: booking.id,
        amount: parseFloat(paymentForm.amount),
        method: paymentForm.method,
      },
    ]);

    if (error) {
      alert('Error: ' + error.message);
    } else {
      setPaymentForm({ ...paymentForm, amount: '' });
      await reloadBooking();
      onRefresh();
      alert('Pago registrado 💰');
    }
  };

  const handleAddCharge = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('charges').insert([
      {
        booking_id: booking.id,
        item: chargeForm.concept,
        price: parseFloat(chargeForm.price),
      },
    ]);

    if (error) {
      alert('Error: ' + error.message);
    } else {
      setChargeForm({ concept: '', price: '' });
      await reloadBooking();
      onRefresh();
    }
  };

  const handleCheckIn = async () => {
    if (window.confirm('¿Confirmar ingreso del huésped?')) {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'checked_in' })
        .eq('id', booking.id);

      if (!error) {
        new Audio('https://actions.google.com/sounds/v1/cartoon/pop.ogg')
          .play()
          .catch(() => {});
        onClose();
        onRefresh();
      }
    }
  };

  const reloadBooking = async () => {
    const { data } = await supabase
      .from('bookings')
      .select('*, guests(*), payments(*), charges(*)')
      .eq('id', booking.id)
      .single();
    if (data) onUpdateBooking(data);
  };

  return createPortal(
    <div className='fixed inset-0 bg-black/60 backdrop-blur-md z-[9999] flex items-end md:items-center justify-center p-0 md:p-4'>
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        className='bg-[#F8FAFC] rounded-t-[2rem] md:rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden h-[85vh] md:h-auto md:max-h-[90vh] flex flex-col relative'
      >
        <div className='p-6 border-b border-slate-200/60 flex justify-between items-center bg-white/80 backdrop-blur-xl'>
          <div>
            <h3 className='font-serif text-2xl font-bold text-slate-800'>
              Estadía Activa
            </h3>
            <p className='text-[10px] font-bold text-slate-400 uppercase tracking-widest'>
              Reserva #{booking.id.slice(0, 8)}
            </p>
          </div>
          <button
            onClick={onClose}
            className='p-2 bg-slate-100 rounded-full text-slate-400 hover:text-red-500 transition-colors'
          >
            <X size={24} />
          </button>
        </div>

        <div className='flex border-b border-slate-100 bg-white'>
          {[
            { id: 'info', label: 'Gestión', icon: <Edit size={14} /> },
            {
              id: 'billing',
              label: 'Consumos',
              icon: <CreditCard size={14} />,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveDetailTab(tab.id)}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-tighter flex items-center justify-center gap-2 transition-all ${
                activeDetailTab === tab.id
                  ? 'text-slate-900 border-b-2 border-slate-900'
                  : 'text-slate-400'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        <div className='flex-1 overflow-y-auto p-6 space-y-6 pb-24'>
          {activeDetailTab === 'info' && (
            <div className='space-y-6'>
              <div className='bg-white p-4 rounded-2xl border border-slate-100 shadow-sm'>
                <label className='text-[10px] font-bold text-slate-400 uppercase block mb-1'>
                  Huésped
                </label>
                <div className='flex items-center gap-3'>
                  <div className='w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-white font-bold'>
                    {booking.guests?.full_name?.[0] || 'H'}
                  </div>
                  <div>
                    <p className='font-bold text-slate-800 leading-tight'>
                      {booking.guests?.full_name || 'Anónimo'}
                    </p>
                    <p className='text-xs text-slate-500'>
                      {booking.guests?.doc_number || 'Sin documento'}
                    </p>
                  </div>
                </div>
              </div>

              <div className='space-y-1'>
                <label className='text-[10px] font-bold text-slate-400 uppercase ml-2'>
                  Habitación
                </label>
                <select
                  className='w-full p-4 bg-white rounded-2xl border border-slate-100 font-bold text-slate-800'
                  value={booking.room_id}
                  onChange={async (e) => {
                    await supabase
                      .from('bookings')
                      .update({ room_id: e.target.value })
                      .eq('id', booking.id);
                    onRefresh();
                  }}
                >
                  {rooms.map((r) => (
                    <option
                      key={r.id}
                      value={r.id}
                    >
                      {r.name} - ${parseInt(r.price).toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>

              {/* ✨ RECUPERADO: EDITORES DE FECHA */}
              <div className='grid grid-cols-2 gap-4'>
                <input
                  type='date'
                  className='p-4 bg-white rounded-2xl border border-slate-100 font-bold text-xs'
                  value={booking.check_in}
                  onChange={async (e) => {
                    await supabase
                      .from('bookings')
                      .update({ check_in: e.target.value })
                      .eq('id', booking.id);
                    onRefresh();
                  }}
                />
                <input
                  type='date'
                  className='p-4 bg-white rounded-2xl border border-slate-100 font-bold text-xs'
                  value={booking.check_out}
                  onChange={async (e) => {
                    await supabase
                      .from('bookings')
                      .update({ check_out: e.target.value })
                      .eq('id', booking.id);
                    onRefresh();
                  }}
                />
              </div>
            </div>
          )}

          {activeDetailTab === 'billing' && (
            <div className='space-y-6'>
              <div className='grid grid-cols-2 gap-3'>
                <div className='bg-emerald-50 p-4 rounded-2xl border border-emerald-100'>
                  <span className='text-[9px] font-bold text-emerald-600 uppercase'>
                    Pagado
                  </span>
                  <p className='text-lg font-bold text-emerald-700'>
                    ${calculateFinancials(booking).paid.toLocaleString()}
                  </p>
                </div>
                <div className='bg-orange-50 p-4 rounded-2xl border border-orange-100'>
                  <span className='text-[9px] font-bold text-orange-600 uppercase'>
                    Pendiente Total
                  </span>
                  <p className='text-lg font-bold text-orange-700'>
                    $
                    {(
                      calculateFinancials(booking).pending +
                      currentBookingOrders.reduce(
                        (acc, o) =>
                          acc +
                          (o.payment_method === 'room_charge'
                            ? o.total_price
                            : 0),
                        0,
                      )
                    ).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* ✨ RECUPERADO: LISTA DE PEDIDOS VISUAL */}
              <div className='bg-slate-50 p-4 rounded-2xl border border-slate-100 max-h-40 overflow-y-auto custom-scrollbar space-y-2'>
                <p className='text-[10px] font-bold text-slate-400 uppercase mb-2 flex justify-between'>
                  <span>🍔 Room Service & Restaurante</span>
                  <span>
                    $
                    {currentBookingOrders
                      .reduce(
                        (acc, o) =>
                          acc +
                          (o.payment_method === 'room_charge'
                            ? o.total_price
                            : 0),
                        0,
                      )
                      .toLocaleString()}
                  </span>
                </p>

                {currentBookingOrders.length === 0 ? (
                  <p className='text-xs text-slate-400 italic text-center py-2'>
                    Sin pedidos registrados
                  </p>
                ) : (
                  currentBookingOrders.map((order) => (
                    <div
                      key={order.id}
                      className='bg-white p-2 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center'
                    >
                      <div>
                        <p className='text-xs font-bold text-slate-700'>
                          {order.items
                            .map((i) => `${i.qty}x ${i.name}`)
                            .join(', ')}
                        </p>
                        <p className='text-[10px] text-slate-400'>
                          {new Date(order.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <div className='text-right'>
                        <p className='text-xs font-bold text-slate-800'>
                          ${order.total_price.toLocaleString()}
                        </p>
                        <span
                          className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase ${order.payment_method === 'room_charge' ? 'bg-orange-100 text-orange-600' : 'bg-emerald-100 text-emerald-600'}`}
                        >
                          {order.payment_method === 'room_charge'
                            ? 'Por Pagar'
                            : 'Pagado'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <form
                onSubmit={handleRegisterPayment}
                className='relative overflow-hidden rounded-2xl p-5 border border-white/50 shadow-lg group'
              >
                <div className='absolute inset-0 bg-white/40 backdrop-blur-xl z-0'></div>
                <div className='relative z-10 space-y-4'>
                  <div className='flex justify-between items-center'>
                    <p className='text-[10px] font-bold text-slate-500 uppercase tracking-widest'>
                      Terminal de Pago
                    </p>
                    <div className='flex bg-white/50 rounded-lg p-1 gap-1'>
                      {['EFECTIVO', 'TARJETA', 'TRANSFERENCIA'].map((m) => (
                        <button
                          key={m}
                          type='button'
                          onClick={() =>
                            setPaymentForm({ ...paymentForm, method: m })
                          }
                          className={`p-1.5 rounded-md ${paymentForm.method === m ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}
                        >
                          {m === 'EFECTIVO' ? (
                            <Banknote size={14} />
                          ) : m === 'TARJETA' ? (
                            <CreditCard size={14} />
                          ) : (
                            <ScanBarcode size={14} />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className='flex gap-3'>
                    <input
                      type='number'
                      placeholder='0.00'
                      className='w-full pl-4 py-3 bg-white/60 border-none rounded-xl text-xl font-bold text-slate-800'
                      value={paymentForm.amount}
                      onChange={(e) =>
                        setPaymentForm({
                          ...paymentForm,
                          amount: e.target.value,
                        })
                      }
                    />
                    <button
                      type='submit'
                      className='bg-emerald-600 text-white px-5 rounded-xl font-bold text-xs uppercase'
                    >
                      Cobrar
                    </button>
                  </div>
                </div>
              </form>

              <form
                onSubmit={handleAddCharge}
                className='bg-white p-4 rounded-2xl border border-slate-100 space-y-3'
              >
                <p className='text-[10px] font-bold text-slate-400 uppercase'>
                  Cargar Consumo
                </p>
                <div className='flex gap-2'>
                  <input
                    placeholder='Item'
                    className='flex-1 p-3 text-sm rounded-xl'
                    value={chargeForm.concept}
                    onChange={(e) =>
                      setChargeForm({ ...chargeForm, concept: e.target.value })
                    }
                  />
                  <input
                    type='number'
                    placeholder='$'
                    className='w-24 p-3 text-sm rounded-xl font-bold'
                    value={chargeForm.price}
                    onChange={(e) =>
                      setChargeForm({ ...chargeForm, price: e.target.value })
                    }
                  />
                  <button
                    type='submit'
                    className='bg-slate-900 text-white p-3 rounded-xl'
                  >
                    <Plus size={18} />
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className='grid grid-cols-3 gap-2 pt-4 border-t border-slate-100'>
            <button
              onClick={onWhatsApp}
              className='flex flex-col items-center p-3 bg-white border border-slate-100 rounded-2xl gap-1 hover:bg-slate-50'
            >
              <MessageCircle
                className='text-emerald-500'
                size={18}
              />
              <span className='text-[8px] font-bold uppercase text-slate-500'>
                WhatsApp
              </span>
            </button>
            {booking.status === 'confirmed' ? (
              <button
                onClick={handleCheckIn}
                className='flex flex-col items-center p-3 bg-blue-50 border border-blue-100 rounded-2xl gap-1 hover:bg-blue-100'
              >
                <CheckCircle2
                  className='text-blue-600'
                  size={18}
                />
                <span className='text-[8px] font-bold uppercase text-blue-600'>
                  Check-in
                </span>
              </button>
            ) : (
              <div className='flex flex-col items-center p-3 bg-emerald-50 border border-emerald-100 rounded-2xl gap-1 opacity-50 cursor-default'>
                <User
                  className='text-emerald-600'
                  size={18}
                />
                <span className='text-[8px] font-bold uppercase text-emerald-600'>
                  En Casa
                </span>
              </div>
            )}
            <button
              onClick={onCheckOut}
              className='flex flex-col items-center p-3 bg-red-50 border border-red-100 rounded-2xl gap-1 hover:bg-red-100'
            >
              <Trash2
                className='text-red-500'
                size={18}
              />
              <span className='text-[8px] font-bold uppercase text-red-500'>
                Salida
              </span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>,
    document.body,
  );
};

export default BookingDetailModal;
