import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { jsPDF } from 'jspdf';

export const useCalendar = ({
  hotelInfo,
  rooms,
  bookings,
  setBookings,
  guests,
  fetchOperationalData,
}) => {
  // 1. Estados de Navegación (Fechas)
  const [currentDate, setCurrentDate] = useState(new Date());

  const changeMonth = (offset) => {
    const newDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + offset,
      1
    );
    setCurrentDate(newDate);
  };
  const goToToday = () => setCurrentDate(new Date());

  // 2. Estados de Modales y Formularios
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [modalTab, setModalTab] = useState('info');

  // Formularios
  const [bookingForm, setBookingForm] = useState({
    type: 'booking',
    guestName: '',
    guestDoc: '',
    guestNat: 'COL',
    guestPhone: '',
    guestEmail: '',
    roomId: '',
    checkIn: '',
    checkOut: '',
    price: '',
    notes: '',
  });

  const [editForm, setEditForm] = useState({});
  const [chargeForm, setChargeForm] = useState({ concept: '', price: '' });
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    method: 'Efectivo',
  });

  // 3. Lógica Auxiliar (Cálculos)
  const calculateFinancials = (b) => {
    const total = b.total_price || 0;
    const paid = b.payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
    return { total, paid, pending: total - paid };
  };

  const calculateTax = (total) => {
    const rate = hotelInfo?.tax_rate || 0;
    if (!rate) return { base: total, tax: 0 };
    const base = total / (1 + rate / 100);
    return { base, tax: total - base };
  };

  // 👇 CAMBIO IMPORTANTE: PRIORIDAD VISUAL
  // Esta función decide qué reserva pintar si hay varias el mismo día.
  const getBookingForDate = (rid, d) => {
    // 1. Buscar TODAS las coincidencias (excluyendo canceladas)
    const matches = bookings.filter(
      (b) =>
        b.room_id === rid &&
        new Date(d) >= new Date(b.check_in + 'T00:00') &&
        new Date(d) < new Date(b.check_out + 'T00:00') &&
        b.status !== 'cancelled'
    );

    // 2. Si no hay ninguna, retornamos undefined
    if (matches.length === 0) return undefined;

    // 3. Sistema de Puntos (Verde > Azul > Gris)
    const priority = {
      checked_in: 3, // En Casa (Verde) - Gana Siempre
      confirmed: 2, // Reserva Nueva (Azul) - Gana a Historial
      checked_out: 1, // Historial (Gris) - Solo se ve si no hay nada más
      maintenance: 0,
    };

    // Ordenamos para que la de mayor prioridad quede de primera [0]
    return matches.sort((a, b) => {
      const pA = priority[a.status] || 0;
      const pB = priority[b.status] || 0;
      return pB - pA;
    })[0];
  };

  const availableRoomsList = rooms.filter((room) => {
    const targetCheckIn = isEditing ? editForm.checkIn : bookingForm.checkIn;
    const targetCheckOut = isEditing ? editForm.checkOut : bookingForm.checkOut;

    if (!targetCheckIn || !targetCheckOut) return true;

    const start = new Date(targetCheckIn);
    const end = new Date(targetCheckOut);

    // Si estamos editando, la propia habitación actual siempre está disponible
    if (isEditing && selectedBooking && room.id === selectedBooking.room_id)
      return true;

    // Verificamos choques de fechas
    return !bookings.some((b) => {
      if (b.room_id !== room.id) return false; // No es esta habitación

      // Ignoramos las reservas canceladas Y las que ya salieron (checked_out)
      if (b.status === 'cancelled' || b.status === 'checked_out') return false;

      if (isEditing && selectedBooking && b.id === selectedBooking.id)
        return false; // Ignoramos la reserva que estamos editando

      // Fórmula de colisión de fechas
      return start < new Date(b.check_out) && end > new Date(b.check_in);
    });
  });

  // 4. Funciones de Acción
  const handleScanSuccess = (data) => {
    setBookingForm((prev) => ({
      ...prev,
      type: 'booking',
      guestDoc: data.docNumber,
      guestName: data.fullName,
      notes: `Tipo Sangre: ${data.bloodType}. (Escaneado Digitalmente)`,
    }));
    setShowScanner(false);
    alert(`✅ Cédula detectada: ${data.docNumber}`);
  };

  const handleCreateBooking = async (e) => {
    e.preventDefault();
    try {
      let gid = null;
      if (bookingForm.type === 'booking') {
        // Verificar si el huésped ya existe para no duplicarlo innecesariamente
        let existingGuest = guests.find(
          (g) => g.doc_number === bookingForm.guestDoc
        );

        if (existingGuest) {
          gid = existingGuest.id;
        } else {
          const { data: g, error } = await supabase
            .from('guests')
            .insert([
              {
                full_name: bookingForm.guestName,
                doc_number: bookingForm.guestDoc,
                nationality: bookingForm.guestNat,
                phone: bookingForm.guestPhone,
                email: bookingForm.guestEmail,
              },
            ])
            .select()
            .single();
          if (error) throw error;
          gid = g.id;
        }
      }

      await supabase.from('bookings').insert([
        {
          hotel_id: hotelInfo.id,
          room_id: bookingForm.roomId,
          guest_id: gid,
          check_in: bookingForm.checkIn,
          check_out: bookingForm.checkOut,
          status: bookingForm.type === 'booking' ? 'confirmed' : 'maintenance',
          total_price: bookingForm.price,
        },
      ]);

      fetchOperationalData();
      setShowBookingModal(false);
    } catch (e) {
      alert('Error creando reserva: ' + e.message);
    }
  };

  const startEditing = () => {
    if (!selectedBooking) return;
    setEditForm({
      guestName: selectedBooking.guests?.full_name || '',
      guestDoc: selectedBooking.guests?.doc_number || '',
      guestPhone: selectedBooking.guests?.phone || '',
      guestEmail: selectedBooking.guests?.email || '',
      price: selectedBooking.total_price || 0,
      notes: selectedBooking.notes || '',
      roomId: selectedBooking.room_id,
      checkIn: selectedBooking.check_in,
      checkOut: selectedBooking.check_out,
      totalPrice: selectedBooking.total_price,
    });
    setIsEditing(true);
  };

  const saveEditing = async () => {
    try {
      await supabase
        .from('bookings')
        .update({
          room_id: editForm.roomId,
          check_in: editForm.checkIn,
          check_out: editForm.checkOut,
          total_price: editForm.totalPrice,
        })
        .eq('id', selectedBooking.id);

      if (selectedBooking.guests) {
        await supabase
          .from('guests')
          .update({
            full_name: editForm.guestName,
            doc_number: editForm.guestDoc,
            phone: editForm.guestPhone,
            email: editForm.guestEmail,
          })
          .eq('id', selectedBooking.guests.id);
      }

      alert('Reserva actualizada');
      setIsEditing(false);
      fetchOperationalData();
      setSelectedBooking(null);
    } catch (e) {
      alert('Error al actualizar: ' + e.message);
    }
  };

  const handleRegisterPayment = async (e) => {
    e.preventDefault();
    if (!paymentForm.amount) return;
    await supabase.from('payments').insert([
      {
        booking_id: selectedBooking.id,
        amount: parseFloat(paymentForm.amount),
        method: paymentForm.method,
      },
    ]);
    fetchOperationalData();
    alert('Pago registrado');
    // Actualizamos localmente para ver el cambio inmediato
    setSelectedBooking((prev) => ({
      ...prev,
      payments: [
        ...(prev.payments || []),
        { amount: parseFloat(paymentForm.amount) },
      ],
    }));
    setPaymentForm({ ...paymentForm, amount: '' });
  };

  const handleAddCharge = async (e) => {
    e.preventDefault();
    await supabase.from('charges').insert([
      {
        booking_id: selectedBooking.id,
        item: chargeForm.concept,
        price: parseFloat(chargeForm.price),
      },
    ]);
    fetchOperationalData();
    alert('Consumo agregado');
    setChargeForm({ concept: '', price: '' });
  };

  const handleDeleteCharge = async (id) => {
    if (window.confirm('¿Borrar consumo?')) {
      await supabase.from('charges').delete().eq('id', id);
      fetchOperationalData();
    }
  };

  // --- NUEVA FUNCIÓN: Check-out con Auditoría de Deuda ---
  const handleCheckOut = async () => {
    if (!selectedBooking) return;

    // 1. Calculamos si debe dinero usando tu función existente
    const financials = calculateFinancials(selectedBooking);

    // 2. Si debe dinero, lanzamos la ALERTA
    if (financials.pending > 0) {
      const confirmarDeuda = window.confirm(
        `⚠️ ¡ALERTA DE DEUDA!\n\nEl huésped tiene un saldo pendiente de: $${financials.pending.toLocaleString(
          'es-CO'
        )}.\n\n¿Estás seguro de que deseas darle salida sin cobrar?`
      );
      // Si el recepcionista dice "Cancelar", detenemos todo.
      if (!confirmarDeuda) return;
    }

    // 3. Si no debe nada (o si aceptaste la deuda), confirmamos la salida
    if (
      window.confirm(
        '¿Finalizar estadía y liberar habitación? (Pasará a historial)'
      )
    ) {
      try {
        const { error } = await supabase
          .from('bookings')
          .update({ status: 'checked_out' }) // 👈 Cambia estado a historial, NO borra
          .eq('id', selectedBooking.id);

        if (error) throw error;

        alert('✅ Salida registrada. La habitación está libre.');
        setSelectedBooking(null); // Cerramos el modal
        fetchOperationalData(); // Actualizamos el calendario
      } catch (e) {
        alert('Error al registrar salida: ' + e.message);
      }
    }
  };

  const handleCancelBooking = async () => {
    if (window.confirm('¿Eliminar reserva permanentemente?')) {
      await supabase.from('bookings').delete().eq('id', selectedBooking.id);
      setSelectedBooking(null);
      fetchOperationalData();
    }
  };

  const generateTRA = () => {
    const doc = new jsPDF();
    doc.text(`TRA No. ${selectedBooking.tra_number || 'PEND'}`, 20, 20);
    doc.text(`Huésped: ${selectedBooking.guests?.full_name}`, 20, 30);
    doc.save('TRA.pdf');
  };

  const handleSendWhatsApp = () => {
    if (!selectedBooking?.guests?.phone)
      return alert('No hay teléfono registrado');

    let phone = selectedBooking.guests.phone.replace(/\D/g, '');
    if (!phone.startsWith('57') && phone.length === 10) phone = '57' + phone;

    // Enlace 1: Check-in (Mantenemos tu lógica)
    const checkInLink = `${window.location.origin}/checkin?booking=${selectedBooking.id}`;

    // Enlace 2: CORREGIDO - Cambiamos 'book' por 'menu'
    // 🔴 Antes: .../book/${hotelInfo.id}  (Esto llevaba a reservas)
    // 🟢 Ahora: .../menu/${hotelInfo.id}  (Esto lleva al Room Service)
    const menuLink = `${window.location.origin}/menu/${hotelInfo.id}`;

    const message = `Hola *${selectedBooking.guests.full_name}*, tu reserva en *${hotelInfo?.name}* está confirmada. ✅\n\n📝 *Check-in Digital:* ${checkInLink}\n🍹 *Room Service:* ${menuLink}`;

    window.open(
      `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
      '_blank'
    );
  };

  return {
    currentDate,
    changeMonth,
    goToToday,
    showBookingModal,
    setShowBookingModal,
    showScanner,
    setShowScanner,
    bookingForm,
    setBookingForm,
    selectedBooking,
    setSelectedBooking,
    isEditing,
    setIsEditing,
    editForm,
    setEditForm,
    modalTab,
    setModalTab,
    chargeForm,
    setChargeForm,
    paymentForm,
    setPaymentForm,
    // Funciones
    getBookingForDate,
    availableRoomsList,
    handleScanSuccess,
    handleCreateBooking,
    startEditing,
    saveEditing,
    calculateFinancials,
    calculateTax,
    handleRegisterPayment,
    handleAddCharge,
    handleDeleteCharge,
    handleCancelBooking,
    handleCheckOut,
    generateTRA,
    handleSendWhatsApp,
  };
};
