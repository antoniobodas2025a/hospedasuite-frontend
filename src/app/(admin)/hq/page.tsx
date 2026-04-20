'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Building2, 
  TrendingUp, 
  Zap, 
  ShieldCheck, 
  DollarSign,
  FileText,
  AlertCircle,
  Server,
  Loader2
} from 'lucide-react';
import { getHQFinancialReportAction, HotelFinancialRecord } from '@/app/actions/hq';

export default function SuperAdminHQ() {
  const [data, setData] = useState<HotelFinancialRecord[]>([]);
  const [kpis, setKpis] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadHQ() {
      setIsLoading(true);
      const res = await getHQFinancialReportAction();
      if (res.success) {
        setData(res.report);
        setKpis(res.kpis);
      } else {
        setError(res.error);
      }
      setIsLoading(false);
    }
    loadHQ();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] flex flex-col items-center justify-center">
        <Loader2 size={32} className="text-slate-400 animate-spin mb-4" />
        <span className="text-slate-400 font-medium tracking-widest uppercase text-xs">Autenticando Nivel Tier-0...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-[2rem] shadow-2xl max-w-md w-full border border-red-100 text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldCheck size={32} className="text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2 tracking-tight">Acceso Restringido</h2>
          <p className="text-sm text-slate-500 font-medium">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f] font-sans selection:bg-emerald-200">
      
      {/* HEADER HQ */}
      <header className="bg-white/80 backdrop-blur-2xl border-b border-black/5 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center shadow-inner">
              <Server size={16} className="text-emerald-400" />
            </div>
            <h1 className="text-lg font-bold tracking-tight">HospedaSuite Central</h1>
          </div>
          <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Corte Financiero Activo</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        
        {/* KPI DASHBOARD */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 rounded-[2rem] shadow-sm border border-black/5 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><Building2 size={20} /></div>
            </div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Tenants (Hoteles)</p>
            <h3 className="text-3xl font-display font-bold tracking-tight">{kpis?.totalHotels}</h3>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white p-6 rounded-[2rem] shadow-sm border border-black/5 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><Zap size={20} /></div>
            </div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">MRR (Planes Base)</p>
            <h3 className="text-3xl font-display font-bold tracking-tight tabular-nums">${kpis?.globalSaaS.toLocaleString()}</h3>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white p-6 rounded-[2rem] shadow-sm border border-black/5 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl"><TrendingUp size={20} /></div>
            </div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Comisiones (OTA+IA)</p>
            <h3 className="text-3xl font-display font-bold tracking-tight tabular-nums">${kpis?.globalCommissions.toLocaleString()}</h3>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-slate-900 text-white p-6 rounded-[2rem] shadow-xl border border-slate-800 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-16 bg-emerald-500/20 blur-3xl rounded-full pointer-events-none" />
            <div className="flex justify-between items-start mb-4 relative z-10">
              <div className="p-3 bg-white/10 text-emerald-400 rounded-2xl border border-white/5"><DollarSign size={20} /></div>
            </div>
            <p className="text-[11px] font-bold text-white/50 uppercase tracking-widest mb-1 relative z-10">A Facturar (Mes Actual)</p>
            <h3 className="text-4xl font-display font-bold text-emerald-400 tracking-tight tabular-nums relative z-10">${kpis?.grandTotalExpected.toLocaleString()}</h3>
          </motion.div>
        </div>

        {/* LEDGER DE CLIENTES (Tabla de Cobro) */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="bg-white rounded-[2rem] shadow-sm border border-black/5 overflow-hidden">
          <div className="p-8 border-b border-black/5 flex flex-col md:flex-row md:justify-between items-start md:items-center gap-4 bg-slate-50/50">
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Estado de Cuentas (Por Cobrar)</h2>
              <p className="text-sm text-slate-500 font-medium mt-1">Desglose del modelo SaaS Bundling por Hotel.</p>
            </div>
            <button className="flex items-center gap-2 bg-emerald-500 text-white px-6 py-3 rounded-full text-sm font-bold shadow-md hover:bg-emerald-400 transition-all active:scale-95">
              <FileText size={16} /> Emitir Lote de Facturas
            </button>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-white">
                  <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Tenant (Propiedad)</th>
                  <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Plan Suscripción</th>
                  <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Comisiones (Variables)</th>
                  <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Total a Cobrar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-8 py-16 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center">
                        <Server size={32} className="mb-3 opacity-20" />
                        <span className="font-medium">No hay registros financieros activos en este periodo.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  data.map((hotel) => (
                    <tr key={hotel.hotel_id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-8 py-6">
                        <div className="font-bold text-slate-900 tracking-tight">{hotel.hotel_name}</div>
                        <div className="text-xs text-slate-400 font-medium mt-1">{hotel.total_bookings} reservas procesadas</div>
                      </td>
                      <td className="px-8 py-6">
                        {hotel.subscription_plan === 'none' ? (
                          <span className="text-[11px] font-bold bg-red-50 text-red-700 px-3 py-1.5 rounded-full border border-red-100">
                            No Asignado
                          </span>
                        ) : (
                          <div>
                            <span className="text-[11px] font-bold bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full border border-blue-100 uppercase tracking-wider">
                              {hotel.subscription_plan}
                            </span>
                            <div className="text-xs text-slate-500 font-medium mt-2 tabular-nums">${hotel.subscription_fee.toLocaleString()}</div>
                          </div>
                        )}
                      </td>
                      <td className="px-8 py-6">
                        <span className="text-sm font-bold text-slate-700 tabular-nums">${hotel.accumulated_fees.toLocaleString()}</span>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {hotel.total_debt > 250000 && (
                            <AlertCircle size={14} className="text-amber-500" />
                          )}
                          <span className="text-xl font-bold text-slate-900 tabular-nums tracking-tight">${hotel.total_debt.toLocaleString()}</span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

      </main>
    </div>
  );
}