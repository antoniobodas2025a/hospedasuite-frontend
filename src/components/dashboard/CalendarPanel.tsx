'use client';

import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Copy, Clock } from 'lucide-react';
import BookingWizardModal from '@/components/modals/BookingWizardModal';
import { useCalendar, Booking } from '@/hooks/useCalendar';
import { cn } from '@/lib/utils';
import { 
  DndContext, DragOverlay, useDraggable, useDroppable, 
  useSensor, useSensors, MouseSensor, TouchSensor, DragEndEvent 
} from '@dnd-kit/core';

// ==========================================
// BLOQUE 1: MICRO-COMPONENTES (Lógica Gantt)
// ==========================================

const CalendarCell = ({ dateStr, roomId, children }: { dateStr: string, roomId: string, children: React.ReactNode }) => {
  const cellId = `${roomId}|${dateStr}`;
  const { isOver, setNodeRef } = useDroppable({ id: cellId });

  return (
    <div 
      ref={setNodeRef} 
      className={cn(
        "flex-1 min-w-[100px] h-16 border-r border-border border-b relative p-1 transition-colors",
        isOver ? "bg-indigo-500/20 ring-2 ring-inset ring-indigo-400/50" : "hover:bg-accent/10"
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

  const statusStyles = {
    checked_in: "bg-emerald-500/80 border-emerald-400 text-white shadow-emerald-500/20",
    maintenance: "bg-amber-500/80 border-amber-400 text-white shadow-amber-500/20",
    confirmed: "bg-indigo-500/80 border-indigo-400 text-white shadow-indigo-500/20",
    checked_out: "bg-muted border-border text-muted-foreground grayscale opacity-60 shadow-none line-through"
  };

  const currentStyle = statusStyles[booking.status as keyof typeof statusStyles] || statusStyles.confirmed;

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
        "absolute top-1 bottom-1 rounded-[var(--radius-squircle-md)] text-[10px] font-bold p-2 shadow-lg cursor-pointer active:cursor-grabbing z-10 select-none touch-none overflow-hidden flex items-center gap-1.5 glass-card transition-all",
        currentStyle,
        isDragging ? (isAltPressed ? 'opacity-80 border-dashed border-2 ring-2 ring-emerald-400' : 'opacity-40 border-dashed border-2 pointer-events-none') : 'animate-in fade-in zoom-in-95 duration-200 hover:ring-2 hover:ring-ring'
      )}
    >
      <span className="whitespace-nowrap flex items-center gap-1 pointer-events-none drop-shadow-md">
        {isDragging && isAltPressed && <Copy className="size-3 shrink-0" />}
        {booking.status === 'maintenance' && <span className="shrink-0">🔧</span>}
        {booking.status === 'checked_out' && <span className="shrink-0">🏁</span>}
        {booking.guest_name || (booking.guests?.full_name ?? 'Ocupado')}
      </span>
    </div>
  );
};

// ==========================================
// BLOQUE 1B: MOBILE CARD VIEW (Mac 2026)
// Card-per-room replaces 1200px Gantt on mobile
// ==========================================

const MobileBookingChip = ({ booking, onEdit }: { booking: Booking; onEdit: (b: Booking) => void }) => {
  const statusStyles: Record<string, string> = {
    checked_in: "border-l-emerald-500 bg-emerald-500/5",
    maintenance: "border-l-amber-500 bg-amber-500/5",
    confirmed: "border-l-indigo-500 bg-indigo-500/5",
    checked_out: "border-l-muted bg-muted/30 opacity-50",
  };

  const statusLabels: Record<string, string> = {
    checked_in: "Alojado",
    maintenance: "Mantenimiento",
    confirmed: "Confirmada",
    checked_out: "Check-out",
  };

  const checkInDate = new Date(`${booking.check_in}T12:00:00Z`);
  const checkOutDate = new Date(`${booking.check_out}T12:00:00Z`);
  const nights = Math.max(1, Math.round((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)));

  return (
    <button
      type="button"
      onClick={() => onEdit(booking)}
      className={cn(
        "w-full text-left p-4 rounded-[var(--radius-squircle-lg)] border border-l-4 transition-all active:scale-[0.98] min-h-[56px]",
        statusStyles[booking.status as string] || statusStyles.confirmed
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground truncate">
            {booking.guest_name || (booking.guests?.full_name ?? 'Ocupado')}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {booking.check_in} → {booking.check_out} · {nights} {nights === 1 ? 'noche' : 'noches'}
          </p>
        </div>
        <span className={cn(
          "text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full shrink-0",
          booking.status === 'checked_in' ? "bg-emerald-500/10 text-emerald-400" :
          booking.status === 'maintenance' ? "bg-amber-500/10 text-amber-400" :
          booking.status === 'checked_out' ? "bg-muted text-muted-foreground" :
          "bg-indigo-500/10 text-indigo-400"
        )}>
          {statusLabels[booking.status as string] || booking.status}
        </span>
      </div>
    </button>
  );
};

const MobileRoomCard = ({ 
  room, 
  bookings, 
  dateRange, 
  getBookingForDate,
  onEditBooking 
}: { 
  room: any;
  bookings: Booking[];
  dateRange: Date[];
  getBookingForDate: (roomId: string, date: Date) => Booking | undefined;
  onEditBooking: (booking: Booking) => void;
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const todayBooking = getBookingForDate(String(room.id), new Date());

  return (
    <div className="glass-card p-4 rounded-[var(--radius-squircle-2xl)] border border-border space-y-3">
      {/* Room header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-foreground">{room.name}</h3>
          <p className="text-[11px] text-muted-foreground font-mono">${(room.price || 0).toLocaleString()} / noche</p>
        </div>
        {todayBooking ? (
          <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full">
            <Clock size={10} /> Ocupada hoy
          </span>
        ) : (
          <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2 py-1 rounded-full">
            Disponible
          </span>
        )}
      </div>

      {/* Bookings for this room within date range */}
      {bookings.length > 0 ? (
        <div className="space-y-2">
          {bookings.map(booking => (
            <MobileBookingChip key={booking.id} booking={booking} onEdit={onEditBooking} />
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground text-center py-4">Sin reservas en este período</p>
      )}
    </div>
  );
};

// ==========================================
// BLOQUE 2: COMPONENTE PRINCIPAL
// ==========================================

export default function CalendarPanel({ rooms, initialBookings, hotelId }: { rooms: any[], initialBookings: Booking[], hotelId: string }) {
  const [isMounted, setIsMounted] = useState(false);
  
  const {
    currentDate, moveDate, getBookingForDate, showBookingModal, setShowBookingModal,
    bookingForm, setBookingForm, handleSaveBooking, openEditBookingModal, openNewBookingModal,
    handleDragEnd, handleCancelBooking, handleDuplicateBooking, availableRoomsList
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

  const monthName = currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' });

  // Collect bookings per room for mobile card view
  const getBookingsForRoom = (roomId: string): Booking[] => {
    const seen = new Set<string>();
    const result: Booking[] = [];
    for (const date of dateRange) {
      const booking = getBookingForDate(roomId, date);
      if (booking && !seen.has(String(booking.id))) {
        seen.add(String(booking.id));
        result.push(booking);
      }
    }
    return result;
  };

  return (
    <>
      {/* Mac 2026: pb-8 replaces pb-20 — layout.tsx handles dock clearance */}
      <div className='space-y-6 pb-8 font-poppins text-foreground'>
        <div className='flex flex-col md:flex-row justify-between items-start md:items-center gap-4 glass-card p-6 rounded-[var(--radius-squircle-3xl)] border border-border shadow-2xl'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight text-foreground flex items-center gap-3'>
              <CalendarIcon className="size-6 text-indigo-400" /> Matriz de Ocupación
            </h2>
            <p className='text-muted-foreground text-sm mt-1 capitalize'>{monthName}</p>
          </div>
          
          <div className='flex flex-wrap items-center gap-4'>
            <button onClick={openNewBookingModal} className='flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[var(--radius-squircle-lg)] font-bold text-sm transition-all active:scale-95 min-h-[44px]'>
              <Plus className="size-4 stroke-[2]" /> Nueva Reserva
            </button>
            <div className='flex bg-background border border-border rounded-[var(--radius-squircle-lg)] p-1'>
              {/* P1: Tap targets ≥44px — p-3 replaces p-2 */}
              <button onClick={() => moveDate(-7)} className='p-3 min-w-[44px] min-h-[44px] flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent rounded-[var(--radius-squircle-md)] transition-colors'>
                <ChevronLeft className="size-5" />
              </button>
              <span className='px-4 py-2 text-sm font-bold text-foreground min-w-[120px] text-center capitalize'>
                {currentDate.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })}
              </span>
              <button onClick={() => moveDate(7)} className='p-3 min-w-[44px] min-h-[44px] flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent rounded-[var(--radius-squircle-md)] transition-colors'>
                <ChevronRight className="size-5" />
              </button>
            </div>
          </div>
        </div>

        {/* MOBILE: Card-per-room view (replaces 1200px Gantt) */}
        <div className="md:hidden space-y-4">
          {rooms.map(room => (
            <MobileRoomCard
              key={room.id}
              room={room}
              bookings={getBookingsForRoom(String(room.id))}
              dateRange={dateRange}
              getBookingForDate={getBookingForDate}
              onEditBooking={openEditBookingModal}
            />
          ))}
        </div>

        {/* DESKTOP: Gantt matrix with drag-and-drop */}
        <div className="hidden md:block">
          <DndContext sensors={sensors} onDragStart={(e) => setActiveDragBooking(e.active.data.current?.booking as Booking)} onDragEnd={onDragEnd}>
            <div className='glass-panel border border-border shadow-2xl rounded-[var(--radius-squircle-3xl)] overflow-hidden flex flex-col'>
              <div className='flex-1 overflow-auto custom-scrollbar relative'>
                <div className='min-w-[1200px]'>
                  <div className='flex sticky top-0 z-20 glass-panel border-b border-border !rounded-none'>
                    <div className='w-48 shrink-0 p-4 border-r border-border flex items-center justify-center sticky left-0 z-30 bg-background'>
                      <span className='text-xs font-bold text-muted-foreground uppercase tracking-widest'>Unidad</span>
                    </div>
                    {dateRange.map((date, idx) => (
                      <div key={idx} className={cn('flex-1 min-w-[100px] border-r border-border p-3 flex flex-col items-center justify-center', date.getDay() === 0 || date.getDay() === 6 ? 'bg-indigo-500/5' : '')}>
                        <span className='text-[10px] font-bold text-muted-foreground uppercase tracking-widest'>{date.toLocaleString('es-ES', { weekday: 'short' })}</span>
                        <span className={cn('text-lg font-bold', date.toDateString() === new Date().toDateString() ? 'text-indigo-400' : 'text-foreground')}>{date.getDate()}</span>
                      </div>
                    ))}
                  </div>

                  <div className='bg-card'>
                    {rooms.map((room) => (
                      <div key={room.id} className='flex group hover:bg-accent/10 transition-colors'>
                        <div className='w-48 shrink-0 p-4 border-r border-border border-b flex flex-col justify-center bg-muted sticky left-0 z-10 group-hover:bg-card'>
                          <span className='text-sm font-bold text-foreground truncate'>{room.name}</span>
                          <span className='text-[10px] text-muted-foreground font-mono uppercase'>${(room.price || 0).toLocaleString()}</span>
                        </div>
                        
                        {dateRange.map((date, idx) => {
                          const dateStr = date.toISOString().split('T')[0];
                          const booking = getBookingForDate(String(room.id), date);
                          const isStart = booking ? booking.check_in === dateStr : false;

                          return (
                            <CalendarCell key={idx} dateStr={dateStr} roomId={String(room.id)}>
                              {booking && isStart && (
                                <DraggableBooking 
                                  booking={booking} 
                                  isStart={isStart} 
                                  isAltPressed={isAltPressed} 
                                  onEdit={openEditBookingModal}
                                />
                              )}
                              {booking && !isStart && (
                                <div className={cn(
                                  "pointer-events-none h-full absolute top-1 bottom-1 left-0 right-0 z-0 opacity-20",
                                  booking.status === 'checked_out' ? "bg-muted line-through" :
                                  booking.status === 'checked_in' ? 'bg-emerald-500' : 
                                  booking.status === 'maintenance' ? 'bg-amber-500' : 'bg-indigo-50'
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

            <DragOverlay dropAnimation={null}>
              {activeDragBooking && (
                <div className={cn(
                  "h-14 rounded-[var(--radius-squircle-md)] text-[10px] font-bold p-2 text-white shadow-2xl cursor-grabbing border border-ring opacity-90 scale-105 flex items-center gap-1.5",
                  activeDragBooking.status === 'checked_out' ? "bg-muted" :
                  activeDragBooking.status === 'checked_in' ? 'bg-emerald-500' : 
                  activeDragBooking.status === 'maintenance' ? 'bg-amber-500' : 'bg-indigo-500',
                )} style={{ width: '160px' }}>
                  <span className='truncate'>{activeDragBooking.guest_name || (activeDragBooking.guests?.full_name ?? 'Ocupado')}</span>
                </div>
              )}
            </DragOverlay>
          </DndContext>
        </div>
      </div>

      {showBookingModal && (
        <BookingWizardModal 
          bookingForm={bookingForm} 
          setBookingForm={setBookingForm} 
          availableRoomsList={availableRoomsList} 
          handleCreateBooking={handleSaveBooking} 
          onDelete={() => bookingForm.id && handleCancelBooking(bookingForm.id)}
          onClose={() => setShowBookingModal(false)} 
        />
      )}
    </>
  );
}