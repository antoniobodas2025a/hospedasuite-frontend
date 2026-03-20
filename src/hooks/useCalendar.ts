'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBookingAction, updateBookingDatesAction, cancelBookingAction, duplicateBookingAction } from '@/app/actions/bookings';
import { createClient } from '@/utils/supabase/client';

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

export const useCalendar = (initialRooms: any[], initialBookings: Booking[], hotelId: string) => {
  const router = useRouter();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [bookings, setBookings] = useState<Booking[]>(initialBookings.filter(b => b.status !== 'cancelled'));

  // 🚨 FIX QA CRÍTICO: Sincronización de Estado (Anti-Reservas Fantasma)
  // Cuando Next.js trae nuevos datos (por router.refresh), los inyectamos a la pantalla
  useEffect(() => {
    setBookings(initialBookings.filter(b => b.status !== 'cancelled'));
  }, [initialBookings]);

  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingForm, setBookingForm] = useState<BookingForm>({
    type: 'booking', guestName: '', guestDoc: '', guestPhone: '', roomId: '',
    checkIn: new Date().toISOString().split('T')[0],
    checkOut: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    adults: 1, children: 0, price: 0,
  });

  useEffect(() => {
    if (!hotelId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`calendar-sync-${hotelId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings', filter: `hotel_id=eq.${hotelId}` },
        (payload) => {
          console.log('Sincronización Mágica: Cambio detectado', payload);
          router.refresh(); 
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [hotelId, router]);

  const moveDate = (days: number) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + days);
    setCurrentDate(newDate);
  };

  const goToToday = () => setCurrentDate(new Date());

  const getBookingForDate = (roomId: string, date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    return bookings.find((b) => b.room_id === roomId && dateStr >= b.check_in && dateStr < b.check_out && b.status !== 'cancelled');
  };

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hotelId) return alert('Error Crítico: No se ha identificado el Hotel ID.');

    try {
      const result = await createBookingAction({
        hotel_id: hotelId, type: bookingForm.type, guestName: bookingForm.guestName,
        guestDoc: bookingForm.guestDoc, guestPhone: bookingForm.guestPhone,
        guestEmail: bookingForm.guestEmail, roomId: bookingForm.roomId,
        checkIn: bookingForm.checkIn, checkOut: bookingForm.checkOut,
        price: bookingForm.price, source: 'admin'
      });

      if (!result.success) throw new Error(result.error);

      alert('✅ Reserva Creada Exitosamente');
      setShowBookingModal(false);
      router.refresh(); 

      setBookingForm({
        type: 'booking', guestName: '', guestDoc: '', guestPhone: '', roomId: '',
        checkIn: new Date().toISOString().split('T')[0],
        checkOut: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        adults: 1, children: 0, price: 0,
      });
    } catch (error: any) {
      console.error(error);
      alert(`Error Forense: ${error.message}`);
    }
  };

  const handleDragEnd = async (bookingId: string, newRoomId: string, newCheckInDateStr: string) => {
    const originalBooking = bookings.find(b => b.id === bookingId);
    if (!originalBooking) return;

    const checkInDate = new Date(`${originalBooking.check_in}T12:00:00Z`);
    const checkOutDate = new Date(`${originalBooking.check_out}T12:00:00Z`);
    const durationDays = Math.round((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));

    const newCheckIn = new Date(`${newCheckInDateStr}T12:00:00Z`);
    const newCheckOut = new Date(newCheckIn.getTime() + durationDays * 24 * 60 * 60 * 1000);
    const newCheckOutDateStr = newCheckOut.toISOString().split('T')[0];

    const backupBookings = [...bookings]; 
    setBookings(current => current.map(b => {
      if (b.id === bookingId) {
        return { ...b, room_id: newRoomId, check_in: newCheckInDateStr, check_out: newCheckOutDateStr };
      }
      return b;
    }));

    try {
      const result = await updateBookingDatesAction(bookingId, newRoomId, newCheckInDateStr, newCheckOutDateStr);
      if (!result.success) {
        setBookings(backupBookings);
        alert(`❌ No se pudo mover: ${result.error}`);
      }
    } catch (error) {
      setBookings(backupBookings); 
      alert('Error de conexión al mover la reserva.');
    }
  };

  const handleDuplicateBooking = async (bookingId: string, newRoomId: string, newCheckInDateStr: string) => {
    const originalBooking = bookings.find(b => b.id === bookingId);
    if (!originalBooking) return;

    const checkInDate = new Date(`${originalBooking.check_in}T12:00:00Z`);
    const checkOutDate = new Date(`${originalBooking.check_out}T12:00:00Z`);
    const durationDays = Math.round((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));

    const newCheckIn = new Date(`${newCheckInDateStr}T12:00:00Z`);
    const newCheckOut = new Date(newCheckIn.getTime() + durationDays * 24 * 60 * 60 * 1000);
    const newCheckOutDateStr = newCheckOut.toISOString().split('T')[0];

    const tempClone: Booking = {
      ...originalBooking,
      id: `temp-${Date.now()}`,
      room_id: newRoomId,
      check_in: newCheckInDateStr,
      check_out: newCheckOutDateStr,
    };
    
    setBookings(current => [...current, tempClone]);

    try {
      const result = await duplicateBookingAction(bookingId, newRoomId, newCheckInDateStr, newCheckOutDateStr);
      if (!result.success) {
        setBookings(current => current.filter(b => b.id !== tempClone.id));
        alert(`❌ No se pudo clonar: ${result.error}`);
      } else {
        router.refresh(); 
      }
    } catch (error) {
      setBookings(current => current.filter(b => b.id !== tempClone.id));
      alert('Error de conexión al clonar la reserva.');
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm('¿Estás seguro de que deseas anular esta reserva?')) return;
    
    const backupBookings = [...bookings];
    setBookings(current => current.filter(b => b.id !== bookingId));

    try {
      const result = await cancelBookingAction(bookingId);
      if (result.success) {
        alert('✅ Reserva cancelada correctamente.');
        setShowBookingModal(false);
        router.refresh();
      } else {
        setBookings(backupBookings); 
        alert('❌ Error al cancelar: ' + result.error);
      }
    } catch (error: any) {
      setBookings(backupBookings);
      alert('Error de red: ' + error.message);
    }
  };

  return {
    currentDate, moveDate, goToToday, getBookingForDate, bookings,
    showBookingModal, setShowBookingModal, bookingForm, setBookingForm,
    handleCreateBooking, availableRoomsList: initialRooms,
    handleDragEnd, handleCancelBooking, handleDuplicateBooking
  };
};