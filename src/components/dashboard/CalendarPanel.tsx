'use client';

import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Copy } from 'lucide-react';
import BookingWizardModal from '@/components/modals/BookingWizardModal';
import { useCalendar, Booking } from '@/hooks/useCalendar';
import { cn } from '@/lib/utils';
import { 
  DndContext, DragOverlay, useDraggable, useDroppable, 
  defaultDropAnimationSideEffects, useSensor, useSensors, 
  MouseSensor, TouchSensor, DragStartEvent, DragEndEvent 
} from '@dnd-kit/core';

// ==========================================
// BLOQUE 1: INTERFACES ESTRICTAS
// ==========================================

interface Room { id: string; name: string; price: number; status: string; capacity?: number; type?: string; }

export interface CalendarPanelProps {
  rooms: Room[];
  initialBookings: Booking[];
  hotelId: string;
}

interface CalendarPanelViewProps {
  rooms: Room[];
  dateRange: Date[];
  currentDate: Date;
  isAltPressed: boolean;
  getBookingForDate: (roomId: string, date: Date) => Booking | undefined;
  onNavigateDate: (days: number) => void;
  onOpenBookingModal: () => void;
  onOpenEdit: (booking: Booking) => void;
}

// ==========================================
// BLOQUE 2: MICRO-COMPONENTES (Lógica Gantt)
// ==========================================

const CalendarCell = ({ dateStr, roomId, children }: { dateStr: string, roomId: string, children: React.ReactNode }) => {
  const cellId = `${roomId}|${dateStr}`;
  const { isOver, setNodeRef } = useDroppable({ id: cellId });

  return (
    <div 
      ref={setNodeRef} 
      className={cn(
        "flex-1 min-w-[100px] h-16 border-r border-white/5 border-b relative p-1 transition-colors",
        isOver ? "bg-indigo-500/20 ring-2 ring-inset ring-indigo-400/50" : "hover:bg-white/[0.02]"
      )}
    >
      {children}
    </div>
  );
};

const DraggableBooking = ({ 
  booking, 
  isStart, 
  isAltPressed, 
  onEdit 
}: { 
  booking: Booking, 
  isStart: boolean, 
  isAltPressed: boolean,
  onEdit: (booking: Booking) => void 
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: String(booking.id),
    data: { booking }
  });

  if (!isStart) return null;

  const checkInDate = new Date(`${booking.check_in}T12:00:00Z`);
  const checkOutDate = new Date(`${booking.check_out}T12:00:00Z`);
  const durationDays = Math.max(1, Math.round((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)));

  const style = { 
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    width: `calc(${durationDays * 100}% + ${durationDays - 1}px)`, 
    left: '4px'
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        e.stopPropagation(); 
        onEdit(booking);
      }}
      className={cn(
        "absolute top-1 bottom-1 rounded-lg text-[10px] font-bold p-2 shadow-lg cursor-pointer active:cursor-grabbing z-10 select-none touch-none overflow-hidden flex items-center gap-1.5 border backdrop-blur-md",
        booking.status === 'checked_in' ? 'bg-emerald-500/80 border-emerald-400 text-white' : 
        booking.status === 'maintenance' ? 'bg-amber-500/80 border-amber-400 text-white' : 'bg-indigo-500/80 border-indigo-400 text-white',
        isDragging ? (isAltPressed ? 'opacity-80 border-dashed border-2 ring-2 ring-emerald-400' : 'opacity-40 border-dashed border-2 pointer-events-none') : 'animate-in fade-in zoom-in-95 duration-200 hover:ring-2 hover:ring-white/50 transition-all'
      )}
    >
      <span className="whitespace-nowrap flex items-center gap-1 pointer-events-none drop-shadow-md">
        {isDragging && isAltPressed && <Copy className="size-3 shrink-0" />}
        {booking.status === 'maintenance' && <span className="shrink-0 text-[10px]">🔧</span>}
        {booking.guest_name || (booking.guests?.full_name ?? 'Ocupado')}
      </span>
    </div>
  );
};

// ==========================================
// BLOQUE 3: COMPONENTE PRESENTACIONAL
// ==========================================

const CalendarPanelView: React.FC<CalendarPanelViewProps> = ({
  rooms, dateRange, currentDate, isAltPressed, getBookingForDate, onNavigateDate, onOpenBookingModal, onOpenEdit
}) => {
  const monthName = currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' });

  return (
    <div className='space-y-6 pb-20 font-poppins text-zinc-100'>
      <div className='flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-zinc-900/40 backdrop-blur-2xl p-6 rounded-3xl border border-white/5 shadow-2xl shadow-black/50'>
        <div>
          <h2 className='text-2xl font-bold tracking-tight text-zinc-50 flex items-center gap-3'>
            <CalendarIcon className="size-6 text-indigo-400" /> Matriz de Ocupación
          </h2>
          <p className='text-zinc-400 font-lora text-sm mt-1 capitalize'>{monthName}</p>
        </div>
        
        <div className='flex flex-wrap items-center gap-4'>
          <button onClick={onOpenBookingModal} className='flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/25 transition-all active:scale-95'>
            <Plus className="size-4 stroke-[2]" /> Nueva Reserva
          </button>
          <div className='flex bg-zinc-950 border border-white/10 rounded-xl p-1 shadow-inner'>
            <button onClick={() => onNavigateDate(-7)} className='p-2 text-zinc-400 hover:text-zinc-50 hover:bg-white/5 rounded-lg transition-colors'>
              <ChevronLeft className="size-5 stroke-[1.5]" />
            </button>
            <span className='px-4 py-2 text-sm font-bold text-zinc-200 min-w-[120px] text-center capitalize'>
              {currentDate.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })}
            </span>
            <button onClick={() => onNavigateDate(7)} className='p-2 text-zinc-400 hover:text-zinc-50 hover:bg-white/5 rounded-lg transition-colors'>
              <ChevronRight className="size-5 stroke-[1.5]" />
            </button>
          </div>
        </div>
      </div>

      <div className='bg-zinc-900/40 backdrop-blur-3xl border border-white/5 shadow-2xl rounded-3xl overflow-hidden flex flex-col'>
        <div className='flex-1 overflow-auto custom-scrollbar relative'>
          <div className='min-w-[1200px]'>
            <div className='flex sticky top-0 z-20 bg-zinc-950/90 backdrop-blur-md border-b border-white/10 shadow-sm'>
              <div className='w-48 shrink-0 p-4 border-r border-white/10 flex items-center justify-center sticky left-0 z-30 bg-zinc-950'>
                <span className='text-xs font-bold text-zinc-500 uppercase tracking-widest'>Unidad</span>
              </div>
              {dateRange.map((date, idx) => (
                <div key={idx} className={cn('flex-1 min-w-[100px] border-r border-white/5 p-3 flex flex-col items-center justify-center', date.getDay() === 0 || date.getDay() === 6 ? 'bg-indigo-500/5' : '')}>
                  <span className='text-[10px] font-bold text-zinc-500 uppercase tracking-widest'>{date.toLocaleString('es-ES', { weekday: 'short' })}</span>
                  <span className={cn('text-lg font-bold', date.toDateString() === new Date().toDateString() ? 'text-indigo-400' : 'text-zinc-300')}>{date.getDate()}</span>
                </div>
              ))}
            </div>

            <div className='bg-[#09090b]/80'>
              {rooms.map((room) => (
                <div key={room.id} className='flex group hover:bg-white/[0.02] transition-colors'>
                  <div className='w-48 shrink-0 p-4 border-r border-white/5 border-b flex flex-col justify-center bg-zinc-950/80 sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)] group-hover:bg-zinc-900/80'>
                    <span className='text-sm font-bold text-zinc-200 truncate'>{room.name}</span>
                    <span className='text-[10px] text-zinc-500 font-mono uppercase truncate'>${(room.price || 0).toLocaleString()}</span>
                  </div>
                  
                  {dateRange.map((date, idx) => {
                    const dateStr = date.toISOString().split('T')[0];
                    const booking = getBookingForDate(String(room.id), date);
                    const isStart = booking ? booking.check_in === dateStr : false;

                    return (
                      <CalendarCell key={idx} dateStr={dateStr} roomId={String(room.id)}>
                        {booking && isStart && (
                          <DraggableBooking 
                            booking={{...booking, id: String(booking.id)}} 
                            isStart={isStart} 
                            isAltPressed={isAltPressed} 
                            onEdit={onOpenEdit}
                          />
                        )}
                        {booking && !isStart && (
                          <div className={cn(
                            "pointer-events-none h-full absolute top-1 bottom-1 left-0 right-0 z-0 opacity-40",
                            booking.status === 'checked_in' ? 'bg-emerald-500' : booking.status === 'maintenance' ? 'bg-amber-500' : 'bg-indigo-500'
                          )} />
                        )}
                      </CalendarCell>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// BLOQUE 4: COMPONENTE CONTENEDOR
// ==========================================

export default function CalendarPanel({ rooms, initialBookings, hotelId }: CalendarPanelProps) {
  const [isMounted, setIsMounted] = useState(false);
  
  const {
    currentDate, moveDate, getBookingForDate, showBookingModal, setShowBookingModal,
    bookingForm, setBookingForm, handleSaveBooking, openEditBookingModal, openNewBookingModal,
    handleDragEnd, handleCancelBooking, handleDuplicateBooking
  } = useCalendar(rooms, initialBookings, hotelId);
  
  const [activeDragBooking, setActiveDragBooking] = useState<Booking | null>(null);
  const [isAltPressed, setIsAltPressed] = useState(false);

  useEffect(() => {
    setIsMounted(true);
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

  if (!isMounted) return null;

  const dateRange = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + i);
    return d;
  });

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragBooking(null); 
    if (over && active.id) {
      const [newRoomId, newCheckInStr] = String(over.id).split('|');
      if(newRoomId && newCheckInStr) {
        if (isAltPressed) handleDuplicateBooking(String(active.id), newRoomId, newCheckInStr);
        else handleDragEnd(String(active.id), newRoomId, newCheckInStr);
      }
    }
  };

  return (
    <>
      <DndContext sensors={sensors} onDragStart={(e) => setActiveDragBooking(e.active.data.current?.booking as Booking)} onDragEnd={onDragEnd}>
        <CalendarPanelView 
          rooms={rooms} dateRange={dateRange} currentDate={currentDate} isAltPressed={isAltPressed}
          getBookingForDate={getBookingForDate} onNavigateDate={moveDate} onOpenBookingModal={openNewBookingModal} onOpenEdit={openEditBookingModal}
        />
        <DragOverlay dropAnimation={null}>
          {activeDragBooking && (
            <div className={cn(
              "h-14 rounded-lg text-[10px] font-bold p-2 text-white shadow-2xl cursor-grabbing border border-white/50 opacity-90 scale-105 flex items-center gap-1.5",
              activeDragBooking.status === 'checked_in' ? 'bg-emerald-500' : activeDragBooking.status === 'maintenance' ? 'bg-amber-500' : 'bg-indigo-500',
              isAltPressed ? 'ring-2 ring-emerald-400' : ''
            )} style={{ width: '160px' }}>
              <span className='truncate'>{activeDragBooking.guest_name || (activeDragBooking.guests?.full_name ?? 'Ocupado')}</span>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {showBookingModal && (
        <BookingWizardModal 
          bookingForm={bookingForm} 
          setBookingForm={setBookingForm} 
          availableRoomsList={rooms} 
          handleCreateBooking={handleSaveBooking} 
          onDelete={() => bookingForm.id && handleCancelBooking(bookingForm.id)}
          onClose={() => setShowBookingModal(false)} 
        />
      )}
    </>
  );
}