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

import MobileNav from '../components/layout/MobileNav';

import RoomServiceModal from '../components/modals/RoomServiceModal';
import ScannerModal from '../components/modals/ScannerModal';

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
    new Audio('https://www.soundjay.com/buttons/sounds/button-3.mp3')
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
        '¿Seguro que deseas eliminar este huésped? Sus reservas históricas se mantendrán, pero su perfil se borrará.'
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

        // 🛡️ [INICIO BLOQUE DEFENSIVO] 🛡️
        // LÓGICA DE ONBOARDING: Si no existe hotel, hay que crearlo o redirigir
        if (!hotel) {
          console.warn(
            '⚠️ Usuario nuevo detectado. Redirigiendo a Onboarding...'
          );

          // Detenemos carga para evitar crashes por acceder a hotel.id después
          setLoading(false);

          // Opción A: Redirigir a una página de creación (si existiera)
          // navigate('/create-hotel');

          // Opción B (Actual): Mostrar alerta y NO continuar con fetchOrders
          return alert(
            '🛑 ATENCIÓN: Tu usuario ha sido creado, pero aún no tiene un Hotel asignado.\n\nPor favor contacta a soporte para activar tu instancia o espera la aprobación del SuperAdmin.'
          );
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
        }
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
            (a, b) => new Date(b.created_at) - new Date(a.created_at)
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

  const calculateFinancials = (b) => {
    // Si no hay reserva, valores en cero
    if (!b) return { total: 0, paid: 0, pending: 0 };

    // 1. Precio base de la habitación
    const basePrice = Number(b.total_price) || 0;

    // 2. 🍔 Sumar consumos extras (Hamburguesas, cervezas, etc.)
    const extraCharges =
      b.charges?.reduce((sum, c) => sum + (Number(c.price) || 0), 0) || 0;

    // 3. 💰 Sumar abonos/pagos realizados
    // Usamos Number() para asegurar que la suma de abonos sea reactiva
    const totalPaid =
      b.payments?.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) || 0;

    // 4. Gran Total = Habitación + Extras
    const grandTotal = basePrice + extraCharges;

    return {
      total: grandTotal,
      paid: totalPaid, // Este valor actualizará el recuadro verde
      pending: grandTotal - totalPaid, // Este valor actualizará el recuadro naranja
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
        '⚠️ Por favor selecciona una habitación y las fechas de entrada/salida.'
      );
      return;
    }

    // B. VERIFICACIÓN DE OVERBOOKING (La protección crítica)
    const isAvailable = await checkAvailability(
      bookingForm.roomId,
      bookingForm.checkIn,
      bookingForm.checkOut
    );

    if (!isAvailable) {
      alert(
        '⛔ ¡ALERTA DE OVERBOOKING!\n\nLa habitación ya está ocupada en estas fechas. Por favor selecciona otra habitación o cambia las fechas.'
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
        'https://assets.mixkit.co/sfx/preview/mixkit-software-interface-start-2574.mp3'
      )
        .play()
        .catch(() => {});

      fetchOperationalData(); // Recarga el calendario
      setShowBookingModal(false); // Cierra el modal
      alert(
        bookingForm.type === 'booking'
          ? '✅ Reserva creada con éxito'
          : '🛠️ Mantenimiento agendado'
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
              (b.check_in === startDate || b.check_out === endDate)
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
                `✅ Lead Guardado: ${finalName}\n📞 Tel: ${finalPhone}\n\n🤖 La IA sugiere enviar este WhatsApp:\n"${smartMessage}"\n\n¿Enviar ahora?`
              );

              if (confirmed) {
                marketingData.openWhatsApp(finalPhone, smartMessage);
              }
            }, 800);
          } else {
            // Feedback si faltó el número (para que sepas por qué no salió el WA)
            console.warn(
              'Lead guardado sin teléfono, omitiendo WhatsApp automático.'
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
          { body: { command: transcript, type: 'VOICE' } }
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
        'https://actions.google.com/sounds/v1/science_fiction/beep_short.ogg'
      );
      audio.volume = 0.5;

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          // Capturamos el error silenciosamente para que NO salga rojo en consola
          console.warn(
            'Audio silenciado por el navegador (normal sin interacción previa).'
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
      0
    );
    return total + sumPayments;
  }, 0);

  // Calculamos la ocupación actual
  const activeBookingsCount = bookings.filter(
    (b) => b.status === 'checked_in'
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
        {/* ENCABEZADO */}
        <header className='flex-none px-8 py-5 flex justify-between items-center bg-white/80 backdrop-blur-md rounded-[2rem] shadow-sm mb-6 border border-white'>
          <h1 className='text-3xl font-serif font-bold text-[#2C2C2C] italic capitalize'>
            {activeTab === 'calendar'
              ? 'Agenda'
              : activeTab === 'inventory'
              ? 'Inventario'
              : activeTab === 'guests'
              ? 'Huéspedes'
              : activeTab === 'leads'
              ? 'Marketing'
              : activeTab === 'menu' // 👈 AGREGAR ESTO
              ? 'Carta Digital' // 👈 Título elegante
              : 'Configuración'}
          </h1>

          <div className='flex items-center gap-6'>
            {/* Botón de Notificaciones */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowOrdersModal(true)}
              className='relative p-3 bg-white rounded-full shadow-sm hover:shadow-md transition-all text-[#8C3A3A]'
            >
              <Bell size={22} />
              {pendingOrders.length > 0 && (
                <span className='absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full animate-ping' />
              )}
            </motion.button>

            {/* Fecha (Visible en PC) */}
            <div className='hidden md:block text-right'>
              <p className='text-xs font-bold text-[#8C3A3A] uppercase tracking-wider'>
                {new Date().toLocaleDateString('es-CO', { weekday: 'long' })}
              </p>
              <p className='text-sm font-serif font-bold'>
                {new Date().toLocaleDateString('es-CO', {
                  day: 'numeric',
                  month: 'long',
                })}
              </p>
            </div>
          </div>
        </header>

        {/* --- OPCIÓN B: BARRA COMPACTA (DYNAMIC ISLAND) --- */}
        <div className='mb-6 mx-1'>
          <div className='bg-slate-900/90 backdrop-blur-xl text-white rounded-[20px] p-4 flex items-center justify-between shadow-xl border border-white/10'>
            {/* Bloque 1: Ingresos */}
            <div className='flex flex-col'>
              <span className='text-[9px] font-bold uppercase text-emerald-400 tracking-wider mb-0.5'>
                Caja
              </span>
              <span className='text-lg font-serif font-bold'>
                ${(incomeToday / 1000).toFixed(0)}k
              </span>
            </div>

            {/* Separador */}
            <div className='w-px h-8 bg-white/10'></div>

            {/* Bloque 2: Pendiente */}
            <div className='flex flex-col items-center'>
              <span className='text-[9px] font-bold uppercase text-orange-400 tracking-wider mb-0.5'>
                Deuda
              </span>
              <span className='text-lg font-serif font-bold'>
                ${(totalPending / 1000).toFixed(0)}k
              </span>
            </div>

            {/* Separador */}
            <div className='w-px h-8 bg-white/10'></div>

            {/* Bloque 3: Ocupación */}
            <div className='flex items-center gap-3'>
              <div className='relative w-10 h-10'>
                <svg
                  className='w-full h-full -rotate-90'
                  viewBox='0 0 36 36'
                >
                  <path
                    className='text-slate-700'
                    d='M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='3'
                  />
                  <path
                    className='text-blue-500'
                    strokeDasharray={`${occupancyRate}, 100`}
                    d='M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='4'
                    strokeLinecap='round'
                  />
                </svg>
                <div className='absolute inset-0 flex items-center justify-center text-[10px] font-bold'>
                  {occupancyRate}%
                </div>
              </div>
            </div>
          </div>
          <p className='text-center text-[10px] text-slate-400 mt-2 opacity-60'>
            Resumen financiero del día (Cifras en miles 'k')
          </p>
        </div>

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

          {/* CONFIGURACIÓN */}
          {activeTab === 'settings' && (
            <SettingsPanel
              hotelInfo={hotelInfo}
              setHotelInfo={setHotelInfo}
            />
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

        {/* 1. MODAL NUEVA RESERVA */}
        {calendarData.showBookingModal &&
          createPortal(
            <div className='fixed inset-0 bg-black/60 backdrop-blur-md z-[9999] flex items-end md:items-center justify-center p-0 md:p-4'>
              <motion.div
                initial={{ y: '100%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '100%', opacity: 0 }}
                className='bg-[#F8FAFC] rounded-t-[2rem] md:rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden h-[85vh] md:h-auto md:max-h-[90vh] flex flex-col relative'
              >
                {/* Header */}
                <div className='p-6 border-b border-slate-200/60 flex justify-between items-center bg-white/80 backdrop-blur-xl sticky top-0 z-20'>
                  <h3 className='font-serif text-2xl font-bold text-slate-800'>
                    Nueva Estadía
                  </h3>
                  <button
                    onClick={() => calendarData.setShowBookingModal(false)}
                    className='p-2 bg-slate-100 rounded-full text-slate-400 hover:text-red-500 transition-colors'
                  >
                    <X size={24} />
                  </button>
                </div>

                {/* Formulario */}
                <div className='flex-1 overflow-y-auto custom-scrollbar p-6 pb-32'>
                  <form
                    onSubmit={calendarData.handleCreateBooking}
                    className='space-y-6'
                  >
                    {/* Tipo */}
                    <div className='bg-slate-200/50 p-1.5 rounded-2xl flex'>
                      <button
                        type='button'
                        onClick={() =>
                          calendarData.setBookingForm({
                            ...calendarData.bookingForm,
                            type: 'booking',
                          })
                        }
                        className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
                          calendarData.bookingForm.type === 'booking'
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-500'
                        }`}
                      >
                        Huésped
                      </button>
                      <button
                        type='button'
                        onClick={() =>
                          calendarData.setBookingForm({
                            ...calendarData.bookingForm,
                            type: 'maintenance',
                          })
                        }
                        className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
                          calendarData.bookingForm.type === 'maintenance'
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-500'
                        }`}
                      >
                        Mantenimiento
                      </button>
                    </div>

                    {/* Fechas */}
                    <div className='grid grid-cols-2 gap-4'>
                      <div className='space-y-1'>
                        <label className='text-[10px] font-bold uppercase text-slate-400'>
                          Entrada
                        </label>
                        <input
                          type='date'
                          className='w-full p-4 bg-white rounded-2xl border border-slate-100 font-bold'
                          value={calendarData.bookingForm.checkIn}
                          onChange={(e) =>
                            calendarData.setBookingForm({
                              ...calendarData.bookingForm,
                              checkIn: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className='space-y-1'>
                        <label className='text-[10px] font-bold uppercase text-slate-400'>
                          Salida
                        </label>
                        <input
                          type='date'
                          className='w-full p-4 bg-white rounded-2xl border border-slate-100 font-bold'
                          value={calendarData.bookingForm.checkOut}
                          onChange={(e) =>
                            calendarData.setBookingForm({
                              ...calendarData.bookingForm,
                              checkOut: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>

                    {/* Contadores */}
                    <div className='grid grid-cols-2 gap-4'>
                      {['adults', 'children'].map((type) => (
                        <div
                          key={type}
                          className='space-y-1'
                        >
                          <label className='text-[10px] font-bold uppercase text-slate-400'>
                            {type === 'adults' ? 'Adultos' : 'Niños'}
                          </label>
                          <div className='flex items-center bg-white border border-slate-100 rounded-2xl p-1'>
                            <button
                              type='button'
                              onClick={() =>
                                calendarData.setBookingForm((p) => ({
                                  ...p,
                                  [type]: Math.max(0, p[type] - 1),
                                }))
                              }
                              className='w-10 h-10 hover:bg-slate-50 rounded-xl font-bold text-slate-500'
                            >
                              -
                            </button>
                            <input
                              className='flex-1 text-center font-bold border-none bg-transparent outline-none'
                              value={calendarData.bookingForm[type]}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                calendarData.setBookingForm((p) => ({
                                  ...p,
                                  [type]: val,
                                }));
                              }}
                              type='number'
                            />
                            <button
                              type='button'
                              onClick={() =>
                                calendarData.setBookingForm((p) => ({
                                  ...p,
                                  [type]: p[type] + 1,
                                }))
                              }
                              className='w-10 h-10 hover:bg-slate-50 rounded-xl font-bold text-slate-500'
                            >
                              +
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Habitación */}
                    <div className='space-y-1'>
                      <label className='text-[10px] font-bold uppercase text-slate-400'>
                        Habitación
                      </label>
                      <select
                        className='w-full p-4 bg-white rounded-2xl border border-slate-100 font-bold appearance-none'
                        value={calendarData.bookingForm.roomId}
                        onChange={(e) =>
                          calendarData.setBookingForm({
                            ...calendarData.bookingForm,
                            roomId: e.target.value,
                          })
                        }
                      >
                        <option value=''>Seleccionar...</option>
                        {calendarData.availableRoomsList.map((r) => (
                          <option
                            key={r.id}
                            value={r.id}
                          >
                            {r.name} - ${parseInt(r.price).toLocaleString()}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Huésped Info */}
                    {calendarData.bookingForm.type === 'booking' && (
                      <div className='space-y-4 pt-2'>
                        {/* Campo: Nombre */}
                        <div className='space-y-1'>
                          <label className='text-[10px] font-bold uppercase text-slate-400'>
                            Nombre
                          </label>
                          <input
                            className='w-full p-4 bg-white rounded-2xl border border-slate-100 font-bold'
                            placeholder='Ej: Juan'
                            value={calendarData.bookingForm.guestName}
                            onChange={(e) =>
                              calendarData.setBookingForm({
                                ...calendarData.bookingForm,
                                guestName: e.target.value,
                              })
                            }
                          />
                        </div>

                        {/* 👇 NUEVO CAMPO: Teléfono / WhatsApp 👇 */}
                        <div className='space-y-1'>
                          <label className='text-[10px] font-bold uppercase text-slate-400'>
                            Teléfono / WhatsApp
                          </label>
                          <input
                            type='tel'
                            className='w-full p-4 bg-white rounded-2xl border border-slate-100 font-bold'
                            placeholder='300 123 4567'
                            value={calendarData.bookingForm.guestPhone}
                            onChange={(e) =>
                              calendarData.setBookingForm({
                                ...calendarData.bookingForm,
                                guestPhone: e.target.value,
                              })
                            }
                          />
                        </div>

                        {/* Fila: Documento y Total */}
                        <div className='grid grid-cols-2 gap-4'>
                          <div className='space-y-1'>
                            <label className='text-[10px] font-bold uppercase text-slate-400'>
                              Doc
                            </label>
                            <div className='flex gap-2'>
                              <input
                                className='w-full p-4 bg-white rounded-2xl border border-slate-100 font-bold'
                                value={calendarData.bookingForm.guestDoc}
                                onChange={(e) =>
                                  calendarData.setBookingForm({
                                    ...calendarData.bookingForm,
                                    guestDoc: e.target.value,
                                  })
                                }
                              />
                              <button
                                type='button'
                                onClick={() => setShowScanner(true)}
                                className='bg-blue-500 text-white p-3.5 rounded-2xl'
                              >
                                <ScanBarcode size={20} />
                              </button>
                            </div>
                          </div>
                          <div className='space-y-1'>
                            <label className='text-[10px] font-bold uppercase text-slate-400'>
                              Total
                            </label>
                            <input
                              type='number'
                              className='w-full p-4 bg-white rounded-2xl border border-slate-100 font-bold'
                              value={calendarData.bookingForm.price}
                              onChange={(e) =>
                                calendarData.setBookingForm({
                                  ...calendarData.bookingForm,
                                  price: e.target.value,
                                })
                              }
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </form>
                </div>

                {/* Botón Final */}
                <div className='p-4 border-t border-slate-100 bg-white sticky bottom-0 z-30'>
                  <button
                    onClick={calendarData.handleCreateBooking}
                    className='w-full bg-slate-900 text-white font-bold py-4 rounded-2xl shadow-xl flex justify-center items-center gap-2'
                  >
                    {calendarData.bookingForm.type === 'booking' ? (
                      <CheckCircle2 size={20} />
                    ) : (
                      <Hammer size={20} />
                    )}
                    {calendarData.bookingForm.type === 'booking'
                      ? 'Crear Reserva'
                      : 'Bloquear'}
                  </button>
                </div>
              </motion.div>
            </div>,
            document.body
          )}

        {/* 2. MODAL DETALLES ACTUALIZADO: Gestión, Consumos y Pagos */}
        {calendarData.selectedBooking &&
          createPortal(
            <div className='fixed inset-0 bg-black/60 backdrop-blur-md z-[9999] flex items-end md:items-center justify-center p-0 md:p-4'>
              <motion.div
                initial={{ y: '100%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '100%', opacity: 0 }}
                className='bg-[#F8FAFC] rounded-t-[2rem] md:rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden h-[85vh] md:h-auto md:max-h-[90vh] flex flex-col relative'
              >
                {/* Header Dinámico con ID de Reserva */}
                <div className='p-6 border-b border-slate-200/60 flex justify-between items-center bg-white/80 backdrop-blur-xl'>
                  <div>
                    <h3 className='font-serif text-2xl font-bold text-slate-800'>
                      Estadía Activa
                    </h3>
                    <p className='text-[10px] font-bold text-slate-400 uppercase tracking-widest'>
                      Reserva #{calendarData.selectedBooking.id.slice(0, 8)}{' '}
                      [cite: 31, 32]
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      calendarData.setSelectedBooking(null);
                      setActiveDetailTab('info');
                    }}
                    className='p-2 bg-slate-100 rounded-full text-slate-400 hover:text-red-500 transition-colors'
                  >
                    <X size={24} />
                  </button>
                </div>

                {/* Tabs de Navegación Interna */}
                <div className='flex border-b border-slate-100 bg-white'>
                  {[
                    { id: 'info', label: 'Gestión', icon: <Edit size={14} /> },
                    {
                      id: 'billing',
                      label: 'Consumos',
                      icon: <CreditCard size={14} />,
                    },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveDetailTab(tab.id)}
                      className={`flex-1 py-3 text-xs font-bold uppercase tracking-tighter flex items-center justify-center gap-2 transition-all ${
                        activeDetailTab === tab.id
                          ? 'text-slate-900 border-b-2 border-slate-900'
                          : 'text-slate-400'
                      }`}
                    >
                      {tab.icon} {tab.label}
                    </button>
                  ))}
                </div>

                {/* Contenido según Tab Seleccionada */}
                <div className='flex-1 overflow-y-auto p-6 space-y-6 pb-24'>
                  {activeDetailTab === 'info' && (
                    <div className='space-y-6'>
                      {/* Info del Huésped (Cruce de Datos) */}
                      <div className='bg-white p-4 rounded-2xl border border-slate-100 shadow-sm'>
                        <label className='text-[10px] font-bold text-slate-400 uppercase block mb-1'>
                          Huésped [cite: 32]
                        </label>
                        <div className='flex items-center gap-3'>
                          <div className='w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-white font-bold'>
                            {calendarData.selectedBooking.guests
                              ?.full_name?.[0] || 'H'}
                          </div>
                          <div>
                            <p className='font-bold text-slate-800 leading-tight'>
                              {calendarData.selectedBooking.guests?.full_name ||
                                'Huésped Anónimo'}
                            </p>
                            <p className='text-xs text-slate-500'>
                              {calendarData.selectedBooking.guests
                                ?.doc_number || 'Sin documento'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Mover Habitación */}
                      <div className='space-y-1'>
                        <label className='text-[10px] font-bold text-slate-400 uppercase ml-2'>
                          Habitación
                        </label>
                        <select
                          className='w-full p-4 bg-white rounded-2xl border border-slate-100 font-bold text-slate-800'
                          value={calendarData.selectedBooking.room_id}
                          onChange={async (e) => {
                            const { error } = await supabase
                              .from('bookings')
                              .update({ room_id: e.target.value })
                              .eq('id', calendarData.selectedBooking.id);
                            if (!error) fetchOperationalData();
                          }}
                        >
                          {rooms.map((r) => (
                            <option
                              key={r.id}
                              value={r.id}
                            >
                              {r.name} - ${parseInt(r.price).toLocaleString()}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Fechas */}
                      <div className='grid grid-cols-2 gap-4'>
                        <input
                          type='date'
                          className='p-4 bg-white rounded-2xl border border-slate-100 font-bold text-xs'
                          value={calendarData.selectedBooking.check_in}
                          onChange={async (e) => {
                            await supabase
                              .from('bookings')
                              .update({ check_in: e.target.value })
                              .eq('id', calendarData.selectedBooking.id);
                            fetchOperationalData();
                          }}
                        />
                        <input
                          type='date'
                          className='p-4 bg-white rounded-2xl border border-slate-100 font-bold text-xs'
                          value={calendarData.selectedBooking.check_out}
                          onChange={async (e) => {
                            await supabase
                              .from('bookings')
                              .update({ check_out: e.target.value })
                              .eq('id', calendarData.selectedBooking.id);
                            fetchOperationalData();
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {activeDetailTab === 'billing' && (
                    <div className='space-y-6'>
                      {/* Estado Financiero Rápido */}
                      <div className='grid grid-cols-2 gap-3'>
                        <div className='bg-emerald-50 p-4 rounded-2xl border border-emerald-100'>
                          <span className='text-[9px] font-bold text-emerald-600 uppercase'>
                            Pagado
                          </span>
                          <p className='text-lg font-bold text-emerald-700'>
                            $
                            {calculateFinancials(
                              calendarData.selectedBooking
                            ).paid.toLocaleString()}{' '}
                          </p>
                        </div>
                        <div className='bg-orange-50 p-4 rounded-2xl border border-orange-100'>
                          <span className='text-[9px] font-bold text-orange-600 uppercase'>
                            Pendiente
                          </span>
                          <p className='text-lg font-bold text-orange-700'>
                            $
                            {calculateFinancials(
                              calendarData.selectedBooking
                            ).pending.toLocaleString()}{' '}
                          </p>
                        </div>
                      </div>

                      {/* Formulario de Cargos Extra  */}
                      <form
                        onSubmit={handleAddCharge}
                        className='bg-white p-4 rounded-2xl border border-slate-100 space-y-3'
                      >
                        <p className='text-[10px] font-bold text-slate-400 uppercase'>
                          Añadir Consumo
                        </p>
                        <div className='flex gap-2'>
                          <input
                            placeholder='Item (Cerveza, etc.)'
                            className='flex-1 p-3 text-sm rounded-xl'
                            value={chargeForm.concept}
                            onChange={(e) =>
                              setChargeForm({
                                ...chargeForm,
                                concept: e.target.value,
                              })
                            }
                          />
                          <input
                            type='number'
                            placeholder='$'
                            className='w-24 p-3 text-sm rounded-xl font-bold'
                            value={chargeForm.price}
                            onChange={(e) =>
                              setChargeForm({
                                ...chargeForm,
                                price: e.target.value,
                              })
                            }
                          />
                          <button
                            type='submit'
                            className='bg-slate-900 text-white p-3 rounded-xl'
                          >
                            <Plus size={18} />
                          </button>
                        </div>
                      </form>

                      {/* --- OPCIÓN 1: VISION PAY UI --- */}
                      <form
                        onSubmit={handleRegisterPayment}
                        className='relative overflow-hidden rounded-2xl p-5 border border-white/50 shadow-lg group'
                      >
                        {/* Fondo Glass Activo */}
                        <div className='absolute inset-0 bg-white/40 backdrop-blur-xl z-0'></div>
                        <div className='absolute -top-10 -right-10 w-32 h-32 bg-emerald-400/20 rounded-full blur-3xl group-hover:bg-emerald-400/30 transition-all'></div>

                        <div className='relative z-10 space-y-4'>
                          <div className='flex justify-between items-center'>
                            <p className='text-[10px] font-bold text-slate-500 uppercase tracking-widest'>
                              Terminal de Pago
                            </p>
                            {/* Selector de Método (Iconos) */}
                            <div className='flex bg-white/50 rounded-lg p-1 gap-1'>
                              {['Efectivo', 'Tarjeta', 'Transferencia'].map(
                                (m) => (
                                  <button
                                    key={m}
                                    type='button'
                                    onClick={() =>
                                      setPaymentForm({
                                        ...paymentForm,
                                        method: m,
                                      })
                                    }
                                    title={m}
                                    className={`p-1.5 rounded-md transition-all ${
                                      paymentForm.method === m
                                        ? 'bg-white text-emerald-600 shadow-sm scale-110'
                                        : 'text-slate-400 hover:text-slate-600'
                                    }`}
                                  >
                                    {m === 'Efectivo' && <Banknote size={14} />}
                                    {m === 'Tarjeta' && (
                                      <CreditCard size={14} />
                                    )}
                                    {m === 'Transferencia' && (
                                      <ScanBarcode size={14} />
                                    )}
                                  </button>
                                )
                              )}
                            </div>
                          </div>

                          <div className='flex gap-3'>
                            <div className='relative flex-1 group/input'>
                              <span className='absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-serif italic text-lg'>
                                $
                              </span>
                              <input
                                type='number'
                                placeholder='0.00'
                                className='w-full pl-8 pr-4 py-3 bg-white/60 border-none rounded-xl text-xl font-bold text-slate-800 placeholder:text-slate-300 focus:ring-2 focus:ring-emerald-400/50 transition-all'
                                value={paymentForm.amount}
                                onChange={(e) =>
                                  setPaymentForm({
                                    ...paymentForm,
                                    amount: e.target.value,
                                  })
                                }
                              />
                            </div>
                            <button
                              type='submit'
                              className='bg-gradient-to-br from-emerald-500 to-teal-600 text-white px-5 rounded-xl font-bold text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:scale-105 active:scale-95 transition-all flex flex-col justify-center items-center gap-1'
                            >
                              <span className='text-[10px] opacity-80'>
                                Cobrar
                              </span>
                              <span>Ahora</span>
                            </button>
                          </div>

                          <div className='text-center'>
                            <p className='text-[9px] text-slate-400 font-medium'>
                              Método seleccionado:{' '}
                              <span className='text-emerald-600 font-bold'>
                                {paymentForm.method}
                              </span>
                            </p>
                          </div>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* Acciones Globales ACTUALIZADAS */}
                  <div className='grid grid-cols-3 gap-2 pt-4 border-t border-slate-100'>
                    {/* 1. Botón WhatsApp */}
                    <button
                      onClick={calendarData.handleSendWhatsApp}
                      className='flex flex-col items-center justify-center p-3 bg-white border border-slate-100 rounded-2xl gap-1 hover:bg-slate-50 transition-all'
                    >
                      <MessageCircle
                        className='text-emerald-500'
                        size={18}
                      />
                      <span className='text-[8px] font-bold uppercase text-slate-500'>
                        WhatsApp
                      </span>
                    </button>

                    {/* 2. 👇 NUEVO BOTÓN: CHECK-IN (Inteligente) */}
                    {calendarData.selectedBooking.status === 'confirmed' ? (
                      <button
                        onClick={handleCheckIn}
                        className='flex flex-col items-center justify-center p-3 bg-blue-50 border border-blue-100 rounded-2xl gap-1 hover:bg-blue-100 transition-all'
                      >
                        <CheckCircle2
                          className='text-blue-600'
                          size={18}
                        />
                        <span className='text-[8px] font-bold uppercase text-blue-600'>
                          Check-in
                        </span>
                      </button>
                    ) : (
                      /* Si ya ingresó, mostramos que está "En Casa" */
                      <div className='flex flex-col items-center justify-center p-3 bg-emerald-50 border border-emerald-100 rounded-2xl gap-1 opacity-50 cursor-default'>
                        <User
                          className='text-emerald-600'
                          size={18}
                        />
                        <span className='text-[8px] font-bold uppercase text-emerald-600'>
                          En Casa
                        </span>
                      </div>
                    )}

                    {/* 3. Botón Salida (Reemplaza a Eliminar) */}
                    <button
                      onClick={() => {
                        // Usamos la nueva función si existe, si no, alerta
                        if (calendarData.handleCheckOut) {
                          calendarData.handleCheckOut();
                        } else {
                          alert(
                            '⚠️ Falta agregar handleCheckOut en useCalendar.js'
                          );
                        }
                      }}
                      className='flex flex-col items-center justify-center p-3 bg-red-50 border border-red-100 rounded-2xl gap-1 hover:bg-red-100 transition-all'
                    >
                      <Trash2
                        className='text-red-500'
                        size={18}
                      />
                      <span className='text-[8px] font-bold uppercase text-red-500'>
                        Salida
                      </span>
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>,
            document.body
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

export default DashboardPage;
