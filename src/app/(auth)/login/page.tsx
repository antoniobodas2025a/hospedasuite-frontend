'use client';

import { login } from '@/app/actions/auth';
import { useState, useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Loader2, ShieldCheck, Eye, EyeOff } from 'lucide-react';

async function loginAction(_state: unknown, formData: FormData) {
  return login(formData);
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type='submit'
      disabled={pending}
      className='w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-[var(--radius-squircle-lg)] shadow-lg shadow-blue-900/20 transition-all flex justify-center items-center gap-2 mt-4 disabled:opacity-50 disabled:cursor-not-allowed'
    >
      {pending ? <Loader2 className='animate-spin' /> : 'Iniciar Sesión'}
    </button>
  );
}

export default function LoginPage() {
  const [state, formAction] = useActionState(loginAction, null);
  const [showPassword, setShowPassword] = useState(false);

  const error = state && !state.success ? state.message : null;

  return (
    <div className='min-h-screen flex items-center justify-center bg-[#09090b] relative overflow-hidden'>
      {/* Background FX */}
      <div className='absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-900/20 rounded-full blur-[120px] opacity-40 animate-pulse' />

      <div className='w-full max-w-md p-8 relative z-10'>
        <div className='text-center mb-10'>
          <div className='w-16 h-16 bg-gradient-to-tr from-blue-600 to-cyan-400 rounded-[var(--radius-squircle-2xl)] mx-auto flex items-center justify-center shadow-lg shadow-blue-900/30 mb-4'>
            <ShieldCheck className='text-white w-8 h-8' />
          </div>
          <h1 className='text-2xl font-bold text-white tracking-tight'>
            HospedaSuite SaaS
          </h1>
          <p className='text-white/40 text-sm mt-2'>
            Acceso Seguro
          </p>
        </div>

        <form
          action={formAction}
          className='space-y-4 glass-card p-8'
        >
          {error && (
            <div className='p-3 bg-red-500/10 border border-red-500/20 rounded-[var(--radius-squircle-md)] text-red-400 text-xs font-bold text-center'>
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
              className='w-full bg-black/40 border border-white/10 rounded-[var(--radius-squircle-lg)] p-4 text-white outline-none focus:border-blue-500/50 focus:bg-black/60 transition-all'
            />
          </div>

          <div className='space-y-1'>
            <label className='text-xs font-bold text-white/50 uppercase ml-1'>
              Contraseña
            </label>
            <div className='relative'>
              <input
                name='password'
                type={showPassword ? 'text' : 'password'}
                required
                placeholder='••••••••'
                className='w-full bg-black/40 border border-white/10 rounded-[var(--radius-squircle-lg)] p-4 pr-12 text-white outline-none focus:border-blue-500/50 focus:bg-black/60 transition-all'
              />
              <button
                type='button'
                tabIndex={0}
                onClick={() => setShowPassword(!showPassword)}
                className='absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors p-1'
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <SubmitButton />
        </form>

        <p className='text-center text-white/20 text-xs mt-8'>
          Protegido por SSL de grado militar
        </p>

        <div className="mt-6 text-center">
          <p className="text-white/40 text-xs">
            ¿No tenés cuenta?{' '}
            <a href="/software/onboarding?plan=pro" className="text-white/70 hover:text-white transition-colors underline underline-offset-4">
              Empezar 1 mes gratis
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
