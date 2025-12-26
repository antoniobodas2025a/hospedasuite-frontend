import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Mail, Loader2, ArrowRight } from 'lucide-react';
import { supabase } from '../supabaseClient';

const LoginPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError('Credenciales incorrectas o usuario no encontrado.');
      setLoading(false);
    } else {
      // Éxito: Redirigir al Dashboard
      navigate('/dashboard');
    }
  };

  return (
    <div className='min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden'>
      {/* Fondo Aurora sutil */}
      <div className='absolute top-0 left-0 w-full h-full overflow-hidden -z-10'>
        <div className='absolute top-1/4 left-1/4 w-96 h-96 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob'></div>
        <div className='absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000'></div>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className='w-full max-w-md p-8'
      >
        <div className='glass-card p-10 rounded-3xl shadow-2xl border border-white/60'>
          <div className='text-center mb-10'>
            <h2 className='text-3xl font-bold text-slate-900 tracking-tight'>
              Bienvenido
            </h2>
            <p className='text-slate-500 text-sm mt-2'>
              Accede a tu panel de control HospedaSuite
            </p>
          </div>

          <form
            onSubmit={handleLogin}
            className='space-y-6'
          >
            <div className='space-y-2'>
              <label className='text-xs font-bold text-slate-500 uppercase tracking-wider ml-1'>
                Correo Corporativo
              </label>
              <div className='relative'>
                <Mail
                  className='absolute left-4 top-3.5 text-slate-400'
                  size={20}
                />
                <input
                  type='email'
                  required
                  placeholder='admin@hotel.com'
                  className='w-full pl-12 pr-4 py-3 bg-white/50 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all'
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className='space-y-2'>
              <label className='text-xs font-bold text-slate-500 uppercase tracking-wider ml-1'>
                Contraseña
              </label>
              <div className='relative'>
                <Lock
                  className='absolute left-4 top-3.5 text-slate-400'
                  size={20}
                />
                <input
                  type='password'
                  required
                  placeholder='••••••••'
                  className='w-full pl-12 pr-4 py-3 bg-white/50 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all'
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div className='p-3 rounded-lg bg-red-50 text-red-600 text-sm text-center border border-red-100'>
                {error}
              </div>
            )}

            <button
              type='submit'
              disabled={loading}
              className='w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl active:scale-95'
            >
              {loading ? (
                <Loader2 className='animate-spin' />
              ) : (
                <>
                  Ingresar <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className='mt-8 text-center'>
            <a
              href='#'
              className='text-sm text-slate-400 hover:text-blue-600 transition-colors'
            >
              ¿Olvidaste tu contraseña?
            </a>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
