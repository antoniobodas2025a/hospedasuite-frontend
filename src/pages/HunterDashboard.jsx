import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import {
  Target,
  MapPin,
  Search,
  MessageCircle,
  Globe,
  AlertTriangle,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Save,
  Edit3,
} from 'lucide-react';

const HunterDashboard = () => {
  // Configuración de Caza
  const [city, setCity] = useState('Villa de Leyva');
  const [category, setCategory] = useState('Glamping');
  const [loading, setLoading] = useState(false);

  // Gestión de Datos
  const [leads, setLeads] = useState([]);
  const [activeTab, setActiveTab] = useState('new'); // new | contacted | warm | closed | dead
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [tempNote, setTempNote] = useState('');

  // Estadísticas Rápidas
  const stats = {
    new: leads.filter((l) => l.status === 'new' || !l.status).length,
    contacted: leads.filter((l) => l.status === 'contacted').length,
    closed: leads.filter((l) => l.status === 'closed').length,
  };

  // Carga Inicial y Realtime
  useEffect(() => {
    fetchLeads();

    const subscription = supabase
      .channel('hunted_leads_tracker')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'hunted_leads' },
        (payload) => {
          // Actualización inteligente: Si es nuevo insert, lo agrega. Si es update, lo modifica.
          if (payload.eventType === 'INSERT') {
            setLeads((prev) => [payload.new, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setLeads((prev) =>
              prev.map((l) => (l.id === payload.new.id ? payload.new : l))
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const fetchLeads = async () => {
    const { data } = await supabase
      .from('hunted_leads')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setLeads(data);
  };

  const launchHunt = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('hunter-api', {
        body: { city, category },
      });
      if (error) throw error;
      alert(
        `🏹 Cacería completada. Se detectaron ${data.new_leads} objetivos nuevos.`
      );
      fetchLeads();
    } catch (err) {
      alert('Error cazando: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- LÓGICA CRM (EL CEREBRO DEL LOBO) ---

  const updateStatus = async (id, newStatus) => {
    // Optimistic UI Update (Para que se sienta instantáneo)
    setLeads((prev) =>
      prev.map((l) => (l.id === id ? { ...l, status: newStatus } : l))
    );

    const { error } = await supabase
      .from('hunted_leads')
      .update({
        status: newStatus,
        last_contact_at: newStatus === 'contacted' ? new Date() : undefined,
      })
      .eq('id', id);

    if (error) console.error('Error updating status', error);
  };

  const saveNote = async (id) => {
    const { error } = await supabase
      .from('hunted_leads')
      .update({ notes: tempNote })
      .eq('id', id);

    if (!error) {
      setEditingNoteId(null);
      // El realtime actualizará la UI, o podemos hacerlo manual:
      setLeads((prev) =>
        prev.map((l) => (l.id === id ? { ...l, notes: tempNote } : l))
      );
    }
  };

  const openWhatsApp = (id, phone, message) => {
    if (!phone) return alert('No hay teléfono disponible');

    // 1. Marcar automáticamente como contactado si es nuevo
    const currentLead = leads.find((l) => l.id === id);
    if (currentLead && (currentLead.status === 'new' || !currentLead.status)) {
      updateStatus(id, 'contacted');
    }

    // 2. Abrir WhatsApp
    const cleanNumber = phone.replace(/\D/g, '');
    const finalNumber =
      cleanNumber.length === 10 ? `57${cleanNumber}` : cleanNumber;
    window.open(
      `https://wa.me/${finalNumber}?text=${encodeURIComponent(message)}`,
      '_blank'
    );
  };

  // Filtrado de Leads para el Tab actual
  const filteredLeads = leads.filter((l) => {
    const s = l.status || 'new';
    if (activeTab === 'new') return s === 'new';
    if (activeTab === 'contacted') return s === 'contacted' || s === 'warm';
    if (activeTab === 'closed') return s === 'closed';
    return true;
  });

  return (
    <div className='p-6 md:p-8 bg-slate-50 min-h-screen font-sans text-slate-900'>
      <div className='max-w-7xl mx-auto'>
        {/* HEADER ESTRATÉGICO */}
        <header className='mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4'>
          <div>
            <h1 className='text-4xl font-black flex items-center gap-3 tracking-tight'>
              <Target
                className='text-red-600'
                size={36}
              />
              Protocolo Hunter
            </h1>
            <p className='text-slate-500 font-medium ml-12'>
              Inteligencia de Ventas Outbound
            </p>
          </div>

          {/* SCOREBOARD */}
          <div className='flex gap-4 bg-white p-2 rounded-xl border border-slate-200 shadow-sm'>
            <div className='px-4 py-2 text-center'>
              <div className='text-2xl font-black text-slate-800'>
                {stats.new}
              </div>
              <div className='text-[10px] font-bold text-slate-400 uppercase'>
                Frescos
              </div>
            </div>
            <div className='w-px bg-slate-100'></div>
            <div className='px-4 py-2 text-center'>
              <div className='text-2xl font-black text-blue-600'>
                {stats.contacted}
              </div>
              <div className='text-[10px] font-bold text-slate-400 uppercase'>
                En Juego
              </div>
            </div>
            <div className='w-px bg-slate-100'></div>
            <div className='px-4 py-2 text-center'>
              <div className='text-2xl font-black text-green-600'>
                {stats.closed}
              </div>
              <div className='text-[10px] font-bold text-slate-400 uppercase'>
                Cerrados
              </div>
            </div>
          </div>
        </header>

        {/* PANEL DE CONTROL (SEARCH & FIRE) */}
        <div className='bg-white p-6 rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-100 mb-10 relative overflow-hidden'>
          <div className='absolute top-0 right-0 w-64 h-64 bg-red-50 rounded-full blur-3xl -z-0 opacity-50 pointer-events-none'></div>

          <div className='relative z-10 flex flex-wrap gap-4 items-end'>
            <div className='flex-1 min-w-[200px]'>
              <label className='block text-xs font-bold text-slate-400 uppercase mb-2 ml-1'>
                Zona de Caza
              </label>
              <div className='relative'>
                <MapPin
                  className='absolute left-4 top-1/2 -translate-y-1/2 text-slate-400'
                  size={18}
                />
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className='w-full pl-11 p-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-700 focus:ring-2 focus:ring-red-100 transition-all'
                  placeholder='Ej: Cartagena'
                />
              </div>
            </div>
            <div className='flex-1 min-w-[200px]'>
              <label className='block text-xs font-bold text-slate-400 uppercase mb-2 ml-1'>
                Tipo de Presa
              </label>
              <div className='relative'>
                <Target
                  className='absolute left-4 top-1/2 -translate-y-1/2 text-slate-400'
                  size={18}
                />
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className='w-full pl-11 p-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-700 appearance-none focus:ring-2 focus:ring-red-100 transition-all'
                >
                  <option>Glamping</option>
                  <option>Hotel Boutique</option>
                  <option>Hostal</option>
                  <option>Cabañas</option>
                  <option>Hotel Campestre</option>
                </select>
              </div>
            </div>
            <button
              onClick={launchHunt}
              disabled={loading}
              className='px-8 py-4 bg-slate-900 hover:bg-black text-white font-bold rounded-2xl flex items-center gap-2 transition-all shadow-lg hover:scale-105 active:scale-95'
            >
              {loading ? (
                <span className='flex items-center gap-2'>
                  <Clock className='animate-spin' /> Escaneando Satélite...
                </span>
              ) : (
                <>🐺 LIBERAR CAZADOR</>
              )}
            </button>
          </div>
        </div>

        {/* TABS DE SEGUIMIENTO (PIPELINE) */}
        <div className='flex gap-2 mb-6 overflow-x-auto pb-2'>
          {[
            { id: 'new', label: '🎯 Objetivos Nuevos', color: 'bg-red-500' },
            {
              id: 'contacted',
              label: '💬 En Negociación',
              color: 'bg-blue-500',
            },
            {
              id: 'closed',
              label: '💰 Ventas Cerradas',
              color: 'bg-green-500',
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 rounded-xl font-bold text-sm whitespace-nowrap transition-all flex items-center gap-2 border ${
                activeTab === tab.id
                  ? 'bg-white border-slate-200 shadow-md text-slate-900 scale-105'
                  : 'bg-transparent border-transparent text-slate-400 hover:bg-white/50'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${tab.color}`}></div>
              {tab.label}
            </button>
          ))}
        </div>

        {/* GRID DE TARJETAS (WOLFPACK CARDS) */}
        <div className='grid md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20'>
          {filteredLeads.length === 0 && (
            <div className='col-span-full text-center py-20 opacity-40'>
              <Search
                size={64}
                className='mx-auto mb-4'
              />
              <p className='text-xl font-bold'>
                No hay objetivos en esta fase.
              </p>
              <p>Cambia de filtro o lanza una nueva búsqueda.</p>
            </div>
          )}

          {filteredLeads.map((lead) => (
            <div
              key={lead.id}
              className={`bg-white rounded-3xl p-6 shadow-sm border transition-all hover:shadow-xl group relative ${
                lead.status === 'contacted'
                  ? 'border-blue-100'
                  : lead.status === 'closed'
                  ? 'border-green-100'
                  : 'border-slate-100'
              }`}
            >
              {/* BADGES SUPERIORES */}
              <div className='flex justify-between items-start mb-4'>
                {!lead.website ? (
                  <span className='bg-red-50 text-red-600 text-[10px] font-bold px-3 py-1 rounded-full border border-red-100'>
                    SIN WEB
                  </span>
                ) : (
                  <a
                    href={lead.website}
                    target='_blank'
                    rel='noreferrer'
                    className='bg-emerald-50 text-emerald-600 text-[10px] font-bold px-3 py-1 rounded-full border border-emerald-100 flex items-center gap-1 hover:bg-emerald-100'
                  >
                    <Globe size={10} /> WEB ACTIVA
                  </a>
                )}

                {/* SELECTOR DE ESTADO RÁPIDO */}
                <select
                  className='text-[10px] font-bold uppercase bg-slate-50 border border-slate-200 rounded-lg p-1 outline-none'
                  value={lead.status || 'new'}
                  onChange={(e) => updateStatus(lead.id, e.target.value)}
                >
                  <option value='new'>🎯 Nuevo</option>
                  <option value='contacted'>💬 Contactado</option>
                  <option value='closed'>💰 Cerrado</option>
                  <option value='dead'>💀 Descartado</option>
                </select>
              </div>

              {/* INFO PRINCIPAL */}
              <h3 className='font-black text-xl text-slate-900 mb-1 leading-tight'>
                {lead.business_name}
              </h3>
              <div className='flex items-center gap-2 text-xs text-slate-500 mb-4'>
                <MapPin
                  size={12}
                  className='text-slate-400'
                />{' '}
                {lead.address?.split(',')[0]}
                <span className='flex items-center gap-1 text-amber-500 font-bold bg-amber-50 px-1.5 rounded'>
                  ★ {lead.rating}
                </span>
              </div>

              {/* PITCH DE IA (SOLO VISIBLE SI ES NUEVO O CONTACTADO) */}
              {lead.status !== 'closed' && (
                <div className='bg-slate-50 p-4 rounded-2xl mb-4 border border-slate-100 relative group-hover:border-blue-200 transition-colors'>
                  <div className='absolute -left-1 top-4 w-1 h-8 bg-gradient-to-b from-blue-400 to-purple-500 rounded-r-full'></div>
                  <p className='text-[9px] font-bold text-slate-400 uppercase mb-2 flex items-center gap-1'>
                    <Target size={10} /> Estrategia de Ataque (IA)
                  </p>
                  <p className='text-sm text-slate-700 leading-relaxed font-medium'>
                    "{lead.ai_pitch?.split('👉')[0]}"
                  </p>
                </div>
              )}

              {/* ÁREA DE NOTAS (CRM) */}
              <div className='mb-4'>
                {editingNoteId === lead.id ? (
                  <div className='flex gap-2 animate-in fade-in zoom-in'>
                    <input
                      autoFocus
                      className='flex-1 text-xs p-2 bg-yellow-50 border border-yellow-200 rounded-lg outline-none'
                      value={tempNote}
                      onChange={(e) => setTempNote(e.target.value)}
                      placeholder='Escribe nota de seguimiento...'
                    />
                    <button
                      onClick={() => saveNote(lead.id)}
                      className='p-2 bg-slate-900 text-white rounded-lg'
                    >
                      <Save size={14} />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => {
                      setTempNote(lead.notes || '');
                      setEditingNoteId(lead.id);
                    }}
                    className={`text-xs p-2 rounded-lg cursor-pointer hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all flex items-center gap-2 ${
                      lead.notes ? 'text-slate-600' : 'text-slate-300 italic'
                    }`}
                  >
                    <Edit3 size={12} />
                    {lead.notes || 'Clic para agregar notas...'}
                  </div>
                )}
              </div>

              {/* BOTÓN DE ACCIÓN PRINCIPAL */}
              {lead.status === 'closed' ? (
                <div className='w-full py-3 bg-green-100 text-green-700 font-bold rounded-xl flex items-center justify-center gap-2 cursor-default'>
                  <CheckCircle2 size={18} /> Cliente Activo
                </div>
              ) : (
                <button
                  onClick={() =>
                    openWhatsApp(lead.id, lead.phone, lead.ai_pitch)
                  }
                  className='w-full py-4 bg-[#25D366] hover:bg-[#128C7E] text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-green-500/20 transition-all active:scale-95 group/btn'
                >
                  <MessageCircle
                    size={20}
                    className='group-hover/btn:animate-bounce'
                  />
                  {lead.status === 'contacted'
                    ? 'Hacer Seguimiento'
                    : 'Lanzar Pitch'}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HunterDashboard;
