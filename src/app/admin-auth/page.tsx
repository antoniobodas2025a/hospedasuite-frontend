'use client';

import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Lock, Mail, ArrowLeft, Loader2, ShieldCheck } from 'lucide-react';

// --- CONFIGURACIÓN ---
const BRAND_COLOR = '#0065B3';

// Inicializamos el cliente manualmente
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert('Error de Credenciales: ' + error.message);
      setLoading(false);
    } else {
      router.refresh();
      router.push('/dashboard/settings');
    }
  };

  return (
    <div className='min-h-screen bg-[#F5F5F7] flex items-center justify-center p-6 relative overflow-hidden font-sans selection:bg-[#0065B3]/20'>
      {/* Background Ambient Glow (Estilo macOS Wallpaper) */}
      <div
        className='absolute top-[-20%] left-[-10%] w-[800px] h-[800px] rounded-full opacity-60 pointer-events-none blur-3xl'
        style={{
          background: `radial-gradient(circle, ${BRAND_COLOR}15 0%, transparent 70%)`,
        }}
      />
      <div
        className='absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full opacity-60 pointer-events-none blur-3xl'
        style={{
          background:
            'radial-gradient(circle, rgba(0,0,0,0.03) 0%, transparent 70%)',
        }}
      />

      {/* Main Card */}
      <div className='bg-white/80 backdrop-blur-xl border border-white/50 rounded-[2rem] p-10 max-w-[420px] w-full shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] relative z-10 animate-in fade-in zoom-in-95 duration-500'>
        {/* Header: Logo & Title */}
        <div className='flex flex-col items-center mb-10'>
          <Link
            href='/'
            className='mb-6 hover:scale-105 transition-transform duration-300'
          >
            <div className='w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0065B3] to-[#004E8A] flex items-center justify-center shadow-lg shadow-blue-900/20 text-white'>
              {/* Intentamos cargar el logo, si falla mostramos la H */}
              <div className='relative w-full h-full flex items-center justify-center overflow-hidden rounded-2xl'>
                <Image
                  src='/logo.png'
                  alt='Logo'
                  width={64}
                  height={64}
                  className='object-cover'
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <span className='absolute text-3xl font-bold font-serif pointer-events-none'>
                  H
                </span>
              </div>
            </div>
          </Link>

          <h1 className='text-2xl font-bold tracking-tight text-[#1d1d1f]'>
            Bienvenido de nuevo
          </h1>
          <p className='text-[#1d1d1f]/50 text-[15px] font-medium mt-2'>
            Ingresa a tu Suite de Control
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleLogin}
          className='space-y-5'
        >
          {/* Email Input */}
          <div className='space-y-1.5'>
            <label className='text-[13px] font-semibold text-[#1d1d1f]/70 ml-1'>
              Correo Corporativo
            </label>
            <div className='relative group'>
              <Mail
                className='absolute left-4 top-3.5 text-[#1d1d1f]/30 group-focus-within:text-[#0065B3] transition-colors'
                size={18}
              />
              <input
                type='email'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className='w-full pl-11 pr-4 py-3.5 bg-[#F5F5F7] border-transparent rounded-xl text-[15px] text-[#1d1d1f] placeholder:text-[#1d1d1f]/20 outline-none focus:bg-white focus:ring-4 focus:ring-[#0065B3]/10 focus:border-[#0065B3]/20 transition-all duration-200 shadow-inner'
                placeholder='admin@hospedasuite.com'
                required
              />
            </div>
          </div>

          {/* Password Input */}
          <div className='space-y-1.5'>
            <label className='text-[13px] font-semibold text-[#1d1d1f]/70 ml-1'>
              Contraseña Maestra
            </label>
            <div className='relative group'>
              <Lock
                className='absolute left-4 top-3.5 text-[#1d1d1f]/30 group-focus-within:text-[#0065B3] transition-colors'
                size={18}
              />
              <input
                type='password'
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className='w-full pl-11 pr-4 py-3.5 bg-[#F5F5F7] border-transparent rounded-xl text-[15px] text-[#1d1d1f] placeholder:text-[#1d1d1f]/20 outline-none focus:bg-white focus:ring-4 focus:ring-[#0065B3]/10 focus:border-[#0065B3]/20 transition-all duration-200 shadow-inner'
                placeholder='••••••••'
                required
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type='submit'
            disabled={loading}
            className='w-full py-4 mt-4 bg-[#1d1d1f] hover:bg-black text-white font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2'
          >
            {loading ? (
              <>
                <Loader2
                  className='animate-spin'
                  size={18}
                />
                <span>Verificando...</span>
              </>
            ) : (
              'Iniciar Sesión'
            )}
          </button>
        </form>

        {/* Footer Links */}
        <div className='mt-8 pt-6 border-t border-[#1d1d1f]/5 flex items-center justify-between text-[13px] font-medium'>
          <Link
            href='/'
            className='text-[#1d1d1f]/40 hover:text-[#1d1d1f] flex items-center gap-1.5 transition-colors group'
          >
            <ArrowLeft
              size={14}
              className='group-hover:-translate-x-1 transition-transform'
            />
            Volver al inicio
          </Link>

          <div
            className='flex items-center gap-1.5 text-[#0065B3]/80 cursor-help'
            title='Conexión encriptada'
          >
            <ShieldCheck size={14} />
            <span>Acceso Seguro</span>
          </div>
        </div>
      </div>

      {/* Copyright */}
      <div className='absolute bottom-6 text-center w-full text-[12px] text-[#1d1d1f]/30 font-medium'>
        © 2026 HospedaSuite Inc. Sistema Operativo Hotelero.
      </div>
    </div>
  );
}
