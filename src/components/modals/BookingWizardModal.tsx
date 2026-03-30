'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { X, CheckCircle2, Hammer, User, ScanBarcode, Moon, Info, CreditCard } from 'lucide-react';
import ScannerModal from './ScannerModal';
import { calculateStayPrice } from '@/utils/supabase/pricing';

interface BookingForm {
  id?: string;
  type: 'booking' | 'maintenance';
  guestName: string;
  guestDoc: string;
  guestPhone: string;
  roomId: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  price: number;
  guestEmail?: string;
}

interface BookingWizardModalProps {
  bookingForm: BookingForm;
  setBookingForm: (form: any) => void;
  availableRoomsList: any[];
  handleCreateBooking: (e: React.FormEvent) => Promise<void>;
  handleCancelBooking?: (id: string) => Promise<void>;
  onClose: () => void;
}

const BookingWizardModal = ({
  bookingForm,
  setBookingForm,
  availableRoomsList,
  handleCreateBooking,
  handleCancelBooking,
  onClose,
}: BookingWizardModalProps) => {
  if (typeof document === 'undefined') return null;

  const [showScanner, setShowScanner] = useState(false);
  
  const [pricingDetails, setPricingDetails] = useState({
    totalNights: 0, weekendNights: 0, weekdayNights: 0, totalPrice: 0
  });

  useEffect(() => {
    if (bookingForm.roomId && bookingForm.checkIn && bookingForm.checkOut) {
      const selectedRoom = availableRoomsList.find((r) => r.id === bookingForm.roomId);
      if (selectedRoom) {
        const breakdown = calculateStayPrice(
          bookingForm.checkIn,
          bookingForm.checkOut,
          selectedRoom.price,
          (selectedRoom as any).weekend_price || 0
        );
        setPricingDetails(breakdown);
        if (bookingForm.price !== breakdown.totalPrice) {
          setBookingForm({ ...bookingForm, price: breakdown.totalPrice });
        }
      }
    }
  }, [bookingForm.roomId, bookingForm.checkIn, bookingForm.checkOut, availableRoomsList, setBookingForm]);

  const handleScanSuccess = (data: any) => {
    setBookingForm({
      ...bookingForm,
      guestName: data.fullName || bookingForm.guestName,
      guestDoc: data.docNumber || bookingForm.guestDoc,
    });
    setShowScanner(false);
  };

  return createPortal(
    <div className='fixed inset-0 bg-hospeda-950/60 backdrop-blur-xl z-[100] flex items-center justify-center p-4'>
      <motion.div className='bg-[#F8FAFC]/95 border border-white/60 rounded-[2.5rem] w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col relative max-h-[95vh]'>
        
        <div className='px-10 py-6 border-b border-slate-200/50 flex justify-between items-center bg-white/50'>
          <h3 className='font-display text-3xl font-bold text-slate-800'>
            {bookingForm.id ? 'Detalles de Estadía' : 'Nueva Estadía'}
          </h3>
          <button onClick={onClose} className='p-2 bg-white rounded-full text-slate-400 hover:text-red-500 shadow-sm border border-slate-100'>
            <X size={24} strokeWidth={1.5} />
          </button>
        </div>

        <div className='flex-1 overflow-y-auto p-10'>
          <form onSubmit={handleCreateBooking} className='grid grid-cols-1 lg:grid-cols-12 gap-8'>
            
            <div className='lg:col-span-7 space-y-6'>
              <div className='bg-slate-200/50 p-2 rounded-2xl flex'>
                <button type="button" onClick={() => setBookingForm({...bookingForm, type: 'booking'})} className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase transition-all ${bookingForm.type === 'booking' ? 'bg-white shadow-md' : 'text-slate-500'}`}>Huésped</button>
                <button type="button" onClick={() => setBookingForm({...bookingForm, type: 'maintenance'})} className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase transition-all ${bookingForm.type === 'maintenance' ? 'bg-white shadow-md' : 'text-slate-500'}`}>Mantenimiento</button>
              </div>

              <div className='grid grid-cols-2 gap-4'>
                {/* 🚨 FIX: Inyectado bg-white text-slate-900 para neutralizar modo oscuro */}
                <input type='date' className='p-4 rounded-2xl border border-slate-100 font-bold shadow-sm bg-white text-slate-900' value={bookingForm.checkIn} onChange={(e) => setBookingForm({...bookingForm, checkIn: e.target.value})} />
                <input type='date' min={bookingForm.checkIn} className='p-4 rounded-2xl border border-slate-100 font-bold shadow-sm bg-white text-slate-900' value={bookingForm.checkOut} onChange={(e) => setBookingForm({...bookingForm, checkOut: e.target.value})} />
              </div>

              <select className='w-full p-4 rounded-2xl border border-slate-100 font-bold shadow-sm bg-white text-slate-900' value={bookingForm.roomId} onChange={(e) => setBookingForm({...bookingForm, roomId: e.target.value})}>
                <option value=''>Seleccionar Habitación...</option>
                {availableRoomsList.map(r => <option key={r.id} value={r.id}>{r.name} — ${Number(r.price).toLocaleString()}</option>)}
              </select>
            </div>

            <div className='lg:col-span-5 space-y-4'>
              {bookingForm.type === 'booking' ? (
                <>
                  <div className='bg-white p-6 rounded-3xl border border-slate-100 space-y-3'>
                    <div className='flex gap-2'>
                      {/* 🚨 FIX: Inyectado text-slate-900 y placeholder-slate-400 */}
                      <input className='flex-1 p-3 bg-slate-50 rounded-xl border-none outline-none text-slate-900 placeholder-slate-400' placeholder='Nombre Huésped' value={bookingForm.guestName} onChange={(e) => setBookingForm({...bookingForm, guestName: e.target.value})} />
                      <button type="button" onClick={() => setShowScanner(true)} className='p-3 bg-slate-800 text-white rounded-xl'>
                        <ScanBarcode size={20} strokeWidth={1.5}/>
                      </button>
                    </div>
                    <input className='w-full p-3 bg-slate-50 rounded-xl border-none outline-none text-slate-900 placeholder-slate-400' placeholder='Documento' value={bookingForm.guestDoc} onChange={(e) => setBookingForm({...bookingForm, guestDoc: e.target.value})} />
                  </div>

                  <div className='bg-slate-900 rounded-[2rem] p-6 text-white space-y-4 relative overflow-hidden'>
                    <div className='flex justify-between text-xs text-slate-400 font-bold uppercase tracking-widest'>
                      <span>Resumen de Estadía</span>
                      <Moon size={14} strokeWidth={1.5} />
                    </div>
                    <div className='space-y-1 text-sm'>
                      <div className='flex justify-between'><span>Noches Semana</span><span>{pricingDetails.weekdayNights}</span></div>
                      <div className='flex justify-between text-emerald-400'><span>Noches Fin de Sem.</span><span>{pricingDetails.weekendNights}</span></div>
                    </div>
                    <div className='pt-4 border-t border-white/10 flex justify-between items-end'>
                      <div>
                        <p className='text-[10px] text-slate-500 font-bold uppercase'>Total a Pagar</p>
                        <p className='text-3xl font-serif font-bold text-emerald-400'>${bookingForm.price.toLocaleString()}</p>
                      </div>
                      <CreditCard size={32} strokeWidth={1.5} className='text-white/10'/>
                    </div>
                  </div>
                </>
              ) : (
                <div className='bg-slate-100 rounded-3xl p-10 text-center opacity-50 text-slate-700'>
                  <Hammer size={48} strokeWidth={1.5} className='mx-auto mb-2'/>
                  <p className='font-bold'>Modo Bloqueo</p>
                </div>
              )}
            </div>
          </form>
        </div>

        <div className='p-6 bg-white border-t border-slate-100 flex gap-3'>
          {bookingForm.id && handleCancelBooking && (
            <button 
              type="button" 
              onClick={() => handleCancelBooking(bookingForm.id!)} 
              className='px-6 py-3 font-bold text-red-500 hover:bg-red-50 rounded-2xl transition-colors mr-auto'
            >
              Anular Reserva
            </button>
          )}

          <button type="button" onClick={onClose} className='px-6 py-3 font-bold text-slate-400 hover:text-slate-600 ml-auto transition-colors'>Cancelar</button>
          
          {!bookingForm.id && (
            <button type="submit" onClick={handleCreateBooking} className='px-8 py-3 bg-hospeda-900 text-white font-bold rounded-2xl hover:bg-black transition-colors'>Confirmar</button>
          )}
        </div>

        {showScanner && <ScannerModal onScanSuccess={handleScanSuccess} onClose={() => setShowScanner(false)} />}
      </motion.div>
    </div>,
    document.body
  );
};

export default BookingWizardModal;