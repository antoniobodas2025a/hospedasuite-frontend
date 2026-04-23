'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  FileText, Search, Download, CalendarDays, User, BedDouble
} from 'lucide-react';
import { useForensicBook, ForensicEntry } from '@/hooks/useForensicBook';
import { cn } from '@/lib/utils';

// ==========================================
// BLOQUE 1: INTERFACES ESTRICTAS
// ==========================================

interface ForensicBookPanelContainerProps {
  initialData: ForensicEntry[];
}

interface ForensicBookPanelViewProps {
  entries: ForensicEntry[];
  searchTerm: string;
  statusFilter: string;
  totalRevenue: number;
  onFilter: (term: string, status: string) => void;
}

// ==========================================
// BLOQUE 2: COMPONENTES AUXILIARES Y DICCIONARIOS
// ==========================================

const getStatusStyle = (status: string) => {
  switch (status) {
    case 'checked_in':
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_-3px_rgba(16,185,129,0.2)]';
    case 'checked_out':
      return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
    case 'confirmed':
      return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 shadow-[0_0_10px_-3px_rgba(99,102,241,0.2)]';
    case 'cancelled':
      return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    default:
      return 'bg-zinc-800/50 text-zinc-500 border-white/5';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'checked_in': return 'En Casa';
    case 'checked_out': return 'Finalizado';
    case 'confirmed': return 'Confirmado';
    case 'cancelled': return 'Cancelado';
    default: return status;
  }
};

// ==========================================
// BLOQUE 3: COMPONENTE PRESENTACIONAL (UI Claude 2026)
// ==========================================

const ForensicBookPanelView: React.FC<ForensicBookPanelViewProps> = ({
  entries, searchTerm, statusFilter, totalRevenue, onFilter
}) => {
  return (
    <div className='space-y-6 pb-20 font-poppins text-zinc-100'>
      
      {/* HEADER: Liquid Glass */}
      <div className='bg-zinc-900/40 backdrop-blur-2xl p-6 rounded-3xl border border-white/5 shadow-2xl shadow-black/50 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 ring-1 ring-inset ring-white/10'>
        <div>
          <h2 className='text-2xl font-bold tracking-tight text-zinc-50 flex items-center gap-3'>
            <FileText className='text-indigo-400 size-6' /> Libro de Registro
          </h2>
          <p className='text-zinc-400 text-sm mt-1 font-lora'>
            Auditoría inmutable de movimientos y ocupación histórica.
          </p>
        </div>

        {/* TARJETA DE INGRESOS (Metrics Node) */}
        <div className='bg-zinc-950/80 border border-white/5 px-6 py-3.5 rounded-2xl shadow-inner flex flex-col items-end min-w-[200px]'>
          <span className='text-[10px] font-bold uppercase tracking-widest text-zinc-500'>
            Ingresos Vista
          </span>
          <span className='text-2xl font-display font-bold text-emerald-400 tracking-tight'>
            ${totalRevenue.toLocaleString()}
          </span>
        </div>
      </div>

      {/* BARRA DE HERRAMIENTAS DE NAVEGACIÓN */}
      <div className='flex flex-col md:flex-row gap-4'>
        {/* Buscador Forense */}
        <div className='relative flex-1'>
          <Search className='absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 size-4 stroke-[1.5]' />
          <input
            type='text'
            placeholder='Buscar identidad, documento o vector de habitación...'
            className='w-full pl-11 pr-4 py-3 bg-zinc-900/40 backdrop-blur-md rounded-2xl border border-white/5 font-medium text-zinc-200 placeholder:text-zinc-600 shadow-inner outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all'
            value={searchTerm}
            onChange={(e) => onFilter(e.target.value, statusFilter)}
          />
        </div>

        {/* Filtros Topológicos */}
        <div className='flex gap-2 overflow-x-auto pb-2 md:pb-0 custom-scrollbar hide-scrollbar'>
          {['all', 'confirmed', 'checked_in', 'checked_out', 'cancelled'].map((status) => (
            <button
              key={status}
              onClick={() => onFilter(searchTerm, status)}
              className={cn(
                "px-4 py-3 rounded-xl text-sm font-bold whitespace-nowrap transition-all duration-300",
                statusFilter === status
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 ring-1 ring-indigo-400/50"
                  : "bg-zinc-900/40 border border-white/5 text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
              )}
            >
              {status === 'all' ? 'Vista Global' : getStatusLabel(status)}
            </button>
          ))}
        </div>

        {/* Botón Exportar */}
        <button className='px-5 py-3 bg-zinc-800/50 border border-white/5 text-zinc-300 hover:text-white hover:border-indigo-500/50 rounded-2xl font-bold shadow-lg transition-all flex items-center gap-2 active:scale-95 group'>
          <Download className="size-4 stroke-[2] group-hover:translate-y-0.5 transition-transform" /> 
          <span className='hidden md:inline'>Exportar CSV</span>
        </button>
      </div>

      {/* TABLA DE DATOS (High Density B2B) */}
      <div className='bg-zinc-900/40 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-white/5 overflow-hidden ring-1 ring-inset ring-white/5'>
        <div className='overflow-x-auto custom-scrollbar'>
          <table className='w-full text-left border-collapse'>
            <thead>
              <tr className='bg-zinc-950/80 border-b border-white/5 text-[10px] font-bold text-zinc-500 uppercase tracking-widest'>
                <th className='p-6'>Identidad Huésped</th>
                <th className='p-6'>Asignación Física</th>
                <th className='p-6'>Ventana Temporal</th>
                <th className='p-6'>Estado Transaccional</th>
                <th className='p-6 text-right'>Liquidación Total</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-white/5'>
              {entries.map((entry) => (
                <motion.tr
                  key={entry.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className='hover:bg-white/[0.02] transition-colors group'
                >
                  <td className='p-6'>
                    <div className='flex items-center gap-3.5'>
                      <div className='size-10 rounded-2xl bg-zinc-800/50 border border-white/5 flex items-center justify-center text-zinc-500 group-hover:bg-indigo-500/10 group-hover:text-indigo-400 group-hover:border-indigo-500/20 transition-all'>
                        <User className="size-4 stroke-[2]" />
                      </div>
                      <div>
                        <div className='font-bold text-zinc-200 group-hover:text-white transition-colors'>
                          {entry.guests?.full_name || 'Huésped no indexado'}
                        </div>
                        <div className='text-[10px] text-zinc-500 font-mono tracking-wider mt-0.5'>
                          DOC: {entry.guests?.doc_number || 'N/A'}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className='p-6'>
                    <div className='flex items-center gap-2.5 text-zinc-300 font-medium'>
                      <BedDouble size={16} className='text-zinc-600' />
                      {entry.rooms?.name || 'Nodo No Asignado'}
                    </div>
                  </td>

                  <td className='p-6'>
                    <div className='flex flex-col text-xs font-mono gap-1.5'>
                      <span className='flex items-center gap-2 text-zinc-300'>
                        <span className='size-1.5 rounded-full bg-emerald-500/80 shadow-[0_0_5px_rgba(16,185,129,0.5)]'></span>
                        {entry.check_in}
                      </span>
                      <span className='flex items-center gap-2 text-zinc-500'>
                        <span className='size-1.5 rounded-full bg-zinc-700'></span>
                        {entry.check_out}
                      </span>
                    </div>
                  </td>

                  <td className='p-6'>
                    <span className={cn("px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest border", getStatusStyle(entry.status))}>
                      {getStatusLabel(entry.status)}
                    </span>
                  </td>

                  <td className='p-6 text-right'>
                    <div className='font-display font-bold text-zinc-200'>
                      ${entry.total_price.toLocaleString()}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State Nativo */}
        {entries.length === 0 && (
          <div className='p-20 text-center flex flex-col items-center bg-zinc-950/30'>
            <CalendarDays className='size-12 mb-4 stroke-[1] text-zinc-600' />
            <p className="text-zinc-400 font-mono text-sm uppercase tracking-widest">
              El motor de búsqueda no encontró registros coincidentes.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// ==========================================
// BLOQUE 4: COMPONENTE CONTENEDOR (Máquina de Estados)
// ==========================================

export default function ForensicBookPanel({ initialData }: ForensicBookPanelContainerProps) {
  const { entries, searchTerm, statusFilter, handleFilter, totalRevenue } = useForensicBook(initialData);

  // 🛡️ Zero-Trust Data Parsing (Protección estricta de Memoria)
  const safeEntries = useMemo(() => Array.isArray(entries) ? entries : [], [entries]);

  return (
    <ForensicBookPanelView 
      entries={safeEntries}
      searchTerm={searchTerm}
      statusFilter={statusFilter}
      totalRevenue={totalRevenue}
      onFilter={handleFilter}
    />
  );
}