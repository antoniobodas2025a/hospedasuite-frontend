import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
// NOTA: Ya no usamos createClient para el admin, usamos fetch directo para el bypass
import {
  Building2,
  Users,
  Settings,
  Activity,
  Search,
  Bell,
  Plus,
  MoreHorizontal,
  TrendingUp,
  ShieldCheck,
  Zap,
  LayoutGrid,
  ListFilter,
  MapPin,
  Trash2,
  Edit,
  ExternalLink,
  MessageCircle,
  Inbox,
  CheckCircle,
  XCircle,
  LogOut,
  DollarSign,
  AlertCircle,
  Menu,
  Target,
  LogIn,
  Key,
} from 'lucide-react';

// --- COMPONENTES VISUALES ---
const LiquidLayout = ({ children }) => (
  <div className='min-h-screen bg-[#09090b] relative overflow-hidden font-sans antialiased selection:bg-blue-500/30 selection:text-white'>
    <div className='fixed inset-0 z-0 bg-[#09090b]' />
    <div className='fixed top-[-20%] left-[-10%] w-[800px] h-[800px] bg-blue-900/20 rounded-full blur-[120px] opacity-60 animate-pulse-slow' />
    <div className='fixed bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-indigo-900/10 rounded-full blur-[100px] opacity-60' />
    <div className='fixed inset-0 z-0 bg-noise opacity-[0.02] mix-blend-overlay pointer-events-none'></div>
    <div className='relative z-10 flex flex-col md:flex-row h-screen p-4 md:p-6 gap-4 md:gap-6'>
      {children}
    </div>
    <style>{`
      .bg-noise { background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E"); }
      @keyframes pulse-slow { 0%, 100% { opacity: 0.4; transform: scale(1); } 50% { opacity: 0.6; transform: scale(1.05); } }
      .animate-pulse-slow { animation: pulse-slow 8s ease-in-out infinite; }
      .custom-scrollbar::-webkit-scrollbar { width: 4px; }
      .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.02); }
      .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
    `}</style>
  </div>
);

const SuperAdminPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('hotels');
  const [processingId, setProcessingId] = useState(null);
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
  const [launchData, setLaunchData] = useState({
    id: null,
    taken: 0,
    total: 12,
  });

  useEffect(() => {
    const checkAccess = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return navigate('/login');
    };
    checkAccess();
    fetchData();
    fetchLaunchStatus();
  }, []);

  useEffect(() => {
    calculateStats(hotels, leads);
  }, [hotels, leads]);

  const fetchData = async () => {
    setLoading(true);
    const { data: leadsData } = await supabase
      .from('platform_leads')
      .select('*')
      .order('created_at', { ascending: false });
    if (leadsData) setLeads(leadsData);
    const { data: hotelsData } = await supabase
      .from('hotels')
      .select('*')
      .order('created_at', { ascending: false });
    if (hotelsData) setHotels(hotelsData);
    setLoading(false);
  };

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

  const fetchLaunchStatus = async () => {
    const { data } = await supabase
      .from('launch_control')
      .select('*')
      .limit(1)
      .maybeSingle();
    if (data)
      setLaunchData({
        id: data.id,
        taken: data.spots_taken,
        total: data.total_spots,
      });
  };

  const calculateStats = (hotelsData, leadsData = []) => {
    const activeHotels = hotelsData.filter((h) => h.status === 'active');
    const totalRevenue = activeHotels.reduce(
      (acc, curr) => acc + (curr.monthly_price || 29),
      0
    );
    setStats({
      mrr: totalRevenue,
      active: activeHotels.length,
      trial: hotelsData.filter((h) => h.status === 'trial').length,
      suspended: hotelsData.filter((h) => h.status === 'suspended').length,
      pendingLeads: leadsData.filter((l) => l.status === 'pending').length,
    });
  };

  const updateLaunchSpots = async (newVal) => {
    const safeVal = Math.max(0, Math.min(newVal, launchData.total));
    const { error } = await supabase
      .from('launch_control')
      .update({ spots_taken: safeVal })
      .eq('id', launchData.id);
    if (!error) setLaunchData({ ...launchData, taken: safeVal });
  };

  // 🔥 MODO DIOS: BYPASS HTTP
  const handleAccessHotel = async (hotel) => {
    const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
    const projectUrl = import.meta.env.VITE_SUPABASE_URL;

    if (!serviceRoleKey) {
      alert(
        '⚠️ ERROR DE CONFIGURACIÓN:\nNo se encontró VITE_SUPABASE_SERVICE_ROLE_KEY en .env.\nReinicia el servidor (npm run dev) si acabas de guardarlo.'
      );
      return;
    }

    if (
      !window.confirm(
        `⚠️ MODO DIOS ACTIVADO\n\nEntrando a "${hotel.name}" sin contraseña...\n\nTu sesión actual se cerrará.`
      )
    )
      return;

    try {
      const response = await fetch(
        `${projectUrl}/auth/v1/admin/generate_link`,
        {
          method: 'POST',
          headers: {
            apikey: serviceRoleKey,
            Authorization: `Bearer ${serviceRoleKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'magiclink',
            email: hotel.email,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.msg || data.error_description || 'Error desconocido del servidor'
        );
      }

      const magicLink = data.properties?.action_link || data.action_link;

      if (!magicLink) throw new Error('No se recibió el enlace mágico');

      await supabase.auth.signOut();

      window.location.href =
        magicLink + '&redirect_to=' + window.location.origin;
    } catch (err) {
      console.error('Error Modo Dios:', err);
      alert('❌ Falló el acceso directo.\n\nCausa: ' + err.message);
    }
  };

  // 🔥 BORRADO BLINDADO V4
  const handleDeleteHotel = async (hotel) => {
    const userInput = window.prompt(
      `⚠️ BORRADO FINAL ⚠️\n\nVas a eliminar a "${hotel.name}".\nEscribe "BORRAR" para confirmar la limpieza total:`
    );
    if (userInput !== 'BORRAR') return;

    try {
      console.log('--- INICIANDO PROTOCOLO DE LIMPIEZA ---');
      const { data: hotelRooms } = await supabase
        .from('rooms')
        .select('id')
        .eq('hotel_id', hotel.id);
      const roomIds = hotelRooms?.map((r) => r.id) || [];

      try {
        await supabase
          .from('room_service_orders')
          .delete()
          .eq('hotel_id', hotel.id);
        await supabase.from('service_orders').delete().eq('hotel_id', hotel.id);

        if (roomIds.length > 0) {
          await supabase
            .from('room_service_orders')
            .delete()
            .in('room_id', roomIds);
          await supabase.from('service_orders').delete().in('room_id', roomIds);
        }
      } catch (e) {
        console.log('Aviso: Error limpiando órdenes (puede que no existan)');
      }

      try {
        const { error } = await supabase
          .from('bookings')
          .delete()
          .eq('hotel_id', hotel.id);
        if (error && !error.message.includes('foreign key')) throw error;
      } catch (e) {
        console.warn('Aviso Bookings:', e.message);
      }

      try {
        await supabase
          .from('inventory_items')
          .delete()
          .eq('hotel_id', hotel.id);
      } catch (e) {}
      try {
        await supabase.from('menu_items').delete().eq('hotel_id', hotel.id);
      } catch (e) {}
      try {
        await supabase.from('guests').delete().eq('hotel_id', hotel.id);
      } catch (e) {}

      if (roomIds.length > 0) {
        const { error: roomError } = await supabase
          .from('rooms')
          .delete()
          .eq('hotel_id', hotel.id);
        if (roomError)
          throw new Error(`Error borrando habitaciones: ${roomError.message}`);
      }

      const { error: hotelError } = await supabase
        .from('hotels')
        .delete()
        .eq('id', hotel.id);
      if (hotelError) throw hotelError;

      alert('✅ HOTEL ELIMINADO CORRECTAMENTE.');
      fetchHotels();
      if (launchData.taken > 0) updateLaunchSpots(launchData.taken - 1);
    } catch (error) {
      console.error('Error crítico:', error);
      alert('❌ Error Fatal: ' + error.message);
    }
  };

  // --- OTRAS FUNCIONES ---
  const handleManualCreate = async () => {
    const name = window.prompt('Nombre del Hotel:');
    if (!name) return;
    const email = window.prompt('Correo:')?.toLowerCase().trim();
    if (!email) return;
    const password = window.prompt('Contraseña:', 'hotel123');
    const phone = window.prompt('WhatsApp:');

    const tempSupabase = supabase;
    const { error: authError } = await tempSupabase.auth.signUp({
      email,
      password,
    });
    if (authError) return alert('❌ Error Auth: ' + authError.message);

    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 30);
    const { error: dbError } = await supabase.from('hotels').insert([
      {
        name,
        email,
        phone,
        location: 'Colombia',
        status: 'trial',
        trial_ends_at: trialEnd.toISOString(),
        monthly_price: 29,
        subscription_plan: 'PRO_AI',
      },
    ]);

    if (dbError) alert('⚠️ Error DB: ' + dbError.message);
    else {
      fetchHotels();
      alert(`✅ Creado: ${email}`);
    }
  };

  const handleApproveLead = async (lead) => {
    if (processingId) return;
    setProcessingId(lead.id);
    if (!window.confirm(`¿Aprobar a "${lead.hotel_name}"?`)) {
      setProcessingId(null);
      return;
    }
    try {
      const tempPassword = 'hotel123';
      const { error: authError } = await supabase.auth.signUp({
        email: lead.email,
        password: tempPassword,
      });
      if (authError && !authError.message.includes('already registered'))
        throw new Error(authError.message);

      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 30);
      const { error: hotelError } = await supabase.from('hotels').insert([
        {
          name: lead.hotel_name || `Hotel de ${lead.full_name}`,
          location: lead.city_interest || 'General',
          status: 'trial',
          trial_ends_at: trialEnd.toISOString(),
          monthly_price: 0,
          phone: lead.phone,
          email: lead.email,
          subscription_plan: 'PRO_AI',
        },
      ]);
      if (hotelError) throw hotelError;

      await supabase
        .from('platform_leads')
        .update({ status: 'approved' })
        .eq('id', lead.id);
      updateLaunchSpots(launchData.taken + 1);
      setLeads((prev) => prev.filter((l) => l.id !== lead.id));
      fetchData();
      alert(`✅ Aprobado!\nUser: ${lead.email}\nPass: ${tempPassword}`);
    } catch (e) {
      console.error(e);
      alert('❌ Error: ' + e.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectLead = async (leadId) => {
    if (!window.confirm('¿Rechazar?')) return;
    await supabase
      .from('platform_leads')
      .update({ status: 'rejected' })
      .eq('id', leadId);
    setLeads((prev) => prev.filter((l) => l.id !== leadId));
    fetchData();
  };

  // ✅ EDICIÓN ACTUALIZADA CON EMAIL Y TELÉFONO
  const handleUpdateHotel = async (e) => {
    e.preventDefault();
    if (!editingHotel) return;
    try {
      const { error } = await supabase
        .from('hotels')
        .update({
          name: editingHotel.name,
          email: editingHotel.email, // 🔥 NUEVO
          phone: editingHotel.phone, // 🔥 NUEVO
          status: editingHotel.status,
          subscription_plan: editingHotel.subscription_plan,
          trial_ends_at: new Date(editingHotel.trial_ends_at).toISOString(),
        })
        .eq('id', editingHotel.id);

      if (error) throw error;
      alert('✅ Hotel actualizado correctamente');
      setEditingHotel(null);
      fetchHotels();
    } catch (error) {
      console.error(error);
      alert('Error actualizando: ' + error.message);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <LiquidLayout>
      <aside className='w-full md:w-72 h-auto md:h-full flex-shrink-0 relative group z-50'>
        <div className='absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-white/5 rounded-[24px] md:rounded-[36px] -m-[1px] p-[1px] pointer-events-none'></div>
        <div className='h-full w-full bg-white/5 backdrop-blur-[80px] rounded-[24px] md:rounded-[36px] border border-white/10 flex flex-row md:flex-col items-center md:items-stretch justify-between p-4 md:p-6 relative overflow-hidden'>
          <div className='flex items-center gap-3 mb-0 md:mb-12'>
            <div className='w-8 h-8 md:w-10 md:h-10 rounded-xl md:rounded-2xl bg-gradient-to-tr from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg'>
              <ShieldCheck
                size={18}
                className='text-white'
              />
            </div>
            <h1 className='text-lg md:text-xl font-semibold text-white/90 tracking-tight hidden xs:block'>
              Admin <span className='text-blue-400'>OS</span>
            </h1>
          </div>
          <nav className='flex flex-row md:flex-col gap-2 md:gap-2 flex-1 justify-center md:justify-start px-2 md:px-0'>
            <button
              onClick={() => setActiveTab('hotels')}
              className={`flex items-center gap-2 md:gap-4 px-3 md:px-4 py-2 md:py-3.5 rounded-xl md:rounded-2xl transition-all ${
                activeTab === 'hotels'
                  ? 'bg-white/10 text-white shadow-inner'
                  : 'text-white/60 hover:bg-white/5'
              }`}
            >
              <Building2
                size={18}
                className='text-emerald-400'
              />
              <span className='font-medium text-xs md:text-sm hidden sm:inline'>
                Hoteles
              </span>
            </button>
            <button
              onClick={() => setActiveTab('leads')}
              className={`flex items-center gap-2 md:gap-4 px-3 md:px-4 py-2 md:py-3.5 rounded-xl md:rounded-2xl transition-all ${
                activeTab === 'leads'
                  ? 'bg-white/10 text-white shadow-inner'
                  : 'text-white/60 hover:bg-white/5'
              }`}
            >
              <div className='relative'>
                <Inbox
                  size={18}
                  className='text-blue-400'
                />
                {stats.pendingLeads > 0 && (
                  <span className='absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse'></span>
                )}
              </div>
              <span className='font-medium text-xs md:text-sm hidden sm:inline'>
                Solicitudes
              </span>
            </button>
            <button
              onClick={() => navigate('/hunter')}
              className='flex items-center gap-2 md:gap-4 px-3 md:px-4 py-2 md:py-3.5 rounded-xl md:rounded-2xl transition-all text-white/60 hover:bg-white/5'
            >
              <div className='p-1 bg-red-500/10 rounded-lg'>
                <Target
                  size={18}
                  className='text-red-500'
                />
              </div>
              <span className='font-medium text-xs md:text-sm hidden sm:inline'>
                Hunter AI
              </span>
            </button>
          </nav>
          <button
            onClick={handleLogout}
            className='md:mt-auto flex items-center gap-3 p-2 md:p-3 rounded-xl md:rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors md:w-full justify-center'
          >
            <LogOut size={18} />
            <span className='hidden md:inline text-sm font-bold'>Salir</span>
          </button>
        </div>
      </aside>

      <main className='flex-1 h-full flex flex-col overflow-hidden relative z-10'>
        <header className='h-auto md:h-20 flex-shrink-0 mb-4 md:mb-6 relative'>
          <div className='absolute inset-0 bg-gradient-to-r from-white/10 via-white/5 to-white/10 rounded-[24px] md:rounded-[32px] -m-[1px] p-[1px] pointer-events-none'></div>
          <div className='h-full w-full bg-white/5 backdrop-blur-[60px] rounded-[24px] md:rounded-[32px] border border-white/10 flex flex-col md:flex-row items-center justify-between px-4 md:px-8 py-4 md:py-0 shadow-sm relative gap-3'>
            <div className='text-center md:text-left'>
              <h2 className='text-lg md:text-2xl font-semibold text-white/90 tracking-tight'>
                {activeTab === 'hotels' ? 'Propiedades' : 'Admisiones'}
              </h2>
              <p className='text-xs md:text-sm text-white/50 flex items-center justify-center md:justify-start gap-2'>
                <span className='w-2 h-2 rounded-full bg-emerald-400 animate-pulse'></span>{' '}
                Sistema Activo
              </p>
            </div>
            <div className='flex items-center gap-2 md:gap-4 w-full md:w-auto'>
              <div className='relative group flex-1 md:flex-none'>
                <Search
                  size={16}
                  className='absolute left-4 top-3.5 text-white/40'
                />
                <input
                  type='text'
                  placeholder='Buscar...'
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className='bg-white/5 border border-white/10 text-sm text-white pl-11 pr-4 py-3 rounded-2xl w-full md:w-64 outline-none focus:bg-white/10 transition-all'
                />
              </div>
              <button
                onClick={handleManualCreate}
                className='px-4 md:px-6 py-3 rounded-2xl bg-blue-600 text-white text-sm font-bold shadow-lg hover:bg-blue-500 transition-all flex items-center gap-2 whitespace-nowrap'
              >
                <Plus size={16} />{' '}
                <span className='hidden sm:inline'>Crear</span>
              </button>
            </div>
          </div>
        </header>

        <div className='flex-1 flex flex-col gap-4 md:gap-6 overflow-y-auto custom-scrollbar pb-6 pr-0 md:pr-2'>
          <div className='grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 flex-shrink-0'>
            {[
              {
                label: 'MRR Mensual',
                val: `$${stats.mrr.toLocaleString()}`,
                icon: <DollarSign size={20} />,
                color: 'text-emerald-400',
                bg: 'bg-emerald-500/20',
              },
              {
                label: 'Activos',
                val: stats.active,
                icon: <Building2 size={20} />,
                color: 'text-blue-400',
                bg: 'bg-blue-500/20',
              },
              {
                label: 'Cupos',
                val: `${launchData.taken}/${launchData.total}`,
                icon: <Zap size={20} />,
                color: 'text-purple-400',
                bg: 'bg-purple-500/20',
              },
              {
                label: 'Pendientes',
                val: stats.pendingLeads,
                icon: <Inbox size={20} />,
                color: 'text-orange-400',
                bg: 'bg-orange-500/20',
              },
            ].map((m, i) => (
              <div
                key={i}
                className='bg-white/5 backdrop-blur-xl p-4 md:p-5 rounded-[20px] md:rounded-[24px] border border-white/10'
              >
                <div className={`p-2 ${m.bg} rounded-xl ${m.color} w-fit mb-2`}>
                  {m.icon}
                </div>
                <h3 className='text-lg md:text-2xl font-bold text-white'>
                  {m.val}
                </h3>
                <p className='text-white/40 text-[10px] md:text-xs'>
                  {m.label}
                </p>
              </div>
            ))}
          </div>

          <div className='flex-1 rounded-[24px] md:rounded-[36px] bg-white/5 backdrop-blur-[70px] border border-white/10 p-4 md:p-6'>
            {activeTab === 'hotels' && (
              <div className='space-y-2 md:space-y-2'>
                {hotels
                  .filter((h) =>
                    h.name.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((hotel) => (
                    <div
                      key={hotel.id}
                      className='group grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 items-center px-4 md:px-6 py-4 rounded-[20px] md:rounded-3xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all'
                    >
                      <div className='col-span-1 md:col-span-4 flex items-center gap-3'>
                        <div className='w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center font-bold text-white text-sm'>
                          {hotel.name.charAt(0)}
                        </div>
                        <div>
                          <h3 className='text-white font-semibold text-sm md:text-base'>
                            {hotel.name}
                          </h3>
                          <p className='text-white/40 text-xs flex items-center gap-1'>
                            <MapPin size={10} /> {hotel.location}
                          </p>
                        </div>
                      </div>
                      <div className='col-span-1 md:col-span-2 flex md:block'>
                        <span
                          className={`px-3 py-1 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-wider ${
                            hotel.status === 'active'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-amber-500/20 text-amber-400'
                          }`}
                        >
                          {hotel.status}
                        </span>
                      </div>
                      <div className='col-span-1 md:col-span-3 text-white/60 text-xs md:text-sm font-mono'>
                        {hotel.phone || 'Sin teléfono'}
                      </div>
                      <div className='col-span-1 md:col-span-3 flex justify-start md:justify-end gap-2'>
                        {/* 🔥 BOTÓN MAGIC LINK (MODO DIOS) */}
                        <button
                          onClick={() => handleAccessHotel(hotel)}
                          className='p-2 rounded-xl bg-purple-600/20 text-purple-400 hover:bg-purple-600 hover:text-white transition-all flex items-center justify-center border border-purple-500/20'
                          title='Entrada Directa (Modo Dios)'
                        >
                          <Key size={16} />
                        </button>

                        {hotel.phone && (
                          <button
                            onClick={() => {
                              let cleanPhone = hotel.phone.replace(/\D/g, '');
                              if (!cleanPhone.startsWith('57'))
                                cleanPhone = '57' + cleanPhone;
                              const msg = `Hola! El hotel *${hotel.name}* ha sido seleccionado.\n\nAcceso: ${window.location.origin}/login\nUsuario: ${hotel.email}\nClave: hotel123`;
                              window.open(
                                `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(
                                  msg
                                )}`,
                                '_blank'
                              );
                            }}
                            className='p-2 rounded-xl bg-green-500/20 text-green-400 hover:bg-green-500/40 flex items-center justify-center'
                          >
                            <MessageCircle size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => setEditingHotel(hotel)}
                          className='p-2 rounded-xl bg-blue-500/20 text-blue-400 hover:bg-blue-500/40 flex items-center justify-center'
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteHotel(hotel)}
                          className='p-2 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/40 flex items-center justify-center'
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {activeTab === 'leads' && (
              <div className='space-y-3'>
                {leads.filter((l) => l.status === 'pending').length === 0 ? (
                  <div className='text-center py-20 text-white/30'>
                    No hay solicitudes pendientes
                  </div>
                ) : (
                  leads
                    .filter((l) => l.status === 'pending')
                    .map((lead) => (
                      <div
                        key={lead.id}
                        className='grid grid-cols-1 md:grid-cols-12 gap-3 items-center px-4 md:px-6 py-4 rounded-[20px] bg-blue-500/5 border border-blue-500/10'
                      >
                        <div className='col-span-1 md:col-span-4'>
                          <h3 className='text-white font-semibold text-sm'>
                            {lead.hotel_name}
                          </h3>
                          <p className='text-white/40 text-xs'>
                            {lead.full_name} | {lead.city_interest}
                          </p>
                        </div>
                        <div className='col-span-1 md:col-span-4 text-white/60 text-xs'>
                          <div className='bg-white/5 p-2 rounded-lg truncate text-[10px] font-mono'>
                            {lead.metadata?.source_url || 'Orgánico'}
                          </div>
                        </div>
                        <div className='col-span-1 md:col-span-4 flex justify-end gap-3'>
                          <button
                            onClick={() => handleRejectLead(lead.id)}
                            className='flex-1 md:flex-none px-4 py-2 rounded-xl bg-red-500/10 text-red-400 text-xs font-bold hover:bg-red-500/20'
                          >
                            Rechazar
                          </button>
                          <button
                            onClick={() => handleApproveLead(lead)}
                            className='flex-1 md:flex-none px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 text-xs font-bold hover:bg-emerald-500/30 border border-emerald-500/20 shadow-lg shadow-emerald-500/10'
                          >
                            {processingId === lead.id ? '...' : 'Aprobar'}
                          </button>
                        </div>
                      </div>
                    ))
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ✅ MODAL DE EDICIÓN CON EMAIL Y TELÉFONO */}
      {editingHotel && (
        <div className='fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md'>
          <div className='bg-[#09090b] border border-white/10 rounded-[2rem] w-full max-w-md p-6 shadow-2xl relative'>
            <div className='flex justify-between items-center mb-6'>
              <h3 className='text-xl font-bold text-white flex items-center gap-2'>
                <Settings
                  size={20}
                  className='text-blue-400'
                />{' '}
                Editar Propiedad
              </h3>
              <button
                onClick={() => setEditingHotel(null)}
                className='p-2 hover:bg-white/10 rounded-full text-white/60'
              >
                <XCircle size={24} />
              </button>
            </div>
            <form
              onSubmit={handleUpdateHotel}
              className='space-y-4'
            >
              <div className='space-y-1'>
                <label className='text-xs font-bold text-white/40 uppercase'>
                  Nombre del Hotel
                </label>
                <input
                  className='w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:border-blue-500/50 outline-none'
                  value={editingHotel.name}
                  onChange={(e) =>
                    setEditingHotel({ ...editingHotel, name: e.target.value })
                  }
                />
              </div>

              {/* 🔥 NUEVOS CAMPOS: EMAIL Y TELÉFONO */}
              <div className='grid grid-cols-2 gap-4'>
                <div className='space-y-1'>
                  <label className='text-xs font-bold text-white/40 uppercase'>
                    Correo Electrónico
                  </label>
                  <input
                    className='w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:border-blue-500/50 outline-none'
                    value={editingHotel.email || ''}
                    onChange={(e) =>
                      setEditingHotel({
                        ...editingHotel,
                        email: e.target.value,
                      })
                    }
                  />
                </div>
                <div className='space-y-1'>
                  <label className='text-xs font-bold text-white/40 uppercase'>
                    Teléfono
                  </label>
                  <input
                    className='w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:border-blue-500/50 outline-none'
                    value={editingHotel.phone || ''}
                    onChange={(e) =>
                      setEditingHotel({
                        ...editingHotel,
                        phone: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className='grid grid-cols-2 gap-4'>
                <div className='space-y-1'>
                  <label className='text-xs font-bold text-white/40 uppercase'>
                    Estado
                  </label>
                  <select
                    className='w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:border-blue-500/50 outline-none'
                    value={editingHotel.status}
                    onChange={(e) =>
                      setEditingHotel({
                        ...editingHotel,
                        status: e.target.value,
                      })
                    }
                  >
                    <option value='active'>Activo</option>
                    <option value='trial'>Prueba</option>
                    <option value='suspended'>Suspendido</option>
                  </select>
                </div>
                <div className='space-y-1'>
                  <label className='text-xs font-bold text-white/40 uppercase'>
                    Plan
                  </label>
                  <select
                    className='w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:border-blue-500/50 outline-none'
                    value={editingHotel.subscription_plan}
                    onChange={(e) =>
                      setEditingHotel({
                        ...editingHotel,
                        subscription_plan: e.target.value,
                      })
                    }
                  >
                    <option value='PRO_AI'>PRO AI</option>
                    <option value='GROWTH'>GROWTH</option>
                    <option value='CORPORATE'>CORPORATE</option>
                  </select>
                </div>
              </div>
              <div className='space-y-1'>
                <label className='text-xs font-bold text-white/40 uppercase flex items-center gap-2'>
                  <Activity
                    size={12}
                    className='text-emerald-400'
                  />{' '}
                  Vencimiento del Plan
                </label>
                <input
                  type='date'
                  className='w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:border-blue-500/50 outline-none'
                  value={
                    editingHotel.trial_ends_at
                      ? editingHotel.trial_ends_at.split('T')[0]
                      : ''
                  }
                  onChange={(e) =>
                    setEditingHotel({
                      ...editingHotel,
                      trial_ends_at: e.target.value,
                    })
                  }
                />
              </div>
              <button
                type='submit'
                className='w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-900/20 transition-all mt-4'
              >
                Guardar Cambios
              </button>
            </form>
          </div>
        </div>
      )}
    </LiquidLayout>
  );
};

export default SuperAdminPage;
