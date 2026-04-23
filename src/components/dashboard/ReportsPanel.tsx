'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Download, Calendar, DollarSign, FileText, TrendingUp, 
  Target, BarChart3, Search 
} from 'lucide-react';
import { utils, writeFile } from 'xlsx';
import { cn } from '@/lib/utils';

// ==========================================
// BLOQUE 1: INTERFACES ESTRICTAS
// ==========================================

export interface SaleRecord {
  id: string;
  date: string;
  guest: string;
  room: string;
  total: number;
  status: string;
}

interface ReportsPanelProps {
  sales: SaleRecord[];
}

interface ReportsPanelViewProps {
  filteredSales: SaleRecord[];
  totalRevenue: number;
  avgTicket: number;
  dateRange: string;
  setDateRange: (range: string) => void;
  onDownloadExcel: () => void;
}

// ==========================================
// BLOQUE 2: COMPONENTE PRESENTACIONAL (UI Claude 2026)
// ==========================================

const ReportsPanelView: React.FC<ReportsPanelViewProps> = ({
  filteredSales, totalRevenue, avgTicket, dateRange, setDateRange, onDownloadExcel
}) => {
  return (
    <div className='space-y-8 pb-20 font-poppins text-zinc-100'>
      
      {/* HEADER ESTRATÉGICO: Liquid Glass Header */}
      <div className='flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-zinc-900/40 backdrop-blur-2xl p-8 rounded-[2.5rem] border border-white/5 shadow-2xl ring-1 ring-inset ring-white/10'>
        <div>
          <h2 className='text-2xl font-bold text-zinc-50 tracking-tight flex items-center gap-3'>
            <BarChart3 className="text-indigo-400 size-6" />
            Reporte de Desempeño
          </h2>
          <p className='text-zinc-400 text-sm mt-1 font-lora'>Auditoría de ingresos consolidados y métricas de conversión.</p>
        </div>

        <div className='flex flex-wrap items-center gap-4 w-full lg:w-auto'>
          {/* Selector de Rango Temporal (Liquid Tabs) */}
          <div className='flex bg-zinc-950/60 p-1.5 rounded-2xl border border-white/5'>
            {['month', 'year', 'all'].map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={cn(
                  "px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all",
                  dateRange === range 
                    ? "bg-zinc-800 text-white shadow-lg ring-1 ring-white/10" 
                    : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                {range === 'month' ? 'Mes' : range === 'year' ? 'Año' : 'Histórico'}
              </button>
            ))}
          </div>

          <button
            onClick={onDownloadExcel}
            className='flex items-center gap-2 px-6 py-3 bg-emerald-600/90 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all active:scale-95 border border-emerald-400/20'
          >
            <Download size={18} strokeWidth={2.5} /> 
            <span className='hidden sm:inline'>Exportar Ledger</span>
          </button>
        </div>
      </div>

      {/* MATRIZ DE KPIs (Liquid Strategic Cards) */}
      <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
        {/* KPI: Ingresos Totales */}
        <div className='bg-indigo-600/10 backdrop-blur-xl p-8 rounded-[2.5rem] border border-indigo-500/20 relative overflow-hidden group'>
          <div className="absolute -right-6 -bottom-6 size-32 bg-indigo-500/20 rounded-full blur-3xl group-hover:bg-indigo-500/30 transition-colors" />
          <div className='relative z-10 space-y-2'>
            <p className='text-indigo-400/80 text-[10px] font-bold uppercase tracking-[0.2em]'>Recaudación Bruta</p>
            <h3 className='text-4xl font-bold text-zinc-50 tracking-tighter tabular-nums'>
              ${totalRevenue.toLocaleString()}
            </h3>
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-lg w-fit border border-emerald-500/20">
              <TrendingUp size={12} /> +4.2%
            </div>
          </div>
          <DollarSign className='absolute right-6 top-6 text-indigo-500/10' size={60} strokeWidth={1} />
        </div>

        {/* KPI: Volumen de Reservas */}
        <div className='bg-zinc-900/40 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/5 flex items-center gap-6 shadow-inner'>
          <div className='size-14 rounded-2xl bg-zinc-950 flex items-center justify-center text-indigo-400 border border-white/5 shadow-2xl'>
            <Calendar size={28} strokeWidth={1.5} />
          </div>
          <div>
            <p className='text-zinc-500 text-[10px] font-bold uppercase tracking-[0.2em]'>Nodos Facturados</p>
            <h3 className='text-3xl font-bold text-zinc-50 tracking-tight'>
              {filteredSales.length} <span className="text-zinc-700 text-sm font-normal">Unidades</span>
            </h3>
          </div>
        </div>

        {/* KPI: Ticket Promedio */}
        <div className='bg-zinc-900/40 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/5 flex items-center gap-6 shadow-inner'>
          <div className='size-14 rounded-2xl bg-zinc-950 flex items-center justify-center text-emerald-400 border border-white/5 shadow-2xl'>
            <Target size={28} strokeWidth={1.5} />
          </div>
          <div>
            <p className='text-zinc-500 text-[10px] font-bold uppercase tracking-[0.2em]'>Valor Promedio</p>
            <h3 className='text-3xl font-bold text-zinc-50 tracking-tight tabular-nums'>
              ${avgTicket.toLocaleString()}
            </h3>
          </div>
        </div>
      </div>

      {/* DATA LEDGER: Tabla de Alta Densidad */}
      <div className='bg-zinc-900/40 backdrop-blur-xl rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl ring-1 ring-white/5'>
        <div className='overflow-x-auto custom-scrollbar'>
          <table className='w-full text-left border-collapse'>
            <thead>
              <tr className='bg-zinc-950/80 border-b border-white/5 text-[10px] font-bold text-zinc-500 uppercase tracking-widest'>
                <th className='p-6'>Vector Fecha</th>
                <th className='p-6'>Entidad Huésped</th>
                <th className='p-6'>Unidad Asignada</th>
                <th className='p-6'>Estado Fiscal</th>
                <th className='p-6 text-right'>Liquidación</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-white/5'>
              <AnimatePresence mode='popLayout'>
                {filteredSales.map((sale) => (
                  <motion.tr
                    key={sale.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className='hover:bg-white/[0.02] transition-colors group'
                  >
                    <td className='p-6 font-mono text-xs text-zinc-400'>{sale.date}</td>
                    <td className='p-6'>
                      <div className='font-bold text-zinc-200 group-hover:text-indigo-400 transition-colors'>{sale.guest}</div>
                      <div className='text-[9px] text-zinc-600 font-mono mt-0.5'>HASH: {sale.id.split('-')[0]}</div>
                    </td>
                    <td className='p-6 text-sm text-zinc-400'>{sale.room}</td>
                    <td className='p-6'>
                      <span className='px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-[9px] font-bold uppercase tracking-widest'>
                        {sale.status}
                      </span>
                    </td>
                    <td className='p-6 font-bold text-zinc-100 text-right tabular-nums'>
                      ${sale.total.toLocaleString()}
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
              {filteredSales.length === 0 && (
                <tr>
                  <td colSpan={5} className='p-20 text-center'>
                    <div className='flex flex-col items-center gap-4 opacity-30'>
                      <Search size={48} strokeWidth={1} />
                      <p className="text-zinc-500 font-mono text-sm uppercase tracking-widest">No se detectaron transacciones en este vector temporal.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default function ReportsPanel({ sales }: ReportsPanelProps) {
  const [dateRange, setDateRange] = useState('month');

  const { filteredSales, totalRevenue, avgTicket } = useMemo(() => {
    const safeSales = Array.isArray(sales) ? sales : [];
    const now = new Date();
    
    const filtered = safeSales.filter((s) => {
      const d = new Date(s.date);
      if (dateRange === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      if (dateRange === 'year') return d.getFullYear() === now.getFullYear();
      return true;
    });

    const revenue = filtered.reduce((acc, curr) => acc + curr.total, 0);
    const average = filtered.length > 0 ? Math.round(revenue / filtered.length) : 0;

    return { filteredSales: filtered, totalRevenue: revenue, avgTicket: average };
  }, [sales, dateRange]);

  const handleDownloadExcel = () => {
    try {
      const ws = utils.json_to_sheet(filteredSales);
      const wb = utils.book_new();
      utils.book_append_sheet(wb, ws, 'Ventas');
      writeFile(wb, `Audit_Report_${dateRange}_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error("[CRITICAL] Fallo en exportación de activos:", error);
      alert("Error crítico al generar el libro de Excel.");
    }
  };

  return (
    <ReportsPanelView 
      filteredSales={filteredSales}
      totalRevenue={totalRevenue}
      avgTicket={avgTicket}
      dateRange={dateRange}
      setDateRange={setDateRange}
      onDownloadExcel={handleDownloadExcel}
    />
  );
}