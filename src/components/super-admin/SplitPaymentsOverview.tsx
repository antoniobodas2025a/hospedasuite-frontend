'use client';

import { motion } from 'framer-motion';
import { springGentle } from '@/lib/mac2026/spring';
import { Download } from 'lucide-react';
import { useState } from 'react';

interface SplitPayment {
  id: string;
  booking_id: string;
  hotel_id: string;
  total_amount: number;
  hotel_amount: number;
  platform_amount: number;
  split_status: string;
  hotel_payout_status: string;
  created_at: string;
  hotels?: {
    name: string;
    slug: string;
  } | null;
}

interface SplitPaymentsOverviewProps {
  payments: SplitPayment[];
  totalPlatformRevenue: number;
  totalProcessed: number;
  activeHotels: number;
}

const formatCOP = (amount: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(amount);

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

export default function SplitPaymentsOverview({
  payments,
  totalPlatformRevenue,
  totalProcessed,
  activeHotels,
}: SplitPaymentsOverviewProps) {
  const [filterHotel, setFilterHotel] = useState('');

  const filteredPayments = filterHotel
    ? payments.filter((p) => p.hotels?.slug === filterHotel)
    : payments;

  const handleExportCSV = () => {
    const headers = [
      'Fecha',
      'Hotel',
      'Booking',
      'Total',
      'Hotel (92%)',
      'Plataforma (8%)',
      'Estado',
    ];
    const rows = filteredPayments.map((p) => [
      formatDate(p.created_at),
      p.hotels?.name || 'N/A',
      p.booking_id,
      p.total_amount,
      p.hotel_amount,
      p.platform_amount,
      p.hotel_payout_status,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `split-payments-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springGentle()}
          className="bg-white/5 border border-white/10 p-6 rounded-[var(--radius-squircle-2xl)]"
        >
          <p className="text-[11px] font-bold text-white/50 uppercase tracking-widest mb-1">
            Ingresos Plataforma
          </p>
          <h3 className="text-3xl font-bold text-white tracking-tight tabular-nums">
            {formatCOP(totalPlatformRevenue)}
          </h3>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springGentle(), delay: 0.1 }}
          className="bg-white/5 border border-white/10 p-6 rounded-[var(--radius-squircle-2xl)]"
        >
          <p className="text-[11px] font-bold text-white/50 uppercase tracking-widest mb-1">
            Total Procesado
          </p>
          <h3 className="text-3xl font-bold text-white tracking-tight tabular-nums">
            {formatCOP(totalProcessed)}
          </h3>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springGentle(), delay: 0.2 }}
          className="bg-white/5 border border-white/10 p-6 rounded-[var(--radius-squircle-2xl)]"
        >
          <p className="text-[11px] font-bold text-white/50 uppercase tracking-widest mb-1">
            Hoteles Activos
          </p>
          <h3 className="text-3xl font-bold text-white tracking-tight tabular-nums">
            {activeHotels}
          </h3>
        </motion.div>
      </div>

      {/* Filtros y Export */}
      <div className="flex gap-4 items-center">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Filtrar por hotel (slug)..."
            value={filterHotel}
            onChange={(e) => setFilterHotel(e.target.value)}
            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-[var(--radius-squircle-lg)] text-white placeholder:text-white/30"
          />
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 border border-emerald-500/30 rounded-[var(--radius-squircle-lg)] text-emerald-400 font-medium hover:bg-emerald-500/30 transition-colors"
        >
          <Download size={16} />
          Exportar CSV
        </button>
      </div>

      {/* Tabla */}
      <div className="bg-white/5 border border-white/10 rounded-[var(--radius-squircle-2xl)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="text-left p-4 text-xs font-bold text-white/50 uppercase tracking-widest">
                  Fecha
                </th>
                <th className="text-left p-4 text-xs font-bold text-white/50 uppercase tracking-widest">
                  Hotel
                </th>
                <th className="text-left p-4 text-xs font-bold text-white/50 uppercase tracking-widest">
                  Booking
                </th>
                <th className="text-right p-4 text-xs font-bold text-white/50 uppercase tracking-widest">
                  Total
                </th>
                <th className="text-right p-4 text-xs font-bold text-white/50 uppercase tracking-widest">
                  Hotel (92%)
                </th>
                <th className="text-right p-4 text-xs font-bold text-white/50 uppercase tracking-widest">
                  Plataforma (8%)
                </th>
                <th className="text-center p-4 text-xs font-bold text-white/50 uppercase tracking-widest">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map((payment, index) => (
                <motion.tr
                  key={payment.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.02 }}
                  className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors"
                >
                  <td className="p-4 text-sm text-white/70">
                    {formatDate(payment.created_at)}
                  </td>
                  <td className="p-4 text-sm text-white">
                    <div>
                      <p className="font-medium">{payment.hotels?.name || 'N/A'}</p>
                      <p className="text-xs text-white/40 font-mono">
                        {payment.hotels?.slug}
                      </p>
                    </div>
                  </td>
                  <td className="p-4 text-sm font-mono text-white/60">
                    {payment.booking_id.slice(0, 8)}...
                  </td>
                  <td className="p-4 text-sm text-white text-right font-medium">
                    {formatCOP(payment.total_amount)}
                  </td>
                  <td className="p-4 text-sm text-emerald-400 text-right font-bold">
                    {formatCOP(payment.hotel_amount)}
                  </td>
                  <td className="p-4 text-sm text-blue-400 text-right font-bold">
                    {formatCOP(payment.platform_amount)}
                  </td>
                  <td className="p-4 text-center">
                    <span
                      className={`inline-flex px-2 py-1 rounded-md text-xs font-medium ${
                        payment.hotel_payout_status === 'DISBURSED'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : payment.hotel_payout_status === 'PENDING'
                            ? 'bg-amber-500/10 text-amber-400'
                            : 'bg-rose-500/10 text-rose-400'
                      }`}
                    >
                      {payment.hotel_payout_status}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredPayments.length === 0 && (
          <div className="p-12 text-center text-white/50">
            No hay transacciones para mostrar
          </div>
        )}
      </div>
    </div>
  );
}
