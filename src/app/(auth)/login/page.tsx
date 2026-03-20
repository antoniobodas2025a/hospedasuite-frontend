'use client';

import { login } from '@/app/actions/auth';
import { useState } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);

    // Invocamos la Server Action
    const result = await login(formData).catch((e) => ({
      success: false,
      message: e.message,
    }));

    // Si login hace redirect, este código no se ejecuta.
    // Si llega aquí, hubo error.
    if (result && !result.success) {
      setError(result.message || 'Credenciales inválidas');
      setLoading(false);
    }
  }

  return (
    <div className='min-h-screen flex items-center justify-center bg-[#09090b] relative overflow-hidden'>
      {/* Background FX */}
      <div className='absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-900/20 rounded-full blur-[120px] opacity-40 animate-pulse' />

      <div className='w-full max-w-md p-8 relative z-10'>
        <div className='text-center mb-10'>
          <div className='w-16 h-16 bg-gradient-to-tr from-blue-600 to-cyan-400 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-blue-900/30 mb-4'>
            <ShieldCheck className='text-white w-8 h-8' />
          </div>
          <h1 className='text-2xl font-bold text-white tracking-tight'>
            HospedaSuite SaaS
          </h1>
          <p className='text-white/40 text-sm mt-2'>
            Acceso Seguro Multi-Tenant
          </p>
        </div>

        <form
          action={handleSubmit}
          className='space-y-4 bg-white/5 p-8 rounded-3xl border border-white/10 backdrop-blur-xl'
        >
          {error && (
            <div className='p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs font-bold text-center'>
              {error}
            </div>
          )}

          <div className='space-y-1'>
            <label className='text-xs font-bold text-white/50 uppercase ml-1'>
              Email Corporativo
            </label>
            <input
              name='email'
              type='email'
              required
              placeholder='admin@hotel.com'
              className='w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-blue-500/50 focus:bg-black/60 transition-all'
            />
          </div>

          <div className='space-y-1'>
            <label className='text-xs font-bold text-white/50 uppercase ml-1'>
              Contraseña
            </label>
            <input
              name='password'
              type='password'
              required
              placeholder='••••••••'
              className='w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-blue-500/50 focus:bg-black/60 transition-all'
            />
          </div>

          <button
            type='submit'
            disabled={loading}
            className='w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-900/20 transition-all flex justify-center items-center gap-2 mt-4 disabled:opacity-50 disabled:cursor-not-allowed'
          >
            {loading ? <Loader2 className='animate-spin' /> : 'Iniciar Sesión'}
          </button>
        </form>

        <p className='text-center text-white/20 text-xs mt-8'>
          Protegido por SSL de grado militar
        </p>
      </div>
    </div>
  );
}
