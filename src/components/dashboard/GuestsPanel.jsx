import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';
import { UtensilsCrossed, Clock, X, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// 👇 Asegúrate de tener importado 'Phone' y 'Smartphone' de lucide-react
// import { Phone, Smartphone, ... } from 'lucide-react';

const GuestsPanel = ({
  guests = [],
  bookings = [],
  onEditGuest,
  onDeleteGuest,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // --- LÓGICA DE CONSUMOS (VERSION "RED DE ARRASTRE") ---
  const [activeGuest, setActiveGuest] = useState(null);
  const [consumptions, setConsumptions] = useState([]);
  const [loadingConsumptions, setLoadingConsumptions] = useState(false);

  React.useEffect(() => {
    if (!activeGuest) return;

    const fetchConsumptions = async () => {
      setLoadingConsumptions(true);
      console.log('🔍 Analizando consumos para:', activeGuest.full_name);

      try {
        // 1. Buscar la Reserva Activa
        const { data: bookingData, error: bookingError } = await supabase
          .from('bookings')
          .select('id, room_id, check_in, status')
          .eq('guest_id', activeGuest.id)
          .in('status', ['checked_in', 'confirmed'])
          .maybeSingle();

        if (bookingError || !bookingData) {
          console.warn(
            '⚠️ No se encontró reserva activa. Mostrando historial vacío.'
          );
          setConsumptions([]);
          return;
        }

        console.log('🏨 Habitación detectada:', bookingData.room_id);

        // 2. Traer los últimos 50 pedidos de ESTA habitación (Sin filtro estricto de fecha en SQL)
        // Esto evita que problemas de zona horaria oculten el pedido.
        const { data: rawOrders, error: ordersError } = await supabase
          .from('service_orders')
          .select('*')
          .eq('room_id', bookingData.room_id)
          .order('created_at', { ascending: false })
          .limit(50);

        if (ordersError) throw ordersError;

        // 3. Filtrado Inteligente en JS (Más seguro)
        // Aceptamos pedidos del mismo día del check-in, incluso si la hora varía un poco.
        const checkInTime = new Date(bookingData.check_in).getTime();

        const validOrders = (rawOrders || []).filter((order) => {
          const orderTime = new Date(order.created_at).getTime();
          // Margen de tolerancia: Aceptamos pedidos hasta 24h antes del check-in oficial
          // (Por si hicieron el pedido mientras esperaban la habitación)
          return orderTime >= checkInTime - 86400000;
        });

        console.log(
          `🍔 Pedidos: ${rawOrders?.length} brutos -> ${validOrders.length} válidos`
        );
        setConsumptions(validOrders);
      } catch (e) {
        console.error('🔥 Error cargando consumos:', e);
      } finally {
        setLoadingConsumptions(false);
      }
    };

    fetchConsumptions();
  }, [activeGuest]);

  // --- CÁLCULO DE DEUDA (A PRUEBA DE FALLOS) ---
  const consumptionsTotal = consumptions
    .filter((o) => {
      // Si payment_method es NULL o 'room_charge', se cobra.
      // Si es 'cash' o 'card', NO se cobra (ya pagaron).
      const method = o.payment_method || 'room_charge';
      return method === 'room_charge';
    })
    .reduce((sum, order) => sum + (Number(order.total_price) || 0), 0);

  // 1. Lógica de Filtrado
  const filteredGuests = guests.filter((guest) => {
    const search = searchTerm.toLowerCase();
    return (
      guest.full_name?.toLowerCase().includes(search) ||
      guest.doc_number?.includes(search) ||
      guest.email?.toLowerCase().includes(search)
    );
  });

  // 2. Cálculo de LTV
  const calculateLTV = (guestId) => {
    const guestBookings = bookings.filter((b) => b.guest_id === guestId);
    const totalSpent = guestBookings.reduce(
      (sum, b) => sum + (Number(b.total_price) || 0),
      0
    );
    return {
      total: totalSpent,
      visits: guestBookings.length,
    };
  };

  return (
    <div className='space-y-6 h-full flex flex-col'>
      {/* NOTA: El contenedor padre debe tener una altura definida (h-full o h-screen) 
         para que el scroll funcione dentro de este panel.
      */}

      {/* --- BLOQUE PRINCIPAL --- */}
      <div className='bg-white/30 backdrop-blur-xl border border-white/60 rounded-[35px] p-8 shadow-[0_8px_32px_rgba(0,0,0,0.03)] flex flex-col h-full max-h-[85vh] relative overflow-hidden'>
        {/* Encabezado y Buscador (Fijo arriba) */}
        <div className='flex flex-col md:flex-row justify-between items-center gap-6 mb-6 flex-none relative z-20'>
          <div>
            <h2 className='text-3xl font-serif font-bold text-slate-900 tracking-tight'>
              Huéspedes
            </h2>
            <p className='text-sm text-slate-500 font-medium mt-1'>
              {filteredGuests.length} clientes encontrados
            </p>
          </div>

          <div className='relative group w-full md:w-96'>
            <div className='absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-emerald-500 transition-colors'>
              <svg
                xmlns='http://www.w3.org/2000/svg'
                width='20'
                height='20'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
                strokeLinecap='round'
                strokeLinejoin='round'
              >
                <circle
                  cx='11'
                  cy='11'
                  r='8'
                />
                <path d='m21 21-4.3-4.3' />
              </svg>
            </div>
            <input
              type='text'
              placeholder='Buscar por nombre, cédula o email...'
              className='w-full py-4 pl-12 pr-6 bg-white/50 backdrop-blur-md border border-white/80 rounded-2xl text-sm font-bold text-slate-700 placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white/80 transition-all'
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* --- LISTA CON SCROLL --- */}
        {/* 🛠️ AJUSTE DE SCROLL: 
            Agregamos 'flex-1', 'overflow-y-auto' y eliminamos 'overflow-hidden' del padre 
            para que esta sección sea la que se desplace.
        */}
        <div className='flex-1 overflow-y-auto pr-2 space-y-4 relative z-10 custom-scrollbar pb-10'>
          {filteredGuests.length === 0 ? (
            <div className='text-center py-10 text-slate-400'>
              <p>No se encontraron huéspedes.</p>
            </div>
          ) : (
            filteredGuests.map((guest) => {
              const { total, visits } = calculateLTV(guest.id);

              return (
                <div
                  key={guest.id}
                  className='group relative shrink-0'
                >
                  {/* Resplandor hover */}
                  <div className='absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-blue-500/5 blur-xl rounded-[25px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10'></div>

                  <div className='flex flex-col md:flex-row items-center justify-between p-4 bg-white/60 backdrop-blur-md border border-white/80 rounded-[25px] shadow-sm transition-all duration-300 group-hover:shadow-md group-hover:bg-white/80 group-hover:scale-[1.005] gap-4'>
                    {/* Info Principal */}
                    <div className='flex items-center gap-5 flex-1 w-full md:w-auto'>
                      <div className='w-16 h-16 bg-gradient-to-br from-slate-200 to-slate-300 rounded-[18px] flex items-center justify-center text-slate-600 font-bold text-xl shadow-inner ring-2 ring-white shrink-0'>
                        {guest.full_name
                          ? guest.full_name[0].toUpperCase()
                          : '?'}
                      </div>
                      <div>
                        <h4 className='text-lg font-bold text-slate-800 mb-1 capitalize'>
                          {guest.full_name || 'Sin Nombre'}
                        </h4>

                        {/* 👇 AQUÍ ESTÁ EL CAMBIO: DATOS VISIBLES (ID + CELULAR) */}
                        <div className='flex flex-wrap gap-2'>
                          {/* Chip ID */}
                          <div className='flex items-center gap-1.5 text-xs font-medium text-slate-500 bg-slate-100/80 py-1 px-2.5 rounded-lg border border-slate-200/50'>
                            <svg
                              xmlns='http://www.w3.org/2000/svg'
                              width='12'
                              height='12'
                              viewBox='0 0 24 24'
                              fill='none'
                              stroke='currentColor'
                              strokeWidth='2'
                              strokeLinecap='round'
                              strokeLinejoin='round'
                            >
                              <rect
                                width='18'
                                height='12'
                                x='3'
                                y='4'
                                rx='2'
                              />
                              <path d='M3 10h18' />
                              <path d='M8 20h8' />
                            </svg>
                            {guest.doc_number || '---'}
                          </div>

                          {/* Chip Celular (Nuevo) */}
                          <div className='flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50/80 py-1 px-2.5 rounded-lg border border-emerald-100/50'>
                            <svg
                              xmlns='http://www.w3.org/2000/svg'
                              width='12'
                              height='12'
                              viewBox='0 0 24 24'
                              fill='none'
                              stroke='currentColor'
                              strokeWidth='2'
                              strokeLinecap='round'
                              strokeLinejoin='round'
                            >
                              <rect
                                width='14'
                                height='20'
                                x='5'
                                y='2'
                                rx='2'
                                ry='2'
                              />
                              <path d='M12 18h.01' />
                            </svg>
                            {guest.phone || 'Sin Celular'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Métricas y Acciones */}
                    <div className='flex items-center justify-between w-full md:w-auto gap-8 md:gap-12 px-4 md:px-0'>
                      <div className='text-center'>
                        <p className='text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1'>
                          Visitas
                        </p>
                        <p className='text-xl font-serif font-bold text-slate-700'>
                          {visits}
                        </p>
                      </div>

                      <div className='text-center'>
                        <p className='text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1'>
                          LTV Total
                        </p>
                        <div className='flex items-center justify-center gap-1'>
                          <span className='w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]'></span>
                          <p className='text-xl font-serif font-bold text-emerald-700'>
                            ${total.toLocaleString('es-CO')}
                          </p>
                        </div>
                      </div>

                      <div className='flex items-center gap-2 opacity-100 md:opacity-0 md:transform md:translate-x-4 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0'>
                        {/* Botón Ver Consumos */}
                        <button
                          onClick={() => setActiveGuest(guest)}
                          className='p-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-xl transition-colors group/btn shadow-sm'
                          title='Ver Consumos'
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => onEditGuest(guest)}
                          className='p-3 bg-slate-100 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-xl transition-colors group/btn shadow-sm'
                          title='Editar'
                        >
                          <svg
                            xmlns='http://www.w3.org/2000/svg'
                            width='18'
                            height='18'
                            viewBox='0 0 24 24'
                            fill='none'
                            stroke='currentColor'
                            strokeWidth='2'
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            className='group-hover/btn:scale-110 transition-transform'
                          >
                            <path d='M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z' />
                            <path d='m15 5 4 4' />
                          </svg>
                        </button>
                        <button
                          onClick={() => onDeleteGuest(guest.id)}
                          className='p-3 bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-xl transition-colors group/btn shadow-sm'
                          title='Eliminar'
                        >
                          <svg
                            xmlns='http://www.w3.org/2000/svg'
                            width='18'
                            height='18'
                            viewBox='0 0 24 24'
                            fill='none'
                            stroke='currentColor'
                            strokeWidth='2'
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            className='group-hover/btn:scale-110 transition-transform'
                          >
                            <path d='M3 6h18' />
                            <path d='M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6' />
                            <path d='M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2' />
                            <line
                              x1='10'
                              x2='10'
                              y1='11'
                              y2='17'
                            />
                            <line
                              x1='14'
                              x2='14'
                              y1='11'
                              y2='17'
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
      {/* --- MODAL DE DETALLES Y CONSUMOS --- */}
      <AnimatePresence>
        {activeGuest && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveGuest(null)}
              className='fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40'
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className='fixed top-0 right-0 h-full w-full md:w-[450px] bg-[#F2F4F6] z-50 shadow-2xl border-l border-white p-6 flex flex-col'
            >
              {/* Header Modal */}
              <div className='flex justify-between items-center mb-8'>
                <div>
                  <h3 className='font-serif text-2xl font-bold text-slate-800'>
                    {activeGuest.full_name}
                  </h3>
                  <span className='text-xs font-bold text-slate-400 uppercase tracking-widest'>
                    Detalle de Estadía
                  </span>
                </div>
                <button
                  onClick={() => setActiveGuest(null)}
                  className='p-2 bg-white rounded-full text-slate-400 hover:text-slate-800 shadow-sm'
                >
                  <X size={20} />
                </button>
              </div>

              {/* === AQUÍ ENTRA TU CÓDIGO DE UI DE CONSUMOS === */}
              <div className='flex-1 overflow-y-auto custom-scrollbar'>
                <div className='bg-white/50 backdrop-blur-md rounded-2xl p-5 border border-white/60 shadow-sm'>
                  <div className='flex justify-between items-center mb-4'>
                    <h3 className='text-sm font-bold text-slate-700 flex items-center gap-2 uppercase tracking-wide'>
                      <UtensilsCrossed
                        size={16}
                        className='text-slate-400'
                      />
                      Consumos Room Service
                    </h3>
                    <span className='bg-slate-900 text-white px-3 py-1 rounded-full text-xs font-bold shadow-md'>
                      Deuda: ${consumptionsTotal.toLocaleString()}
                    </span>
                  </div>

                  {loadingConsumptions ? (
                    <div className='text-center py-4 text-xs text-slate-400 animate-pulse'>
                      Cargando pedidos...
                    </div>
                  ) : consumptions.length > 0 ? (
                    <div className='space-y-3'>
                      {consumptions.map((order) => (
                        <div
                          key={order.id}
                          className='bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex flex-col gap-2'
                        >
                          <div className='flex justify-between items-start border-b border-slate-50 pb-2'>
                            <div className='flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider'>
                              <Clock size={10} />
                              {new Date(order.created_at).toLocaleTimeString(
                                [],
                                { hour: '2-digit', minute: '2-digit' }
                              )}
                            </div>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                order.payment_method === 'room_charge'
                                  ? 'bg-orange-100 text-orange-600'
                                  : 'bg-emerald-100 text-emerald-600'
                              }`}
                            >
                              {order.payment_method === 'room_charge'
                                ? 'Por Pagar'
                                : 'Pagado'}
                            </span>
                          </div>

                          <div className='space-y-1'>
                            {order.items.map((item, idx) => (
                              <div
                                key={idx}
                                className='flex justify-between text-xs text-slate-600'
                              >
                                <span>
                                  <span className='font-bold text-slate-800'>
                                    {item.qty}x
                                  </span>{' '}
                                  {item.name}
                                </span>
                                <span className='font-medium text-slate-400'>
                                  ${(item.price * item.qty).toLocaleString()}
                                </span>
                              </div>
                            ))}
                          </div>

                          <div className='flex justify-end pt-1'>
                            <span className='text-xs font-bold text-slate-800'>
                              Total: ${order.total_price.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className='text-center py-6 border-2 border-dashed border-slate-200 rounded-xl'>
                      <p className='text-xs text-slate-400 font-medium italic'>
                        Sin consumos registrados
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GuestsPanel;
