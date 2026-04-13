'use client';

import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Copy } from 'lucide-react';
import BookingWizardModal from '@/components/modals/BookingWizardModal';
import { useCalendar, Booking } from '@/hooks/useCalendar';

import { 
  DndContext, DragOverlay, useDraggable, useDroppable, 
  defaultDropAnimationSideEffects, useSensor, useSensors, 
  MouseSensor, TouchSensor 
} from '@dnd-kit/core';

interface Room { id: string; name: string; price: number; status: string; }
interface CalendarPanelProps { rooms: Room[]; initialBookings: Booking[]; hotelId: string; }

const CalendarCell = ({ dateStr, roomId, children }: { dateStr: string, roomId: string, children: React.ReactNode }) => {
  const cellId = `${roomId}|${dateStr}`;
  const { isOver, setNodeRef } = useDroppable({ id: cellId });

  return (
    <div ref={setNodeRef} className={`flex-1 min-w-[80px] h-16 border-r border-slate-50 relative p-1 transition-colors ${isOver ? 'bg-blue-50 ring-2 ring-inset ring-blue-400' : ''}`}>
      {children}
    </div>
  );
};

const DraggableBooking = ({ booking, isStart, isAltPressed }: { booking: Booking, isStart: boolean, isAltPressed: boolean }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: booking.id,
    data: { booking } 
  });

  if (!isStart) return null;

  const checkInDate = new Date(`${booking.check_in}T12:00:00Z`);
  const checkOutDate = new Date(`${booking.check_out}T12:00:00Z`);
  const durationDays = Math.max(1, Math.round((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)));

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      // 🚨 FIX: select-none y touch-none inyectados para bloquear el comportamiento nativo del navegador
      className={`h-full absolute top-1 bottom-1 rounded-lg text-[10px] font-bold p-2 text-white overflow-hidden shadow-sm cursor-grab active:cursor-grabbing border border-white/20 z-10 transition-opacity select-none touch-none
        ${booking.status === 'checked_in' ? 'bg-emerald-500' : booking.status === 'maintenance' ? 'bg-slate-500' : 'bg-blue-500'}
        ${isDragging ? (isAltPressed ? 'opacity-80 border-dashed border-2 ring-2 ring-emerald-400' : 'opacity-30 border-dashed border-2 pointer-events-none') : 'animate-in fade-in zoom-in-95 duration-200'} 
      `}
      style={{ 
        width: `calc(${durationDays * 100}% + ${durationDays - 1}px)`, 
        left: '4px'
      }} 
      title={booking.guest_name || 'Reservado'}
    >
      <span className='whitespace-nowrap flex items-center gap-1 pointer-events-none'>
        {isDragging && isAltPressed && <Copy size={12} className="text-white" />}
        {booking.status === 'maintenance' && <span className='text-xs'>🔨</span>}
        {booking.guest_name || (booking.guests?.full_name ?? 'Ocupado')}
      </span>
    </div>
  );
};

const CalendarPanel = ({ rooms, initialBookings, hotelId }: CalendarPanelProps) => {
  // 🚨 FIX CRÍTICO SSR: El escudo anti-hidratación de Next.js
  const [isMounted, setIsMounted] = useState(false);
  
  const {
    currentDate, moveDate, getBookingForDate, showBookingModal, setShowBookingModal,
    bookingForm, setBookingForm, handleCreateBooking, handleDragEnd, handleDuplicateBooking
  } = useCalendar(rooms, initialBookings, hotelId);

  const [activeDragBooking, setActiveDragBooking] = useState<Booking | null>(null);
  const [isAltPressed, setIsAltPressed] = useState(false);

  useEffect(() => {
    setIsMounted(true); // Encendemos los motores solo cuando estamos 100% en el navegador del cliente
    
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Alt' || e.key === 'Option') setIsAltPressed(true); };
    const handleKeyUp = (e: KeyboardEvent) => { if (e.key === 'Alt' || e.key === 'Option') setIsAltPressed(false); };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => { window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keyup', handleKeyUp); };
  }, []);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  );

  // Si Next.js todavía está renderizando el servidor, mostramos una pantalla de carga para proteger el DndContext
  if (!isMounted) {
    return (
      <div className='flex flex-col h-[calc(100vh-8rem)] bg-white rounded-[2rem] border border-slate-100 shadow-sm items-center justify-center'>
        <div className="animate-pulse flex flex-col items-center">
          <CalendarIcon size={48} className="text-slate-200 mb-4" />
          <p className="text-slate-400 font-bold tracking-widest uppercase text-xs">Calibrando Físicas...</p>
        </div>
      </div>
    );
  }

  const daysToShow = 14;
  const dates = Array.from({ length: daysToShow }, (_, i) => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + i);
    return d;
  });

  const onDragStart = (event: any) => {
    const { active } = event;
    if (active.data.current?.booking) setActiveDragBooking(active.data.current.booking);
  };

  const onDragEnd = (event: any) => {
    const { active, over } = event;
    setActiveDragBooking(null); 
    
    if (over && active.id) {
      const [newRoomId, newCheckInStr] = String(over.id).split('|');
      if(newRoomId && newCheckInStr) {
        const originalBooking = active.data.current?.booking;
        if (originalBooking && originalBooking.room_id === newRoomId && originalBooking.check_in === newCheckInStr) return; 

        if (isAltPressed) handleDuplicateBooking(String(active.id), newRoomId, newCheckInStr);
        else handleDragEnd(String(active.id), newRoomId, newCheckInStr);
      }
    }
  };

  const dropAnimationConfig = { sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.4' } } }) };

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className='flex flex-col h-[calc(100vh-8rem)] bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden'>
        
        {/* HEADER RESPONSIVE */}
        <div className='p-4 sm:p-6 border-b border-slate-100 flex flex-wrap justify-between items-center gap-4 bg-slate-50/50'>
          <div className='flex items-center justify-between w-full sm:w-auto gap-4'>
            <h2 className='text-lg sm:text-xl font-bold text-slate-800 flex items-center gap-2'>
              <CalendarIcon strokeWidth={1.5} className='text-hospeda-600' /> Cronograma
            </h2>
            <button
              onClick={() => { setBookingForm((prev: any) => ({ ...prev, roomId: '', price: 0 })); setShowBookingModal(true); }}
              className='sm:hidden px-4 py-2.5 bg-hospeda-900 hover:bg-black text-white font-bold rounded-xl shadow-lg flex items-center gap-1 transition-transform active:scale-95'
            >
              <Plus size={16} strokeWidth={1.5} /> <span className="text-xs">Reserva</span>
            </button>
          </div>

          <div className='flex flex-wrap items-center gap-4 w-full sm:w-auto justify-between sm:justify-end'>
            <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-lg border border-slate-200 text-xs text-slate-500 font-medium">
              💡 Tip: Mantén <kbd className="bg-white border border-slate-300 px-1.5 py-0.5 rounded shadow-sm text-[10px] font-mono">Alt</kbd> para clonar
            </div>
            <div className='flex bg-white rounded-xl border border-slate-200 p-1 shadow-sm w-full sm:w-auto justify-between'>
              <button onClick={() => moveDate(-7)} className='p-2 hover:bg-slate-100 rounded-lg text-slate-500'>
                <ChevronLeft size={18} strokeWidth={1.5} />
              </button>
              <span className='px-4 py-2 text-sm font-bold text-slate-700 min-w-[120px] text-center capitalize'>
                {currentDate.toLocaleDateString('es-CO', { month: 'short', year: 'numeric' })}
              </span>
              <button onClick={() => moveDate(7)} className='p-2 hover:bg-slate-100 rounded-lg text-slate-500'>
                <ChevronRight size={18} strokeWidth={1.5} />
              </button>
            </div>
            <button
              onClick={() => { setBookingForm((prev: any) => ({ ...prev, roomId: '', price: 0 })); setShowBookingModal(true); }}
              className='hidden sm:flex px-6 py-3 bg-hospeda-900 hover:bg-black text-white font-bold rounded-xl shadow-lg items-center gap-2 transition-transform hover:scale-105'
            >
              <Plus size={18} strokeWidth={1.5} /> Nueva Reserva
            </button>
          </div>
        </div>

        {/* CALENDARIO GRID */}
        <div className='flex-1 overflow-auto custom-scrollbar relative'>
          <div className='min-w-[1200px]'>
            <div className='flex sticky top-0 z-20 bg-white border-b border-slate-100 shadow-sm'>
              <div className='w-48 p-4 font-bold text-slate-400 text-xs uppercase tracking-wider bg-slate-50 border-r border-slate-100 sticky left-0 z-30'>
                Habitación
              </div>
              {dates.map((date, i) => (
                <div key={i} className={`flex-1 min-w-[80px] p-3 text-center border-r border-slate-50 ${date.getDay() === 0 || date.getDay() === 6 ? 'bg-blue-50/30' : ''}`}>
                  <div className='text-xs font-bold text-slate-400 uppercase'>{date.toLocaleDateString('es-CO', { weekday: 'short' })}</div>
                  <div className='text-lg font-bold text-slate-800'>{date.getDate()}</div>
                </div>
              ))}
            </div>

            {rooms.map((room) => (
              <div key={room.id} className='flex border-b border-slate-50 hover:bg-slate-50/50 transition-colors'>
                <div className='w-48 p-4 border-r border-slate-100 bg-white sticky left-0 z-10 flex flex-col justify-center shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]'>
                  <span className='font-bold text-slate-700'>{room.name}</span>
                  <span className='text-xs text-slate-400 font-bold'>${room.price.toLocaleString()}</span>
                </div>

                {dates.map((date, i) => {
                  const dateStr = date.toISOString().split('T')[0];
                  const booking = getBookingForDate(room.id, date);
                  const isStart = booking ? booking.check_in === dateStr : false;

                  return (
                    <CalendarCell key={i} dateStr={dateStr} roomId={String(room.id)}>
                      {/* 🚨 FIX: Aseguramos que el ID de la reserva pase como String estricto */}
                      {booking && isStart && <DraggableBooking booking={{...booking, id: String(booking.id)}} isStart={isStart} isAltPressed={isAltPressed} />}
                      
                      {/* 🚨 FIX CRÍTICO: pointer-events-none inyectado para que el cristal deje pasar el clic */}
                      {booking && !isStart && (
                         <div className={`pointer-events-none h-full absolute top-1 bottom-1 left-0 right-0 z-0 ${booking.status === 'checked_in' ? 'bg-emerald-500' : booking.status === 'maintenance' ? 'bg-slate-500' : 'bg-blue-500'} opacity-90 ${String(activeDragBooking?.id) === String(booking.id) ? 'opacity-30 border-dashed border-2' : ''}`} />
                      )}
                    </CalendarCell>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {showBookingModal && (
          <BookingWizardModal bookingForm={bookingForm} setBookingForm={setBookingForm} availableRoomsList={rooms} handleCreateBooking={handleCreateBooking} onClose={() => setShowBookingModal(false)} />
        )}
      </div>

      {/* 🚨 FIX: z-[999] y pointer-events-none para asegurar que el fantasma flote sobre todo sin bloquear caídas */}
      <DragOverlay dropAnimation={dropAnimationConfig} className="z-[999] pointer-events-none">
        {activeDragBooking ? (
          <div
            className={`h-14 rounded-lg text-[10px] font-bold p-2 text-white shadow-2xl cursor-grabbing border border-white opacity-90 transform scale-105 rotate-2
              ${activeDragBooking.status === 'checked_in' ? 'bg-emerald-500' : activeDragBooking.status === 'maintenance' ? 'bg-slate-500' : 'bg-blue-500'}
              ${isAltPressed ? 'ring-2 ring-emerald-400' : ''}
            `}
            style={{ width: '160px' }} 
          >
            <span className='whitespace-nowrap flex items-center gap-1'>
              {isAltPressed && <Copy size={12} className="text-white" />}
              {activeDragBooking.status === 'maintenance' && <span className='text-xs'>🔨</span>}
              {activeDragBooking.guest_name || (activeDragBooking.guests?.full_name ?? 'Ocupado')}
            </span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default CalendarPanel;