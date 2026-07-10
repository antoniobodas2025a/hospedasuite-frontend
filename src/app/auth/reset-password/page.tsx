'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Loader2, Eye, EyeOff } from 'lucide-react';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  // Procesar tokens del fragment de la URL (magic links)
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('access_token')) {
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');

      if (accessToken && refreshToken) {
        supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        }).then(({ error }) => {
          if (error) {
            console.error('Error setting session:', error);
            setError('Error al procesar el link. Solicita uno nuevo.');
          }
          // Limpiar el fragment de la URL
          window.history.replaceState(null, '', window.location.pathname);
          setProcessing(false);
        });
      } else {
        setProcessing(false);
      }
    } else {
      setProcessing(false);
    }
  }, [supabase.auth]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      setSuccess(true);
      setTimeout(() => {
        router.push('/admin');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Error al actualizar la contraseña');
    } finally {
      setLoading(false);
    }
  };

  if (processing) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-[#09090b]'>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-zinc-400">Procesando tu link de recuperación...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-[#09090b]'>
        <div className='w-full max-w-md p-8 glass-card text-center'>
          <div className='w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4'>
            <ShieldCheck className='text-green-400 w-8 h-8' />
          </div>
          <h2 className='text-2xl font-bold text-white mb-2'>Contraseña Actualizada</h2>
          <p className='text-zinc-400'>Redirigiendo al panel de administración...</p>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen flex items-center justify-center bg-[#09090b]'>
      <div className='w-full max-w-md p-8 glass-card'>
        <div className='text-center mb-8'>
          <div className='w-16 h-16 bg-gradient-to-tr from-blue-600 to-cyan-400 rounded-[var(--radius-squircle-2xl)] mx-auto flex items-center justify-center mb-4'>
            <ShieldCheck className='text-white w-8 h-8' />
          </div>
          <h1 className='text-2xl font-bold text-white'>Nueva Contraseña</h1>
          <p className='text-zinc-400 text-sm mt-2'>Ingresá tu nueva contraseña</p>
        </div>

        <form onSubmit={handleSubmit} className='space-y-4'>
          {error && (
            <div className='p-3 bg-red-500/10 border border-red-500/20 rounded-[var(--radius-squircle-md)] text-red-400 text-xs font-bold text-center'>
              {error}
            </div>
          )}

          <div>
            <label className='block text-xs font-bold text-zinc-400 uppercase mb-2'>
              Nueva Contraseña
            </label>
            <div className='relative'>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder='••••••••'
                className='w-full bg-black/40 border border-white/10 rounded-[var(--radius-squircle-lg)] p-4 text-white outline-none focus:border-blue-500/50'
              />
              <button
                type='button'
                onClick={() => setShowPassword(!showPassword)}
                className='absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white'
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div>
            <label className='block text-xs font-bold text-zinc-400 uppercase mb-2'>
              Confirmar Contraseña
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder='••••••••'
              className='w-full bg-black/40 border border-white/10 rounded-[var(--radius-squircle-lg)] p-4 text-white outline-none focus:border-blue-500/50'
            />
          </div>

          <button
            type='submit'
            disabled={loading}
            className='w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-[var(--radius-squircle-lg)] disabled:opacity-50 flex items-center justify-center gap-2'
          >
            {loading ? (
              <>
                <Loader2 className='animate-spin' />
                Actualizando...
              </>
            ) : (
              'Actualizar Contraseña'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
