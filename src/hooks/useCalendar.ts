'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  createBookingAction, 
  updateBookingDatesAction, 
  cancelBookingAction, 
  duplicateBookingAction,
  updateBookingDetailsAction 
} from '@/app/actions/bookings';
import { createClient } from '@/utils/supabase/client';

// ==========================================
// BLOQUE 1: TIPADO Y ESTRUCTURAS
// ==========================================

export type BookingStatus = 'confirmed' | 'checked_in' | 'checked_out' | 'maintenance' | 'cancelled';

export interface Booking {
  id: string; 
  room_id: string;
  check_in: string;
  check_out: string;
  status: BookingStatus;
  total_price: number;
  guest_name?: string; 
  guests?: { full_name: string; doc_number?: string; phone?: string; };
}

export interface BookingForm {
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
  source?: 'direct' | 'ota' | 'admin';
}

const normalizeBooking = (b: any): Booking => ({
  ...b,
  id: String(b.id),
  room_id: String(b.room_id),
});

// ==========================================
// BLOQUE 2: MOTOR DE ESTADO (HOOK CERTIFICADO)
// ==========================================

export const useCalendar = (initialRooms: any[], initialBookings: any[], hotelId: string) => {
  const router = useRouter();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [bookings, setBookings] = useState<Booking[]>(
    initialBookings.map(normalizeBooking).filter(b => b.status !== 'cancelled')
  );

  useEffect(() => {
    setBookings(initialBookings.map(normalizeBooking).filter(b => b.status !== 'cancelled'));
  }, [initialBookings]);

  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedBookingForEdit, setSelectedBookingForEdit] = useState<Booking | null>(null);

  const [bookingForm, setBookingForm] = useState<BookingForm>({
    type: 'booking', guestName: '', guestDoc: '', guestPhone: '', roomId: '',
    checkIn: new Date().toISOString().split('T')[0],
    checkOut: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    adults: 1, children: 0, price: 0,
  });

  // ========================================================================
  // 🛡️ MOTOR DE DISPONIBILIDAD (Predictive Availability Shield)
  // Filtra las habitaciones al vuelo basándose en las fechas del formulario.
  // ========================================================================
  const availableRoomsList = useMemo(() => {
    const { checkIn, checkOut, id: currentBookingId } = bookingForm;
    if (!checkIn || !checkOut) return initialRooms;

    return initialRooms.filter(room => {
      const roomIsTaken = bookings.some(b => {
        // Exclusión mutua: No chocar con el propio registro en modo edición
        if (currentBookingId && b.id === currentBookingId) return false;
        if (b.room_id !== String(room.id)) return false;

        // Verificación de solapamiento de intervalos temporales
        const overlap = b.check_in < checkOut && checkIn < b.check_out;
        return overlap;
      });
      return !roomIsTaken;
    });
  }, [initialRooms, bookings, bookingForm.checkIn, bookingForm.checkOut, bookingForm.id]);

  // Suscripción Realtime (Zero-Trust Sync)
  useEffect(() => {
    if (!hotelId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`calendar-sync-${hotelId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings', filter: `hotel_id=eq.${hotelId}` },
        () => { router.refresh(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [hotelId, router]);

  const getBookingForDate = (roomId: string, date: Date) => {
    const dStr = date.toISOString().split('T')[0];
    return bookings.find((b) => b.room_id === String(roomId) && dStr >= b.check_in && dStr < b.check_out);
  };

  // ==========================================
  // BLOQUE 3: CONTROLADORES DE MUTACIÓN
  // ==========================================

  const openEditBookingModal = useCallback((booking: Booking) => {
    setSelectedBookingForEdit(booking);
    setBookingForm({
      id: booking.id,
      type: booking.status === 'maintenance' ? 'maintenance' : 'booking',
      guestName: booking.guest_name || booking.guests?.full_name || '',
      guestDoc: booking.guests?.doc_number || '',
      guestPhone: booking.guests?.phone || '',
      roomId: booking.room_id,
      checkIn: booking.check_in,
      checkOut: booking.check_out,
      adults: 1,
      children: 0,
      price: booking.total_price,
    });
    setShowBookingModal(true);
  }, []);

  const openNewBookingModal = useCallback(() => {
    setSelectedBookingForEdit(null);
    setBookingForm({
      type: 'booking', guestName: '', guestDoc: '', guestPhone: '', roomId: '',
      checkIn: new Date().toISOString().split('T')[0],
      checkOut: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      adults: 1, children: 0, price: 0,
    });
    setShowBookingModal(true);
  }, []);

  const handleSaveBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hotelId) return alert('Violación de Contexto: Hotel ID nulo.');
    if (!bookingForm.roomId) return alert('Validación: Unidad física requerida.');

    try {
      const payload = {
        ...bookingForm,
        hotel_id: hotelId,
        guestName: bookingForm.guestName.trim() || undefined,
        guestDoc: bookingForm.guestDoc.trim() || undefined,
        source: 'admin' as const
      };

      let result;
      if (bookingForm.id) {
        result = await updateBookingDetailsAction(bookingForm.id, payload);
      } else {
        result = await createBookingAction(payload);
      }

      if (!result.success) {
        if (result.error?.includes('prevent_double_booking')) {
          throw new Error('La unidad ya se encuentra comprometida para estas fechas.');
        }
        throw new Error(result.error);
      }

      alert('✅ Transacción Ejecutada');
      setShowBookingModal(false);
      router.refresh();
    } catch (error: any) {
      alert(`⚠️ Bloqueo Operativo: ${error.message}`);
    }
  };

  const handleDragEnd = async (bookingId: string, newRoomId: string, newCheckIn: string) => {
    const original = bookings.find(b => b.id === bookingId);
    if (!original) return;

    const diff = new Date(original.check_out).getTime() - new Date(original.check_in).getTime();
    const newCheckOut = new Date(new Date(newCheckIn).getTime() + diff).toISOString().split('T')[0];

    const backup = [...bookings];
    setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, room_id: newRoomId, check_in: newCheckIn, check_out: newCheckOut } : b));

    const res = await updateBookingDatesAction(bookingId, newRoomId, newCheckIn, newCheckOut);
    if (!res.success) {
      setBookings(backup);
      alert('Error al reposicionar: ' + res.error);
    }
  };

  const handleDuplicateBooking = async (id: string, rid: string, cin: string) => {
    const original = bookings.find(b => b.id === id);
    if (!original) return;

    const diff = new Date(original.check_out).getTime() - new Date(original.check_in).getTime();
    const cout = new Date(new Date(cin).getTime() + diff).toISOString().split('T')[0];

    const res = await duplicateBookingAction(id, rid, cin, cout);
    if (!res.success) alert('Fallo al clonar nodo: ' + res.error);
    else router.refresh();
  };

  const handleCancelBooking = async (id: string) => {
    if (!confirm('¿Anular transacción?')) return;
    const res = await cancelBookingAction(id);
    if (res.success) {
      setShowBookingModal(false);
      router.refresh();
    } else alert('Error: ' + res.error);
  };

  return {
    currentDate, 
    moveDate: (d: number) => {
      const n = new Date(currentDate); n.setDate(n.getDate() + d); setCurrentDate(n);
    }, 
    goToToday: () => setCurrentDate(new Date()),
    getBookingForDate, 
    bookings, 
    showBookingModal, 
    setShowBookingModal,
    bookingForm, 
    setBookingForm, 
    handleSaveBooking, 
    openEditBookingModal, 
    openNewBookingModal,
    handleDragEnd, 
    handleCancelBooking, 
    handleDuplicateBooking,
    availableRoomsList
  };
};