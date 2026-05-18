'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle2, ArrowRight, ExternalLink } from 'lucide-react';

export default function OnboardingSuccess() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 flex flex-col items-center justify-center py-12 px-4 relative overflow-hidden">
      <div className="fixed top-[-20%] left-[-10%] w-[80%] h-[80%] bg-emerald-600/10 blur-[180px] rounded-full pointer-events-none" />
      
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="max-w-lg w-full text-center space-y-10 relative z-10">
        <CheckCircle2 className="mx-auto text-emerald-400" size={80} />
        
        <div className="space-y-4">
          <h1 className="text-4xl font-black text-white uppercase tracking-widest">¡Tu Propiedad Está Lista!</h1>
          <p className="text-zinc-400 text-lg">Todo fue configurado correctamente. Ya podés empezar a recibir reservas.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center justify-center gap-3 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[var(--radius-squircle-xl)] font-bold text-sm transition-all shadow-lg shadow-indigo-600/20"
          >
            Ir al Dashboard <ArrowRight size={16} />
          </button>
          <button
            onClick={() => router.push('/')}
            className="flex items-center justify-center gap-3 px-8 py-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-[var(--radius-squircle-xl)] font-bold text-sm transition-all border border-white/10"
          >
            Ver mi OTA <ExternalLink size={16} />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
