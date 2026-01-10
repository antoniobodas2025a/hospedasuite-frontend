import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { jsPDF } from 'jspdf';
import ICAL from 'ical.js';
import { motion, AnimatePresence } from 'framer-motion';
import CedulaOCR from '../components/CedulaOCR';
import VoiceAgent from '../components/VoiceAgent'; //
import {
  LayoutDashboard,
  Calendar as CalendarIcon,
  Users,
  LogOut,
  Hotel,
  Plus,
  BedDouble,
  Save,
  X,
  Trash2,
  User,
  Hammer,
  Download,
  DollarSign,
  ShoppingBag,
  FileText,
  Coffee,
  ShieldCheck,
  UploadCloud,
  RefreshCw,
  Settings,
  Image as ImageIcon,
  Percent,
  AlertTriangle,
  MessageCircle,
  Phone,
  Mail,
  QrCode,
  Edit,
  Check,
  Bell,
  Utensils,
  Printer,
  PenTool,
  Tv,
  Wind,
  Bath,
  Mountain,
  Car,
  Snowflake,
  Waves,
  Wine,
  Wifi,
  Star,
  Dumbbell,
  PawPrint,
  ScanBarcode,
  ChevronLeft, // 👈 AGREGAR
  ChevronRight, // 👈 AGREGAR
} from 'lucide-react';
// ... otros imports ...
import { useMarketing } from '../hooks/useMarketing'; // <--- AGREGAR ESTO
import MarketingPanel from '../components/dashboard/MarketingPanel'; // <--- AGREGAR ESTO
import { useInventory } from '../hooks/useInventory'; // <--- AGREGAR
import InventoryPanel from '../components/dashboard/InventoryPanel'; // <--- AGREGAR

const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,600;0,700;1,600&display=swap');
    
    :root {
      --font-sans: 'Inter', sans-serif;
      --font-serif: 'Playfair Display', serif;
      --color-cyan: #06b6d4;
      --deep-midnight: #010512;
    }

    body { 
      background-color: #F8FAFC; 
      color: #0f172a; 
      font-family: var(--font-sans);
    }
    
    .font-serif { fontFamily: var(--font-serif); }
    .font-sans { fontFamily: var(--font-sans); }
    
    /* Scrollbar Premium */
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }

    .glass-panel { 
      background: rgba(255, 255, 255, 0.95); 
      border: 1px solid #e2e8f0; 
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
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
  const [audio] = useState(
    new Audio(
      'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'
    )
  );

  // Estados UI y Formularios
  const [currentDate, setCurrentDate] = useState(new Date());
  const changeMonth = (offset) => {
    const newDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + offset,
      1
    );
    setCurrentDate(newDate);
  };

  // Función para ir rápido a hoy
  const goToToday = () => setCurrentDate(new Date());
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  const handleScanSuccess = (data) => {
    // Aquí ocurre la MAGIA: Llenamos el formulario con los datos de la cédula
    setBookingForm((prev) => ({
      ...prev,
      type: 'booking', // Aseguramos que sea tipo huésped
      guestDoc: data.docNumber,
      guestName: data.fullName,
      notes: `Tipo Sangre: ${data.bloodType}. (Escaneado Digitalmente)`,
      // Si el parser detecta más datos, los agregas aquí
    }));

    // Cerramos escáner y damos feedback
    setShowScanner(false);
    // Reproducir sonido de éxito (opcional)
    const successAudio = new Audio(
      'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3'
    );
    successAudio.play().catch((e) => {});
    alert(`✅ Cédula detectada: ${data.docNumber}`);
  };
  const [selectedBooking, setSelectedBooking] = useState(null);

  const [modalTab, setModalTab] = useState('info');
  const [isEditing, setIsEditing] = useState(false);

  const [editForm, setEditForm] = useState({});

  const [targetRoomId, setTargetRoomId] = useState(null);

  // 👇 ESTADO ORIGINAL RESTAURADO
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

  const [chargeForm, setChargeForm] = useState({ concept: '', price: '' });
  const [configForm, setConfigForm] = useState({
    name: '',
    color: '#8C3A3A',
    location: '',
    tax_rate: 0,
    phone: '',
  });

  // Estado para cambio de contraseña
  const [newPassword, setNewPassword] = useState('');

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      return alert('La contraseña debe tener al menos 6 caracteres.');
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      alert('Error: ' + error.message);
    } else {
      alert('✅ ¡Contraseña actualizada con éxito!');
      setNewPassword('');
    }
  };

  // Estado y Lógica para Editar Huésped
  const [editingGuest, setEditingGuest] = useState(null);

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
      alert('Error: ' + error.message);
    } else {
      alert('Huésped actualizado correctamente');
      setEditingGuest(null);
      fetchOperationalData();
    }
  };

  const springSoft = { type: 'spring', stiffness: 200, damping: 25 };

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
        setConfigForm({
          name: hotel.name || '',
          color: hotel.primary_color || '#8C3A3A',
          location: hotel.location || '',
          tax_rate: parseFloat(hotel.tax_rate) || 0,
          phone: hotel.phone || '',
        });

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

  // --- HELPERS & STYLES ---
  const brandColor = hotelInfo?.primary_color || '#0891b2'; // Cyan-600 elegante
  const brandStyle = { backgroundColor: brandColor };
  const textBrandStyle = { color: brandColor };

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

  const getBookingForDate = (rid, d) =>
    bookings.find(
      (b) =>
        b.room_id === rid &&
        new Date(d) >= new Date(b.check_in + 'T00:00') &&
        new Date(d) < new Date(b.check_out + 'T00:00')
    );

  const daysInMonth = Array.from(
    {
      length: new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1,
        0
      ).getDate(),
    },
    (_, i) => new Date(currentDate.getFullYear(), currentDate.getMonth(), i + 1)
  );

  const availableRoomsList = rooms.filter((room) => {
    const targetCheckIn = isEditing ? editForm.checkIn : bookingForm.checkIn;
    const targetCheckOut = isEditing ? editForm.checkOut : bookingForm.checkOut;
    if (!targetCheckIn || !targetCheckOut) return true;
    const start = new Date(targetCheckIn);
    const end = new Date(targetCheckOut);

    if (
      isEditing &&
      room.id === selectedBooking.room_id &&
      selectedBooking.room_id === parseInt(editForm.roomId)
    )
      return true;

    return !bookings.some((b) => {
      if (b.room_id !== room.id) return false;
      if (b.status === 'cancelled') return false;
      if (isEditing && b.id === selectedBooking.id) return false;
      return start < new Date(b.check_out) && end > new Date(b.check_in);
    });
  });

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

  const handleSendWhatsApp = async () => {
    if (!selectedBooking || !selectedBooking.guests) return;
    const guest = selectedBooking.guests;
    let phone = guest.phone ? guest.phone.replace(/\D/g, '') : '';
    if (phone && !phone.startsWith('57') && phone.length === 10)
      phone = '57' + phone;

    if (!phone)
      return alert('⚠️ El huésped no tiene un teléfono celular registrado.');

    const checkInLink = `${window.location.origin}/checkin?booking=${selectedBooking.id}`;
    const message = `Hola *${guest.full_name}*, tu reserva en *${hotelInfo?.name}* está confirmada. ✅\n\n📝 *Check-in Digital:* Para agilizar tu ingreso, firma aquí:\n${checkInLink}\n\n🍹 *Room Service:* ${menuLink}`;

    window.open(
      `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
      '_blank'
    );
  };

  const generateTRA = () => {
    const doc = new jsPDF();
    doc.text(`TRA No. ${selectedBooking.tra_number || 'PEND'}`, 20, 20);
    doc.text(`Huésped: ${selectedBooking.guests?.full_name}`, 20, 30);
    doc.save('TRA.pdf');
  };
  // --- GENERADOR SIRE BLINDADO (Auditoría 2026) ---
  const generateSIRE = () => {
    const reportDate = new Date().toISOString().split('T')[0];
    let content = '';
    let count = 0;

    // Tabla Oficial de Migración Colombia (Códigos ISO Numéricos)
    const sireCountryCodes = {
      COL: 169,
      USA: 245,
      ESP: 724,
      FRA: 250,
      DEU: 276,
      ARG: 32,
      BRA: 76,
      CHL: 152,
      ECU: 218,
      MEX: 484,
      PER: 604,
      VEN: 862,
      CAN: 124,
      GBR: 826,
      ITA: 380,
      PAN: 591,
      CRI: 188,
    };

    // Filtramos solo reservas confirmadas que tengan datos de huésped
    const activeBookings = bookings.filter(
      (b) => b.status === 'confirmed' && b.guests
    );

    if (activeBookings.length === 0) {
      return alert(
        '⚠️ No hay huéspedes activos con Check-In confirmado para reportar.'
      );
    }

    activeBookings.forEach((b) => {
      const g = b.guests;

      // 1. Detección de Documento
      let docType = 'PA'; // Pasaporte por defecto para extranjeros
      if (g.nationality === 'COL') {
        docType = g.doc_number.length > 10 ? 'TI' : 'CC';
      } else {
        // Extranjeros: Solo números y corto = CE, Alfanumérico = PA
        if (/^\d+$/.test(g.doc_number) && g.doc_number.length < 10) {
          docType = 'CE';
        } else {
          docType = 'PA';
        }
      }

      // 2. Conversión Legal de Nacionalidad
      // Si no encuentra el país, usa 999 (Otros) para evitar bloqueo
      const countryCode = sireCountryCodes[g.nationality] || 999;

      // 3. Limpieza de Texto (Eliminar caracteres que rompen el TXT)
      const safeName = g.full_name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Quita tildes
        .toUpperCase()
        .replace(/Ñ/g, 'N') // Quita Ñ
        .replace(/[^A-Z0-9 ]/g, ''); // Solo letras y números

      // Fechas seguras
      const checkInSafe = b.check_in || reportDate;
      const checkOutSafe = b.check_out || reportDate;
      const birthSafe = g.birth_date || '1990-01-01';

      // 4. Construcción de la Trama
      content += `${docType}|${
        g.doc_number
      }|${safeName}|${countryCode}|${birthSafe}|${
        g.gender || 'M'
      }|${checkInSafe}|${checkOutSafe}\n`;
      count++;
    });

    // Descarga
    const blob = new Blob([content], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `SIRE_${
      hotelInfo?.name.replace(/\s+/g, '_') || 'HOTEL'
    }_${reportDate}.txt`;
    link.click();

    alert(
      `✅ Archivo SIRE generado con ${count} registros (Códigos Numéricos Aplicados).`
    );
  };

  const handleUpdateConfig = async (e) => {
    e.preventDefault();
    await supabase
      .from('hotels')
      .update({ ...configForm })
      .eq('id', hotelInfo.id);
    setHotelInfo({ ...hotelInfo, ...configForm });
    alert('Guardado');
  };

  const handleCreateBooking = async (e) => {
    e.preventDefault();
    try {
      let gid = null;
      if (bookingForm.type === 'booking') {
        const { data: g } = await supabase
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
        gid = g.id;
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
      alert(e.message);
    }
  };

  const handleRegisterPayment = async (e) => {
    e.preventDefault();
    await supabase.from('payments').insert([
      {
        booking_id: selectedBooking.id,
        amount: parseFloat(paymentForm.amount),
        method: paymentForm.method,
      },
    ]);
    recordAuditLog('REGISTER_PAYMENT', {
      booking_id: selectedBooking.id,
      amount: paymentForm.amount,
    });
    fetchOperationalData();
    alert('Pago OK');
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
    alert('Cargo OK');
  };

  const handleCancelBooking = async () => {
    if (window.confirm('¿Eliminar?')) {
      await supabase.from('bookings').delete().eq('id', selectedBooking.id);
      recordAuditLog('DELETE_BOOKING', {
        guest: selectedBooking.guests?.full_name,
        amount: selectedBooking.total_price,
      });
      setSelectedBooking(null);
      fetchOperationalData();
    }
  };

  const handleDeleteCharge = async (id) => {
    if (window.confirm('¿Borrar?')) {
      await supabase.from('charges').delete().eq('id', id);
      fetchOperationalData();
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

  // 🧠 EJECUTOR DE COMANDOS DE VOZ (MEJORADO)
  const handleVoiceAction = async (aiResponse) => {
    const { action, data } = aiResponse;

    if (action === 'CREATE_BOOKING') {
      let targetRoomId = '';
      let finalPrice = '';

      if (data.roomId) {
        const voiceInput = String(data.roomId).toLowerCase().trim();
        const voiceNumbers = voiceInput.replace(/\D/g, '');

        // ... (Tu lógica de búsqueda de habitación existente va aquí) ...

        // Si tienes el console.log de auditoría, déjalo.
        let found = null;
        if (voiceNumbers.length > 0) {
          found = rooms.find((r) => r.name.replace(/\D/g, '') === voiceNumbers);
        }
        if (!found) {
          found = rooms.find((r) => r.name.toLowerCase().includes(voiceInput));
        }

        if (found) {
          targetRoomId = found.id;
          finalPrice = data.price || found.price;
        }
      }

      // 👇 AQUÍ VA LA LÓGICA DE LLENADO (NO ARRIBA)
      setBookingForm({
        type: 'booking',
        guestName: data.guestName || 'Huésped por Voz',
        guestDoc: data.guestDoc
          ? String(data.guestDoc).replace(/[^a-zA-Z0-9]/g, '')
          : 'PENDIENTE',
        guestPhone: data.guestPhone
          ? String(data.guestPhone).replace(/\D/g, '')
          : '',
        roomId: targetRoomId,
        checkIn: data.checkIn || new Date().toISOString().split('T')[0],
        checkOut:
          data.checkOut ||
          new Date(Date.now() + 86400000).toISOString().split('T')[0],
        price: finalPrice,
      });

      setShowBookingModal(true);

      // Alerta si falló la búsqueda

      if (!targetRoomId && data.roomId) {
        alert(
          `⚠️ El sistema escuchó "${data.roomId}" pero no logré asociarlo a ninguna habitación. Por favor selecciónala de la lista.`
        );
      }
    } else if (action === 'BLOCK_ROOM') {
      alert(`Bloqueando habitación por voz: ${data.reason}`);
    }
  };

  // --- RENDER UI ---
  return (
    <div className='flex h-screen bg-[#F8FAFC] font-sans overflow-hidden text-slate-900'>
      <GlobalStyles />
      {/* SIDEBAR */}

      <aside className='hidden md:flex w-72 bg-[#010512] text-slate-300 flex-col shadow-2xl z-20 rounded-r-[2rem] my-4 ml-4 h-[calc(100vh-2rem)] border-r border-slate-800'>
        <div className='p-8 border-b border-[#444] flex items-center gap-4'>
          <div className='w-10 h-10 rounded-full bg-cyan-600 text-white flex items-center justify-center font-serif font-bold text-lg shadow-lg shadow-cyan-500/30'>
            H
          </div>
          <div className='overflow-hidden'>
            <h2 className='font-serif font-bold text-lg truncate leading-tight'>
              {hotelInfo?.name || 'Hotel'}
            </h2>
            <p className='text-[10px] text-gray-400 uppercase tracking-widest'>
              Administración
            </p>
          </div>
        </div>
        <nav className='flex-1 p-6 space-y-3'>
          <NavButton
            icon={<CalendarIcon size={18} />}
            label='Agenda'
            active={activeTab === 'calendar'}
            onClick={() => setActiveTab('calendar')}
          />
          <NavButton
            icon={<LayoutDashboard size={18} />}
            label='Inventario'
            active={activeTab === 'inventory'}
            onClick={() => setActiveTab('inventory')}
          />
          <NavButton
            icon={<Users size={18} />}
            label='Huéspedes'
            active={activeTab === 'guests'}
            onClick={() => setActiveTab('guests')}
          />
          <NavButton
            icon={<ShoppingBag size={18} />}
            label='Marketing (Leads)'
            active={activeTab === 'leads'}
            onClick={() => setActiveTab('leads')}
          />
          <NavButton
            icon={<Settings size={18} />}
            label='Configuración'
            active={activeTab === 'settings'}
            onClick={() => setActiveTab('settings')}
          />
        </nav>
        <div className='p-6'>
          <button
            onClick={handleLogout}
            className='flex items-center gap-3 text-[#E5E0D8] hover:text-[#8C3A3A] transition-colors text-sm font-bold'
          >
            <LogOut size={18} /> Cerrar Sesión
          </button>
        </div>
      </aside>
      {/* MAIN */}
      <main className='flex-1 flex flex-col h-screen overflow-hidden relative w-full p-4 md:p-6'>
        <header className='flex-none px-8 py-5 flex justify-between items-center bg-white/80 backdrop-blur-md rounded-[1.5rem] shadow-sm mb-6 border border-white'>
          <h1 className='text-2xl font-serif font-bold text-[#2C2C2C] italic capitalize'>
            {activeTab === 'calendar'
              ? 'Agenda'
              : activeTab === 'inventory'
              ? 'Inventario'
              : activeTab === 'guests'
              ? 'Huéspedes'
              : activeTab === 'leads'
              ? 'Marketing'
              : 'Configuración'}
          </h1>
          <div className='flex items-center gap-6'>
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

        <div className='flex-1 bg-white/60 backdrop-blur-sm rounded-[2rem] border border-[#E5E0D8] shadow-sm overflow-hidden relative'>
          {/* CALENDARIO (ESTRUCTURA CORREGIDA) */}
          {activeTab === 'calendar' && (
            <div className='h-full overflow-auto custom-scrollbar relative pb-32'>
              {/* 👇 BARRA DE NAVEGACIÓN (NUEVA) 👇 */}
              <div className='flex items-center justify-between px-6 py-4 sticky left-0 mb-4 bg-white/50 backdrop-blur-sm border-b border-[#E5E0D8] z-30'>
                <div className='flex items-center gap-4'>
                  <h2 className='text-2xl font-serif font-bold text-[#2C2C2C] capitalize'>
                    {currentDate.toLocaleDateString('es-CO', {
                      month: 'long',
                      year: 'numeric',
                    })}
                  </h2>
                  <div className='flex gap-1'>
                    <button
                      onClick={() => changeMonth(-1)}
                      className='p-2 hover:bg-white rounded-full text-slate-600 transition-colors shadow-sm border border-transparent hover:border-slate-200'
                      title='Mes Anterior'
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <button
                      onClick={goToToday}
                      className='px-3 py-1 text-xs font-bold bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-500'
                    >
                      Hoy
                    </button>
                    <button
                      onClick={() => changeMonth(1)}
                      className='p-2 hover:bg-white rounded-full text-slate-600 transition-colors shadow-sm border border-transparent hover:border-slate-200'
                      title='Mes Siguiente'
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                </div>
              </div>

              <div className='min-w-max pb-20'>
                {/* Cabecera de Días (El código sigue igual aquí abajo...) */}
                <div className='flex sticky top-0 z-10 bg-[#F9F7F2]/95 backdrop-blur border-b border-[#E5E0D8]'>
                  <div className='w-40 p-4 font-serif font-bold text-[#2C2C2C] sticky left-0 bg-[#F9F7F2] z-20 border-r border-[#E5E0D8] shadow-sm'>
                    Habitación
                  </div>
                  {daysInMonth.map((d) => (
                    <div
                      key={d.toString()}
                      className={`w-14 p-2 text-center border-r border-[#E5E0D8] flex flex-col justify-center ${
                        d.getDate() === new Date().getDate()
                          ? 'bg-[#8C3A3A]/5'
                          : ''
                      }`}
                    >
                      <span className='text-[10px] text-[#5D5555] font-bold uppercase'>
                        {d
                          .toLocaleDateString('es', { weekday: 'short' })
                          .slice(0, 1)}
                      </span>
                      <span
                        className={`text-sm font-serif font-bold ${
                          d.getDate() === new Date().getDate()
                            ? 'text-[#8C3A3A]'
                            : ''
                        }`}
                      >
                        {d.getDate()}
                      </span>
                    </div>
                  ))}
                </div>

                {/* CUADRÍCULA DE RESERVAS */}
                <div className='divide-y divide-[#E5E0D8]'>
                  {rooms.map((room) => (
                    <div
                      key={room.id}
                      className='flex group hover:bg-[#F9F7F2] transition-colors'
                    >
                      {/* Columna Nombre Habitación */}
                      <div className='w-40 p-4 sticky left-0 bg-white group-hover:bg-[#F9F7F2] z-10 border-r border-[#E5E0D8] shadow-sm flex flex-col justify-center'>
                        <span className='font-serif font-bold text-[#2C2C2C] text-sm leading-tight'>
                          {room.name}
                        </span>
                        <span className='text-[10px] text-gray-400 mt-1 uppercase tracking-widest'>
                          ${parseInt(room.price).toLocaleString()}
                        </span>
                      </div>

                      {/* Celdas de la cuadrícula */}
                      {daysInMonth.map((d) => {
                        const booking = getBookingForDate(room.id, d);
                        const isStart =
                          booking &&
                          new Date(booking.check_in + 'T00:00').getTime() ===
                            d.getTime();

                        let cellContent = null;
                        let cellClass = '';

                        if (booking) {
                          if (isStart) {
                            const color =
                              booking.status === 'maintenance'
                                ? 'bg-gray-800'
                                : 'bg-[#8C3A3A]';
                            cellContent = (
                              <motion.div
                                layoutId={`booking-${booking.id}`}
                                onClick={() => {
                                  setSelectedBooking(booking);
                                  setIsEditing(false);
                                }}
                                className={`absolute top-1 left-1 right-1 bottom-1 ${color} rounded-lg shadow-md z-10 cursor-pointer flex items-center px-2 overflow-hidden hover:brightness-110`}
                              >
                                <span className='text-[10px] font-bold text-white truncate'>
                                  {booking.guests?.full_name || 'Bloqueo'}
                                </span>
                              </motion.div>
                            );
                          } else {
                            cellClass =
                              booking.status === 'maintenance'
                                ? 'bg-gray-100'
                                : 'bg-[#8C3A3A]/10';
                          }
                        }

                        return (
                          <div
                            key={d.toISOString()}
                            className={`w-14 h-16 border-r border-[#E5E0D8] relative flex-none transition-colors ${cellClass}`}
                          >
                            {cellContent}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
              {/* AQUÍ YA NO ESTÁ EL BOTÓN FLOTANTE (ESTÁ CORRECTO) */}
            </div>
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

          {/* MARKETING (LEADS) */}
          {activeTab === 'leads' && (
            <div className='p-8 h-full overflow-auto custom-scrollbar pb-32'>
              {/* 👇 AHORA INCLUIMOS TODOS LOS PLANES 'AI' EN EL ACCESO VIP 👇 */}

              {![
                'GROWTH',
                'CORPORATE',
                'PRO_AI',
                'PRO', // 👈 AGREGAR ESTO PARA DESBLOQUEAR TU USUARIO ACTUAL
                'NANO_AI',
                'GROWTH_AI',
                'CORPORATE_AI',
              ].includes(hotelInfo?.subscription_plan) ? (
                <div className='flex flex-col items-center justify-center h-full text-center max-w-md mx-auto'>
                  <div className='w-20 h-20 bg-cyan-100 text-cyan-600 rounded-3xl flex items-center justify-center mb-6 shadow-lg shadow-cyan-200/50 animate-bounce'>
                    <ShoppingBag size={40} />
                  </div>
                  <h3 className='font-serif text-3xl font-bold mb-4 text-[#2C2C2C]'>
                    Desbloquea el Motor de Ventas
                  </h3>
                  <p className='text-slate-500 mb-8 leading-relaxed text-sm'>
                    Estás en el{' '}
                    <b>Plan {hotelInfo?.subscription_plan || 'NANO'}</b>.
                    Actualiza al Plan <b>GROWTH</b> para identificar quién
                    visita tu web, rastrear campañas de anuncios y gestionar
                    cierres por WhatsApp.
                  </p>
                  <button
                    onClick={() =>
                      window.open(
                        'https://wa.me/573213795015?text=Hola!%20Quiero%20hacer%20upgrade%20al%20Plan%20GROWTH%20en%20HospedaSuite',
                        '_blank'
                      )
                    }
                    className='w-full bg-[#2C2C2C] text-white font-bold py-4 rounded-2xl shadow-xl hover:bg-black transition-all transform hover:scale-105 flex items-center justify-center gap-2'
                  >
                    <MessageCircle size={20} /> Hablar con un Consultor Elite
                  </button>
                </div>
              ) : (
                <>
                  <div className='flex justify-between items-end mb-8'>
                    <div>
                      <h2 className='font-serif text-3xl font-bold text-[#2C2C2C]'>
                        Prospectos & Campañas
                      </h2>
                      <p className='text-xs text-slate-500 mt-1 uppercase tracking-widest font-bold'>
                        Marketing Forense de Elite
                      </p>
                    </div>

                    <div className='flex gap-3'>
                      {/* 👇 BOTÓN DE IMPORTAR (NUEVO) */}
                      <button
                        onClick={() => importInputRef.current.click()}
                        className='bg-white text-slate-600 border border-slate-300 px-4 py-3 rounded-xl font-bold text-xs shadow-sm hover:bg-slate-50 flex items-center gap-2 transition-all'
                      >
                        <UploadCloud size={16} /> Importar Excel
                      </button>

                      {/* Input oculto para el archivo */}
                      <input
                        type='file'
                        accept='.csv,.xlsx'
                        ref={importInputRef}
                        className='hidden'
                        onChange={handleImportLeads}
                      />

                      <div className='bg-cyan-50 border border-cyan-100 px-6 py-3 rounded-2xl flex items-center gap-3 shadow-sm'>
                        <span className='text-[11px] font-black text-cyan-700 uppercase tracking-widest'>
                          Leads Activos: {leads.length}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className='bg-white rounded-[2rem] shadow-sm border border-[#E5E0D8] overflow-hidden relative'>
                    <table className='w-full text-left border-collapse'>
                      <thead className='bg-[#F9F7F2] border-b border-[#E5E0D8] sticky top-0 z-10'>
                        <tr>
                          <th className='p-5 text-[10px] font-bold uppercase text-[#5D5555] tracking-widest'>
                            Origen / Interesado
                          </th>
                          <th className='p-5 text-[10px] font-bold uppercase text-[#5D5555] tracking-widest'>
                            Ciudad / Plan Sugerido
                          </th>
                          <th className='p-5 text-[10px] font-bold uppercase text-[#5D5555] tracking-widest'>
                            Trazabilidad
                          </th>
                          <th className='p-5 text-[10px] font-bold uppercase text-[#5D5555] tracking-widest'>
                            Gestión
                          </th>
                        </tr>
                      </thead>
                      <tbody className='divide-y divide-[#F2F0E9]'>
                        {leads.map((l) => (
                          <tr
                            key={l.id}
                            className={`transition-colors group ${
                              l.status === 'contacted'
                                ? 'bg-green-50/40'
                                : 'hover:bg-slate-50/50'
                            }`}
                          >
                            <td className='p-5'>
                              <div className='flex items-center gap-4'>
                                <button
                                  onClick={() =>
                                    updateLeadStatus(l.id, l.status)
                                  }
                                  className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all shadow-sm ${
                                    l.status === 'contacted'
                                      ? 'bg-green-500 border-green-500 text-white'
                                      : 'border-slate-200'
                                  }`}
                                >
                                  {l.status === 'contacted' && (
                                    <Check
                                      size={14}
                                      strokeWidth={4}
                                    />
                                  )}
                                </button>
                                <div>
                                  <div className='font-serif font-bold text-slate-800 text-lg leading-tight'>
                                    {l.hotel_name}
                                  </div>
                                  <div className='text-xs font-bold text-slate-600'>
                                    {l.full_name}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className='p-5'>
                              <span className='text-[10px] font-black uppercase bg-cyan-50 text-cyan-700 px-2 py-1 rounded'>
                                {l.city_interest}
                              </span>
                              <div className='mt-1 text-[9px] font-black text-slate-400'>
                                TIER {l.metadata?.plan_interest || 'NANO'}
                              </div>
                            </td>
                            <td className='p-5'>
                              <div className='text-[9px] font-mono bg-slate-50 p-2 rounded border border-slate-100 text-slate-500 break-all leading-relaxed max-w-[220px]'>
                                {l.metadata?.source_url || 'Tráfico Directo'}
                              </div>
                            </td>
                            <td className='p-5'>
                              <div className='flex flex-col gap-2'>
                                <button
                                  onClick={() =>
                                    sendWhatsAppTemplate(l, 'welcome')
                                  }
                                  className='bg-white text-green-600 px-3 py-1.5 rounded-lg border border-green-200 text-[10px] font-black uppercase shadow-sm'
                                >
                                  Bienvenida
                                </button>
                                <button
                                  onClick={() =>
                                    sendWhatsAppTemplate(l, 'followup')
                                  }
                                  className='bg-white text-blue-600 px-3 py-1.5 rounded-lg border border-blue-200 text-[10px] font-black uppercase shadow-sm'
                                >
                                  Seguimiento
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

          {/* HUÉSPEDES */}
          {activeTab === 'guests' && (
            <div className='p-8 h-full overflow-auto pb-32'>
              <div className='flex justify-between items-end mb-8'>
                <h2 className='font-serif text-3xl font-bold'>Huéspedes</h2>
                <button
                  onClick={generateSIRE}
                  className='bg-[#F2F0E9] text-[#2C2C2C] px-6 py-3 rounded-xl font-bold text-sm shadow-sm hover:bg-[#E5E0D8] transition-colors flex gap-2 items-center'
                >
                  <FileText size={16} /> Exportar SIRE
                </button>
              </div>
              <div className='bg-white rounded-[1.5rem] shadow-sm border border-[#E5E0D8] overflow-hidden'>
                {guests.map((g, i) => (
                  <div
                    key={g.id}
                    className={`p-5 flex justify-between items-center ${
                      i !== guests.length - 1 ? 'border-b border-[#F2F0E9]' : ''
                    }`}
                  >
                    <div className='flex items-center gap-4'>
                      <div className='w-10 h-10 bg-[#8C3A3A]/10 text-[#8C3A3A] rounded-full flex items-center justify-center font-bold text-xs'>
                        {g.nationality}
                      </div>
                      <div>
                        <h4 className='font-serif font-bold text-lg'>
                          {g.full_name}
                        </h4>
                        <p className='text-xs text-[#5D5555]'>{g.doc_number}</p>
                      </div>
                    </div>
                    <div className='flex items-center gap-3'>
                      <button
                        onClick={() => setEditingGuest(g)}
                        className='p-2 bg-slate-100 text-slate-600 rounded-full hover:bg-slate-200 hover:text-[#8C3A3A] transition-colors'
                      >
                        <Edit size={16} />
                      </button>
                      <span className='text-xs font-bold bg-[#F9F7F2] px-3 py-1 rounded-full text-[#888] hidden md:inline-block'>
                        {new Date(g.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CONFIGURACIÓN */}
          {activeTab === 'settings' && (
            <div className='p-10 max-w-3xl mx-auto h-full overflow-auto pb-32'>
              <div className='glass-panel p-10 rounded-[2rem] shadow-xl'>
                <h2 className='font-serif text-3xl font-bold mb-8 text-[#2C2C2C]'>
                  Identidad & Configuración
                </h2>
                <form
                  onSubmit={handleUpdateConfig}
                  className='space-y-8'
                >
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
                    <div>
                      <label className='block text-xs font-bold text-[#5D5555] uppercase tracking-widest mb-2'>
                        Nombre
                      </label>
                      <input
                        className='w-full p-4 bg-[#F9F7F2] rounded-xl border-none font-serif text-lg font-bold outline-none'
                        value={configForm.name}
                        onChange={(e) =>
                          setConfigForm({ ...configForm, name: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className='block text-xs font-bold text-[#5D5555] uppercase tracking-widest mb-2'>
                        Color
                      </label>
                      <div className='flex items-center gap-4 bg-[#F9F7F2] p-2 rounded-xl'>
                        <input
                          type='color'
                          className='w-12 h-12 rounded-lg cursor-pointer border-none'
                          value={configForm.color}
                          onChange={(e) =>
                            setConfigForm({
                              ...configForm,
                              color: e.target.value,
                            })
                          }
                        />
                        <span className='font-mono text-sm'>
                          {configForm.color}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className='block text-xs font-bold text-[#5D5555] uppercase tracking-widest mb-2'>
                      WhatsApp
                    </label>
                    <div className='relative'>
                      <Phone
                        className='absolute left-4 top-4 text-[#8C3A3A]'
                        size={20}
                      />
                      <input
                        className='w-full p-4 pl-12 bg-[#F9F7F2] rounded-xl border-none font-sans font-bold outline-none'
                        placeholder='57300...'
                        value={configForm.phone}
                        onChange={(e) =>
                          setConfigForm({
                            ...configForm,
                            phone: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                  <button className='w-full bg-[#2C2C2C] text-white font-bold py-5 rounded-xl shadow-lg hover:bg-black transition-colors'>
                    Guardar Cambios
                  </button>
                </form>

                <div className='mt-12 pt-10 border-t border-[#E5E0D8]'>
                  <h3 className='font-serif text-xl font-bold mb-4 text-[#2C2C2C] flex items-center gap-2'>
                    🔒 Seguridad de la Cuenta
                  </h3>
                  <div className='bg-red-50 border border-red-100 p-6 rounded-2xl'>
                    <form
                      onSubmit={handleUpdatePassword}
                      className='flex gap-4 items-end'
                    >
                      <div className='flex-1'>
                        <label className='block text-xs font-bold text-red-900/50 uppercase tracking-widest mb-2'>
                          Nueva Contraseña
                        </label>
                        <input
                          type='password'
                          placeholder='Mínimo 6 caracteres'
                          className='w-full p-3 bg-white rounded-xl border border-red-200 outline-none focus:ring-2 focus:ring-red-500/20'
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                        />
                      </div>
                      <button
                        type='submit'
                        className='bg-red-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-red-700 transition-colors shadow-lg'
                      >
                        Actualizar Clave
                      </button>
                    </form>
                  </div>
                </div>

                <div className='mt-12 pt-10 border-t border-[#E5E0D8]'>
                  <h3 className='font-serif text-xl font-bold mb-4 text-[#2C2C2C] flex items-center gap-2'>
                    🌐 Tu Página Web de Reservas
                  </h3>
                  <div className='bg-blue-50 border border-blue-200 p-6 rounded-2xl'>
                    <p className='text-sm text-blue-800 mb-3'>
                      Este es tu enlace único. Compártelo en redes sociales.
                    </p>
                    <div className='flex gap-2'>
                      <input
                        readOnly
                        className='flex-1 p-3 bg-white rounded-xl text-sm font-mono text-gray-600 border border-blue-100 select-all'
                        value={`${window.location.origin}/book/${hotelInfo.id}`}
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(
                            `${window.location.origin}/book/${hotelInfo.id}`
                          );
                          alert('¡Link copiado!');
                        }}
                        className='bg-blue-600 text-white font-bold px-4 py-2 rounded-xl hover:bg-blue-700'
                      >
                        Copiar
                      </button>
                      <button
                        onClick={() =>
                          window.open(
                            `${window.location.origin}/book/${hotelInfo.id}`,
                            '_blank'
                          )
                        }
                        className='bg-white text-blue-600 font-bold px-4 py-2 rounded-xl border border-blue-200 hover:bg-blue-50'
                      >
                        Ver Página
                      </button>
                    </div>
                  </div>
                </div>

                <div className='mt-12 pt-10 border-t border-[#E5E0D8]'>
                  <h3 className='font-serif text-xl font-bold mb-4 text-[#2C2C2C] flex items-center gap-2'>
                    <QrCode size={24} /> Código QR del Menú
                  </h3>
                  <div className='flex flex-col md:flex-row items-center gap-8 bg-white p-8 rounded-[1.5rem] shadow-sm border border-[#E5E0D8]'>
                    <div className='bg-white p-2 rounded-xl shadow-inner border border-gray-100'>
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                          menuLink
                        )}`}
                        alt='QR Menú'
                        className='rounded-lg mix-blend-multiply'
                      />
                    </div>
                    <div className='flex-1 text-center md:text-left'>
                      <h4 className='font-bold text-lg mb-2'>
                        Acceso Directo al Room Service
                      </h4>
                      <p className='text-sm text-[#5D5555] mb-6 leading-relaxed'>
                        Imprime este código y colócalo en las habitaciones. Tus
                        huéspedes podrán escanearlo para ver el menú y pedir
                        comida.
                      </p>
                      <a
                        href={`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(
                          menuLink
                        )}`}
                        target='_blank'
                        download
                        className='inline-flex items-center gap-2 text-[#8C3A3A] font-bold bg-[#F9F7F2] px-6 py-3 rounded-xl hover:bg-[#E5E0D8] transition-colors'
                      >
                        <Printer size={18} /> Descargar para Imprimir
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MODAL ROOM SERVICE */}
        <AnimatePresence>
          {showOrdersModal && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowOrdersModal(false)}
                className='fixed inset-0 bg-[#2C2C2C]/30 backdrop-blur-sm z-60'
              />
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={springSoft}
                className='fixed top-0 right-0 h-full w-full max-w-md bg-[#F9F7F2] z-50 shadow-2xl p-8 flex flex-col'
              >
                <div className='flex justify-between items-center mb-8'>
                  <h3 className='font-serif text-3xl font-bold text-[#2C2C2C]'>
                    Room Service
                  </h3>
                  <button
                    onClick={() => setShowOrdersModal(false)}
                    className='p-2 hover:bg-[#E5E0D8] rounded-full'
                  >
                    <X />
                  </button>
                </div>
                <div className='flex-1 overflow-auto space-y-4'>
                  {pendingOrders.map((order) => (
                    <div
                      key={order.id}
                      className='bg-white p-6 rounded-[1.5rem] shadow-sm border border-[#E5E0D8]'
                    >
                      <div className='flex justify-between mb-4'>
                        <span className='bg-[#8C3A3A] text-white px-3 py-1 rounded-full text-xs font-bold'>
                          Hab. {order.rooms?.name}
                        </span>
                        <span className='font-serif font-bold text-lg'>
                          ${order.total_price.toLocaleString()}
                        </span>
                      </div>
                      <ul className='space-y-2 mb-6'>
                        {order.items.map((i, idx) => (
                          <li
                            key={idx}
                            className='flex justify-between text-sm text-[#5D5555]'
                          >
                            <span>
                              {i.qty}x {i.name}
                            </span>
                            <span className='font-bold'>
                              ${(i.price * i.qty).toLocaleString()}
                            </span>
                          </li>
                        ))}
                      </ul>
                      <button
                        onClick={() => markOrderDelivered(order.id)}
                        className='w-full bg-white border-2 border-[#2C2C2C] text-[#2C2C2C] py-3 rounded-xl font-bold text-sm hover:bg-[#2C2C2C] hover:text-white transition-colors'
                      >
                        Marcar Entregado
                      </button>
                    </div>
                  ))}
                  {pendingOrders.length === 0 && (
                    <p className='text-center text-[#888] font-serif italic mt-10'>
                      Todo está tranquilo.
                    </p>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* MODAL NUEVA RESERVA */}
        <AnimatePresence>
          {showBookingModal && (
            <div className='fixed inset-0 bg-[#2C2C2C]/40 backdrop-blur-sm z-60 flex items-center justify-center p-4'>
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className='bg-[#F9F7F2] rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden'
              >
                <div className='p-8 pb-0 flex justify-between items-center'>
                  <h3 className='font-serif text-2xl font-bold'>
                    Nueva Estadía
                  </h3>
                  <button onClick={() => setShowBookingModal(false)}>
                    <X />
                  </button>
                </div>
                <form
                  onSubmit={handleCreateBooking}
                  className='p-8 space-y-5'
                >
                  {/* Tabs Tipo de Reserva */}
                  <div className='bg-white p-1 rounded-xl flex shadow-sm border border-[#E5E0D8]'>
                    <button
                      type='button'
                      onClick={() =>
                        setBookingForm({ ...bookingForm, type: 'booking' })
                      }
                      className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                        bookingForm.type === 'booking'
                          ? 'bg-[#2C2C2C] text-white shadow-md'
                          : 'text-[#888]'
                      }`}
                    >
                      Huésped
                    </button>
                    <button
                      type='button'
                      onClick={() =>
                        setBookingForm({ ...bookingForm, type: 'maintenance' })
                      }
                      className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                        bookingForm.type === 'maintenance'
                          ? 'bg-[#2C2C2C] text-white shadow-md'
                          : 'text-[#888]'
                      }`}
                    >
                      Mantenimiento
                    </button>
                  </div>

                  {/* Fechas */}
                  <div className='grid grid-cols-2 gap-4'>
                    <div>
                      <label className='text-[10px] font-bold uppercase text-[#5D5555] tracking-widest'>
                        Desde
                      </label>
                      <input
                        type='date'
                        required
                        className='w-full mt-1 p-3 bg-white rounded-xl border-none outline-none font-bold'
                        value={bookingForm.checkIn}
                        onChange={(e) =>
                          setBookingForm({
                            ...bookingForm,
                            checkIn: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className='text-[10px] font-bold uppercase text-[#5D5555] tracking-widest'>
                        Hasta
                      </label>
                      <input
                        type='date'
                        required
                        className='w-full mt-1 p-3 bg-white rounded-xl border-none outline-none font-bold'
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

                  {/* Selección de Habitación */}
                  <div>
                    <label className='text-[10px] font-bold uppercase text-[#5D5555] tracking-widest'>
                      Habitación
                    </label>
                    <select
                      className='w-full mt-1 p-3 bg-white rounded-xl border-none outline-none font-bold'
                      value={bookingForm.roomId}
                      onChange={(e) =>
                        setBookingForm({
                          ...bookingForm,
                          roomId: e.target.value,
                        })
                      }
                    >
                      <option value=''>Seleccionar...</option>
                      {availableRoomsList.map((r) => (
                        <option
                          key={r.id}
                          value={r.id}
                        >
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Campos de Huésped (Solo si es tipo 'booking') */}
                  {bookingForm.type === 'booking' && (
                    <div className='space-y-3 mt-4'>
                      <div>
                        <label className='text-[10px] font-bold uppercase text-[#5D5555] tracking-widest'>
                          Nombre Completo
                        </label>
                        <input
                          required
                          className='w-full p-3 bg-white rounded-xl border-none outline-none font-serif text-lg font-bold'
                          placeholder='Ej: Juan Pérez'
                          value={bookingForm.guestName}
                          onChange={(e) =>
                            setBookingForm({
                              ...bookingForm,
                              guestName: e.target.value,
                            })
                          }
                        />
                      </div>

                      <div className='grid grid-cols-2 gap-4'>
                        {/* 👇 BLOQUE DE DOCUMENTO CON BOTÓN DE ESCÁNER 👇 */}
                        <div>
                          <label className='text-[10px] font-bold uppercase text-[#5D5555] tracking-widest'>
                            Documento ID
                          </label>
                          <div className='flex gap-2 mt-1'>
                            <input
                              required
                              className='w-full p-3 bg-white rounded-xl border-none outline-none font-bold text-[#2C2C2C]'
                              placeholder='CC 123...'
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
                              onClick={() => setShowScanner(true)}
                              className='bg-cyan-500 hover:bg-cyan-600 text-white p-3 rounded-xl transition-colors shadow-lg flex items-center justify-center tooltip shrink-0'
                              title='Escanear Cédula'
                            >
                              <ScanBarcode size={20} />
                            </button>
                          </div>
                        </div>
                        {/* 👆 FIN BLOQUE ESCÁNER 👆 */}

                        <div>
                          <label className='text-[10px] font-bold uppercase text-[#5D5555] tracking-widest'>
                            Celular
                          </label>
                          <input
                            required
                            className='w-full mt-1 p-3 bg-white rounded-xl border-none outline-none font-bold text-[#2C2C2C]'
                            placeholder='300...'
                            value={bookingForm.guestPhone}
                            onChange={(e) =>
                              setBookingForm({
                                ...bookingForm,
                                guestPhone: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>

                      <div>
                        <label className='text-[10px] font-bold uppercase text-[#5D5555] tracking-widest'>
                          Precio Total Pactado
                        </label>
                        <div className='relative'>
                          <span className='absolute left-3 top-3 text-[#888]'>
                            $
                          </span>
                          <input
                            type='number'
                            required
                            className='w-full pl-8 p-3 bg-white rounded-xl border-none outline-none font-bold text-[#8C3A3A] text-lg'
                            placeholder='0'
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
                    </div>
                  )}

                  <button className='w-full bg-[#8C3A3A] text-white font-bold py-4 rounded-xl shadow-lg shadow-[#8C3A3A]/30 mt-2'>
                    Crear Reserva
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MODAL DETALLES */}
        <AnimatePresence>
          {selectedBooking && (
            <div className='fixed inset-0 bg-[#2C2C2C]/40 backdrop-blur-sm z-60 flex items-center justify-center p-4'>
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className='bg-[#F9F7F2] rounded-[2rem] w-full max-w-sm h-[90vh] overflow-y-auto scrollbar-hide shadow-2xl'
              >
                <div className='p-6 pb-0 flex justify-between items-start'>
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${
                      selectedBooking.status === 'maintenance'
                        ? 'bg-slate-100 text-slate-600'
                        : 'text-white'
                    }`}
                    style={
                      selectedBooking.status !== 'maintenance' ? brandStyle : {}
                    }
                  >
                    {selectedBooking.status === 'maintenance' ? (
                      <Hammer />
                    ) : (
                      <User />
                    )}
                  </div>
                  <div className='flex gap-2'>
                    {!isEditing && selectedBooking.status !== 'maintenance' && (
                      <button
                        onClick={startEditing}
                        className='p-2 bg-slate-100 rounded-full hover:bg-slate-200 text-slate-600'
                      >
                        <Edit size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setSelectedBooking(null);
                        setIsEditing(false);
                      }}
                    >
                      <X />
                    </button>
                  </div>
                </div>

                <div className='px-6'>
                  {isEditing ? (
                    <div className='space-y-4 pb-6'>
                      <h3 className='font-bold text-lg text-slate-800'>
                        Editando Reserva
                      </h3>
                      <div>
                        <label className='text-xs font-bold'>Huésped</label>
                        <input
                          className='w-full p-2 border rounded'
                          value={editForm.guestName}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              guestName: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className='grid grid-cols-2 gap-2'>
                        <div>
                          <label className='text-xs font-bold'>ID</label>
                          <input
                            className='w-full p-2 border rounded'
                            value={editForm.guestDoc}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                guestDoc: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div>
                          <label className='text-xs font-bold'>Cel</label>
                          <input
                            className='w-full p-2 border rounded'
                            value={editForm.guestPhone}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                guestPhone: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>
                      <div>
                        <label className='text-xs font-bold'>Email</label>
                        <input
                          className='w-full p-2 border rounded'
                          value={editForm.guestEmail}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              guestEmail: e.target.value,
                            })
                          }
                        />
                      </div>
                      <hr />
                      <div>
                        <label className='text-xs font-bold'>Habitación</label>
                        <select
                          className='w-full p-2 border rounded'
                          value={editForm.roomId}
                          onChange={(e) =>
                            setEditForm({ ...editForm, roomId: e.target.value })
                          }
                        >
                          {availableRoomsList.map((r) => (
                            <option
                              key={r.id}
                              value={r.id}
                            >
                              {r.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className='grid grid-cols-2 gap-2'>
                        <div>
                          <label className='text-xs font-bold'>Entrada</label>
                          <input
                            type='date'
                            className='w-full p-2 border rounded'
                            value={editForm.checkIn}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                checkIn: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div>
                          <label className='text-xs font-bold'>Salida</label>
                          <input
                            type='date'
                            className='w-full p-2 border rounded'
                            value={editForm.checkOut}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                checkOut: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>
                      <div>
                        <label className='text-xs font-bold'>Total</label>
                        <input
                          type='number'
                          className='w-full p-2 border rounded'
                          value={editForm.totalPrice}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              totalPrice: e.target.value,
                            })
                          }
                        />
                      </div>
                      <button
                        onClick={saveEditing}
                        className='w-full bg-green-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2'
                      >
                        <Check size={18} /> Guardar Cambios
                      </button>
                      <button
                        onClick={() => setIsEditing(false)}
                        className='w-full text-slate-400 font-bold py-2'
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <>
                      <h3 className='text-xl font-bold'>
                        {selectedBooking.guests?.full_name || 'Mantenimiento'}
                      </h3>
                      <p className='text-sm text-slate-500 mb-4'>
                        {selectedBooking.guests?.doc_number || 'Bloqueo'}
                      </p>
                      {selectedBooking.status !== 'maintenance' && (
                        <div className='flex border-b px-6 -mx-6 mb-4'>
                          <button
                            onClick={() => setModalTab('info')}
                            className={`flex-1 pb-2 text-sm font-bold border-b-2 ${
                              modalTab === 'info'
                                ? 'border-current'
                                : 'border-transparent text-slate-400'
                            }`}
                            style={modalTab === 'info' ? textBrandStyle : {}}
                          >
                            General
                          </button>
                          <button
                            onClick={() => setModalTab('charges')}
                            className={`flex-1 pb-2 text-sm font-bold border-b-2 ${
                              modalTab === 'charges'
                                ? 'border-current'
                                : 'border-transparent text-slate-400'
                            }`}
                            style={modalTab === 'charges' ? textBrandStyle : {}}
                          >
                            Consumos
                          </button>
                        </div>
                      )}
                      <div className='pb-6 space-y-6'>
                        {(modalTab === 'info' ||
                          selectedBooking.status === 'maintenance') && (
                          <>
                            <div className='bg-slate-50 p-4 rounded-xl border text-sm space-y-2'>
                              <div className='flex justify-between'>
                                <span>Entrada:</span>
                                <b>{selectedBooking.check_in}</b>
                              </div>
                              <div className='flex justify-between'>
                                <span>Salida:</span>
                                <b>{selectedBooking.check_out}</b>
                              </div>
                            </div>

                            {selectedBooking.guests?.signature_url && (
                              <div className='mt-3 bg-white border border-[#E5E0D8] p-3 rounded-xl shadow-sm'>
                                <div className='flex justify-between items-center mb-2'>
                                  <span className='text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1'>
                                    <PenTool size={10} /> Firma Digital
                                  </span>
                                  <span className='text-[10px] text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded'>
                                    Aceptado
                                  </span>
                                </div>
                                <div className='bg-slate-50 rounded-lg border border-dashed border-slate-200 p-2 flex justify-center'>
                                  <img
                                    src={selectedBooking.guests.signature_url}
                                    alt='Firma del huésped'
                                    className='h-16 object-contain opacity-80 mix-blend-multiply'
                                  />
                                </div>
                                <a
                                  href={selectedBooking.guests.signature_url}
                                  target='_blank'
                                  rel='noopener noreferrer'
                                  className='block text-center text-[10px] text-[#8C3A3A] mt-2 underline'
                                >
                                  Ver original
                                </a>
                              </div>
                            )}

                            {selectedBooking.guests?.consent_ip && (
                              <>
                                <div className='mb-3 p-2 bg-blue-50/50 rounded-lg border border-blue-100 mt-3'>
                                  <p className='text-[9px] text-blue-800 leading-tight italic'>
                                    "Huésped aceptó la política de tratamiento
                                    de datos Ley 1581 y el registro de metadatos
                                    forenses."
                                  </p>
                                </div>
                                <div className='bg-[#F8FAFC] border border-slate-200 p-3 rounded-xl shadow-inner'>
                                  <div className='flex justify-between items-center mb-2'>
                                    <span className='text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1'>
                                      <ShieldCheck
                                        size={12}
                                        className='text-cyan-600'
                                      />{' '}
                                      Auditoría Habeas Data
                                    </span>
                                    <span className='text-[9px] text-slate-400 font-mono'>
                                      v2.0-NANO
                                    </span>
                                  </div>
                                  <div className='space-y-1 text-[10px] font-mono text-slate-600'>
                                    <div className='flex justify-between border-b border-slate-100 pb-1'>
                                      <span>IP ORIGEN:</span>
                                      <span className='text-slate-900 font-bold'>
                                        {selectedBooking.guests.consent_ip}
                                      </span>
                                    </div>
                                    <div className='leading-tight opacity-70 break-all'>
                                      <span className='font-bold'>
                                        NAVEGADOR:
                                      </span>{' '}
                                      {
                                        selectedBooking.guests
                                          .consent_user_agent
                                      }
                                    </div>
                                    <div className='flex justify-between pt-1 text-cyan-700 font-bold'>
                                      <span>TIMESTAMP:</span>
                                      <span>
                                        {new Date(
                                          selectedBooking.guests.consent_timestamp
                                        ).toLocaleString('es-CO')}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </>
                            )}

                            {selectedBooking.status !== 'maintenance' &&
                              (() => {
                                const { total, paid, pending } =
                                  calculateFinancials(selectedBooking);
                                const { base, tax } = calculateTax(total);
                                return (
                                  <div className='bg-slate-50 p-4 rounded-xl border'>
                                    <h4 className='text-xs font-bold text-slate-400 mb-3'>
                                      CUENTA
                                    </h4>
                                    <div className='text-xs text-slate-500 mb-2 border-b border-dashed pb-2'>
                                      <div className='flex justify-between'>
                                        <span>Base:</span>
                                        <span>
                                          ${Math.round(base).toLocaleString()}
                                        </span>
                                      </div>
                                      <div className='flex justify-between'>
                                        <span>
                                          IVA/Imp ({hotelInfo?.tax_rate}%):
                                        </span>
                                        <span>
                                          ${Math.round(tax).toLocaleString()}
                                        </span>
                                      </div>
                                    </div>
                                    <div className='flex justify-between mb-2'>
                                      <span>Total</span>
                                      <b>${total.toLocaleString()}</b>
                                    </div>
                                    <div className='flex justify-between mb-4'>
                                      <span>Pagado</span>
                                      <b className='text-green-600'>
                                        ${paid.toLocaleString()}
                                      </b>
                                    </div>
                                    <div className='text-right text-xs font-bold mb-4'>
                                      Saldo: ${pending.toLocaleString()}
                                    </div>
                                    {pending > 0 && (
                                      <form
                                        onSubmit={handleRegisterPayment}
                                        className='pt-4 border-t'
                                      >
                                        <div className='flex gap-2 mb-2'>
                                          <input
                                            type='number'
                                            placeholder='$'
                                            className='w-full p-2 border rounded'
                                            value={paymentForm.amount}
                                            onChange={(e) =>
                                              setPaymentForm({
                                                ...paymentForm,
                                                amount: e.target.value,
                                              })
                                            }
                                          />
                                          <select
                                            className='bg-white border rounded px-1'
                                            value={paymentForm.method}
                                            onChange={(e) =>
                                              setPaymentForm({
                                                ...paymentForm,
                                                method: e.target.value,
                                              })
                                            }
                                          >
                                            <option>Efectivo</option>
                                            <option>Nequi</option>
                                          </select>
                                        </div>
                                        <button className='w-full bg-green-600 text-white text-xs font-bold py-2 rounded'>
                                          Pagar
                                        </button>
                                      </form>
                                    )}
                                  </div>
                                );
                              })()}

                            <div className='flex gap-2'>
                              {selectedBooking.status !== 'maintenance' && (
                                <>
                                  <button
                                    onClick={generateTRA}
                                    className='flex-1 text-white font-bold py-3 rounded-xl shadow-lg flex items-center justify-center gap-2 text-sm'
                                    style={brandStyle}
                                  >
                                    <Download size={16} /> TRA
                                  </button>
                                  <button
                                    onClick={handleSendWhatsApp}
                                    className='flex-1 bg-green-500 text-white font-bold py-3 rounded-xl shadow-lg flex items-center justify-center gap-2 text-sm hover:bg-green-600'
                                  >
                                    <MessageCircle size={16} /> WhatsApp
                                  </button>
                                </>
                              )}
                            </div>
                            <button
                              onClick={handleCancelBooking}
                              className='w-full bg-white border-2 border-red-100 text-red-600 font-bold py-3 rounded-xl'
                            >
                              Eliminar
                            </button>
                          </>
                        )}
                        {modalTab === 'charges' &&
                          selectedBooking.status !== 'maintenance' && (
                            <div className='space-y-4'>
                              {selectedBooking.charges?.map((c) => (
                                <div
                                  key={c.id}
                                  className='flex justify-between bg-white p-3 border rounded-xl shadow-sm'
                                >
                                  <span>{c.item}</span>
                                  <div className='flex gap-3 font-bold'>
                                    <span>${c.price}</span>
                                    <button
                                      onClick={() => handleDeleteCharge(c.id)}
                                      className='text-red-300'
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                              <div className='bg-yellow-50 p-4 rounded-xl border text-sm'>
                                <p className='font-bold'>Nuevo Consumo</p>
                              </div>
                              <form
                                onSubmit={handleAddCharge}
                                className='space-y-3'
                              >
                                <div>
                                  <label className='text-xs font-bold'>
                                    Item
                                  </label>
                                  <input
                                    className='w-full mt-1 p-2 border rounded'
                                    value={chargeForm.concept}
                                    onChange={(e) =>
                                      setChargeForm({
                                        ...chargeForm,
                                        concept: e.target.value,
                                      })
                                    }
                                  />
                                </div>
                                <div>
                                  <label className='text-xs font-bold'>
                                    Valor
                                  </label>
                                  <input
                                    type='number'
                                    className='w-full mt-1 p-2 border rounded'
                                    value={chargeForm.price}
                                    onChange={(e) =>
                                      setChargeForm({
                                        ...chargeForm,
                                        price: e.target.value,
                                      })
                                    }
                                  />
                                </div>
                                <button className='w-full bg-yellow-400 text-yellow-900 font-bold py-2 rounded'>
                                  Agregar
                                </button>
                              </form>
                            </div>
                          )}
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <input
          type='file'
          accept='.ics'
          ref={fileInputRef}
          className='hidden'
          onChange={handleIcalUpload}
        />

        {/* COMPONENTE ESCÁNER (Foto OCR) */}
        <AnimatePresence>
          {showScanner && (
            <CedulaOCR
              onScanSuccess={handleScanSuccess}
              onClose={() => setShowScanner(false)}
            />
          )}
        </AnimatePresence>
        {/* 👇👇 PEGAR AQUÍ (LÍNEA ~1664) - BOTÓN FLOTANTE GLOBAL (+) 👇👇 */}
        <div className='fixed bottom-24 right-4 md:bottom-8 md:right-10 flex flex-col gap-4 z-50'>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowBookingModal(true)}
            className='bg-[#2C2C2C] text-white p-4 md:p-5 rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.4)] flex items-center justify-center'
          >
            <Plus size={24} />
          </motion.button>
        </div>
        <VoiceAgent onActionTriggered={handleVoiceAction} />
      </main>
      {/* Navegación Móvil */}
      <nav className='md:hidden fixed bottom-0 left-0 w-full bg-white/95 backdrop-blur border-t border-slate-200 flex justify-around p-3 pb-safe z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]'>
        <NavButton
          icon={<CalendarIcon />}
          label='Cal'
          active={activeTab === 'calendar'}
          onClick={() => setActiveTab('calendar')}
        />
        <NavButton
          icon={<Settings />}
          label='Cfg'
          active={activeTab === 'settings'}
          onClick={() => setActiveTab('settings')}
        />
      </nav>
    </div> // 👈 ESTE CIERRA EL DIV PRINCIPAL (flex h-screen...)
  ); // 👈 ESTE CIERRA EL RETURN
}; // 👈 ¡ESTA LLAVE ES CRÍTICA! CIERRA EL COMPONENTE DashboardPage

// --- COMPONENTES AUXILIARES (Deben estar FUERA de DashboardPage) ---

const NavButton = ({ icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-300 group ${
      active
        ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_20px_rgba(6,182,212,0.15)]'
        : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
    }`}
  >
    <span
      className={`transition-transform duration-300 ${
        active ? 'scale-110' : 'group-hover:scale-110'
      }`}
    >
      {icon}
    </span>
    <span className='font-sans font-medium tracking-wide text-sm'>{label}</span>
  </button>
);

const LockScreen = ({ hotelName, reason }) => (
  <div className='fixed inset-0 bg-[#2C2C2C] z-50 flex flex-col items-center justify-center text-white p-6 text-center'>
    <div className='bg-red-500/20 p-6 rounded-full mb-6 animate-pulse'>
      <AlertTriangle
        size={64}
        className='text-red-500'
      />
    </div>
    <h1 className='text-4xl font-serif font-bold mb-4'>Acceso Restringido</h1>
    <p className='text-xl text-gray-300 max-w-md mb-8'>
      {reason === 'suspended'
        ? `El servicio para ${hotelName} ha sido suspendido temporalmente.`
        : `El periodo de prueba de ${hotelName} ha finalizado.`}
    </p>
    <div className='bg-white/10 p-6 rounded-xl border border-white/20 max-w-sm w-full'>
      <p className='text-sm text-gray-400 mb-4'>
        Para reactivar el servicio inmediatamente:
      </p>
      <button
        onClick={() =>
          window.open(
            'https://wa.me/573213795015?text=Hola,%20quiero%20reactivar%20mi%20servicio',
            '_blank'
          )
        }
        className='w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-6 rounded-lg transition-all flex items-center justify-center gap-2'
      >
        <MessageCircle size={20} /> Contactar Soporte
      </button>
    </div>
    <p className='mt-8 text-xs text-gray-500'>ID del Hotel: {hotelName}</p>
  </div>
);

export default DashboardPage;
