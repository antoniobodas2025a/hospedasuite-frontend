import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import {
  Target,
  MapPin,
  Search,
  MessageCircle,
  Globe,
  Filter,
  CheckCircle2,
  Clock,
  Save,
  Edit3,
  PhoneOff,
  RotateCcw,
} from 'lucide-react';

const HunterDashboard = () => {
  // Configuración de Caza
  const [city, setCity] = useState('Villa de Leyva');
  const [category, setCategory] = useState('Glamping');
  const [loading, setLoading] = useState(false);

  // Gestión de Datos
  const [leads, setLeads] = useState([]);
  const [activeTab, setActiveTab] = useState('new');
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [tempNote, setTempNote] = useState('');

  // Estadísticas Rápidas (Ahora incluye Descartados)
  const stats = {
    new: leads.filter((l) => l.status === 'new' || !l.status).length,
    contacted: leads.filter((l) => l.status === 'contacted').length,
    closed: leads.filter((l) => l.status === 'closed').length,
    dead: leads.filter((l) => l.status === 'dead').length, // <--- NUEVO KPI
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
          if (payload.eventType === 'INSERT') {
            setLeads((prev) => [payload.new, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setLeads((prev) =>
              prev.map((l) => (l.id === payload.new.id ? payload.new : l)),
            );
          }
        },
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
        `🏹 Cacería completada. Se detectaron ${data.new_leads} objetivos nuevos.`,
      );
      fetchLeads();
    } catch (err) {
      alert('Error cazando: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, newStatus) => {
    setLeads((prev) =>
      prev.map((l) => (l.id === id ? { ...l, status: newStatus } : l)),
    );
    await supabase
      .from('hunted_leads')
      .update({ status: newStatus })
      .eq('id', id);
  };

  const saveNote = async (id) => {
    await supabase
      .from('hunted_leads')
      .update({ notes: tempNote })
      .eq('id', id);
    setEditingNoteId(null);
    setLeads((prev) =>
      prev.map((l) => (l.id === id ? { ...l, notes: tempNote } : l)),
    );
  };

  // --- 🛠️ NUEVO GENERADOR DE PITCH ESTRATÉGICO ---
  const generateSmartPitch = (businessName) => {
    return `Hola ${businessName}! 👋

Soy Antonio de HospedaSuite. Estaba viendo su perfil en Google Maps (¡muy buenas fotos!) y noté que no tienen un link directo para reservar sin comisiones.

Desarrollamos un sistema ligero que les permite recibir reservas directas y escanear cédulas desde el celular.

Cuesta $29.900 al mes (literalmente menos de lo que cuesta un tinto al día ☕) y les evita pagar el 15-20% a Booking en sus clientes directos.

¿Les gustaría que les active una prueba para que vean cómo funciona?`;
  };

  const openWhatsApp = (id, phone, businessName) => {
    if (!phone) {
      // Si no tiene teléfono, sugerimos descartarlo o buscarlo manual
      if (
        window.confirm(
          "Este objetivo no tiene teléfono registrado. ¿Deseas moverlo a 'Descartados' para buscarlo luego?",
        )
      ) {
        updateStatus(id, 'dead');
      }
      return;
    }

    const currentLead = leads.find((l) => l.id === id);
    if (currentLead && (currentLead.status === 'new' || !currentLead.status)) {
      updateStatus(id, 'contacted');
    }

    // Generamos el mensaje actualizado al momento del click
    const message = generateSmartPitch(businessName);

    const cleanNumber = phone.replace(/\D/g, '');
    const finalNumber =
      cleanNumber.length === 10 ? `57${cleanNumber}` : cleanNumber;
    window.open(
      `https://wa.me/${finalNumber}?text=${encodeURIComponent(message)}`,
      '_blank',
    );
  };

  // Filtrado Lógico (Incluye la nueva pestaña)
  const filteredLeads = leads.filter((l) => {
    const s = l.status || 'new';
    if (activeTab === 'new') return s === 'new';
    if (activeTab === 'contacted') return s === 'contacted' || s === 'warm';
    if (activeTab === 'closed') return s === 'closed';
    if (activeTab === 'dead') return s === 'dead'; // <--- FILTRO DE RECUPERACIÓN
    return true;
  });

  return (
    <div className='p-6 md:p-8 bg-slate-50 min-h-screen font-sans text-slate-900'>
      <div className='max-w-7xl mx-auto'>
        {/* HEADER */}
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

          {/* SCOREBOARD ACTUALIZADO */}
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
              <div className='text-2xl font-black text-slate-400'>
                {stats.dead}
              </div>
              <div className='text-[10px] font-bold text-slate-300 uppercase'>
                Papelera
              </div>
            </div>
          </div>
        </header>

        {/* PANEL DE CONTROL (SEARCH) */}
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
                  className='w-full pl-11 p-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-700'
                />
              </div>
            </div>
            <div className='flex-1 min-w-[200px]'>
              <label className='block text-xs font-bold text-slate-400 uppercase mb-2 ml-1'>
                Tipo
              </label>
              <div className='relative'>
                <Target
                  className='absolute left-4 top-1/2 -translate-y-1/2 text-slate-400'
                  size={18}
                />
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className='w-full pl-11 p-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-700 appearance-none'
                >
                  <option>Glamping</option>
                  <option>Hotel Boutique</option>
                  <option>Hostal</option>
                  <option>Cabañas</option>
                </select>
              </div>
            </div>
            <button
              onClick={launchHunt}
              disabled={loading}
              className='px-8 py-4 bg-slate-900 text-white font-bold rounded-2xl flex items-center gap-2 hover:scale-105 transition-all'
            >
              {loading ? (
                <Clock className='animate-spin' />
              ) : (
                <>🐺 LIBERAR CAZADOR</>
              )}
            </button>
          </div>
        </div>

        {/* TABS DE SEGUIMIENTO (INCLUYE DESCARTADOS) */}
        <div className='flex gap-2 mb-6 overflow-x-auto pb-2 custom-scrollbar'>
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
            {
              id: 'dead',
              label: '💀 Papelera / Sin Tel',
              color: 'bg-slate-400',
            }, // <--- NUEVA PESTAÑA
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

        {/* GRID DE TARJETAS */}
        <div className='grid md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20'>
          {filteredLeads.length === 0 && (
            <div className='col-span-full text-center py-20 opacity-40'>
              <Search
                size={64}
                className='mx-auto mb-4'
              />
              <p className='text-xl font-bold'>Zona limpia.</p>
              <p>No hay objetivos en esta categoría.</p>
            </div>
          )}

          {filteredLeads.map((lead) => (
            <div
              key={lead.id}
              className={`bg-white rounded-3xl p-6 shadow-sm border transition-all hover:shadow-xl group relative ${
                lead.status === 'dead'
                  ? 'opacity-75 bg-slate-50 border-slate-200' // Efecto visual para descartados
                  : lead.status === 'contacted'
                    ? 'border-blue-100'
                    : lead.status === 'closed'
                      ? 'border-green-100'
                      : 'border-slate-100'
              }`}
            >
              {/* BADGES & ESTADO */}
              <div className='flex justify-between items-start mb-4'>
                <div className='flex gap-1'>
                  {!lead.website && (
                    <span className='bg-red-50 text-red-600 text-[9px] font-bold px-2 py-1 rounded-md border border-red-100'>
                      SIN WEB
                    </span>
                  )}
                  {/* VISUAL REFERENCE: BADGE PARA SIN TELÉFONO */}
                  {!lead.phone && (
                    <span className='bg-slate-100 text-slate-500 text-[9px] font-bold px-2 py-1 rounded-md border border-slate-200 flex items-center gap-1'>
                      <PhoneOff size={8} /> SIN TEL
                    </span>
                  )}
                </div>

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

              <h3 className='font-black text-xl text-slate-900 mb-1 leading-tight'>
                {lead.business_name}
              </h3>

              {/* 🛠️ CAMBIO ESTRATÉGICO: Link Directo a Google Maps para "Reconocimiento" */}
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  lead.business_name + ' ' + (city || ''),
                )}`}
                target='_blank'
                rel='noreferrer'
                className='text-[10px] font-bold text-blue-600 hover:underline mb-3 flex items-center gap-1'
              >
                <Search size={10} /> Investigar en Maps
              </a>

              <div className='flex items-center gap-2 text-xs text-slate-500 mb-4'>
                <MapPin
                  size={12}
                  className='text-slate-400'
                />{' '}
                {lead.address?.split(',')[0]}
              </div>

              {/* NOTAS (CRUCIAL PARA DESCARTADOS) */}
              <div className='mb-4'>
                {editingNoteId === lead.id ? (
                  <div className='flex gap-2 animate-in fade-in zoom-in'>
                    <input
                      autoFocus
                      className='flex-1 text-xs p-2 bg-yellow-50 border border-yellow-200 rounded-lg outline-none'
                      value={tempNote}
                      onChange={(e) => setTempNote(e.target.value)}
                      placeholder='¿Por qué se descartó?'
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
                      lead.notes
                        ? 'text-slate-600 bg-slate-50'
                        : 'text-slate-300 italic'
                    }`}
                  >
                    <Edit3 size={12} />{' '}
                    {lead.notes || 'Agregar nota de investigación...'}
                  </div>
                )}
              </div>

              {/* BOTÓN DE ACCIÓN CONTEXTUAL */}
              {lead.status === 'dead' ? (
                // SI ESTÁ MUERTO, OFRECEMOS REACTIVARLO
                <button
                  onClick={() => updateStatus(lead.id, 'new')}
                  className='w-full py-3 bg-white border-2 border-slate-200 text-slate-500 font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-50 hover:text-slate-900 transition-all'
                >
                  <RotateCcw size={18} /> Reactivar Oportunidad
                </button>
              ) : (
                // SI ESTÁ VIVO, BOTÓN DE WHATSAPP CON NUEVO SCRIPT
                <button
                  onClick={() =>
                    openWhatsApp(lead.id, lead.phone, lead.business_name)
                  }
                  disabled={!lead.phone}
                  className={`w-full py-4 font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 group/btn ${
                    !lead.phone
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
                      : 'bg-[#25D366] hover:bg-[#128C7E] text-white shadow-green-500/20'
                  }`}
                >
                  {!lead.phone ? (
                    <>Sin WhatsApp Disponible</>
                  ) : (
                    <>
                      <MessageCircle
                        size={20}
                        className='group-hover/btn:animate-bounce'
                      />
                      {lead.status === 'contacted'
                        ? 'Hacer Seguimiento'
                        : 'Lanzar Pitch'}
                    </>
                  )}
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
