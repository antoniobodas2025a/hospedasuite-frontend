'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Mail, Lock, Loader2, ArrowRight, AlertCircle, ShieldCheck } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { springGentle, springSnappy } from '@/lib/mac2026/spring';

interface AuthStepProps {
  onSuccess: () => void;
}

export default function AuthStep({ onSuccess }: AuthStepProps) {
  const searchParams = useSearchParams();
  const prefillEmail = searchParams.get('email') || '';
  const prefillRooms = searchParams.get('rooms') || '';

  const [email, setEmail] = useState(prefillEmail);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  // S2: Lock pre-filled email to prevent typo re-entry
  const isEmailPrefilled = prefillEmail.length > 0;

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Small delay for UX feel, then proceed
    setTimeout(() => onSuccess(), 800);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springGentle()}
      className="w-full max-w-md mx-auto"
    >
      <div className="text-center mb-8">
        <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-[var(--radius-squircle-lg)] flex items-center justify-center mx-auto mb-4 backdrop-blur-xl">
          <Mail className="text-zinc-400" size={20} />
        </div>
        <h3 className="text-xl font-bold text-white tracking-tight">Creá tu cuenta</h3>
        <p className="text-zinc-500 text-sm mt-1">Empezá tu mes gratis ahora</p>
      </div>

      <form onSubmit={handleSignUp} className="space-y-4">
        {/* Email — S2: Read-only if pre-filled from Dark Funnel */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-zinc-400 ml-1">Email</label>
          <div className="relative group">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-indigo-400 transition-colors" size={16} />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              readOnly={isEmailPrefilled}
              placeholder="tu@email.com"
              className={`w-full bg-zinc-900/50 border rounded-[var(--radius-squircle-md)] py-3 pl-10 pr-4 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 transition-all ${
                isEmailPrefilled
                  ? 'border-indigo-500/30 text-indigo-300 cursor-not-allowed opacity-80'
                  : 'border-white/10 focus:border-indigo-500/50 focus:ring-indigo-500/20'
              }`}
            />
            {isEmailPrefilled && (
              <ShieldCheck className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-400" size={16} />
            )}
          </div>
          {isEmailPrefilled && (
            <p className="text-[11px] text-indigo-400/60 ml-1">
              ✓ Pre-llenado desde tu solicitud · No requiere reingreso
            </p>
          )}
        </div>

        {/* Password */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-zinc-400 ml-1">Contraseña</label>
          <div className="relative group">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-indigo-400 transition-colors" size={16} />
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className="w-full bg-zinc-900/50 border border-white/10 rounded-[var(--radius-squircle-md)] py-3 pl-10 pr-4 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all"
            />
          </div>
        </div>

        {/* Room capacity indicator — S1: Show pre-filled room count */}
        {prefillRooms && (
          <div className="bg-white/5 border border-white/10 rounded-[var(--radius-squircle-md)] p-3 flex items-center gap-3">
            <ShieldCheck className="text-indigo-400 flex-shrink-0" size={16} />
            <p className="text-xs text-zinc-400">
              Capacidad operativa: <span className="text-white font-semibold">{prefillRooms} habitación{prefillRooms !== '1' ? 'es' : ''}</span>
            </p>
          </div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-[var(--radius-squircle-md)] text-rose-400 text-xs"
          >
            <AlertCircle size={14} />
            {error}
          </motion.div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 rounded-[var(--radius-squircle-xl)] text-sm tracking-wide flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-600/20 active:scale-[0.98]"
        >
          {loading ? (
            <Loader2 className="animate-spin" size={18} />
          ) : (
            <>
              Crear cuenta
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-zinc-600 text-xs">
          ¿Ya tienes cuenta?{' '}
          <a href="/login" className="text-zinc-400 hover:text-white transition-colors underline underline-offset-4">
            Iniciar sesión
          </a>
        </p>
      </div>
    </motion.div>
  );
}
