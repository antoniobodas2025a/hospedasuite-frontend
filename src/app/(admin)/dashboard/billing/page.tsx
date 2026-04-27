'use client';

import React from 'react';
import { CreditCard, ShieldCheck, Activity, ArrowUpRight, Zap } from 'lucide-react';

/**
 * 🛡️ COMPONENTE DE FACTURACIÓN (TIER-1 ARCHITECTURE)
 * Certificado para cumplimiento de contrato de Next.js 16.
 * Resuelve el fallo de prerenderizado en Vercel.
 */
export default function BillingPage() {
  return (
    <div className="p-4 md:p-8 space-y-8 font-poppins text-zinc-100 min-h-screen">
      {/* HEADER DE CENTRO DE MANDO */}
      <div className="bg-zinc-900/40 backdrop-blur-3xl p-10 rounded-[3rem] border border-white/5 shadow-2xl relative overflow-hidden ring-1 ring-white/10">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <Zap size={120} />
        </div>
        
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6 relative z-10">
          <div className="p-4 bg-indigo-500/10 rounded-[2rem] text-indigo-400 border border-indigo-500/20 shadow-inner">
            <CreditCard size={40} />
          </div>
          <div className="space-y-1">
            <h2 className="text-4xl font-bold tracking-tighter uppercase text-white">Centro de Facturación</h2>
            <p className="text-zinc-500 text-sm italic font-lora">Análisis forense de ingresos y gestión de suscripciones.</p>
          </div>
        </div>

        {/* MOCK DE ESTADO FINANCIERO */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <div className="bg-black/40 p-6 rounded-[2rem] border border-white/5 space-y-2">
            <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Plan Actual</p>
            <div className="flex items-center justify-between">
              <p className="text-white font-bold text-xl uppercase">Pionero</p>
              <span className="bg-emerald-500/10 text-emerald-400 text-[10px] px-3 py-1 rounded-full font-bold border border-emerald-500/20">ACTIVO</span>
            </div>
          </div>
          <div className="bg-black/40 p-6 rounded-[2rem] border border-white/5 space-y-2">
            <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Próximo Cobro</p>
            <p className="text-white font-bold text-xl">$0.00 <span className="text-zinc-500 text-xs font-normal">COP</span></p>
          </div>
          <div className="bg-black/40 p-6 rounded-[2rem] border border-white/5 space-y-2">
            <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Días Restantes</p>
            <p className="text-indigo-400 font-bold text-xl italic font-mono">~90 Días</p>
          </div>
        </div>

        {/* CONTENEDOR DE PROTECCIÓN */}
        <div className="mt-12 bg-zinc-950/60 p-12 rounded-[2.5rem] border border-white/5 flex flex-col items-center justify-center text-center space-y-6 relative overflow-hidden group hover:border-emerald-500/20 transition-all duration-700">
          <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity blur-3xl pointer-events-none" />
          
          <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/20 shadow-2xl animate-pulse">
            <ShieldCheck className="text-emerald-500" size={42} />
          </div>
          
          <div className="space-y-3 max-w-md relative z-10">
            <h3 className="text-white font-bold text-lg uppercase tracking-widest">Blindaje Comercial Activo</h3>
            <p className="text-zinc-500 text-sm leading-relaxed font-lora italic">
              Antonio, tu acceso ha sido validado bajo el protocolo de <span className="text-emerald-400 font-bold">Lanzamiento Pionero</span>. 
              El despliegue de las métricas de transacciones en tiempo real comenzará tras el primer check-in operativo.
            </p>
          </div>
          
          <button className="flex items-center gap-2 text-[10px] font-bold text-zinc-600 uppercase tracking-[0.3em] hover:text-white transition-colors">
            Ver términos de cortesía <ArrowUpRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}