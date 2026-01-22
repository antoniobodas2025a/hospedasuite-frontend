import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import ICAL from 'ical.js';

import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  X,
  CheckCircle2,
  Hammer,
  ScanBarcode,
  User,
  CreditCard,
  Banknote,
  MessageCircle,
  Download,
  Edit,
  Trash2,
  Plus,
  TrendingUp, // 👈 AGREGAR
  Activity, // 👈 AGREGAR
} from 'lucide-react';

import { useCalendar } from '../hooks/useCalendar';
import { useInventory } from '../hooks/useInventory';
import { useMarketing } from '../hooks/useMarketing';

import CalendarPanel from '../components/dashboard/CalendarPanel';
import InventoryPanel from '../components/dashboard/InventoryPanel';
import MarketingPanel from '../components/dashboard/MarketingPanel';

import GuestsPanel from '../components/dashboard/GuestsPanel';
import SettingsPanel from '../components/dashboard/SettingsPanel';
import MenuManager from '../components/dashboard/MenuManager';
import ForensicBookPanel from '../components/dashboard/ForensicBookPanel';

import MobileNav from '../components/layout/MobileNav';

import RoomServiceModal from '../components/modals/RoomServiceModal';
import ScannerModal from '../components/modals/ScannerModal';
import BookingWizardModal from '../components/modals/BookingWizardModal';
import BookingDetailModal from '../components/modals/BookingDetailModal';

import LockScreen from '../components/auth/LockScreen';

const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Playfair+Display:ital,wght@0,600;0,700;1,600&display=swap');
    
    :root {
      --font-sans: 'Inter', system-ui, sans-serif;
      --font-serif: 'Playfair Display', serif;
    }

    body { 
      background-color: #F8FAFC; 
      background-image: 
        radial-gradient(at 0% 0%, rgba(6, 182, 212, 0.08) 0px, transparent 50%),
        radial-gradient(at 100% 100%, rgba(99, 102, 241, 0.05) 0px, transparent 50%);
      background-attachment: fixed;
      color: #0f172a;
      font-family: var(--font-sans);
      -webkit-font-smoothing: antialiased;
    }
    
    .font-serif { fontFamily: var(--font-serif); }
    .font-sans { fontFamily: var(--font-sans); }
    
    /* 🔥 CORRECCIÓN AQUÍ: SCROLLBARS VISIBLES Y ELEGANTES */
    ::-webkit-scrollbar {
      width: 8px;      /* Grosor vertical */
      height: 8px;     /* Grosor horizontal (CRÍTICO para ver días a la derecha) */
    }
    ::-webkit-scrollbar-track {
      background: transparent; 
    }
    ::-webkit-scrollbar-thumb {
      background: rgba(203, 213, 225, 0.6); /* Slate 300 semi-transparente */
      border-radius: 10px;
      border: 2px solid #F8FAFC; /* Borde para dar efecto flotante */
    }
    ::-webkit-scrollbar-thumb:hover {
      background: rgba(148, 163, 184, 0.8); /* Slate 400 al pasar el mouse */
    }

    /* Utilitario para paneles de vidrio */
    .glass-panel { 
      background: rgba(255, 255, 255, 0.7);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.6);
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.02);
    }

    /* Inputs limpios */
    input, select, textarea {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      color: #0f172a;
      transition: all 0.2s;
    }
    input:focus, select:focus, textarea:focus {
      border-color: #06b6d4;
      box-shadow: 0 0 0 3px rgba(6, 182, 212, 0.1);
      outline: none;
    }
  `}</style>
);

const DashboardPage = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // Estados Principales
  const [activeTab, setActiveTab] = useState('calendar');
  const [rooms, setRooms] = useState([]);
  // ... tus otros estados ...

  const [isListening, setIsListening] = useState(false); // 👈 Nuevo estado visual
  const recognitionRef = useRef(null); // 👈 Para guardar el micrófono y poder apagarlo
  const [isProcessing, setIsProcessing] = useState(false); // 👈 Nuevo estado

  const [guests, setGuests] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [leads, setLeads] = useState([]); // Estado para Plan GROWTH/CORP
  const [hotelInfo, setHotelInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  // Estados de Seguridad
  const [accessDenied, setAccessDenied] = useState(false);
  const [denyReason, setDenyReason] = useState('');

  // Estados Room Service
  const [pendingOrders, setPendingOrders] = useState([]);
  const [showOrdersModal, setShowOrdersModal] = useState(false);

  // --- ESTADOS QUE DEBES TENER ---

  // 1. Audio para Room Service - Actualizado con URL estable y precarga
  const [audio] = useState(
    new Audio('https://www.soundjay.com/buttons/sounds/button-3.mp3'),
  );

  // Efecto para asegurar la carga del audio y evitar errores de caché
  useEffect(() => {
    if (audio) {
      audio.load();
      audio.volume = 0.4;
      audio.onerror = () =>
        console.warn('⚠️ Error al cargar audio de Room Service');
    }
  }, [audio]);

  // 2. Estados para Airbnb y Configuración
  const [targetRoomId, setTargetRoomId] = useState(null);
  const [showScanner, setShowScanner] = useState(false);

  // --- ESTADOS FALTANTES (Modales y Formularios) ---

  // 4. Estados para Pagos y Cargos Extra
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    method: 'EFECTIVO', // EFECTIVO, TRANSFERENCIA, TARJETA
  });

  const [currentBookingOrders, setCurrentBookingOrders] = useState([]);

  const [chargeForm, setChargeForm] = useState({
    concept: '', // Ej: Cerveza, Lavandería
    price: '',
  });

  // Estado crítico para el funcionamiento del modal de detalles
  const [activeDetailTab, setActiveDetailTab] = useState('info');

  // --- FIN ESTADOS FALTANTES ---

  // Estado y Lógica para Editar Huésped
  const [editingGuest, setEditingGuest] = useState(null);

  // 📝 ACTUALIZAR PERFIL DE HUÉSPED
  const handleUpdateGuest = async (e) => {
    e.preventDefault();
    if (!editingGuest) return;

    const { error } = await supabase
      .from('guests')
      .update({
        full_name: editingGuest.full_name,
        doc_number: editingGuest.doc_number,
        phone: editingGuest.phone,
        email: editingGuest.email,
      })
      .eq('id', editingGuest.id);

    if (error) {
      alert('Error al actualizar: ' + error.message);
    } else {
      alert('Huésped actualizado correctamente');
      setEditingGuest(null);
      fetchOperationalData();
    }
  };

  // 🗑️ ELIMINAR PERFIL DE HUÉSPED
  const handleDeleteGuest = async (guestId) => {
    if (
      !window.confirm(
        '¿Seguro que deseas eliminar este huésped? Sus reservas históricas se mantendrán, pero su perfil se borrará.',
      )
    )
      return;

    const { error } = await supabase.from('guests').delete().eq('id', guestId);

    if (error) {
      alert('Error al eliminar: ' + error.message);
    } else {
      alert('Huésped eliminado con éxito');
      fetchOperationalData();
    }
  };

  // 👇 CAMBIO: Enlace dinámico al motor de reservas del hotel actual
  const menuLink = hotelInfo?.id
    ? `${window.location.origin}/book/${hotelInfo.id}`
    : '#';

  // --- CARGA INICIAL BLINDADA (CORREGIDA) ---
  useEffect(() => {
    const fetchHotelInfo = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        // 👇 SOLUCIÓN PGRST116: Si hay duplicados, tomamos el más reciente
        const { data: hotels, error } = await supabase
          .from('hotels')
          .select('*')
          .eq('email', user.email)
          .order('created_at', { ascending: false }) // El más nuevo primero
          .limit(1); // Forzamos que solo traiga uno
        if (error) {
          console.error('Error buscando hotel:', error);
          return;
        }
        const hotel = hotels?.[0]; // Tomamos el primero del array

        /// 🛡️ [INICIO BLOQUE DEFENSIVO] 🛡️
        // Si no existe hotel, redirigimos en lugar de alertar
        if (!hotel) {
          console.warn(
            '⚠️ Usuario nuevo detectado. Redirigiendo a Onboarding...',
          );
          setLoading(false);

          // 👇 CORRECCIÓN: Redirigir automáticamente
          navigate('/onboarding');
          return;
        }
        // 🛡️ [FIN BLOQUE DEFENSIVO] 🛡️

        // POLICÍA DE ACCESO
        if (hotel.status === 'suspended') {
          setDenyReason('suspended');
          setAccessDenied(true);
        } else if (hotel.status === 'trial' && hotel.trial_ends_at) {
          const today = new Date();
          const trialEnd = new Date(hotel.trial_ends_at);
          if (today > trialEnd) {
            setDenyReason('trial_over');
            setAccessDenied(true);
          }
        }

        setHotelInfo(hotel);

        fetchOrders(hotel.id);
      } catch (err) {
        console.error('Falla crítica en carga inicial:', err);
      }
    };

    fetchHotelInfo();
  }, []);

  useEffect(() => {
    // Solo intentamos buscar datos si YA tenemos el ID del hotel
    if (hotelInfo?.id) {
      fetchOperationalData();
    }
  }, [activeTab, hotelInfo]);
  // 👆 AGREGADO: , hotelInfo
  // Ahora, si 'hotelInfo' cambia (de null a tener datos), esto se dispara solo.

  // --- REALTIME ORDERS ---
  useEffect(() => {
    const channel = supabase
      .channel('room-service-orders')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'service_orders' },
        (payload) => {
          audio.play().catch((e) => console.log('Audio interaction needed'));
          if (hotelInfo?.id) fetchOrders(hotelInfo.id);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [hotelInfo, audio]);

  const fetchOrders = async (hotelId) => {
    const { data } = await supabase
      .from('service_orders')
      .select('*, rooms(name)')
      .eq('hotel_id', hotelId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (data) setPendingOrders(data);
  };

  const markOrderDelivered = async (orderId) => {
    if (!window.confirm('¿Confirmar entrega?')) return;
    await supabase
      .from('service_orders')
      .update({ status: 'delivered' })
      .eq('id', orderId);
    setPendingOrders((prev) => prev.filter((o) => o.id !== orderId));
  };

  // --- FETCH DATA ---
  const fetchOperationalData = async () => {
    try {
      setLoading(true);
      const currentHotelId = hotelInfo?.id;
      if (!currentHotelId) return;

      if (currentHotelId) {
        // 1. Habitaciones
        const { data: rd } = await supabase
          .from('rooms')
          .select('*')
          .eq('hotel_id', currentHotelId)
          .order('name');
        if (rd) setRooms(rd);

        // 2. Reservas
        const { data: bd } = await supabase
          .from('bookings')
          .select('*, guests(*), payments(*), charges(*)')
          .eq('hotel_id', currentHotelId);

        if (bd) {
          setBookings(bd);

          // 3. Huéspedes
          const uniqueGuestsMap = new Map();
          bd.forEach((booking) => {
            if (booking.guests) {
              uniqueGuestsMap.set(booking.guests.id, booking.guests);
            }
          });
          const myGuests = Array.from(uniqueGuestsMap.values());

          myGuests.sort(
            (a, b) => new Date(b.created_at) - new Date(a.created_at),
          );
          setGuests(myGuests);

          // 4. Leads (NUEVA ARQUITECTURA: Silos de Datos)
          if (
            [
              'GROWTH',
              'CORPORATE',
              'PRO_AI',
              'PRO', // 👈 AGREGAR ESTO
              'NANO_AI',
              'GROWTH_AI',
              'CORPORATE_AI',
            ].includes(hotelInfo?.subscription_plan)
          ) {
            // Consulta directa y limpia a la tabla de huéspedes
            const { data: guestLeads } = await supabase
              .from('hotel_guest_leads') //
              .select('*')
              .eq('hotel_id', hotelInfo.id)
              .order('created_at', { ascending: false });

            if (guestLeads) {
              setLeads(guestLeads);
            }
          } else {
            setLeads([]);
          }
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const marketingData = useMarketing({
    hotelInfo,
    leads,
    setLeads,
    fetchOperationalData,
  });

  const inventoryData = useInventory({
    hotelInfo,
    rooms,
    setRooms,
    fetchOperationalData,
  });

  // 👇 INYECTAR HOOK DE CALENDARIO
  const calendarData = useCalendar({
    hotelInfo,
    rooms,
    bookings,
    setBookings,
    guests,
    fetchOperationalData,
  });

  // 💰 CALCULADORA INTELIGENTE: Detecta modalidad de cobro (Noches vs Personas)
  useEffect(() => {
    const { checkIn, checkOut, roomId, type, adults, children } =
      calendarData.bookingForm;

    // Solo ejecutamos si es una reserva de huésped y tenemos los datos mínimos
    if (type === 'booking' && roomId && checkIn && checkOut) {
      const start = new Date(checkIn + 'T00:00');
      const end = new Date(checkOut + 'T00:00');

      if (!isNaN(start) && !isNaN(end)) {
        // 1. Cálculo de noches (Diferencia de días)
        const diffTime = end - start;
        const nights = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

        // 2. Buscar la habitación seleccionada en el estado local
        const room = rooms.find((r) => r.id === roomId);

        if (room) {
          // 🧐 Lógica de Multiplicador por Persona
          const totalPeople =
            (parseInt(adults) || 0) + (parseInt(children) || 0);

          // Si la habitación tiene activo is_price_per_person, multiplicamos por la gente
          const multiplier = room.is_price_per_person ? totalPeople || 1 : 1;

          // 3. Cálculo Final: (Precio Base) * (Noches) * (Multiplicador Personas)
          const calculatedTotal =
            (parseFloat(room.price) || 0) * nights * multiplier;

          // 4. Actualizamos el formulario solo si el valor cambió para evitar bucles infinitos
          if (calendarData.bookingForm.price !== calculatedTotal) {
            calendarData.setBookingForm((prev) => ({
              ...prev,
              price: calculatedTotal,
            }));
          }
        }
      }
    } else if (type === 'maintenance') {
      // Si el tipo es mantenimiento, forzamos el precio a 0
      if (calendarData.bookingForm.price !== 0) {
        calendarData.setBookingForm((prev) => ({ ...prev, price: 0 }));
      }
    }
  }, [
    calendarData.bookingForm.checkIn,
    calendarData.bookingForm.checkOut,
    calendarData.bookingForm.roomId,
    calendarData.bookingForm.adults,
    calendarData.bookingForm.children,
    calendarData.bookingForm.type,
    rooms,
  ]);

  // --- HELPERS & STYLES ---
  const brandColor = hotelInfo?.primary_color || '#0891b2'; // Cyan-600 elegante
  const brandStyle = { backgroundColor: brandColor };
  const textBrandStyle = { color: brandColor };

  // En DashboardPage.jsx
  const calculateFinancials = (b) => {
    if (!b) return { total: 0, paid: 0, pending: 0 };

    const basePrice = Number(b.total_price) || 0;

    // Suma cargos manuales (Minibar manual, Lavandería, Daños)
    const manualCharges =
      b.charges?.reduce((sum, c) => sum + (Number(c.price) || 0), 0) || 0;

    // ⚠️ ADVERTENCIA: Aquí el Dashboard no ve el Room Service automático
    // porque no estamos trayendo 'service_orders' en la carga inicial para no hacerla lenta.
    // El Check-out SÍ lo consultará en tiempo real.

    const totalPaid =
      b.payments?.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) || 0;
    const grandTotal = basePrice + manualCharges;

    return {
      total: grandTotal,
      paid: totalPaid,
      pending: grandTotal - totalPaid,
    };
  };

  const calculateTax = (total) => {
    const rate = Number(hotelInfo?.tax_rate) || 0;
    if (!rate) return { base: total, tax: 0 };
    const base = total / (1 + rate / 100);
    return { base, tax: total - base };
  };

  // --- ACCIONES ---
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
    // Lógica básica de guardado para editar la reserva
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

      await supabase
        .from('guests')
        .update({
          full_name: editForm.guestName,
          doc_number: editForm.guestDoc,
          phone: editForm.guestPhone,
          email: editForm.guestEmail,
        })
        .eq('id', selectedBooking.guests.id);

      alert('Reserva actualizada');
      setIsEditing(false);
      fetchOperationalData();
      setSelectedBooking(null);
    } catch (e) {
      alert('Error al actualizar: ' + e.message);
    }
  };

  const generateTRA = () => {
    const doc = new jsPDF();
    doc.text(`TRA No. ${selectedBooking.tra_number || 'PEND'}`, 20, 20);
    doc.text(`Huésped: ${selectedBooking.guests?.full_name}`, 20, 30);
    doc.save('TRA.pdf');
  };

  // 1. FUNCIÓN AUXILIAR (Ponla antes de handleCreateBooking)
  // Verifica si la habitación ya tiene reservas en esas fechas
  const checkAvailability = async (roomId, start, end) => {
    // Buscamos reservas que NO estén canceladas y que se solapen con las fechas
    const { data, error } = await supabase
      .from('bookings')
      .select('id')
      .eq('room_id', roomId)
      .neq('status', 'cancelled')
      // Lógica de superposición: (Inicio <= NuevoFin) Y (Fin >= NuevoInicio)
      .or(`and(check_in.lte.${end}, check_out.gte.${start})`);

    if (error) {
      console.error('Error verificando disponibilidad', error);
      return false; // Ante la duda, bloqueamos
    }

    // Si data.length es 0, significa que NO hay reservas (está libre)
    return data.length === 0;
  };

  // 2. TU FUNCIÓN PRINCIPAL (Modificada y Blindada)
  const handleCreateBooking = async (e) => {
    e.preventDefault();

    // A. VALIDACIÓN DE CAMPOS VACÍOS (Evita el warning "Uncontrolled input")
    if (!bookingForm.roomId || !bookingForm.checkIn || !bookingForm.checkOut) {
      alert(
        '⚠️ Por favor selecciona una habitación y las fechas de entrada/salida.',
      );
      return;
    }

    // B. VERIFICACIÓN DE OVERBOOKING (La protección crítica)
    const isAvailable = await checkAvailability(
      bookingForm.roomId,
      bookingForm.checkIn,
      bookingForm.checkOut,
    );

    if (!isAvailable) {
      alert(
        '⛔ ¡ALERTA DE OVERBOOKING!\n\nLa habitación ya está ocupada en estas fechas. Por favor selecciona otra habitación o cambia las fechas.',
      );
      return; // Detiene el guardado
    }

    try {
      let gid = null;

      // C. CREACIÓN DEL HUÉSPED (Solo si es una reserva normal)
      if (bookingForm.type === 'booking') {
        // Validar que haya datos del huésped
        if (!bookingForm.guestName || !bookingForm.guestDoc) {
          alert('⚠️ El nombre y documento del huésped son obligatorios.');
          return;
        }

        const { data: g, error: guestError } = await supabase
          .from('guests')
          .insert([
            {
              full_name: bookingForm.guestName,
              doc_number: bookingForm.guestDoc,
              nationality: bookingForm.guestNat || '', // Evita null
              phone: bookingForm.guestPhone || '',
              email: bookingForm.guestEmail || '',
            },
          ])
          .select()
          .single();

        if (guestError) throw guestError;
        gid = g.id;
      }

      // D. CREACIÓN DE LA RESERVA (O Mantenimiento)
      const { error: bookingError } = await supabase.from('bookings').insert([
        {
          hotel_id: hotelInfo.id,
          room_id: bookingForm.roomId,
          guest_id: gid, // Será null si es mantenimiento
          check_in: bookingForm.checkIn,
          check_out: bookingForm.checkOut,
          status: bookingForm.type === 'booking' ? 'confirmed' : 'maintenance',
          total_price: bookingForm.price || 0,
        },
      ]);

      if (bookingError) throw bookingError;

      // E. ÉXITO
      // Sonido de confirmación (Opcional)
      new Audio(
        'https://assets.mixkit.co/sfx/preview/mixkit-software-interface-start-2574.mp3',
      )
        .play()
        .catch(() => {});

      fetchOperationalData(); // Recarga el calendario
      setShowBookingModal(false); // Cierra el modal
      alert(
        bookingForm.type === 'booking'
          ? '✅ Reserva creada con éxito'
          : '🛠️ Mantenimiento agendado',
      );
    } catch (e) {
      console.error(e);
      alert('Error al guardar: ' + e.message);
    }
  };

  const handleRegisterPayment = async (e) => {
    e.preventDefault();
    const currentBooking = calendarData.selectedBooking;

    if (!currentBooking || !paymentForm.amount) return;

    const { error } = await supabase.from('payments').insert([
      {
        booking_id: currentBooking.id,
        amount: parseFloat(paymentForm.amount),
        method: paymentForm.method,
      },
    ]);

    if (error) {
      alert('Error al registrar pago: ' + error.message);
    } else {
      setPaymentForm({ ...paymentForm, amount: '' }); // Limpiar input

      // 1. Actualizamos el tablero general (Dashboard)
      fetchOperationalData();

      // 👇 2. EL SECRETO: Recargamos la reserva abierta para que el modal se actualice
      const { data: freshBooking } = await supabase
        .from('bookings')
        .select('*, guests(*), payments(*), charges(*)')
        .eq('id', currentBooking.id)
        .single();

      if (freshBooking) {
        // Inyectamos la data fresca en el modal
        calendarData.setSelectedBooking(freshBooking);
      }

      alert('Pago registrado correctamente 💰');
    }
  };

  const handleAddCharge = async (e) => {
    e.preventDefault();
    const currentBooking = calendarData.selectedBooking;

    if (!currentBooking) {
      alert('Error: No hay una reserva seleccionada.');
      return;
    }

    const { error } = await supabase.from('charges').insert([
      {
        booking_id: currentBooking.id,
        item: chargeForm.concept,
        price: parseFloat(chargeForm.price),
      },
    ]);

    if (error) {
      alert('Error al cargar consumo: ' + error.message);
    } else {
      // Sonido de caja
      if (audio) audio.play().catch(() => {});

      setChargeForm({ concept: '', price: '' }); // Limpiar formulario

      // 1. Actualizamos el tablero general
      fetchOperationalData();

      // 👇 2. EL SECRETO: Recargamos la reserva abierta
      const { data: freshBooking } = await supabase
        .from('bookings')
        .select('*, guests(*), payments(*), charges(*)')
        .eq('id', currentBooking.id)
        .single();

      if (freshBooking) {
        calendarData.setSelectedBooking(freshBooking);
      }

      // (Quitamos el alert molesto para que sea más rápido vender)
    }
  };

  const handleCancelBooking = async () => {
    // 🛡️ CORRECCIÓN: Acceso seguro a través de calendarData
    const currentBooking = calendarData.selectedBooking;

    if (window.confirm('¿Seguro que deseas eliminar esta reserva?')) {
      const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('id', currentBooking.id);

      if (!error) {
        recordAuditLog('DELETE_BOOKING', {
          guest: currentBooking.guests?.full_name,
          amount: currentBooking.total_price,
        });
        calendarData.setSelectedBooking(null); // Limpia la selección en el hook
        fetchOperationalData();
      }
    }
  };
  // --- 🛎️ FUNCIÓN DE CHECK-IN (REGISTRO DE INGRESO) ---
  const handleCheckIn = async () => {
    // Protección: Solo si hay reserva seleccionada
    if (!calendarData.selectedBooking) return;

    if (window.confirm('¿El huésped está en recepción y va a ingresar?')) {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'checked_in' }) // 👈 Cambia el estado a "En Casa"
        .eq('id', calendarData.selectedBooking.id);

      if (error) {
        alert('Error al registrar ingreso: ' + error.message);
      } else {
        // Sonido de éxito
        new Audio('https://actions.google.com/sounds/v1/cartoon/pop.ogg')
          .play()
          .catch(() => {});

        alert('✅ Check-in Exitoso: La habitación ahora está OCUPADA');
        calendarData.setSelectedBooking(null); // Cierra el modal
        fetchOperationalData(); // Recarga el calendario para ver el cambio
      }
    }
  };

  const handleDeleteCharge = async (id) => {
    if (window.confirm('¿Deseas eliminar este cargo de la cuenta?')) {
      const { error } = await supabase.from('charges').delete().eq('id', id);

      if (!error) fetchOperationalData();
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const recordAuditLog = async (action, details) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      await supabase.from('audit_logs').insert([
        {
          hotel_id: hotelInfo.id,
          user_email: user?.email,
          action: action,
          details: details,
          ip_address: 'Capturada vía Edge Function',
        },
      ]);
    } catch (err) {
      console.error('Error en Log:', err);
    }
  };

  const handleIcalUpload = (e) => {
    const file = e.target.files[0];
    if (!file || !targetRoomId) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const jcalData = ICAL.parse(ev.target.result);
        const vcalendar = new ICAL.Component(jcalData);
        const vevents = vcalendar.getAllSubcomponents('vevent');
        let importedCount = 0;
        const newBookings = [];
        for (const vevent of vevents) {
          const event = new ICAL.Event(vevent);
          const startDate = event.startDate
            .toJSDate()
            .toISOString()
            .split('T')[0];
          let endDate = event.endDate.toJSDate().toISOString().split('T')[0];
          const exists = bookings.some(
            (b) =>
              b.room_id === targetRoomId &&
              (b.check_in === startDate || b.check_out === endDate),
          );
          if (!exists) {
            newBookings.push({
              hotel_id: hotelInfo.id,
              room_id: targetRoomId,
              check_in: startDate,
              check_out: endDate,
              status: 'maintenance',
              source: 'airbnb',
              total_price: 0,
              notes: `Importado: ${event.summary || 'Reserva Externa'}`,
            });
            importedCount++;
          }
        }
        if (newBookings.length > 0) {
          await supabase.from('bookings').insert(newBookings);
          alert(`✅ Se importaron ${importedCount} reservas de Airbnb.`);
          fetchOperationalData();
        } else {
          alert('📅 El calendario está actualizado.');
        }
      } catch (err) {
        alert('Error procesando el archivo ICS.');
      } finally {
        setTargetRoomId(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  // 🍔 LÓGICA DE RECUPERACIÓN DE PEDIDOS (RED DE ARRASTRE PARA EL MODAL)
  useEffect(() => {
    const fetchBookingOrders = async () => {
      const selected = calendarData.selectedBooking;
      if (!selected) {
        setCurrentBookingOrders([]);
        return;
      }

      // Estrategia: Buscar pedidos de la habitación desde el Check-in
      const { data: orders } = await supabase
        .from('service_orders')
        .select('*')
        .eq('room_id', selected.room_id)
        // Margen de tolerancia: 24h antes del check-in (por si pidieron esperando)
        .gte(
          'created_at',
          new Date(
            new Date(selected.check_in).getTime() - 86400000,
          ).toISOString(),
        )
        .order('created_at', { ascending: false });

      setCurrentBookingOrders(orders || []);
    };

    fetchBookingOrders();
  }, [calendarData.selectedBooking]);

  // --- LÓGICA DE VOZ (Faltaba esto) ---

  // ===========================================================================
  // 🧠 CEREBRO DE VOZ: INTEGRACIÓN SEGURA (RESERVAS + MARKETING)
  // ===========================================================================

  const executeAICommand = (aiResponse) => {
    console.log('🔥 EJECUTANDO COMANDO...', aiResponse);
    const { action, data } = aiResponse;

    // ---------------------------------------------------------
    // OPCIÓN A: CREAR RESERVA (Tu código original restaurado)
    // ---------------------------------------------------------
    if (action?.toUpperCase() === 'CREATE_BOOKING') {
      // 1. Cambiamos visualmente al calendario
      setActiveTab('calendar');

      // 2. Usamos el estado del HOOK (calendarData)
      setTimeout(() => {
        console.log('🔥 ABRIENDO MODAL AHORA (Usando calendarData)');

        // 3. Lógica para encontrar el ID de la habitación
        let foundRoomId = '';
        if (data.roomId) {
          const search = String(data.roomId).toLowerCase().replace(/\D/g, '');
          const room = rooms.find((r) => r.name.includes(search));
          if (room) foundRoomId = room.id;
        }

        // 4. Abrimos el modal
        calendarData.setShowBookingModal(true);

        // 5. Llenamos el formulario
        calendarData.setBookingForm((prev) => ({
          ...prev,
          type: 'booking',
          guestName: data.guestName || prev.guestName || '',
          guestDoc: data.guestDoc
            ? String(data.guestDoc).replace(/\D/g, '')
            : prev.guestDoc,
          guestPhone: data.guestPhone
            ? String(data.guestPhone).replace(/\D/g, '')
            : prev.guestPhone,
          roomId: foundRoomId || data.roomId || prev.roomId || '',
          checkIn: data.checkIn || prev.checkIn,
          checkOut: data.checkOut || prev.checkOut,
          adults:
            typeof data.adults === 'number' ? data.adults : prev.adults || 1,
          children:
            typeof data.children === 'number'
              ? data.children
              : prev.children || 0,
          price: data.price || prev.price || 0,
        }));
      }, 10);
    }
    // ---------------------------------------------------------
    // OPCIÓN B: CREAR LEAD / MARKETING (Lógica Blindada)
    // ---------------------------------------------------------
    if (action?.toUpperCase() === 'CREATE_LEAD') {
      setActiveTab('leads');

      setTimeout(async () => {
        console.log('📈 Procesando Lead de Voz...');

        // 1. EXTRAER DATOS CON PRIORIDAD
        // Buscamos el teléfono en todas partes posibles
        const finalPhone = data.phone || data.guestPhone || '';
        const finalName = data.name || data.guestName || 'Nuevo Interesado';
        const finalNotes = data.details || data.notes || '';

        try {
          // 2. GUARDAR EN BASE DE DATOS
          await marketingData.createHuntedLead({
            hotel_id: hotelInfo?.id,
            name: finalName,
            phone: finalPhone, // Usamos la variable unificada
            source: 'Voz (IA)',
            status: 'pending',
            notes: finalNotes,
          });

          setActiveTab('leads'); // Refuerzo visual

          // 3. GATILLO DE WHATSAPP (Solo si hay teléfono)
          if (finalPhone && finalPhone.length > 5) {
            // Generamos el script
            const smartMessage = marketingData.generateSmartScript({
              name: finalName,
              notes: finalNotes,
            });

            // Lanzamos la sugerencia
            setTimeout(() => {
              const confirmed = window.confirm(
                `✅ Lead Guardado: ${finalName}\n📞 Tel: ${finalPhone}\n\n🤖 La IA sugiere enviar este WhatsApp:\n"${smartMessage}"\n\n¿Enviar ahora?`,
              );

              if (confirmed) {
                marketingData.openWhatsApp(finalPhone, smartMessage);
              }
            }, 800);
          } else {
            // Feedback si faltó el número (para que sepas por qué no salió el WA)
            console.warn(
              'Lead guardado sin teléfono, omitiendo WhatsApp automático.',
            );
          }
        } catch (err) {
          console.error('Error:', err);
          alert('Error guardando el lead.');
        }
      }, 100);
    }
  };

  // PASO 2: EL OÍDO (MICRÓFONO CON ESTADO DE PROCESAMIENTO)
  const handleVoiceAction = () => {
    // Si está procesando, no hacemos nada (evita doble click)
    if (isProcessing) return;

    // 1. Apagar si ya escucha
    if (isListening) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    // 2. Encender
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return alert('Usa Chrome.');

    const recognition = new SpeechRecognition();
    recognition.lang = 'es-CO';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognitionRef.current = recognition;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = async (event) => {
      const transcript = event.results[0][0].transcript;
      console.log('🗣️:', transcript);

      // Apenas termina de escuchar:
      setIsListening(false);
      setIsProcessing(true); // 👈 ¡ACTIVAMOS MODO PENSANDO! (Spinner)

      try {
        const { data, error } = await supabase.functions.invoke(
          'process-voice-command',
          { body: { command: transcript, type: 'VOICE' } },
        );

        if (error) throw error;
        if (data) executeAICommand(data);
      } catch (err) {
        console.error(err);
        alert('Error IA');
      } finally {
        setIsProcessing(false); // 👈 ¡APAGAMOS MODO PENSANDO!
      }
    };

    recognition.onerror = (e) => {
      setIsListening(false);
      setIsProcessing(false);
      if (e.error !== 'no-speech') console.error(e.error);
    };

    recognition.start();
  };

  const handleScanResult = (scannedData) => {
    console.log('✅ Datos escaneados:', scannedData);

    // SOLUCIÓN: Sonido "Beep" incrustado (No requiere internet)
    // Este es un sonido corto tipo "Success" codificado en texto
    const beepUrl =
      'data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU';

    try {
      // Usamos una URL de Google muy estable como respaldo principal
      const audio = new Audio(
        'https://actions.google.com/sounds/v1/science_fiction/beep_short.ogg',
      );
      audio.volume = 0.5;

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          // Capturamos el error silenciosamente para que NO salga rojo en consola
          console.warn(
            'Audio silenciado por el navegador (normal sin interacción previa).',
          );
        });
      }
    } catch (e) {
      console.warn('Error de audio ignorado.');
    }

    // 1. Cerrar cámara
    setShowScanner(false);

    // 2. Orquestación
    setTimeout(() => {
      calendarData.setBookingForm((prev) => ({
        ...prev,
        guestDoc: scannedData.doc || '',
        guestName: scannedData.name || '',
      }));
      calendarData.setShowBookingModal(true);
    }, 300);
  };
  // --- 📊 LÓGICA FINANCIERA (Vision Glass Engine) ---
  const todayStr = new Date().toISOString().split('T')[0];

  const incomeToday = bookings.reduce((total, booking) => {
    // Filtramos solo los pagos hechos HOY
    const todaysPayments =
      booking.payments?.filter((p) => p.created_at?.startsWith(todayStr)) || [];
    // Sumamos esos pagos
    const sumPayments = todaysPayments.reduce(
      (acc, p) => acc + (Number(p.amount) || 0),
      0,
    );
    return total + sumPayments;
  }, 0);

  // Calculamos la ocupación actual
  const activeBookingsCount = bookings.filter(
    (b) => b.status === 'checked_in',
  ).length;
  const occupancyRate =
    rooms.length > 0
      ? Math.round((activeBookingsCount / rooms.length) * 100)
      : 0;

  const totalPending = bookings
    .filter((b) => ['confirmed', 'checked_in'].includes(b.status))
    .reduce((acc, b) => acc + calculateFinancials(b).pending, 0);
  // --- RENDER UI ---
  return (
    <div className='flex h-screen bg-[#F8FAFC] font-sans overflow-hidden text-slate-900 justify-center'>
      <GlobalStyles />

      {accessDenied && (
        <LockScreen
          hotelName={hotelInfo?.name || hotelInfo?.id}
          reason={denyReason}
        />
      )}

      {/* ❌ SIDEBAR ELIMINADO 
         Para que la experiencia sea igual en PC y Móvil.
      */}

      {/* CONTENIDO PRINCIPAL (Centrado y Adaptado) */}
      <main className='flex-1 flex flex-col h-screen overflow-hidden relative w-full max-w-7xl p-4 md:p-8'>
        {/* PANEL CENTRAL (Calendario, etc.) */}
        <div className='flex-1 bg-white/60 backdrop-blur-sm rounded-[2.5rem] border border-[#E5E0D8] shadow-xl overflow-hidden relative mb-24'>
          {/* CALENDARIO */}
          {activeTab === 'calendar' && (
            <CalendarPanel
              rooms={rooms}
              bookings={bookings}
              hotelInfo={hotelInfo}
              calendar={calendarData}
              onOpenScanner={() => setShowScanner(true)}
            />
          )}

          {/* INVENTARIO */}
          {activeTab === 'inventory' && (
            <InventoryPanel
              rooms={rooms}
              inventory={inventoryData}
              onOpenSync={(id) => {
                setTargetRoomId(id);
                fileInputRef.current.click();
              }}
              // 👇 CORRECCIÓN CRÍTICA: Cambiar 'hotel' por 'hotelInfo'
              hotelId={hotelInfo?.id}
            />
          )}

          {/* MARKETING */}
          {activeTab === 'leads' && (
            <MarketingPanel
              leads={leads}
              hotelInfo={hotelInfo}
              marketing={marketingData}
            />
          )}
          {activeTab === 'menu' && (
            <MenuManager
              hotelInfo={hotelInfo}
              // Aquí puedes pasar funciones para recargar datos si hiciste la conexión a Supabase
            />
          )}
          {/* HUÉSPEDES */}
          {activeTab === 'guests' && (
            <GuestsPanel
              guests={guests}
              bookings={bookings}
              hotelInfo={hotelInfo}
              onEditGuest={setEditingGuest} // 👈 Función para abrir modal de edición
              onDeleteGuest={handleDeleteGuest} // 👈 Función para eliminar
            />
          )}

          {/* 👇 2. INSERTAR AQUÍ EL BLOQUE DEL LIBRO DE REGISTRO 👇 */}
          {activeTab === 'forensic-book' && (
            <ForensicBookPanel hotelId={hotelInfo?.id} />
          )}
          {/* 👆 FIN DE LA INSERCIÓN 👆 */}

          {/* CONFIGURACIÓN + FINANZAS (MENÚ DE GESTIÓN UNIFICADO) */}
          {activeTab === 'settings' && (
            <div className='h-full overflow-y-auto custom-scrollbar p-6'>
              {/* 1. Título de Sección */}
              <div className='mb-8'>
                <h2 className='text-3xl font-serif font-bold text-slate-800'>
                  Panel de Gestión
                </h2>
                <p className='text-slate-400 text-sm'>
                  Finanzas y Configuración del Hotel
                </p>
              </div>

              {/* 2. Bento Grid Financiero (Estilo Mac 2026) */}
              <FinancialBento
                income={incomeToday}
                pending={totalPending}
                occupancy={occupancyRate}
              />

              {/* 3. Panel de Ajustes (Debajo de las finanzas) */}
              <SettingsPanel
                hotelInfo={hotelInfo}
                setHotelInfo={setHotelInfo}
              />
            </div>
          )}
        </div>

        {/* MODAL ROOM SERVICE */}
        <RoomServiceModal
          isOpen={showOrdersModal}
          onClose={() => setShowOrdersModal(false)}
          orders={pendingOrders}
          onDeliver={markOrderDelivered}
        />

        {/* ESCÁNER GLOBAL */}
        <ScannerModal
          isOpen={showScanner}
          onClose={() => setShowScanner(false)}
          onScan={handleScanResult}
        />

        {/* MODAL NUEVA RESERVA (Lo tenías en el código original, asegúrate de mantenerlo renderizado si no estaba en CalendarPanel) */}
        {/* Nota: Si tu CalendarPanel ya tiene el modal dentro, ignora esto. Si estaba suelto en DashboardPage, agrégalo aquí. */}

        {/* INPUT OCULTO PARA ICAL */}
        <input
          type='file'
          accept='.ics'
          ref={fileInputRef}
          className='hidden'
          onChange={handleIcalUpload}
        />

        {/* --- MODALES MOVIDOS AL PADRE (PARA QUE LA VOZ FUNCIONE) --- */}

        {/* 1. MODAL NUEVA RESERVA (EXTRAÍDO) */}
        {calendarData.showBookingModal && (
          <BookingWizardModal
            calendarData={calendarData}
            onClose={() => calendarData.setShowBookingModal(false)}
            onOpenScanner={() => setShowScanner(true)}
          />
        )}

        {/* 2. MODAL DETALLES (EXTRAÍDO) */}
        {calendarData.selectedBooking && (
          <BookingDetailModal
            booking={calendarData.selectedBooking}
            rooms={rooms}
            onClose={() => calendarData.setSelectedBooking(null)}
            onRefresh={fetchOperationalData} // Para actualizar el calendario general
            onUpdateBooking={calendarData.setSelectedBooking} // Para actualizar el modal abierto
            onCheckOut={calendarData.handleCheckOut}
            onWhatsApp={calendarData.handleSendWhatsApp}
          />
        )}

        {/* 📝 MODAL EDITAR HUÉSPED */}
        <AnimatePresence>
          {editingGuest && (
            <div className='fixed inset-0 bg-black/40 backdrop-blur-md z-[100] flex items-center justify-center p-4'>
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className='bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden'
              >
                <div className='p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50'>
                  <h3 className='font-serif text-xl font-bold text-slate-800'>
                    Editar Perfil
                  </h3>
                  <button
                    onClick={() => setEditingGuest(null)}
                    className='p-2 hover:bg-white rounded-full text-slate-400'
                  >
                    <X size={20} />
                  </button>
                </div>
                <form
                  onSubmit={handleUpdateGuest}
                  className='p-6 space-y-4'
                >
                  <input
                    className='w-full p-4 bg-slate-50 rounded-2xl border-none font-bold'
                    value={editingGuest.full_name}
                    onChange={(e) =>
                      setEditingGuest({
                        ...editingGuest,
                        full_name: e.target.value,
                      })
                    }
                    placeholder='Nombre Completo'
                  />
                  <input
                    className='w-full p-4 bg-slate-50 rounded-2xl border-none font-bold'
                    value={editingGuest.doc_number}
                    onChange={(e) =>
                      setEditingGuest({
                        ...editingGuest,
                        doc_number: e.target.value,
                      })
                    }
                    placeholder='Documento'
                  />
                  <input
                    className='w-full p-4 bg-slate-50 rounded-2xl border-none font-bold'
                    value={editingGuest.phone}
                    onChange={(e) =>
                      setEditingGuest({
                        ...editingGuest,
                        phone: e.target.value,
                      })
                    }
                    placeholder='Teléfono'
                  />
                  <button
                    type='submit'
                    className='w-full bg-slate-900 text-white font-bold py-4 rounded-2xl shadow-lg'
                  >
                    Guardar Cambios
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>

      {/* --- NAVEGACIÓN UNIFICADA (PC Y MÓVIL) --- */}
      {/* Ahora este Dock aparecerá siempre, flotando abajo */}
      <MobileNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        voiceAction={handleVoiceAction}
        isListening={isListening}
        isProcessing={isProcessing}
        onOpenScanner={() => setShowScanner(true)}
        onOpenRoomService={() => setShowOrdersModal(true)}
      />
    </div>
  );
}; // 👈 ¡ESTA LLAVE ES CRÍTICA! CIERRA EL COMPONENTE DashboardPage

// --- COMPONENTES AUXILIARES (Deben estar FUERA de DashboardPage) ---
// ✨ NUEVO COMPONENTE: TARJETAS FINANCIERAS MAC 2026
const FinancialBento = ({ income, pending, occupancy }) => (
  <div className='grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 animate-in fade-in zoom-in duration-500'>
    {/* 1. CAJA (WIDGET PRINCIPAL) */}
    <div className='relative overflow-hidden bg-white/80 backdrop-blur-2xl border border-white/60 p-6 rounded-[2rem] shadow-xl shadow-slate-200/50 group hover:scale-[1.02] transition-all duration-300'>
      <div className='absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity'>
        <Banknote
          size={80}
          className='text-emerald-900'
        />
      </div>
      <div className='relative z-10'>
        <p className='text-xs font-bold text-slate-400 uppercase tracking-widest mb-1'>
          Ingresos Hoy
        </p>
        <h3 className='text-4xl font-serif font-black text-slate-800 tracking-tight'>
          ${(income / 1000).toFixed(0)}k
        </h3>
        <div className='mt-4 flex items-center gap-2'>
          <span className='bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1'>
            <TrendingUp size={10} /> +12%
          </span>
          <span className='text-[10px] text-slate-400'>vs ayer</span>
        </div>
      </div>
    </div>

    {/* 2. POR COBRAR (DEUDA) */}
    <div className='relative overflow-hidden bg-white/60 backdrop-blur-xl border border-white/50 p-6 rounded-[2rem] shadow-lg shadow-slate-100/50 group hover:scale-[1.02] transition-all duration-300'>
      <div className='absolute -bottom-4 -right-4 w-24 h-24 bg-orange-500/10 rounded-full blur-2xl'></div>
      <p className='text-xs font-bold text-slate-400 uppercase tracking-widest mb-1'>
        Por Cobrar
      </p>
      <h3 className='text-3xl font-serif font-bold text-slate-700'>
        ${(pending / 1000).toFixed(0)}k
      </h3>
      <div className='mt-4 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden'>
        <div className='h-full bg-orange-400 w-[60%] rounded-full'></div>
      </div>
      <p className='text-[10px] text-slate-400 mt-2 text-right'>
        60% Recuperado
      </p>
    </div>

    {/* 3. OCUPACIÓN (MINIMALISTA) */}
    <div className='relative bg-slate-900 text-white p-6 rounded-[2rem] shadow-2xl shadow-slate-900/20 flex flex-col justify-between group hover:scale-[1.02] transition-all duration-300'>
      <div className='flex justify-between items-start'>
        <p className='text-xs font-bold text-slate-400 uppercase tracking-widest'>
          Ocupación
        </p>
        <Activity
          size={16}
          className='text-blue-400'
        />
      </div>
      <div className='flex items-end gap-2'>
        <h3 className='text-5xl font-sans font-light tracking-tighter'>
          {occupancy}%
        </h3>
      </div>
      <p className='text-[10px] text-slate-500 font-medium'>
        Capacidad actual del hotel
      </p>
    </div>
  </div>
);

export default DashboardPage;
