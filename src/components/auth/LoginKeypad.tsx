'use client';

import { useState } from 'react';
import Image from 'next/image';
import { verifyPin } from '@/app/actions/auth';
import { useRouter } from 'next/navigation';
import { Loader2, Lock } from 'lucide-react';

// CAMBIO IMPORTANTE: El nombre de la función ahora es LoginKeypad
export default function LoginKeypad() {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleNumberClick = (num: string) => {
    if (pin.length < 4) {
      setPin((prev) => prev + num);
      setError('');
    }
  };

  const handleClear = () => setPin('');

  const handleSubmit = async () => {
    if (pin.length !== 4) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('pin', pin);

    const result = await verifyPin(formData);

    if (result.success) {
      router.push('/dashboard');
    } else {
      setError(result.message || 'Error de acceso');
      setPin('');
      setLoading(false);
    }
  };

  return (
    <div className='min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-hospeda-950'>
      {/* Fondo Ambient */}
      <div className='absolute top-[-20%] left-[-10%] w-96 h-96 bg-hospeda-600/30 rounded-full blur-[100px] animate-pulse' />
      <div className='absolute bottom-[-20%] right-[-10%] w-96 h-96 bg-cyan-500/20 rounded-full blur-[100px]' />

      <div className='glass-card w-full max-w-md p-8 rounded-3xl flex flex-col items-center relative z-10 backdrop-blur-xl bg-black/40 border-white/10'>
        {/* Identidad Corporativa */}
        <div className='mb-8 flex flex-col items-center'>
          <div className='w-24 h-24 relative mb-4 rounded-2xl overflow-hidden shadow-2xl border border-white/20 p-2 bg-white/5'>
            <Image
              src='/logo.png'
              alt='HospedaSuite Logo'
              fill
              // [AUDITORÍA] Agregamos esto para calmar a Next.js:
              sizes='(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
              className='object-contain p-1'
              priority
            />
          </div>
          <h1 className='text-2xl font-display text-white tracking-widest uppercase text-center'>
            Hospeda<span className='text-hospeda-400 font-bold'>Suite</span>
          </h1>
          <p className='text-[10px] text-hospeda-300 tracking-[0.3em] mt-1 uppercase'>
            Sistema Forense V27.0
          </p>
        </div>

        {/* Display del PIN */}
        <div className='flex gap-4 mb-8'>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                pin.length > i
                  ? 'bg-hospeda-400 shadow-[0_0_15px_#38bdf8]'
                  : 'bg-white/10 border border-white/20'
              }`}
            />
          ))}
        </div>

        {/* Mensaje de Error */}
        {error && (
          <div className='mb-6 text-red-300 text-xs font-mono bg-red-950/50 px-4 py-2 rounded-lg border border-red-500/20 animate-bounce'>
            ⚠ {error}
          </div>
        )}

        {/* Teclado Numérico */}
        <div className='grid grid-cols-3 gap-4 w-full max-w-[260px]'>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => handleNumberClick(num.toString())}
              className='h-16 w-16 rounded-2xl bg-white/5 hover:bg-white/10 active:bg-white/20 transition-all flex items-center justify-center text-xl font-light text-white border border-white/5 mx-auto shadow-lg'
            >
              {num}
            </button>
          ))}
          <button
            onClick={handleClear}
            className='h-16 w-16 flex items-center justify-center text-white/40 hover:text-white transition-colors mx-auto uppercase text-[10px] font-bold tracking-widest'
          >
            CLR
          </button>
          <button
            onClick={() => handleNumberClick('0')}
            className='h-16 w-16 rounded-2xl bg-white/5 hover:bg-white/10 active:bg-white/20 transition-all flex items-center justify-center text-xl font-light text-white border border-white/5 mx-auto shadow-lg'
          >
            0
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || pin.length !== 4}
            className='h-16 w-16 rounded-2xl bg-hospeda-600/20 hover:bg-hospeda-500/40 border border-hospeda-500/30 flex items-center justify-center text-hospeda-400 hover:text-white transition-all mx-auto disabled:opacity-30 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(14,165,233,0.1)]'
          >
            {loading ? (
              <Loader2 className='animate-spin' />
            ) : (
              <Lock size={20} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
