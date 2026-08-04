'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface TermsAcceptanceProps {
  accepted: boolean;
  onAcceptanceChange: (accepted: boolean) => void;
}

export default function TermsAcceptance({ accepted, onAcceptanceChange }: TermsAcceptanceProps) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      {/* Checkbox principal */}
      <label className="flex items-start gap-3 p-4 bg-slate-800/40 border border-slate-500/30 rounded-[var(--radius-squircle-xl)] cursor-pointer hover:bg-slate-800/60 transition-colors">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => onAcceptanceChange(e.target.checked)}
          className="mt-1 w-5 h-5 rounded border-slate-500 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-0 bg-slate-900"
        />
        <div className="flex-1 space-y-1">
          <p className="text-sm text-zinc-300 leading-relaxed">
            He leído y acepto los{' '}
            <Link
              href="/software/terms"
              target="_blank"
              className="text-indigo-400 hover:text-indigo-300 underline font-semibold inline-flex items-center gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              Términos y Condiciones
              <ExternalLink size={12} />
            </Link>{' '}
            y la{' '}
            <Link
              href="/software/privacy"
              target="_blank"
              className="text-indigo-400 hover:text-indigo-300 underline font-semibold inline-flex items-center gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              Política de Privacidad
              <ExternalLink size={12} />
            </Link>{' '}
            de HospedaSuite.
          </p>
          
          {/* Detalles expandibles */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowDetails(!showDetails);
            }}
            className="text-xs text-zinc-500 hover:text-zinc-400 transition-colors flex items-center gap-1"
          >
            <Shield size={12} />
            {showDetails ? 'Ocultar detalles' : 'Ver qué implica aceptar'}
          </button>

          {showDetails && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 p-3 bg-slate-900/60 border border-slate-700/50 rounded-[var(--radius-squircle-lg)] space-y-2 text-xs text-zinc-400"
            >
              <p className="font-semibold text-zinc-300">Al aceptar, entendés que:</p>
              <ul className="space-y-1.5 list-disc list-inside">
                <li>
                  HospedaSuite recopilará y procesará tus datos personales según la Ley 1581 de 2012
                </li>
                <li>
                  Tu suscripción se renovará automáticamente cada mes (podés cancelar cuando quieras)
                </li>
                <li>
                  HospedaSuite cobra una comisión del 8% sobre reservas realizadas a través de la plataforma
                </li>
                <li>
                  Sos responsable de la veracidad de la información de tu propiedad
                </li>
                <li>
                  HospedaSuite no es responsable por disputas entre huéspedes y hoteles
                </li>
              </ul>
              <p className="text-zinc-500 italic mt-2">
                Podés ejercer tus derechos de acceso, rectificación y supresión de datos en cualquier momento contactando a soporte@hospedasuite.com
              </p>
            </motion.div>
          )}
        </div>
      </label>

      {/* Warning si no está aceptado */}
      {!accepted && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-amber-400 text-center flex items-center justify-center gap-1"
        >
          <Shield size={12} />
          Debés aceptar los términos para continuar
        </motion.p>
      )}
    </motion.div>
  );
}
