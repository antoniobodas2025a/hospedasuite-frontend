import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import {
  Target,
  MapPin,
  Search,
  MessageCircle,
  Globe,
  AlertTriangle,
} from 'lucide-react';

const HunterDashboard = () => {
  const [city, setCity] = useState('Villa de Leyva');
  const [category, setCategory] = useState('Glamping');
  const [loading, setLoading] = useState(false);
  const [leads, setLeads] = useState([]);

  // Cargar leads existentes
  useEffect(() => {
    fetchLeads();
    // Suscripción Realtime (Verlos caer en vivo)
    const subscription = supabase
      .channel('hunted_leads')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'hunted_leads' },
        (payload) => {
          setLeads((current) => [payload.new, ...current]);
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

  // En src/pages/HunterDashboard.jsx
  const launchHunt = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('hunter-api', {
        body: { city, category },
      });
      if (error) throw error;

      // 👇 CORRECCIÓN AQUÍ: Usamos 'new_leads' en lugar de 'hunted'
      alert(
        `🏹 Cacería completada. Se detectaron ${data.new_leads} objetivos nuevos.`
      );

      // Recargar la lista para verlos
      fetchLeads();
    } catch (err) {
      alert('Error cazando: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const openWhatsApp = (phone, message) => {
    if (!phone) return alert('No hay teléfono disponible');
    // Limpiar número
    const cleanNumber = phone.replace(/\D/g, '');
    // Asumir código de país 57 si no lo trae, o ajustarlo
    const finalNumber =
      cleanNumber.length === 10 ? `57${cleanNumber}` : cleanNumber;
    window.open(
      `https://wa.me/${finalNumber}?text=${encodeURIComponent(message)}`,
      '_blank'
    );
  };

  return (
    <div className='p-8 bg-slate-50 min-h-screen'>
      <div className='max-w-6xl mx-auto'>
        <header className='mb-8'>
          <h1 className='text-4xl font-black text-slate-900 flex items-center gap-3'>
            <Target className='text-red-600' /> Protocolo Hunter
          </h1>
          <p className='text-slate-500'>
            Inteligencia Artificial de Ventas Outbound
          </p>
        </header>

        {/* CONTROL DE MANDO */}
        <div className='bg-white p-6 rounded-2xl shadow-lg border border-slate-200 mb-10 flex flex-wrap gap-4 items-end'>
          <div className='flex-1'>
            <label className='block text-xs font-bold text-slate-400 uppercase mb-1'>
              Ciudad Objetivo
            </label>
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className='w-full p-3 bg-slate-50 border rounded-xl font-bold text-slate-700'
            />
          </div>
          <div className='flex-1'>
            <label className='block text-xs font-bold text-slate-400 uppercase mb-1'>
              Categoría
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className='w-full p-3 bg-slate-50 border rounded-xl font-bold text-slate-700'
            >
              <option>Glamping</option>
              <option>Hotel Boutique</option>
              <option>Hostal</option>
              <option>Cabañas</option>
            </select>
          </div>
          <button
            onClick={launchHunt}
            disabled={loading}
            className='px-8 py-3 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-red-200'
          >
            {loading ? '🛰️ Escaneando...' : '🐺 SOLTAR CAZADOR'}
          </button>
        </div>

        {/* LISTA DE OBJETIVOS */}
        <div className='grid md:grid-cols-2 lg:grid-cols-3 gap-6'>
          {leads.map((lead) => (
            <div
              key={lead.id}
              className='bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all relative overflow-hidden group'
            >
              {/* CINTA DE ESTADO WEB */}
              {!lead.website && (
                <div className='absolute top-0 right-0 bg-red-100 text-red-600 text-[10px] font-bold px-3 py-1 rounded-bl-xl'>
                  SIN WEB
                </div>
              )}

              <h3 className='font-bold text-lg text-slate-900 mb-1'>
                {lead.business_name}
              </h3>
              <div className='flex items-center gap-1 text-xs text-slate-500 mb-4'>
                <MapPin size={12} /> {lead.address?.split(',')[0]}
                <span className='text-yellow-500 ml-2 font-bold'>
                  ★ {lead.rating}
                </span>
              </div>

              {/* LA ESTRATEGIA DE GEMINI */}
              <div className='bg-slate-50 p-3 rounded-xl mb-4 border border-slate-100'>
                <p className='text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1'>
                  <Globe size={10} /> Estrategia IA
                </p>
                <p className='text-sm text-slate-600 italic leading-snug'>
                  "{lead.ai_pitch}"
                </p>
              </div>

              <button
                onClick={() => openWhatsApp(lead.phone, lead.ai_pitch)}
                className='w-full py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-green-100 transition-transform active:scale-95'
              >
                <MessageCircle size={18} /> Enviar Pitch por WhatsApp
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HunterDashboard;
