'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  Search,
  Filter,
  Download,
  CalendarDays,
  User,
  BedDouble,
} from 'lucide-react';
import { useForensicBook, ForensicEntry } from '@/hooks/useForensicBook';

interface ForensicBookPanelProps {
  initialData: ForensicEntry[];
}

const ForensicBookPanel = ({ initialData }: ForensicBookPanelProps) => {
  const { entries, searchTerm, statusFilter, handleFilter, totalRevenue } =
    useForensicBook(initialData);

  // Utilidad de colores para badges
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'checked_in':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'checked_out':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      case 'confirmed':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'cancelled':
        return 'bg-red-50 text-red-500 border-red-100';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'checked_in':
        return 'En Casa';
      case 'checked_out':
        return 'Finalizado';
      case 'confirmed':
        return 'Confirmado';
      case 'cancelled':
        return 'Cancelado';
      default:
        return status;
    }
  };

  return (
    <div className='space-y-6 pb-20'>
      {/* HEADER */}
      <div className='bg-white/50 backdrop-blur-md p-6 rounded-3xl border border-white/60 shadow-sm flex flex-col lg:flex-row justify-between items-end lg:items-center gap-6'>
        <div>
          <h2 className='text-2xl font-display font-bold text-slate-800 flex items-center gap-3'>
            <FileText className='text-hospeda-600' /> Libro de Registro
          </h2>
          <p className='text-slate-500 text-sm mt-1'>
            Auditoría de movimientos y ocupación histórica.
          </p>
        </div>

        {/* TARJETA DE INGRESOS (Solo visible si hay datos) */}
        <div className='bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-xl flex flex-col items-end min-w-[200px]'>
          <span className='text-[10px] font-bold uppercase tracking-widest text-slate-400'>
            Ingresos Vista
          </span>
          <span className='text-2xl font-display font-bold text-emerald-400'>
            ${totalRevenue.toLocaleString()}
          </span>
        </div>
      </div>

      {/* BARRA DE HERRAMIENTAS */}
      <div className='flex flex-col md:flex-row gap-4'>
        {/* Buscador */}
        <div className='relative flex-1'>
          <Search
            className='absolute left-4 top-1/2 -translate-y-1/2 text-slate-400'
            size={18}
          />
          <input
            type='text'
            placeholder='Buscar por huésped, cédula o habitación...'
            className='w-full pl-11 pr-4 py-3 bg-white rounded-2xl border-none font-medium text-slate-600 shadow-sm outline-none focus:ring-2 focus:ring-hospeda-200'
            value={searchTerm}
            onChange={(e) => handleFilter(e.target.value, statusFilter)}
          />
        </div>

        {/* Filtros */}
        <div className='flex gap-2 overflow-x-auto pb-2 md:pb-0'>
          {['all', 'confirmed', 'checked_in', 'checked_out', 'cancelled'].map(
            (status) => (
              <button
                key={status}
                onClick={() => handleFilter(searchTerm, status)}
                className={`px-4 py-3 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
                  statusFilter === status
                    ? 'bg-hospeda-600 text-white shadow-md'
                    : 'bg-white text-slate-500 hover:bg-slate-50'
                }`}
              >
                {status === 'all' ? 'Todos' : getStatusLabel(status)}
              </button>
            ),
          )}
        </div>

        {/* Botón Exportar (Visual) */}
        <button className='px-4 py-3 bg-white text-slate-600 rounded-2xl font-bold shadow-sm hover:text-hospeda-600 flex items-center gap-2'>
          <Download size={18} /> <span className='hidden md:inline'>CSV</span>
        </button>
      </div>

      {/* TABLA DE DATOS */}
      <div className='bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden'>
        <div className='overflow-x-auto'>
          <table className='w-full text-left border-collapse'>
            <thead>
              <tr className='bg-slate-50/50 border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider'>
                <th className='p-6'>Huésped</th>
                <th className='p-6'>Habitación</th>
                <th className='p-6'>Fechas</th>
                <th className='p-6'>Estado</th>
                <th className='p-6 text-right'>Total</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-slate-50'>
              {entries.map((entry) => (
                <motion.tr
                  key={entry.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className='hover:bg-slate-50/50 transition-colors group'
                >
                  <td className='p-6'>
                    <div className='flex items-center gap-3'>
                      <div className='w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-white group-hover:shadow-sm transition-all'>
                        <User size={18} />
                      </div>
                      <div>
                        <div className='font-bold text-slate-800'>
                          {entry.guests?.full_name || 'Desconocido'}
                        </div>
                        <div className='text-xs text-slate-400 font-mono'>
                          {entry.guests?.doc_number}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className='p-6'>
                    <div className='flex items-center gap-2 text-slate-600 font-medium'>
                      <BedDouble
                        size={16}
                        className='text-hospeda-400'
                      />
                      {entry.rooms?.name || 'N/A'}
                    </div>
                  </td>

                  <td className='p-6'>
                    <div className='flex flex-col text-sm'>
                      <span className='flex items-center gap-2 text-slate-600'>
                        <span className='w-1.5 h-1.5 rounded-full bg-emerald-400'></span>
                        {entry.check_in}
                      </span>
                      <span className='flex items-center gap-2 text-slate-400 mt-1'>
                        <span className='w-1.5 h-1.5 rounded-full bg-slate-300'></span>
                        {entry.check_out}
                      </span>
                    </div>
                  </td>

                  <td className='p-6'>
                    <span
                      className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${getStatusStyle(entry.status)}`}
                    >
                      {getStatusLabel(entry.status)}
                    </span>
                  </td>

                  <td className='p-6 text-right'>
                    <div className='font-display font-bold text-slate-800'>
                      ${entry.total_price.toLocaleString()}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {entries.length === 0 && (
          <div className='p-20 text-center text-slate-400 flex flex-col items-center'>
            <CalendarDays
              size={48}
              className='mb-4 opacity-50'
            />
            <p>No se encontraron registros forenses.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForensicBookPanel;
