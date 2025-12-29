import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { createClient } from '@supabase/supabase-js';
import {
  Building2,
  MapPin,
  DollarSign,
  Search,
  TrendingUp,
  Users,
  AlertCircle,
  Edit,
  ExternalLink,
  Inbox,
  CheckCircle,
  XCircle,
  MessageCircle,
  Trash2, // <--- ¡SOLO UNA VEZ!
  LogOut, // <--- Este es el nuevo para salir
} from 'lucide-react';

const SuperAdminPage = () => {
  const navigate = useNavigate();

  // 🛡️ GUARDIÁN DE SEGURIDAD (CANDADO)
  useEffect(() => {
    const checkAccess = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // 1. Si no hay usuario logueado -> Fuera
      if (!user) {
        alert('⛔ Acceso Prohibido: Identifícate.');
        return navigate('/login');
      }

      // 2. (OPCIONAL) Si quieres que SOLO TU CORREO pueda entrar, descomenta esto:
      /*
      if (user.email !== 'tucorreo@gmail.com') {
         alert("⛔ No eres el Super Admin.");
         return navigate('/dashboard');
      }
      */
    };
    checkAccess();
  }, []);
  // --- ESTADOS ---
  const [activeTab, setActiveTab] = useState('hotels'); // 'hotels' | 'leads'
  const [hotels, setHotels] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingHotel, setEditingHotel] = useState(null);

  const [stats, setStats] = useState({
    mrr: 0,
    active: 0,
    trial: 0,
    suspended: 0,
    pendingLeads: 0,
  });

  // Estado Control de Lanzamiento (DECLARADO UNA SOLA VEZ ✅)
  const [launchData, setLaunchData] = useState({
    id: null,
    taken: 0,
    total: 12,
  });

  // --- EFECTOS ---
  useEffect(() => {
    fetchData();
    fetchLaunchStatus();
  }, []);

  // ⭐ VIGILANTE NUEVO: Esto arregla el contador "0" recalculando al detectar cambios
  useEffect(() => {
    calculateStats(hotels, leads);
  }, [hotels, leads]);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchHotels(), fetchLeads()]);
    setLoading(false);
  };

  // --- FUNCIONES DE LÓGICA ---

  const fetchHotels = async () => {
    const { data } = await supabase
      .from('hotels')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) {
      setHotels(data);
      calculateStats(data, leads);
    }
  };

  const fetchLeads = async () => {
    const { data } = await supabase
      .from('leads')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (data) {
      setLeads(data);
      if (hotels.length > 0) calculateStats(hotels, data);
    }
  };

  const fetchLaunchStatus = async () => {
    const { data } = await supabase
      .from('launch_control')
      .select('*')
      .limit(1)
      .maybeSingle();
    if (data) {
      setLaunchData({
        id: data.id,
        taken: data.spots_taken,
        total: data.total_spots,
      });
    }
  };

  const calculateStats = (hotelsData, leadsData = []) => {
    const activeHotels = hotelsData.filter((h) => h.status === 'active');
    const trialHotels = hotelsData.filter((h) => h.status === 'trial');
    const suspendedHotels = hotelsData.filter((h) => h.status === 'suspended');

    const totalRevenue = activeHotels.reduce(
      (acc, curr) => acc + (curr.monthly_price || 29),
      0
    );

    setStats({
      mrr: totalRevenue,
      active: activeHotels.length,
      trial: trialHotels.length,
      suspended: suspendedHotels.length,
      pendingLeads: leadsData.length,
    });
  };

  // --- ACCIONES ---

  // 👇 FUNCIÓN ACTUALIZADA: PROTECCIÓN CON CONFIRMACIÓN DE TEXTO
  const handleDeleteHotel = async (hotel) => {
    // 1. Primer aviso visual (Soft Warning)
    const confirmMsg = `⚠️ ZONA DE PELIGRO ⚠️\n\nEstás a punto de ELIMINAR PERMANENTEMENTE el hotel:\n\n🏨 ${hotel.name}\n\nSe borrarán:\n- Todas sus reservas\n- Historial de huéspedes\n- Configuración y Habitaciones\n\nPara confirmar, escribe la palabra "BORRAR" (en mayúsculas) a continuación:`;

    const userInput = window.prompt(confirmMsg);

    // 2. Validación Estricta (Hard Lock)
    if (userInput !== 'BORRAR') {
      if (userInput !== null) {
        // Si no le dio Cancelar, pero escribió mal
        alert(
          '❌ Operación cancelada. La palabra de confirmación no coincide.'
        );
      }
      // 👇 FUNCIÓN PARA CERRAR SESIÓN
      const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login');
      };
      return; // Abortar misión
    }

    // 3. Ejecución Nuclear (Solo si pasó la validación)
    const { error } = await supabase.from('hotels').delete().eq('id', hotel.id);

    if (error) {
      alert('Error crítico al borrar: ' + error.message);
    } else {
      // Feedback positivo y recarga
      alert(`✅ El hotel "${hotel.name}" ha sido eliminado del sistema.`);
      fetchHotels();
      // Actualizar también las stats de lanzamiento si es necesario
      if (launchData.taken > 0) updateLaunchSpots(launchData.taken - 1);
    }
  };

  // 👇 FUNCIÓN CON DIAGNÓSTICO (DEBUG)
  const handleManualCreate = async () => {
    console.log('🚀 Iniciando creación manual...');

    const name = window.prompt('Nombre del Hotel:');
    if (!name) return;

    // 👇 CORRECCIÓN AQUÍ:
    const rawEmail = window.prompt('Correo (Usuario):'); // 1. La recibimos como "cruda" (raw)
    if (!rawEmail) return;

    const email = rawEmail.toLowerCase().trim(); // 2. La limpiamos y guardamos como 'email' final

    // ... resto del código igual ...
    const password = window.prompt('Contraseña temporal:', 'hotel123');
    const phone = window.prompt('WhatsApp:');
    const location = prompt('Ubicación:', 'Villa de Leyva');

    console.log('1️⃣ Intentando conectar con Supabase Auth...');

    // Cliente Temporal
    const tempSupabase = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    // Intentar crear usuario
    const { data: authData, error: authError } = await tempSupabase.auth.signUp(
      {
        email: email,
        password: password,
      }
    );

    if (authError) {
      console.error('❌ Error en Auth:', authError);
      alert('❌ Error creando usuario: ' + authError.message);
      return; // 🛑 AQUÍ SE DETIENE SI FALLA EL USUARIO
    }

    console.log('✅ Usuario creado en Auth:', authData);

    // Crear Hotel
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 30);

    const { error: dbError } = await supabase.from('hotels').insert([
      {
        name: name,
        email: email,
        phone: phone,
        status: 'trial',
        trial_ends_at: trialEnd.toISOString(),
        monthly_price: 29,
        location: location || 'Ubicación pendiente',
      },
    ]);

    if (dbError) {
      console.error('❌ Error en DB:', dbError);
      alert('⚠️ Usuario creado pero falló el hotel: ' + dbError.message);
    } else {
      console.log('✅ Hotel creado en DB');
      fetchHotels();
      alert(`✅ TODO ÉXITO: Usuario ${email} creado.`);
    }
  };
  // ... (aquí siguen tus funciones existentes como handleApproveLead)
  const updateLaunchSpots = async (newVal) => {
    const safeVal = Math.max(0, Math.min(newVal, launchData.total));
    const { error } = await supabase
      .from('launch_control')
      .update({ spots_taken: safeVal })
      .eq('id', launchData.id);

    if (!error) setLaunchData({ ...launchData, taken: safeVal });
  };

  const handleApproveLead = async (lead) => {
    // 1. Red de Seguridad: Si no hay nombre de hotel, usamos "Hotel de [Dueño]"
    const safeHotelName = lead.hotel_name || `Hotel de ${lead.full_name}`;

    // 2. Confirmación visual para ti
    if (!window.confirm(`¿Aprobar y crear cuenta para "${safeHotelName}"?`))
      return;

    // 3. Calcular fecha de prueba (30 días)
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 30);

    // 4. Crear el Hotel (Usando el nombre seguro)
    const { error: hotelError } = await supabase.from('hotels').insert([
      {
        name: safeHotelName, // 👈 AQUÍ ESTÁ EL TRUCO
        location: lead.city_interest || 'Villa de Leyva',
        status: 'trial',
        trial_ends_at: trialEnd.toISOString(),
        monthly_price: 0,
        phone: lead.phone,
        email: lead.email,
        slug: null, // Ya lo hicimos opcional en la base de datos
      },
    ]);

    if (hotelError) {
      console.error(hotelError);
      return alert('Error al crear hotel: ' + hotelError.message);
    }

    // 5. Actualizar la solicitud a "aprobada"
    await supabase
      .from('leads')
      .update({ status: 'approved' })
      .eq('id', lead.id);

    // 6. Actualizar contadores
    updateLaunchSpots(launchData.taken + 1);

    alert(`¡${safeHotelName} ha sido admitido exitosamente!`);
    fetchData(); // Recargar la lista
  };

  const handleRejectLead = async (leadId) => {
    if (!window.confirm('¿Rechazar esta solicitud?')) return;
    await supabase
      .from('leads')
      .update({ status: 'rejected' })
      .eq('id', leadId);
    fetchData();
  };

  // --- FUNCIONES ANTIGUAS (Mantenidas para compatibilidad) ---
  const handleAddMonth = async (hotelId) => {
    if (!window.confirm('¿Confirmar pago manual (+30 días)?')) return;
    const newDate = new Date();
    newDate.setDate(newDate.getDate() + 30);
    await supabase
      .from('hotels')
      .update({ status: 'active', subscription_ends_at: newDate.toISOString() })
      .eq('id', hotelId);
    fetchHotels();
  };

  const toggleSuspend = async (hotelId, currentStatus) => {
    const newStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
    await supabase
      .from('hotels')
      .update({ status: newStatus })
      .eq('id', hotelId);
    fetchHotels();
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    await supabase
      .from('hotels')
      .update({
        name: editingHotel.name,
        monthly_price: editingHotel.monthly_price,
        subscription_ends_at: editingHotel.subscription_ends_at,
        location: editingHotel.location,
      })
      .eq('id', editingHotel.id);
    setEditingHotel(null);
    fetchHotels();
  };
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };
  // --- RENDERIZADO ---

  return (
    <div className='min-h-screen bg-[#F3F4F6] p-8 font-sans text-[#1F2937]'>
      {/* HEADER */}
      <header className='mb-8'>
        <h1 className='font-serif text-3xl font-bold text-[#111827] mb-6 flex justify-between items-center'>
          <span>Panel de Control (CEO) 💼</span>
          <div className='flex gap-2'>
            <button
              onClick={() => setActiveTab('hotels')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                activeTab === 'hotels'
                  ? 'bg-[#1F2937] text-white'
                  : 'bg-white text-gray-500'
              }`}
            >
              Hoteles
            </button>
            <button
              onClick={() => setActiveTab('leads')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 ${
                activeTab === 'leads'
                  ? 'bg-[#1F2937] text-white'
                  : 'bg-white text-gray-500'
              }`}
            >
              Solicitudes
              {stats.pendingLeads > 0 && (
                <span className='bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full'>
                  {stats.pendingLeads}
                </span>
              )}
            </button>
            {/* 👇 NUEVO BOTÓN DE CERRAR SESIÓN */}
            <button
              onClick={handleLogout}
              className='px-4 py-2 rounded-lg text-sm font-bold bg-red-50 text-red-600 hover:bg-red-100 transition-colors flex items-center gap-2'
              title='Cerrar Sesión'
            >
              <LogOut size={16} /> Salir
            </button>
          </div>
        </h1>

        {/* METRICS GRID */}
        <div className='grid grid-cols-1 md:grid-cols-5 gap-4 mb-8'>
          {/* MRR */}
          <div className='bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3'>
            <div className='bg-green-100 p-2 rounded-lg text-green-700'>
              <DollarSign size={20} />
            </div>
            <div>
              <p className='text-[10px] text-gray-500 font-bold uppercase'>
                MRR
              </p>
              <p className='text-xl font-bold'>${stats.mrr.toLocaleString()}</p>
            </div>
          </div>
          {/* Solicitudes (NUEVO) */}
          <div className='bg-white p-4 rounded-xl border border-blue-200 shadow-sm flex items-center gap-3 relative overflow-hidden'>
            <div className='absolute right-0 top-0 w-16 h-16 bg-blue-50 rounded-bl-full -mr-8 -mt-8' />
            <div className='bg-blue-100 p-2 rounded-lg text-blue-700 relative'>
              <Inbox size={20} />
            </div>
            <div className='relative'>
              <p className='text-[10px] text-gray-500 font-bold uppercase'>
                Solicitudes
              </p>
              <p className='text-xl font-bold text-blue-600'>
                {stats.pendingLeads}
              </p>
            </div>
          </div>
          {/* Activos */}
          <div className='bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3'>
            <div className='bg-gray-100 p-2 rounded-lg text-gray-700'>
              <Users size={20} />
            </div>
            <div>
              <p className='text-[10px] text-gray-500 font-bold uppercase'>
                Activos
              </p>
              <p className='text-xl font-bold'>{stats.active}</p>
            </div>
          </div>
          {/* Control Lanzamiento */}
          <div className='md:col-span-2 bg-[#1F2937] text-white p-4 rounded-xl shadow-lg flex items-center justify-between gap-4'>
            <div>
              <p className='text-[10px] text-gray-400 uppercase tracking-widest'>
                Cupos Fundadores
              </p>
              <div className='flex items-baseline gap-2'>
                <span className='text-2xl font-serif font-bold'>
                  {launchData.taken}
                </span>
                <span className='text-sm text-gray-500'>
                  / {launchData.total}
                </span>
              </div>
            </div>
            <div className='flex gap-2'>
              <button
                onClick={() => updateLaunchSpots(launchData.taken - 1)}
                className='w-8 h-8 rounded-lg bg-gray-700 hover:bg-gray-600 flex items-center justify-center font-bold'
              >
                -
              </button>
              <button
                onClick={() => updateLaunchSpots(launchData.taken + 1)}
                className='w-8 h-8 rounded-lg bg-green-600 hover:bg-green-500 flex items-center justify-center font-bold'
              >
                +
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* --- CONTENIDO PRINCIPAL (TABS) --- */}

      {/* TAB 1: LISTA DE HOTELES */}
      {activeTab === 'hotels' && (
        <>
          {/* 👇 CAMBIO 1: Convertimos esto en un Flex para poner el botón de crear al lado */}
          <div className='flex flex-col md:flex-row gap-4 mb-6'>
            <div className='relative flex-1'>
              <Search
                className='absolute left-3 top-3 text-gray-400'
                size={20}
              />
              <input
                type='text'
                placeholder='Buscar hotel...'
                className='w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500'
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {/* Botón para Crear Manualmente */}
            <button
              onClick={handleManualCreate}
              className='bg-black text-white px-6 py-2.5 rounded-lg font-bold hover:bg-gray-800 transition-colors shadow-lg'
            >
              + Crear Hotel
            </button>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
            {hotels
              .filter((h) =>
                h.name.toLowerCase().includes(searchTerm.toLowerCase())
              )
              .map((hotel) => (
                <div
                  key={hotel.id}
                  className={`relative p-6 rounded-2xl border bg-white ${
                    hotel.status === 'suspended'
                      ? 'border-red-300 bg-red-50'
                      : 'border-gray-200'
                  }`}
                >
                  <div className='flex justify-between items-start mb-4'>
                    <div>
                      <h3
                        className='font-serif text-xl font-bold truncate max-w-[180px]'
                        title={hotel.name}
                      >
                        {hotel.name}
                      </h3>
                      <div className='flex gap-1 mt-1'>
                        {/* BOTONES DE ACCIÓN: EDITAR Y VER WEB */}
                        <button
                          onClick={() => setEditingHotel(hotel)}
                          className='text-gray-400 hover:text-blue-600'
                          title='Editar'
                        >
                          <Edit size={16} />
                        </button>

                        {/* 👇 CAMBIO 2: BOTÓN DE BORRAR (Trash2) */}
                        <button
                          onClick={() => handleDeleteHotel(hotel)}
                          className='text-gray-400 hover:text-red-600'
                          title='Eliminar Hotel'
                        >
                          <Trash2 size={16} />
                        </button>

                        <a
                          href={`/book/${hotel.id}`}
                          target='_blank'
                          rel='noopener noreferrer'
                          className='text-gray-400 hover:text-green-600'
                          title='Ver web pública'
                        >
                          <ExternalLink size={16} />
                        </a>

                        {/* ... (Aquí sigue tu código original del botón de WhatsApp) ... */}
                        {hotel.phone && (
                          <a
                            href={(function () {
                              let cleanPhone = hotel.phone.replace(/\D/g, '');
                              if (!cleanPhone.startsWith('57')) {
                                cleanPhone = '57' + cleanPhone;
                              }

                              const bookingLink = `${window.location.origin}/book/${hotel.id}`;
                              const dashboardLink = `${window.location.origin}/login`;

                              const message = `Hola! 👋 Felicidades, el hotel *${
                                hotel.name
                              }* ha sido seleccionado en HospedaSuite Elite.
                        
🚀 *TUS ACCESOS OFICIALES:*

1️⃣ *Motor de Reservas (Para tus huéspedes):*
${bookingLink}
(Comparte este link para recibir reservas sin comisión)

2️⃣ *Tu Panel de Control (Para ti):*
${dashboardLink}

🔑 *Credenciales de Acceso:*
Usuario: ${hotel.email || 'Tu correo registrado'}
Clave Temporal: hotel123 (Cámbiala al ingresar)

¡Bienvenido a la familia! Un consultor te contactará pronto para tu capacitación.`;

                              return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(
                                message
                              )}`;
                            })()}
                            target='_blank'
                            rel='noopener noreferrer'
                            className='text-gray-400 hover:text-green-500'
                            title={`Enviar accesos a: ${hotel.phone}`}
                          >
                            <MessageCircle size={16} />
                          </a>
                        )}
                      </div>
                    </div>
                    {/* ... (Resto de tu código original: estado, ubicación, botones de pago) ... */}
                    <span
                      className={`text-[10px] font-black px-2 py-1 rounded-full uppercase ${
                        hotel.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-purple-100 text-purple-700'
                      }`}
                    >
                      {hotel.status}
                    </span>
                  </div>
                  <div className='text-sm text-gray-500 mb-4'>
                    <MapPin
                      size={12}
                      className='inline mr-1'
                    />{' '}
                    {hotel.location}
                  </div>

                  <div className='grid grid-cols-2 gap-2 mt-4'>
                    <button
                      onClick={() => handleAddMonth(hotel.id)}
                      className='flex items-center justify-center gap-1 px-3 py-2 bg-green-50 text-green-700 text-xs font-bold rounded-lg hover:bg-green-100 transition-colors'
                    >
                      <DollarSign size={14} /> Registrar Pago
                    </button>
                    <button
                      onClick={() => toggleSuspend(hotel.id, hotel.status)}
                      className={`flex items-center justify-center gap-1 px-3 py-2 text-xs font-bold rounded-lg transition-colors ${
                        hotel.status === 'suspended'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-red-50 text-red-600'
                      }`}
                    >
                      <AlertCircle size={14} />{' '}
                      {hotel.status === 'suspended' ? 'Reactivar' : 'Suspender'}
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </>
      )}

      {/* TAB 2: ADMISIONES (CRM) */}
      {activeTab === 'leads' && (
        <div className='max-w-4xl mx-auto'>
          {leads.length === 0 ? (
            <div className='text-center py-20 text-gray-400'>
              <Inbox
                size={48}
                className='mx-auto mb-4 opacity-20'
              />
              <p>No hay solicitudes pendientes. ¡Buen trabajo!</p>
            </div>
          ) : (
            <div className='space-y-4'>
              {leads.map((lead) => (
                <div
                  key={lead.id}
                  className='bg-white p-6 rounded-2xl border border-blue-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 hover:shadow-md transition-shadow'
                >
                  <div className='flex-1'>
                    <div className='flex items-center gap-3 mb-1'>
                      <h3 className='font-serif text-xl font-bold text-gray-900'>
                        {lead.hotel_name}
                      </h3>
                      <span className='bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider'>
                        Postulante
                      </span>
                    </div>
                    <p className='text-sm text-gray-500 mb-2 flex items-center gap-2'>
                      <Users size={14} /> {lead.full_name}
                      <span className='text-gray-300'>|</span>
                      <MapPin size={14} /> {lead.city_interest}
                    </p>
                    <div className='flex gap-2 text-xs'>
                      <span className='bg-gray-100 px-2 py-1 rounded text-gray-600'>
                        📞 {lead.phone}
                      </span>
                      <span className='bg-gray-100 px-2 py-1 rounded text-gray-600'>
                        📧 {lead.email}
                      </span>
                    </div>

                    {/* TRAZABILIDAD FORENSE (CEO Insight) */}
                    <div className='mt-3 p-2 bg-slate-50 rounded-lg border border-slate-200'>
                      <p className='text-[10px] font-mono text-slate-400 uppercase mb-1 flex items-center gap-1'>
                        <TrendingUp size={10} /> Origen de Campaña
                      </p>
                      <div className='text-[10px] font-mono text-slate-600 break-all leading-tight'>
                        {lead.metadata?.source_url || 'Tráfico Orgánico'}
                      </div>
                      <div className='mt-1 text-[9px] text-slate-400 italic truncate'>
                        Disp: {lead.metadata?.user_agent?.substring(0, 50)}...
                      </div>
                    </div>
                  </div>

                  <div className='flex gap-3'>
                    <button
                      onClick={() => handleRejectLead(lead.id)}
                      className='px-4 py-2 rounded-xl text-red-500 font-bold hover:bg-red-50 transition-colors flex items-center gap-2 text-xs'
                    >
                      <XCircle size={16} /> Rechazar
                    </button>
                    <button
                      onClick={() => handleApproveLead(lead)}
                      className='px-6 py-3 rounded-xl bg-slate-900 text-white font-bold shadow-lg hover:bg-black transition-transform hover:scale-105 flex items-center gap-2 text-xs tracking-wide'
                    >
                      <CheckCircle size={16} /> APROBAR & CREAR
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL DE EDICIÓN */}
      {editingHotel && (
        <div className='fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4'>
          <div className='bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden'>
            <div className='bg-[#2C2C2C] p-6 text-white flex justify-between items-center'>
              <h3 className='font-serif text-xl font-bold'>
                Editar Suscripción
              </h3>
              <button
                onClick={() => setEditingHotel(null)}
                className='hover:bg-white/20 p-1 rounded-full'
              >
                <Edit size={18} />
              </button>
            </div>
            <form
              onSubmit={handleSaveEdit}
              className='p-6 space-y-4'
            >
              <div>
                <label className='block text-xs font-bold text-gray-500 uppercase mb-1'>
                  Nombre
                </label>
                <input
                  type='text'
                  className='w-full p-3 border rounded-xl font-bold text-gray-800'
                  value={editingHotel.name}
                  onChange={(e) =>
                    setEditingHotel({ ...editingHotel, name: e.target.value })
                  }
                />
              </div>
              <div>
                <label className='block text-xs font-bold text-gray-500 uppercase mb-1'>
                  Ubicación / Ciudad
                </label>
                <input
                  type='text'
                  className='w-full p-3 border rounded-xl font-bold text-gray-800'
                  value={editingHotel.location || ''}
                  onChange={(e) =>
                    setEditingHotel({
                      ...editingHotel,
                      location: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label className='block text-xs font-bold text-gray-500 uppercase mb-1'>
                  Precio ($)
                </label>
                <input
                  type='number'
                  className='w-full p-3 border rounded-xl font-bold text-gray-800'
                  value={editingHotel.monthly_price || 29}
                  onChange={(e) =>
                    setEditingHotel({
                      ...editingHotel,
                      monthly_price: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label className='block text-xs font-bold text-gray-500 uppercase mb-1'>
                  Vencimiento
                </label>
                <input
                  type='date'
                  className='w-full p-3 border rounded-xl font-bold text-gray-800'
                  value={
                    editingHotel.subscription_ends_at
                      ? new Date(editingHotel.subscription_ends_at)
                          .toISOString()
                          .split('T')[0]
                      : ''
                  }
                  onChange={(e) =>
                    setEditingHotel({
                      ...editingHotel,
                      subscription_ends_at: e.target.value,
                    })
                  }
                />
              </div>
              <div className='flex gap-3 pt-4'>
                <button
                  type='button'
                  onClick={() => setEditingHotel(null)}
                  className='flex-1 py-3 text-gray-500 font-bold hover:bg-gray-100 rounded-xl'
                >
                  Cancelar
                </button>
                <button
                  type='submit'
                  className='flex-1 py-3 bg-[#2C2C2C] text-white font-bold rounded-xl shadow-lg hover:bg-black'
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminPage;
