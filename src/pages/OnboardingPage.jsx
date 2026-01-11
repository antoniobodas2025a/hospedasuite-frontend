import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Building2, MapPin, CheckCircle2, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

const OnboardingPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
  });

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) navigate('/login');
      setUser(user);
    };
    getUser();
  }, []);

  const handleCreateHotel = async (e) => {
    e.preventDefault();
    if (!formData.name) return alert('El nombre del hotel es obligatorio');

    setLoading(true);
    try {
      // 1. Crear el Hotel vinculado al usuario actual
      const { error } = await supabase.from('hotels').insert([
        {
          name: formData.name,
          location: formData.location || 'Ubicación General',
          email: user.email, // ✅ ESTO ES SUFICIENTE PARA VINCULAR
          status: 'active',
          subscription_plan: 'PRO_AI',
          // ❌ ELIMINADO: owner_id: user.id (Esto causaba el error del pantallazo)
        },
      ]);

      if (error) throw error;

      // 2. Éxito y Redirección
      alert('¡Hotel Creado Exitosamente! Bienvenido a LEYVA.');
      window.location.href = '/dashboard';
    } catch (error) {
      console.error(error);
      alert('Error creando el hotel: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4 relative overflow-hidden font-sans text-slate-900'>
      {/* Fondo Animado Sutil */}
      <div className='absolute inset-0 z-0'>
        <div className='absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-400/10 rounded-full blur-[120px]' />
        <div className='absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-emerald-400/10 rounded-full blur-[120px]' />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className='relative z-10 w-full max-w-md'
      >
        <div className='bg-white/70 backdrop-blur-xl border border-white/50 p-8 rounded-[2.5rem] shadow-2xl'>
          <div className='text-center mb-8'>
            <div className='w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-slate-900/20'>
              <Building2
                className='text-white'
                size={32}
              />
            </div>
            <h1 className='text-3xl font-serif font-bold text-slate-800 mb-2'>
              Bienvenido
            </h1>
            <p className='text-slate-500 text-sm'>
              Configuremos tu espacio de trabajo
            </p>
          </div>

          <form
            onSubmit={handleCreateHotel}
            className='space-y-5'
          >
            <div className='space-y-2'>
              <label className='text-xs font-bold text-slate-400 uppercase ml-2'>
                Nombre del Hotel
              </label>
              <div className='relative'>
                <Building2
                  className='absolute left-4 top-1/2 -translate-y-1/2 text-slate-400'
                  size={18}
                />
                <input
                  type='text'
                  className='w-full pl-12 pr-4 py-4 bg-white rounded-2xl border-none font-bold text-slate-800 shadow-sm focus:ring-2 focus:ring-blue-500/20 placeholder:text-slate-300 transition-all'
                  placeholder='Ej: Gran Hotel Leyva'
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  autoFocus
                />
              </div>
            </div>

            <div className='space-y-2'>
              <label className='text-xs font-bold text-slate-400 uppercase ml-2'>
                Ciudad / Ubicación
              </label>
              <div className='relative'>
                <MapPin
                  className='absolute left-4 top-1/2 -translate-y-1/2 text-slate-400'
                  size={18}
                />
                <input
                  type='text'
                  className='w-full pl-12 pr-4 py-4 bg-white rounded-2xl border-none font-bold text-slate-800 shadow-sm focus:ring-2 focus:ring-blue-500/20 placeholder:text-slate-300 transition-all'
                  placeholder='Ej: Villa de Leyva, Boyacá'
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                />
              </div>
            </div>

            <button
              type='submit'
              disabled={loading}
              className='w-full bg-slate-900 text-white font-bold py-4 rounded-2xl shadow-xl shadow-slate-900/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 mt-4'
            >
              {loading ? (
                <Loader2 className='animate-spin' />
              ) : (
                <CheckCircle2 />
              )}
              <span>Crear Espacio</span>
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default OnboardingPage;
