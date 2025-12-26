import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { jsPDF } from 'jspdf';
import Papa from 'papaparse';
import ICAL from 'ical.js';
import { motion, AnimatePresence } from 'framer-motion';
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
} from 'lucide-react';

const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Lato:wght@300;400;700&display=swap');
    body { background-color: #F9F7F2; color: #2C2C2C; }
    .font-serif { fontFamily: 'Playfair Display', serif; }
    .font-sans { fontFamily: 'Lato', sans-serif; }
    .glass-panel { background: rgba(255, 255, 255, 0.9); border: 1px solid rgba(229, 224, 216, 0.5); }
    @supports (backdrop-filter: blur(12px)) {
        .glass-panel { background: rgba(255, 255, 255, 0.75); backdrop-filter: blur(12px); }
    }
  `}</style>
);

const DashboardPage = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // Estados Principales
  const [activeTab, setActiveTab] = useState('calendar');
  const [rooms, setRooms] = useState([]);
  const [guests, setGuests] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [hotelInfo, setHotelInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  // 👇👇 PEGA TUS NUEVOS ESTADOS AQUÍ 👇👇
  const [accessDenied, setAccessDenied] = useState(false); // Nuevo estado
  const [denyReason, setDenyReason] = useState(''); // 'suspended' o 'trial_over'
  // 👆👆 FIN DE LO NUEVO 👆👆

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
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [modalTab, setModalTab] = useState('info');
  const [isEditing, setIsEditing] = useState(false);

  const [editForm, setEditForm] = useState({});
  const [newRoomName, setNewRoomName] = useState('');

  const [targetRoomId, setTargetRoomId] = useState(null);
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

  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    method: 'Efectivo',
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

  // 👇 1. NUEVO CÓDIGO (ESTADO Y FUNCIÓN PASSWORD)
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
  // 👆 FIN DEL BLOQUE NUEVO

  // --- INSERTAR ESTO: Estado y Lógica para Editar Huésped ---
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
      setEditingGuest(null); // Cerrar modal
      fetchOperationalData(); // Recargar lista
    }
  };
  // ----------------------------------------------------------
  const springSoft = { type: 'spring', stiffness: 200, damping: 25 };

  // Enlace del menú (Dinámico basado en la URL actual)
  const menuLink = `${window.location.origin}/menu/hotel-demo`;

  // --- CARGA INICIAL ---
  // --- CARGA INICIAL BLINDADA ---
  useEffect(() => {
    const fetchHotelInfo = async () => {
      // 1. Averiguamos quién es el usuario logueado
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        navigate('/login'); // Si no hay usuario, lo sacamos
        return;
      }

      // 2. Buscamos EL hotel que pertenece a este email
      const { data: hotel, error } = await supabase
        .from('hotels')
        .select('*')
        .eq('email', user.email) // 👈 AQUÍ ESTÁ EL SECRETO
        .single();

      if (error || !hotel) {
        // Si entra un usuario que no tiene hotel asignado (ej: cliente antiguo sin hotel creado)
        console.error('No se encontró hotel para este usuario', error);
        return;
      }

      // 3. Si encontramos el hotel correcto, procedemos con la seguridad
      if (hotel) {
        // 🚨 POLICÍA DE ACCESO: INICIO 🚨
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
        // 🚨 POLICÍA DE ACCESO: FIN 🚨

        setHotelInfo(hotel);
        setConfigForm({
          name: hotel.name,
          color: hotel.primary_color || '#8C3A3A',
          location: hotel.location || '',
          tax_rate: hotel.tax_rate || 0,
          phone: hotel.phone || '',
        });
        fetchOrders(hotel.id);
      }
    };
    fetchHotelInfo();
  }, []);

  useEffect(() => {
    fetchOperationalData();
  }, [activeTab]);

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

  // --- FETCH DATA (SOLO DATOS PROPIOS) ---
  const fetchOperationalData = async () => {
    try {
      setLoading(true);

      const currentHotelId = hotelInfo?.id;
      if (!currentHotelId) return;

      if (currentHotelId) {
        // 1. Habitaciones de ESTE hotel
        const { data: rd } = await supabase
          .from('rooms')
          .select('*')
          .eq('hotel_id', currentHotelId)
          .order('name');
        if (rd) setRooms(rd);

        // 2. Reservas de ESTE hotel
        const { data: bd } = await supabase
          .from('bookings')
          .select('*, guests(*), payments(*), charges(*)')
          .eq('hotel_id', currentHotelId);

        if (bd) {
          setBookings(bd);

          // 👇 3. HUÉSPEDES (FILTRADO INTELIGENTE)
          // En lugar de bajar toda la base de datos, extraemos los huéspedes
          // únicamente de TUS reservas confirmadas.
          const uniqueGuestsMap = new Map();
          bd.forEach((booking) => {
            if (booking.guests) {
              // Usamos un Map para evitar duplicados (si Juan vino 2 veces, sale 1 vez)
              uniqueGuestsMap.set(booking.guests.id, booking.guests);
            }
          });

          // Convertimos el mapa a una lista limpia
          const myGuests = Array.from(uniqueGuestsMap.values());

          // Los ordenamos: los más recientes primero
          myGuests.sort(
            (a, b) => new Date(b.created_at) - new Date(a.created_at)
          );

          setGuests(myGuests);
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // --- ESTILOS MARCA ---
  const brandColor = hotelInfo?.primary_color || '#8C3A3A';
  const brandStyle = { backgroundColor: brandColor };
  const textBrandStyle = { color: brandColor };

  // --- HELPERS ---
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

  const getAvailableRooms = () => {
    const targetCheckIn = isEditing ? editForm.checkIn : bookingForm.checkIn;
    const targetCheckOut = isEditing ? editForm.checkOut : bookingForm.checkOut;
    if (!targetCheckIn || !targetCheckOut) return rooms;
    const start = new Date(targetCheckIn);
    const end = new Date(targetCheckOut);
    return rooms.filter((room) => {
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
  };
  const availableRoomsList = getAvailableRooms();

  // 1. Primero la función de Editar
  const startEditing = () => {
    if (!selectedBooking) return;
    setEditForm({
      guestName: selectedBooking.guests?.full_name || '',
      guestDoc: selectedBooking.guests?.doc_number || '',
      guestPhone: selectedBooking.guests?.phone || '',
      guestEmail: selectedBooking.guests?.email || '',
      price: selectedBooking.total_price || 0,
      notes: selectedBooking.notes || '',
    });
    setIsEditing(true);
  };

  // --- ACCIONES (HANDLERS) ---

  // --- REEMPLAZAR handleSendWhatsApp POR VERSIÓN HÍBRIDA (ROBOT + MANUAL) ---
  const handleSendWhatsApp = async () => {
    if (!selectedBooking || !selectedBooking.guests) return;
    const guest = selectedBooking.guests;

    // 1. Limpieza de Teléfono (Formato estricto para API: 573001234567)
    let phone = guest.phone ? guest.phone.replace(/\D/g, '') : '';
    if (phone && !phone.startsWith('57') && phone.length === 10)
      phone = '57' + phone;

    if (!phone) {
      return alert('⚠️ El huésped no tiene un teléfono celular registrado.');
    }

    // 2. Preparar el Mensaje y Links
    const checkInLink = `${window.location.origin}/checkin?booking=${selectedBooking.id}`;
    const message = `Hola *${guest.full_name}*, tu reserva en *${hotelInfo?.name}* está confirmada. ✅\n\n📝 *Check-in Digital:* Para agilizar tu ingreso, firma aquí:\n${checkInLink}\n\n🍹 *Room Service:* ${menuLink}`;

    // 3. 🤖 INTENTO AUTOMÁTICO (Evolution API)
    // ---------------------------------------------------------
    // ¡IMPORTANTE! Aquí pondrás los datos de tu servidor de WhatsApp cuando lo tengas.
    // Por ahora, dejamos datos de ejemplo.
    const EVOLUTION_URL = 'https://api.tudominio.com';
    const INSTANCE_NAME = 'HospedaSuiteBot';
    const API_KEY = 'TU_API_KEY_AQUI';
    // ---------------------------------------------------------

    // Ponemos el botón en estado "Cargando..." (visual)
    const originalText = document.activeElement.innerText;
    // document.activeElement.innerText = 'Enviando... 🤖'; // Opcional: Feedback visual simple

    try {
      // Intentamos contactar al robot
      const response = await fetch(
        `${EVOLUTION_URL}/message/sendText/${INSTANCE_NAME}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: API_KEY,
          },
          body: JSON.stringify({
            number: phone,
            options: { delay: 1200, presence: 'composing' }, // Simula que está escribiendo
            textMessage: { text: message },
          }),
        }
      );

      if (response.ok) {
        alert('🤖 ¡Mensaje enviado automágicamente por el Robot!');
      } else {
        throw new Error('API no conectada');
      }
    } catch (error) {
      console.warn('⚠️ Robot no disponible. Usando método manual.', error);

      // 4. FALLBACK MANUAL (Plan B)
      // Si la API falla (o no existe), abrimos la ventana clásica para asegurar el envío.
      window.open(
        `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
        '_blank'
      );
    }
  };
  // --------------------------------------------------------------------------

  const generateTRA = () => {
    const doc = new jsPDF();
    doc.text(`TRA No. ${selectedBooking.tra_number || 'PEND'}`, 20, 20);
    doc.text(`Huésped: ${selectedBooking.guests?.full_name}`, 20, 30);
    doc.save('TRA.pdf');
  };

  const generateSIRE = () => {
    let c = '';
    bookings
      .filter((b) => b.status === 'confirmed' && b.guests)
      .forEach((b) => {
        const g = b.guests;
        c += `${g.nationality === 'COL' ? 'CC' : 'PAS'}|${g.doc_number}|${
          g.full_name
        }|${g.nationality}|${g.birth_date || '1900-01-01'}|${g.gender || 'M'}|${
          b.check_in
        }|${b.check_out}\n`;
      });
    if (!c) return alert('Sin datos');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([c], { type: 'text/plain' }));
    link.download = `SIRE.txt`;
    link.click();
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

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!newRoomName) return;
    const { data, error } = await supabase
      .from('rooms')
      .insert([{ hotel_id: hotelInfo.id, name: newRoomName, price: 150000 }])
      .select();
    if (error) {
      alert('Error creando: ' + error.message);
      return;
    }
    if (data) {
      setRooms([...rooms, data[0]]);
      setNewRoomName('');
    }
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

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (res) => {
        alert(`Importados ${res.data.length}`);
        fetchOperationalData();
      },
    });
  };
  // --- REEMPLAZAR POR ESTA VERSIÓN REAL ---
  const handleIcalUpload = (e) => {
    const file = e.target.files[0];
    if (!file || !targetRoomId) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        // 1. Parsear el archivo ICS
        const jcalData = ICAL.parse(ev.target.result);
        const vcalendar = new ICAL.Component(jcalData);
        const vevents = vcalendar.getAllSubcomponents('vevent');

        let importedCount = 0;
        const newBookings = [];

        // 2. Recorrer eventos (Reservas de Airbnb)
        for (const vevent of vevents) {
          const event = new ICAL.Event(vevent);

          // Airbnb a veces trae fechas sin hora, aseguramos formato ISO simple YYYY-MM-DD
          const startDate = event.startDate
            .toJSDate()
            .toISOString()
            .split('T')[0];
          let endDate = event.endDate.toJSDate().toISOString().split('T')[0];

          // Ajuste: Si el evento termina a media noche, a veces cuenta un día extra.
          // Para este MVP lo dejamos estándar.

          // 3. Verificar duplicados en Frontend (Anti-colisión básica)
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
              status: 'maintenance', // Bloqueamos como mantenimiento para que nadie reserve
              source: 'airbnb', // Marca de origen
              total_price: 0,
              notes: `Importado: ${event.summary || 'Reserva Externa'}`,
            });
            importedCount++;
          }
        }

        // 4. Guardar en Supabase en lote
        if (newBookings.length > 0) {
          const { error } = await supabase.from('bookings').insert(newBookings);
          if (error) throw error;
          alert(
            `✅ Sincronización Exitosa: Se importaron ${importedCount} reservas de Airbnb.`
          );
          fetchOperationalData(); // Refrescar calendario visualmente
        } else {
          alert(
            '📅 El calendario está actualizado. No hay fechas nuevas para importar.'
          );
        }
      } catch (err) {
        console.error(err);
        alert(
          'Error procesando el archivo. Asegúrate que sea un .ics válido de Airbnb/Booking.'
        );
      } finally {
        setTargetRoomId(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  // 👇 PEGAR ESTO JUSTO ANTES DEL 'return (' DEL RENDER UI 👇

  // Si el acceso está denegado, mostramos el candado y detenemos el resto
  if (accessDenied && hotelInfo) {
    return (
      <LockScreen
        hotelName={hotelInfo.name}
        reason={denyReason}
      />
    );
  }

  // 👆 👆

  // --- RENDER UI ---
  return (
    <div className='flex h-screen bg-[#F9F7F2] font-sans overflow-hidden text-[#2C2C2C]'>
      <GlobalStyles />

      {/* SIDEBAR */}
      <aside className='hidden md:flex w-72 bg-[#2C2C2C] text-[#F9F7F2] flex-col shadow-2xl z-20 rounded-r-[2rem] my-4 ml-4 h-[calc(100vh-2rem)]'>
        <div className='p-8 border-b border-[#444] flex items-center gap-4'>
          {hotelInfo?.logo_url ? (
            <img
              src={hotelInfo.logo_url}
              className='w-10 h-10 rounded-full object-cover bg-white ring-2 ring-[#8C3A3A]'
            />
          ) : (
            <div className='w-10 h-10 rounded-full bg-[#8C3A3A] flex items-center justify-center font-serif font-bold text-lg'>
              H
            </div>
          )}
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
          {/* AGENDA / CALENDARIO */}
          {activeTab === 'calendar' && (
            <div className='h-full overflow-auto custom-scrollbar relative'>
              <div className='min-w-max pb-20'>
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
                {rooms.map((r) => (
                  <div
                    key={r.id}
                    className='flex border-b border-[#E5E0D8] h-20 hover:bg-white transition-colors'
                  >
                    <div className='w-40 p-4 font-sans font-bold text-[#555] sticky left-0 bg-[#F9F7F2] z-10 border-r border-[#E5E0D8] flex items-center justify-between'>
                      <span>{r.name}</span>
                      <div className='w-1.5 h-1.5 rounded-full bg-green-400' />
                    </div>
                    {daysInMonth.map((d) => {
                      const b = getBookingForDate(r.id, d);
                      return (
                        <div
                          key={d.toString()}
                          className='w-14 border-r border-[#E5E0D8] relative p-1'
                        >
                          {b && (
                            <motion.div
                              layoutId={`booking-${b.id}`}
                              whileHover={{ scale: 1.05, zIndex: 50 }}
                              onClick={() => {
                                setSelectedBooking(b);
                                setModalTab('info');
                                setIsEditing(false);
                              }}
                              className='w-full h-full rounded-lg shadow-sm cursor-pointer border-l-4 border-black/20'
                              style={{
                                backgroundColor:
                                  b.status === 'maintenance'
                                    ? '#A8A29E'
                                    : brandColor,
                              }}
                              title={b.guests?.full_name}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
              <div className='absolute bottom-8 right-8 flex flex-col gap-4 z-30'>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowBookingModal(true)}
                  className='bg-[#2C2C2C] text-white p-5 rounded-full shadow-2xl flex items-center justify-center'
                >
                  <Plus size={24} />
                </motion.button>
              </div>
            </div>
          )}

          {/* INVENTARIO */}
          {activeTab === 'inventory' && (
            <div className='p-8 h-full overflow-auto'>
              <div className='bg-white/80 p-8 rounded-[2rem] shadow-sm border border-[#E5E0D8] mb-8 max-w-2xl'>
                <h3 className='font-serif text-2xl font-bold mb-6 text-[#2C2C2C]'>
                  Agregar Habitación
                </h3>
                <form
                  onSubmit={handleCreateRoom}
                  className='flex gap-4'
                >
                  <input
                    type='text'
                    placeholder='Ej: Suite Presidencial 505'
                    className='flex-1 px-6 py-4 bg-[#F9F7F2] rounded-xl border-none outline-none font-bold text-[#2C2C2C] shadow-inner'
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                  />
                  <button
                    className='text-white px-6 rounded-xl font-bold flex items-center justify-center shadow-lg hover:scale-105 transition-transform'
                    style={brandStyle}
                  >
                    <Plus size={24} />
                  </button>
                </form>
              </div>
              <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6'>
                {rooms.map((r) => (
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    key={r.id}
                    className='bg-white p-6 rounded-[1.5rem] border border-[#E5E0D8] shadow-sm flex justify-between items-center hover:shadow-md transition-shadow'
                  >
                    {/* 👇👇 REEMPLAZA DESDE AQUÍ 👇👇 */}
                    <div>
                      <span className='font-serif font-bold text-lg text-[#2C2C2C] block'>
                        {r.name}
                      </span>
                      <button
                        onClick={() => {
                          setTargetRoomId(r.id);
                          fileInputRef.current.click();
                        }}
                        className='text-[10px] font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg mt-2 flex items-center gap-1 hover:bg-blue-100 transition-colors'
                      >
                        <UploadCloud size={12} /> Sincronizar Airbnb
                      </button>
                    </div>
                    {/* 👆👆 HASTA AQUÍ 👆👆 */}
                    <div className='bg-[#F9F7F2] p-2 rounded-full text-[#8C3A3A]'>
                      <BedDouble size={20} />
                    </div>
                  </motion.div>
                ))}
                {rooms.length === 0 && (
                  <div className='col-span-full text-center py-10 text-[#888] font-serif italic'>
                    No hay habitaciones creadas aún.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* CONFIGURACIÓN */}
          {activeTab === 'settings' && (
            <div className='p-10 max-w-3xl mx-auto h-full overflow-auto'>
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
                        className='w-full p-4 bg-[#F9F7F2] rounded-xl border-none font-serif text-lg font-bold outline-none focus:ring-2 focus:ring-[#8C3A3A]/20'
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

                {/* 👇 2. INSERTAR ESTE BLOQUE DE SEGURIDAD AQUÍ 👇 */}
                <div className='mt-12 pt-10 border-t border-[#E5E0D8]'>
                  <h3 className='font-serif text-xl font-bold mb-4 text-[#2C2C2C] flex items-center gap-2'>
                    🔒 Seguridad de la Cuenta
                  </h3>
                  <div className='bg-red-50 border border-red-100 p-6 rounded-2xl'>
                    <p className='text-sm text-red-800 mb-4'>
                      Cambia tu contraseña periódicamente para mantener tu hotel
                      seguro.
                    </p>
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
                        className='bg-red-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20'
                      >
                        Actualizar Clave
                      </button>
                    </form>
                  </div>
                </div>
                {/* 👆 FIN DEL BLOQUE DE SEGURIDAD 👆 */}

                {/* BLOQUE NUEVO: MOTOR DE RESERVAS */}
                <div className='mt-12 pt-10 border-t border-[#E5E0D8]'>
                  <h3 className='font-serif text-xl font-bold mb-4 text-[#2C2C2C] flex items-center gap-2'>
                    🌐 Tu Página Web de Reservas
                  </h3>
                  <div className='bg-blue-50 border border-blue-200 p-6 rounded-2xl'>
                    <p className='text-sm text-blue-800 mb-3'>
                      Este es tu enlace único. Compártelo en redes sociales para
                      recibir reservas automáticas.
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
                        className='bg-blue-600 text-white font-bold px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors'
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

                {/* 🟢 IMPLEMENTACIÓN #1: Generador de QR para el Menú */}
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
                        Imprime este código y colócalo en las habitaciones (mesa
                        de noche o escritorio). Tus huéspedes podrán escanearlo
                        para ver el menú y pedir comida directamente a
                        recepción.
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

          {/* HUESPEDES */}
          {activeTab === 'guests' && (
            <div className='p-8 h-full overflow-auto'>
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

                    {/* --- BOTONES DE ACCIÓN (Editar) --- */}
                    <div className='flex items-center gap-3'>
                      <button
                        onClick={() => setEditingGuest(g)}
                        className='p-2 bg-slate-100 text-slate-600 rounded-full hover:bg-slate-200 hover:text-[#8C3A3A] transition-colors'
                        title='Editar Datos'
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
                className='fixed inset-0 bg-[#2C2C2C]/30 backdrop-blur-sm z-40'
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
            <div className='fixed inset-0 bg-[#2C2C2C]/40 backdrop-blur-sm z-50 flex items-center justify-center p-4'>
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
                  {/* --- BLOQUE CORREGIDO: CAMPOS DE RESERVA --- */}
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

                      {/* CAMPOS FALTANTES AGREGADOS */}
                      <div className='grid grid-cols-2 gap-4'>
                        <div>
                          <label className='text-[10px] font-bold uppercase text-[#5D5555] tracking-widest'>
                            Documento ID
                          </label>
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
                        </div>
                        <div>
                          <label className='text-[10px] font-bold uppercase text-[#5D5555] tracking-widest'>
                            Celular (WhatsApp)
                          </label>
                          <input
                            required
                            className='w-full p-3 bg-white rounded-xl border-none outline-none font-bold text-[#2C2C2C]'
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
                  {/* --- FIN DEL BLOQUE --- */}
                  <button className='w-full bg-[#8C3A3A] text-white font-bold py-4 rounded-xl shadow-lg shadow-[#8C3A3A]/30 mt-2'>
                    Crear Reserva
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MODAL DETALLES / EDICIÓN */}
        <AnimatePresence>
          {selectedBooking && (
            <div className='fixed inset-0 bg-[#2C2C2C]/40 backdrop-blur-sm z-50 flex items-center justify-center p-4'>
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
                            {/* --- PEGAR ESTE BLOQUE DE INICIO A FIN --- */}
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
                            {selectedBooking.status !== 'maintenance' && (
                              <div className='flex gap-2'>
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
                              </div>
                            )}
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
                                      onClick={() =>
                                        handleDeleteCharge(c.id, c.price)
                                      }
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
        {/* ` */}
        {/* --- MODAL EDITAR HUÉSPED (PESTAÑA HUÉSPEDES) --- */}
        <AnimatePresence>
          {editingGuest && (
            <div className='fixed inset-0 bg-[#2C2C2C]/40 backdrop-blur-sm z-50 flex items-center justify-center p-4'>
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className='bg-[#F9F7F2] rounded-[2rem] w-full max-w-sm shadow-2xl overflow-hidden'
              >
                <div className='p-6 border-b border-[#E5E0D8] flex justify-between items-center'>
                  <h3 className='font-serif text-xl font-bold'>
                    Editar Huésped
                  </h3>
                  <button onClick={() => setEditingGuest(null)}>
                    <X />
                  </button>
                </div>
                <form
                  onSubmit={handleUpdateGuest}
                  className='p-6 space-y-4'
                >
                  <div>
                    <label className='text-[10px] font-bold uppercase text-[#5D5555] tracking-widest'>
                      Nombre
                    </label>
                    <input
                      className='w-full p-3 bg-white rounded-xl border-none outline-none font-bold'
                      value={editingGuest.full_name}
                      onChange={(e) =>
                        setEditingGuest({
                          ...editingGuest,
                          full_name: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className='text-[10px] font-bold uppercase text-[#5D5555] tracking-widest'>
                      Documento
                    </label>
                    <input
                      className='w-full p-3 bg-white rounded-xl border-none outline-none font-bold'
                      value={editingGuest.doc_number || ''}
                      onChange={(e) =>
                        setEditingGuest({
                          ...editingGuest,
                          doc_number: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className='text-[10px] font-bold uppercase text-[#5D5555] tracking-widest'>
                      Teléfono
                    </label>
                    <input
                      className='w-full p-3 bg-white rounded-xl border-none outline-none font-bold'
                      value={editingGuest.phone || ''}
                      onChange={(e) =>
                        setEditingGuest({
                          ...editingGuest,
                          phone: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className='text-[10px] font-bold uppercase text-[#5D5555] tracking-widest'>
                      Email
                    </label>
                    <input
                      className='w-full p-3 bg-white rounded-xl border-none outline-none font-bold'
                      value={editingGuest.email || ''}
                      onChange={(e) =>
                        setEditingGuest({
                          ...editingGuest,
                          email: e.target.value,
                        })
                      }
                    />
                  </div>
                  <button className='w-full bg-[#8C3A3A] text-white font-bold py-3 rounded-xl mt-2'>
                    Guardar Cambios
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
        {/* ` */}
      </main>
      <nav className='md:hidden fixed bottom-0 left-0 w-full bg-white border-t flex justify-around p-3 z-50'>
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
      {/* --- INSERTAR: Input invisible para leer archivos --- */}
      <input
        type='file'
        accept='.ics'
        ref={fileInputRef}
        className='hidden'
        onChange={handleIcalUpload}
      />
    </div>
  );
};

const NavButton = ({ icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${
      active
        ? 'bg-[#F9F7F2] text-[#2C2C2C] shadow-md'
        : 'text-[#888] hover:text-[#F9F7F2]'
    }`}
  >
    {icon} <span className='font-sans font-bold tracking-wide'>{label}</span>
  </button>
);

export default DashboardPage;

// 👇 COPIA ESTO AL FINAL DEL ARCHIVO DashboardPage.jsx (Fuera del componente principal)

const LockScreen = ({ hotelName, reason }) => (
  <div className='fixed inset-0 bg-[#2C2C2C] z-50 flex flex-col items-center justify-center text-white p-6 text-center'>
    <div className='bg-red-500/20 p-6 rounded-full mb-6 animate-pulse'>
      <svg
        xmlns='http://www.w3.org/2000/svg'
        width='64'
        height='64'
        viewBox='0 0 24 24'
        fill='none'
        stroke='#EF4444'
        strokeWidth='2'
        strokeLinecap='round'
        strokeLinejoin='round'
      >
        <rect
          x='3'
          y='11'
          width='18'
          height='11'
          rx='2'
          ry='2'
        ></rect>
        <path d='M7 11V7a5 5 0 0 1 10 0v4'></path>
      </svg>
    </div>

    <h1 className='text-4xl font-serif font-bold mb-4'>Acceso Restringido</h1>

    <p className='text-xl text-gray-300 max-w-md mb-8'>
      {reason === 'suspended'
        ? `El servicio para ${hotelName} ha sido suspendido temporalmente.`
        : `El periodo de prueba de ${hotelName} ha finalizado.`}
    </p>

    <div className='bg-white/10 p-6 rounded-xl border border-white/20 max-w-sm w-full'>
      <p className='text-sm text-gray-400 mb-2'>
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
        <svg
          xmlns='http://www.w3.org/2000/svg'
          width='20'
          height='20'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          strokeWidth='2'
          strokeLinecap='round'
          strokeLinejoin='round'
        >
          <path d='M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z'></path>
        </svg>
        Contactar Soporte
      </button>
    </div>

    <p className='mt-8 text-xs text-gray-500'>ID del Hotel: {hotelName}</p>
  </div>
);
