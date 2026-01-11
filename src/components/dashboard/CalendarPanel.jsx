import React, { useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
// Mantenemos tu componente de OCR
import CedulaOCR from '../CedulaOCR';
import { useDraggableScroll } from '../../hooks/useDraggableScroll';

const CalendarPanel = ({
  rooms,
  bookings,
  hotelInfo,
  calendar,
  onOpenScanner,
}) => {
  // Desestructuramos la lógica
  const {
    currentDate,
    changeMonth,
    goToToday,
    getBookingForDate,
    setSelectedBooking,
    setIsEditing,
    showBookingModal, // Se usa en el botón
    setShowBookingModal,
    bookingForm, // Se usa implícitamente en el set
    setBookingForm,
    availableRoomsList, // Se mantiene para lógica interna
    showScanner,
    setShowScanner,
    handleScanSuccess,
    // Las demás funciones se pasan a los modales en DashboardPage,
    // aquí solo necesitamos las de navegación y selección.
  } = calendar;

  // 👇 LÓGICA DE COLORES DE ESTADO (CORRECTA)
  const getStatusColor = (status) => {
    switch (status) {
      case 'checked_in':
        return 'bg-emerald-600 shadow-emerald-900/20 border-emerald-500/50'; // 🟢 En Casa
      case 'checked_out':
        return 'bg-slate-300 grayscale opacity-70 border-slate-400/30'; // ⚪ Historial
      case 'maintenance':
        return 'bg-slate-800 shadow-slate-900/20 border-slate-600'; // ⚫ Mantenimiento
      case 'confirmed':
        return 'bg-blue-600 shadow-blue-900/20 border-blue-500/50'; // 🔵 Confirmado
      default:
        return 'bg-[#8C3A3A] shadow-red-900/20 border-red-500/50'; // 🔴 Error/Otro
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'checked_in':
        return 'En Casa';
      case 'checked_out':
        return 'Salida';
      case 'confirmed':
        return 'Confirmado';
      case 'maintenance':
        return 'Mantenimiento';
      default:
        return 'Pendiente';
    }
  };

  // 👇 ACTIVAMOS EL MODO DRAG (ESTILO MAC)
  const {
    ref: scrollRef,
    events: scrollEvents,
    style: scrollStyle,
  } = useDraggableScroll();

  // 👇 SCROLL INTELIGENTE: Si es el mes actual, viaja al día de hoy
  useEffect(() => {
    if (scrollRef.current) {
      const today = new Date();
      // Verificamos si la vista actual corresponde al mes y año reales
      const isCurrentMonth =
        currentDate.getMonth() === today.getMonth() &&
        currentDate.getFullYear() === today.getFullYear();

      if (isCurrentMonth) {
        // 🧮 CÁLCULO DE POSICIÓN
        // w-16 de Tailwind son 4rem. Asumiendo 16px base = 64px por día.
        const dayWidth = 64;
        const currentDayIndex = today.getDate() - 1; // Restamos 1 porque el día 1 está en la posición 0

        // Calculamos el scroll exacto
        const targetScroll = currentDayIndex * dayWidth;

        // Ejecutamos el scroll suave
        scrollRef.current.scrollTo({
          left: targetScroll,
          behavior: 'smooth',
        });
      } else {
        // Si navegas a otro mes (Enero -> Febrero), vuelve al inicio
        scrollRef.current.scrollLeft = 0;
      }
    }
  }, [currentDate]);

  // Días del mes
  const daysInMonth = Array.from(
    {
      length: new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1,
        0
      ).getDate(),
    },
    (_, i) => new Date(currentDate.getFullYear(), currentDate.getMonth(), i + 1)
  );

  // ⚡️ FUNCIÓN RECUPERADA: Manejo de clics en celdas vacías
  const handleCellClick = (room, date) => {
    // 1. Verificamos si ya hay reserva (aunque visualmente se ve, la lógica debe saberlo)
    const existingBooking = getBookingForDate(room.id, date);

    if (existingBooking) {
      // Si hay reserva, la abrimos
      setSelectedBooking(existingBooking);
      setIsEditing(false);
    } else {
      // 2. Si está vacía, preparamos el formulario para NUEVA reserva
      const dateStr = date.toISOString().split('T')[0];

      // Calculamos fecha de salida (día siguiente por defecto)
      const nextDay = new Date(date);
      nextDay.setDate(date.getDate() + 1);
      const nextDayStr = nextDay.toISOString().split('T')[0];

      setBookingForm({
        type: 'booking',
        roomId: room.id,
        checkIn: dateStr,
        checkOut: nextDayStr,
        adults: 1,
        children: 0,
        price: 0,
        guestName: '',
        guestDoc: '',
        guestPhone: '',
      });
      setShowBookingModal(true);
    }
  };

  return (
    <div className='h-full flex flex-col relative overflow-hidden'>
      {/* 1. BARRA DE NAVEGACIÓN */}
      <div className='flex-none px-6 py-4 flex items-center justify-between z-40 bg-white/40 backdrop-blur-md border-b border-white/20 shadow-sm'>
        <div className='flex items-center gap-6'>
          <div className='flex items-center gap-2'>
            <div className='p-2 bg-white rounded-xl shadow-sm'>
              <CalendarIcon
                className='text-slate-700'
                size={20}
              />
            </div>
            <div>
              <h2 className='text-2xl font-serif font-bold text-slate-800 capitalize leading-none'>
                {currentDate.toLocaleDateString('es-CO', { month: 'long' })}
              </h2>
              <span className='text-sm text-slate-500 font-medium'>
                {currentDate.getFullYear()}
              </span>
            </div>
          </div>

          <div className='flex bg-white/60 p-1 rounded-xl shadow-inner'>
            <button
              onClick={() => changeMonth(-1)}
              className='p-2 hover:bg-white rounded-lg text-slate-600 transition-all'
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={goToToday}
              className='px-4 py-1 text-xs font-bold text-slate-600 hover:text-slate-900'
            >
              Hoy
            </button>
            <button
              onClick={() => changeMonth(1)}
              className='p-2 hover:bg-white rounded-lg text-slate-600 transition-all'
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        <button
          onClick={() => {
            setBookingForm({
              type: 'booking',
              guestName: '',
              guestDoc: '',
              guestPhone: '',
              roomId: '',
              checkIn: new Date().toISOString().split('T')[0],
              checkOut: new Date(Date.now() + 86400000)
                .toISOString()
                .split('T')[0],
              adults: 1,
              children: 0,
              price: 0,
            });
            setShowBookingModal(true);
          }}
          className='hidden md:flex bg-slate-900 text-white px-5 py-3 rounded-xl font-bold shadow-lg shadow-slate-900/20 hover:scale-105 transition-transform items-center gap-2'
        >
          <Plus size={18} /> Nueva Estadía
        </button>
      </div>

      {/* 2. ÁREA DEL CALENDARIO (Scrollable + Draggable) */}
      <div
        ref={scrollRef}
        {...scrollEvents}
        style={{ ...scrollStyle }}
        className='flex-1 overflow-auto custom-scrollbar relative bg-slate-50/30'
      >
        <div className='min-w-max pb-32'>
          {/* CABECERA DE DÍAS (Sticky Top) */}
          <div className='flex sticky top-0 z-30 bg-white/90 backdrop-blur-xl border-b border-slate-100 shadow-sm'>
            <div className='w-48 p-4 sticky left-0 z-40 bg-white/95 border-r border-slate-100 shadow-[4px_0_24px_rgba(0,0,0,0.02)] flex items-center'>
              <span className='text-xs font-bold text-slate-400 uppercase tracking-widest'>
                Habitación
              </span>
            </div>

            {daysInMonth.map((d) => {
              const isToday =
                d.getDate() === new Date().getDate() &&
                d.getMonth() === new Date().getMonth();
              return (
                <div
                  key={d.toString()}
                  className={`w-16 p-2 text-center border-r border-slate-50 flex flex-col justify-center items-center ${
                    isToday ? 'bg-blue-50/50' : ''
                  }`}
                >
                  <span
                    className={`text-[10px] font-bold uppercase mb-1 ${
                      isToday ? 'text-blue-600' : 'text-slate-400'
                    }`}
                  >
                    {d
                      .toLocaleDateString('es', { weekday: 'short' })
                      .slice(0, 3)}
                  </span>
                  <div
                    className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold ${
                      isToday
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                        : 'text-slate-700'
                    }`}
                  >
                    {d.getDate()}
                  </div>
                </div>
              );
            })}
          </div>

          {/* CUERPO DEL GRID */}
          <div className='divide-y divide-slate-100'>
            {rooms.map((room) => (
              <div
                key={room.id}
                className='flex group bg-white hover:bg-slate-50/50 transition-colors'
              >
                {/* Nombre Habitación (Sticky Left) */}
                <div className='w-48 p-4 sticky left-0 z-20 bg-white group-hover:bg-[#F8FAFC] border-r border-slate-100 shadow-[4px_0_24px_rgba(0,0,0,0.02)] flex flex-col justify-center transition-colors'>
                  <span className='font-serif font-bold text-slate-800 text-sm'>
                    {room.name}
                  </span>
                  <div className='flex items-center gap-1 mt-1'>
                    <span className='text-[10px] px-1.5 py-0.5 bg-slate-100 rounded text-slate-500 font-medium'>
                      ${parseInt(room.price).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Celdas */}
                {daysInMonth.map((d) => {
                  const booking = getBookingForDate(room.id, d);
                  const checkIn = booking
                    ? new Date(booking.check_in + 'T00:00')
                    : null;
                  const checkOut = booking
                    ? new Date(booking.check_out + 'T00:00')
                    : null;
                  const isStart = booking && checkIn.getTime() === d.getTime();

                  let duration = 1;
                  if (booking && checkOut && checkIn) {
                    const diffTime = Math.abs(checkOut - checkIn);
                    duration = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                  }

                  return (
                    <div
                      key={d.toISOString()}
                      // 👇 AQUÍ ESTÁ LA CORRECCIÓN: Evento onClick restaurado
                      onClick={() => !booking && handleCellClick(room, d)}
                      className={`w-16 h-20 border-r border-slate-50 relative flex-none cursor-pointer hover:bg-slate-100/50 transition-colors ${
                        d < new Date().setHours(0, 0, 0, 0)
                          ? 'bg-slate-50/30'
                          : ''
                      }`}
                    >
                      {/* Renderizado de Reserva */}
                      {booking && isStart && (
                        <motion.div
                          layoutId={`booking-${booking.id}`}
                          // Click en la reserva abre detalles
                          onClick={(e) => {
                            e.stopPropagation(); // Evita disparar el click de la celda
                            setSelectedBooking(booking);
                            setIsEditing(false);
                          }}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          whileHover={{ scale: 1.05, zIndex: 50 }}
                          className={`absolute top-1 left-1 bottom-1 shadow-md rounded-xl z-10 cursor-pointer overflow-hidden border border-white/20 ${getStatusColor(
                            booking.status
                          )}`}
                          style={{
                            width: `calc(${duration} * 4rem - 0.5rem)`,
                          }}
                        >
                          <div className='p-2 h-full flex flex-col justify-center'>
                            <span className='text-xs font-bold text-white truncate drop-shadow-md'>
                              {booking.guests?.full_name || 'Mantenimiento'}
                            </span>
                            {booking.status !== 'maintenance' && (
                              <span className='text-[10px] text-white/80 truncate'>
                                {getStatusLabel(booking.status)}
                              </span>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FAB Móvil */}
      <div className='md:hidden fixed bottom-24 right-6 z-50'>
        <button
          onClick={() => setShowBookingModal(true)}
          className='bg-slate-900 text-white p-4 rounded-full shadow-2xl shadow-slate-900/40'
        >
          <Plus size={24} />
        </button>
      </div>

      {/* Scanner Modal */}
      <AnimatePresence>
        {showScanner && (
          <CedulaOCR
            onScanSuccess={handleScanSuccess}
            onClose={() => setShowScanner(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default CalendarPanel;
