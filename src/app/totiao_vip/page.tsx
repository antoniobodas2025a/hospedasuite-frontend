'use client';

import { useState } from 'react';

export default function TotiaoPage() {
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');

    try {
      const res = await fetch('/api/totiao/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone }),
      });

      if (res.ok) {
        setStatus('success');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div className="bg-zinc-950 text-white min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none" />
        <main className="relative z-10 max-w-md w-full text-center space-y-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 mb-4">
            <span className="text-4xl">✅</span>
          </div>
          <h1 className="text-3xl font-black text-white">¡Listo!</h1>
          <p className="text-zinc-400 text-lg">
            Revisa tu WhatsApp en 5 segundos. 🥩
          </p>
          <p className="text-zinc-600 text-sm">
            Ya eres parte del grupo secreto.
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="bg-zinc-950 text-white min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-orange-600/10 rounded-full blur-[120px] pointer-events-none" />

      <main className="relative z-10 max-w-md w-full text-center space-y-8">
        <div className="space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 mb-4 animate-pulse">
            <span className="text-2xl">🥩</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">
            ¡El <span className="text-orange-500">CRUNCH</span> no miente! 🔥
          </h1>
          <p className="text-zinc-400 text-base mt-2">
            Ingresa tu WhatsApp para recibir el acceso VIP automático.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="pt-4 space-y-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tu nombre (opcional)"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500 transition-colors"
            disabled={status === 'loading'}
          />
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Tu WhatsApp (ej: 3001234567)"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500 transition-colors"
            required
            disabled={status === 'loading'}
          />
          <button
            type="submit"
            disabled={status === 'loading'}
            className="group w-full bg-orange-600 hover:bg-orange-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-bold text-lg py-4 px-8 rounded-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_40px_rgba(234,88,12,0.3)]"
          >
            {status === 'loading' ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Enviando...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                Quiero mi Acceso VIP
                <span className="text-xl transition-transform group-hover:rotate-12">🤫</span>
              </span>
            )}
          </button>
          {status === 'error' && (
            <p className="text-red-400 text-sm">
              Hubo un error. Intenta de nuevo o escríbenos directo.
            </p>
          )}
          <p className="text-zinc-600 text-xs">Sin spam. Solo lo importante.</p>
        </form>
      </main>

      <footer className="absolute bottom-6 text-zinc-700 text-[10px] font-medium tracking-wide">
        TOTAIO — 2026
      </footer>
    </div>
  );
}

