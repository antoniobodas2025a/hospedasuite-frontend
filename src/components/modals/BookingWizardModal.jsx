import React from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { X, CheckCircle2, Hammer, User, ScanBarcode } from 'lucide-react';

const BookingWizardModal = ({ calendarData, onClose, onOpenScanner }) => {
  // Extraemos datos del hook para escribir menos
  const {
    bookingForm,
    setBookingForm,
    availableRoomsList,
    handleCreateBooking,
  } = calendarData;

  return createPortal(
    <div className='fixed inset-0 bg-[#0f172a]/60 backdrop-blur-xl z-[9999] flex items-center justify-center p-4'>
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        transition={{ type: 'spring', duration: 0.5, bounce: 0.3 }}
        className='bg-[#F8FAFC]/95 border border-white/60 rounded-[2.5rem] w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col relative max-h-[90vh]'
      >
        {/* HEADER */}
        <div className='px-10 py-8 border-b border-slate-200/50 flex justify-between items-start bg-white/50 backdrop-blur-md'>
          <div>
            <h3 className='font-serif text-4xl font-bold text-slate-800 tracking-tight'>
              Nueva Estadía
            </h3>
            <p className='text-slate-500 mt-1 font-medium'>
              Configura los detalles de la reserva
            </p>
          </div>
          <button
            onClick={onClose}
            className='p-3 bg-white rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all shadow-sm border border-slate-100'
          >
            <X size={24} />
          </button>
        </div>

        {/* BODY */}
        <div className='flex-1 overflow-y-auto custom-scrollbar p-10'>
          <form
            onSubmit={handleCreateBooking}
            className='grid grid-cols-1 lg:grid-cols-12 gap-8'
          >
            {/* COLUMNA IZQUIERDA */}
            <div className='lg:col-span-7 space-y-8'>
              {/* Selector Tipo */}
              <div className='bg-slate-200/50 p-2 rounded-[1.5rem] flex'>
                {['booking', 'maintenance'].map((t) => (
                  <button
                    key={t}
                    type='button'
                    onClick={() => setBookingForm({ ...bookingForm, type: t })}
                    className={`flex-1 py-4 rounded-[1.2rem] text-sm font-bold uppercase tracking-wider transition-all duration-300 ${
                      bookingForm.type === t
                        ? 'bg-white text-slate-900 shadow-md transform scale-100'
                        : 'text-slate-500 hover:bg-slate-200/50'
                    }`}
                  >
                    {t === 'booking' ? 'Huésped' : 'Mantenimiento'}
                  </button>
                ))}
              </div>

              {/* Fechas */}
              <div className='grid grid-cols-2 gap-6'>
                <div className='space-y-2'>
                  <label className='text-xs font-bold uppercase text-slate-400 ml-2'>
                    Entrada
                  </label>
                  <input
                    type='date'
                    className='w-full p-5 bg-white rounded-[1.5rem] border border-slate-100 font-bold text-lg text-slate-700 focus:ring-4 focus:ring-blue-100 transition-all shadow-sm'
                    value={bookingForm.checkIn}
                    onChange={(e) =>
                      setBookingForm({
                        ...bookingForm,
                        checkIn: e.target.value,
                      })
                    }
                  />
                </div>
                <div className='space-y-2'>
                  <label className='text-xs font-bold uppercase text-slate-400 ml-2'>
                    Salida
                  </label>
                  <input
                    type='date'
                    className='w-full p-5 bg-white rounded-[1.5rem] border border-slate-100 font-bold text-lg text-slate-700 focus:ring-4 focus:ring-blue-100 transition-all shadow-sm'
                    value={bookingForm.checkOut}
                    onChange={(e) =>
                      setBookingForm({
                        ...bookingForm,
                        checkOut: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              {/* Habitación y Personas */}
              <div className='grid grid-cols-12 gap-6'>
                <div className='col-span-8 space-y-2'>
                  <label className='text-xs font-bold uppercase text-slate-400 ml-2'>
                    Habitación
                  </label>
                  <select
                    className='w-full p-5 bg-white rounded-[1.5rem] border border-slate-100 font-bold text-lg text-slate-700 shadow-sm'
                    value={bookingForm.roomId}
                    onChange={(e) =>
                      setBookingForm({ ...bookingForm, roomId: e.target.value })
                    }
                  >
                    <option value=''>Seleccionar Habitación...</option>
                    {availableRoomsList.map((r) => (
                      <option
                        key={r.id}
                        value={r.id}
                      >
                        {r.name} — ${parseInt(r.price).toLocaleString()}
                      </option>
                    ))}
                  </select>
                </div>
                <div className='col-span-4 space-y-2'>
                  <label className='text-xs font-bold uppercase text-slate-400 ml-2'>
                    Huéspedes
                  </label>
                  <div className='bg-white border border-slate-100 rounded-[1.5rem] p-2 grid grid-cols-1 md:grid-cols-2 items-center h-auto md:h-[70px] shadow-sm gap-2'>
                    <div className='flex flex-col items-center flex-1 border-r border-slate-100'>
                      <span className='text-[10px] text-slate-400 font-bold'>
                        ADULT
                      </span>
                      <input
                        type='number'
                        value={bookingForm.adults}
                        onChange={(e) =>
                          setBookingForm((p) => ({
                            ...p,
                            adults: parseInt(e.target.value),
                          }))
                        }
                        className='w-full text-center font-bold text-lg bg-transparent border-none p-0 focus:ring-0'
                      />
                    </div>
                    <div className='flex flex-col items-center flex-1'>
                      <span className='text-[10px] text-slate-400 font-bold'>
                        NIÑOS
                      </span>
                      <input
                        type='number'
                        value={bookingForm.children}
                        onChange={(e) =>
                          setBookingForm((p) => ({
                            ...p,
                            children: parseInt(e.target.value),
                          }))
                        }
                        className='w-full text-center font-bold text-lg bg-transparent border-none p-0 focus:ring-0'
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* COLUMNA DERECHA */}
            <div className='lg:col-span-5 bg-white/60 rounded-[2rem] p-6 border border-white space-y-6'>
              {bookingForm.type === 'booking' ? (
                <>
                  <div className='flex items-center gap-3 mb-2'>
                    <div className='w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600'>
                      <User size={20} />
                    </div>
                    <h4 className='font-bold text-lg text-slate-700'>
                      Datos del Cliente
                    </h4>
                  </div>
                  <div className='space-y-4'>
                    <input
                      className='w-full p-4 bg-white rounded-2xl border border-slate-100 font-medium placeholder:text-slate-300'
                      placeholder='Nombre Completo'
                      value={bookingForm.guestName}
                      onChange={(e) =>
                        setBookingForm({
                          ...bookingForm,
                          guestName: e.target.value,
                        })
                      }
                    />
                    <div className='flex gap-3'>
                      <input
                        className='w-full p-4 bg-white rounded-2xl border border-slate-100 font-medium placeholder:text-slate-300'
                        placeholder='Documento'
                        value={bookingForm.guestDoc}
                        onChange={(e) =>
                          setBookingForm({
                            ...bookingForm,
                            guestDoc: e.target.value,
                          })
                        }
                      />
                      <button
                        type='button'
                        onClick={onOpenScanner}
                        className='p-4 bg-slate-800 text-white rounded-2xl hover:bg-black transition-colors'
                      >
                        <ScanBarcode size={20} />
                      </button>
                    </div>
                    <input
                      type='tel'
                      className='w-full p-4 bg-white rounded-2xl border border-slate-100 font-medium placeholder:text-slate-300'
                      placeholder='Teléfono / WhatsApp'
                      value={bookingForm.guestPhone}
                      onChange={(e) =>
                        setBookingForm({
                          ...bookingForm,
                          guestPhone: e.target.value,
                        })
                      }
                    />
                  </div>
                  {/* Tarjeta de Total */}
                  <div className='mt-8 bg-slate-900 rounded-[1.5rem] p-6 text-white relative overflow-hidden'>
                    <div className='absolute top-0 right-0 w-20 h-20 bg-blue-500/20 rounded-full blur-2xl'></div>
                    <p className='text-slate-400 text-xs font-bold uppercase tracking-widest mb-1'>
                      Total Estimado
                    </p>
                    <div className='flex items-baseline gap-1'>
                      <span className='text-3xl font-serif font-bold'>$</span>
                      <input
                        type='number'
                        className='bg-transparent border-none text-4xl font-serif font-bold text-white p-0 w-full focus:ring-0 placeholder:text-white/50'
                        value={bookingForm.price}
                        onChange={(e) =>
                          setBookingForm({
                            ...bookingForm,
                            price: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className='h-full flex flex-col items-center justify-center text-center p-6 opacity-50'>
                  <Hammer
                    size={48}
                    className='mb-4 text-slate-400'
                  />
                  <p>Modo Mantenimiento Activo</p>
                  <p className='text-sm'>La habitación quedará bloqueada.</p>
                </div>
              )}
            </div>
          </form>
        </div>

        {/* FOOTER */}
        <div className='p-6 border-t border-slate-100 bg-white/80 backdrop-blur-xl sticky bottom-0 z-30 flex justify-end gap-4'>
          <button
            onClick={onClose}
            className='px-8 py-4 rounded-2xl font-bold text-slate-500 hover:bg-slate-100 transition-colors'
          >
            Cancelar
          </button>
          <button
            onClick={handleCreateBooking}
            className='px-10 py-4 bg-slate-900 text-white font-bold rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3'
          >
            {bookingForm.type === 'booking' ? (
              <CheckCircle2 size={20} />
            ) : (
              <Hammer size={20} />
            )}
            <span>
              {bookingForm.type === 'booking'
                ? 'Confirmar Reserva'
                : 'Bloquear Habitación'}
            </span>
          </button>
        </div>
      </motion.div>
    </div>,
    document.body,
  );
};

export default BookingWizardModal;
