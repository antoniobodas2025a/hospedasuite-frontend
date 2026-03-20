'use client';

import React, { useState } from 'react';
import { Download, Calendar, DollarSign, FileText } from 'lucide-react';
import { utils, writeFile } from 'xlsx'; // Necesitaremos instalar xlsx

// Tipos simplificados para el reporte
interface SaleRecord {
  id: string;
  date: string;
  guest: string;
  room: string;
  total: number;
  status: string;
}

const ReportsPanel = ({ sales }: { sales: SaleRecord[] }) => {
  const [dateRange, setDateRange] = useState('month'); // month | year | all

  // Filtrado simple en cliente (para velocidad)
  const filteredSales = sales.filter((s) => {
    const d = new Date(s.date);
    const now = new Date();
    if (dateRange === 'month')
      return (
        d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      );
    if (dateRange === 'year') return d.getFullYear() === now.getFullYear();
    return true;
  });

  const totalRevenue = filteredSales.reduce((acc, curr) => acc + curr.total, 0);

  const downloadExcel = () => {
    const ws = utils.json_to_sheet(filteredSales);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Ventas');
    writeFile(wb, `Reporte_Ventas_${dateRange}.xlsx`);
  };

  return (
    <div className='space-y-6'>
      {/* HEADER CONTROLS */}
      <div className='bg-white p-6 rounded-[2rem] border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm'>
        <div>
          <h2 className='text-xl font-bold text-slate-800 flex items-center gap-2'>
            <FileText className='text-blue-600' />
            Reporte de Ventas
          </h2>
          <p className='text-sm text-slate-500'>
            Historial de reservas facturadas.
          </p>
        </div>

        <div className='flex bg-slate-100 p-1 rounded-xl'>
          {['month', 'year', 'all'].map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-4 py-2 rounded-lg text-sm font-bold capitalize transition-all ${
                dateRange === range
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {range === 'month'
                ? 'Este Mes'
                : range === 'year'
                  ? 'Este Año'
                  : 'Todo'}
            </button>
          ))}
        </div>

        <button
          onClick={downloadExcel}
          className='px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center gap-2 transition-colors shadow-lg shadow-emerald-200'
        >
          <Download size={18} /> Exportar Excel
        </button>
      </div>

      {/* KPI RESUMEN */}
      <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
        <div className='bg-blue-900 text-white p-6 rounded-[2rem] relative overflow-hidden'>
          <div className='relative z-10'>
            <p className='text-blue-200 text-xs font-bold uppercase tracking-wider mb-1'>
              Ventas Totales ({dateRange})
            </p>
            <h3 className='text-3xl font-display font-bold'>
              ${totalRevenue.toLocaleString()}
            </h3>
          </div>
          <DollarSign
            className='absolute -right-4 -bottom-4 text-blue-800 opacity-50'
            size={100}
          />
        </div>

        <div className='bg-white p-6 rounded-[2rem] border border-slate-100 flex items-center gap-4'>
          <div className='w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500'>
            <Calendar size={24} />
          </div>
          <div>
            <p className='text-slate-400 text-xs font-bold uppercase'>
              Reservas
            </p>
            <h3 className='text-2xl font-bold text-slate-800'>
              {filteredSales.length}
            </h3>
          </div>
        </div>

        <div className='bg-white p-6 rounded-[2rem] border border-slate-100 flex items-center gap-4'>
          <div className='w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600'>
            <DollarSign size={24} />
          </div>
          <div>
            <p className='text-slate-400 text-xs font-bold uppercase'>
              Ticket Promedio
            </p>
            <h3 className='text-2xl font-bold text-slate-800'>
              $
              {filteredSales.length > 0
                ? Math.round(
                    totalRevenue / filteredSales.length,
                  ).toLocaleString()
                : 0}
            </h3>
          </div>
        </div>
      </div>

      {/* TABLA DE DATOS */}
      <div className='bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm'>
        <div className='overflow-x-auto'>
          <table className='w-full text-left'>
            <thead className='bg-slate-50 border-b border-slate-100'>
              <tr>
                <th className='p-4 text-xs font-bold text-slate-400 uppercase'>
                  Fecha
                </th>
                <th className='p-4 text-xs font-bold text-slate-400 uppercase'>
                  Huésped
                </th>
                <th className='p-4 text-xs font-bold text-slate-400 uppercase'>
                  Habitación
                </th>
                <th className='p-4 text-xs font-bold text-slate-400 uppercase'>
                  Estado
                </th>
                <th className='p-4 text-xs font-bold text-slate-400 uppercase text-right'>
                  Total
                </th>
              </tr>
            </thead>
            <tbody className='divide-y divide-slate-50'>
              {filteredSales.map((sale) => (
                <tr
                  key={sale.id}
                  className='hover:bg-slate-50/50 transition-colors'
                >
                  <td className='p-4 font-bold text-slate-600'>{sale.date}</td>
                  <td className='p-4 font-bold text-slate-800'>{sale.guest}</td>
                  <td className='p-4 text-sm text-slate-500'>{sale.room}</td>
                  <td className='p-4'>
                    <span className='px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-bold uppercase'>
                      {sale.status}
                    </span>
                  </td>
                  <td className='p-4 font-bold text-slate-800 text-right'>
                    ${sale.total.toLocaleString()}
                  </td>
                </tr>
              ))}
              {filteredSales.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className='p-8 text-center text-slate-400 font-medium'
                  >
                    No hay registros en este periodo.
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

export default ReportsPanel;
