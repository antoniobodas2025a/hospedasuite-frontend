'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { AlertTriangle, Inbox, ChevronLeft, ChevronRight } from 'lucide-react';
import ManualPaymentRow, { type PaymentWithHotel } from '@/components/super-admin/ManualPaymentRow';

type TabKey = 'pending' | 'approved' | 'rejected';

// ─── Componente ───────────────────────────────────────────────────────────────

export default function PendingPaymentsTable({
  payments,
  totalPages,
  currentPage,
  totalCount,
  error,
}: {
  payments: PaymentWithHotel[];
  totalPages?: number;
  currentPage?: number;
  totalCount?: number;
  error?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentStatus = searchParams.get('status') as TabKey | null;
  const [activeTab, setActiveTab] = useState<TabKey>(currentStatus || 'pending');

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'pending', label: 'Pendientes' },
    { key: 'approved', label: 'Aprobados' },
    { key: 'rejected', label: 'Rechazados' },
  ];

  const handleRefresh = () => {
    router.refresh();
  };

  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
    const params = new URLSearchParams();
    params.set('status', tab);
    params.set('page', '1');
    router.push(`/admin/payments/pending?${params.toString()}`);
  };

  const goToPage = (p: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(p));
    router.push(`/admin/payments/pending?${params.toString()}`);
  };

  if (error) {
    return (
      <div className="p-12 text-center">
        <AlertTriangle size={32} className="mx-auto text-rose-400 mb-3" />
        <p className="text-rose-400 text-sm font-medium">Error al cargar los pagos</p>
        <p className="text-white/30 text-xs mt-1 font-mono">{error}</p>
      </div>
    );
  }

  return (
    <>
      {/* Tabs */}
      <div className="border-b border-white/10">
        <div className="flex">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={`relative px-6 py-4 text-sm font-bold transition-colors ${
                  isActive
                    ? 'text-white'
                    : 'text-white/40 hover:text-white/70'
                }`}
              >
                {tab.label}
                {isActive && (
                  <motion.div
                    layoutId="tab-indicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tabla */}
      {payments.length === 0 ? (
        <div className="p-16 text-center">
          <Inbox size={40} className="mx-auto text-white/15 mb-4" />
          <p className="text-white/30 text-sm font-medium">No hay pagos {activeTab === 'pending' ? 'pendientes' : activeTab === 'approved' ? 'aprobados' : 'rechazados'}</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-black/20 text-[10px] uppercase text-white/40 font-bold tracking-widest">
                <tr>
                  <th className="p-4">Hotel</th>
                  <th className="p-4">Monto</th>
                  <th className="p-4">Método</th>
                  <th className="p-4">Comprobante</th>
                  <th className="p-4">Fecha</th>
                  <th className="p-4">Estado</th>
                  <th className="p-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {payments.map((payment) => (
                  <ManualPaymentRow
                    key={payment.id}
                    payment={payment}
                    onRefresh={handleRefresh}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* ─── Paginación ────────────────────────────────────────────────── */}
          {totalPages && totalPages > 1 && (
            <div className="border-t border-white/10 px-6 py-4 flex items-center justify-between">
              <p className="text-xs text-white/30">
                Página {currentPage} de {totalPages} ({totalCount} registros)
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => goToPage((currentPage ?? 1) - 1)}
                  disabled={(currentPage ?? 1) <= 1}
                  className="p-2 rounded-[var(--radius-squircle-lg)] text-white/40 hover:text-white hover:bg-white/5 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => {
                    if (p === 1 || p === totalPages) return true;
                    if (Math.abs(p - (currentPage ?? 1)) <= 1) return true;
                    return false;
                  })
                  .map((p, idx, arr) => {
                    const showEllipsis = idx > 0 && p - arr[idx - 1] > 1;
                    return (
                      <div key={p} className="flex items-center">
                        {showEllipsis && (
                          <span className="px-1 text-white/20 text-xs">...</span>
                        )}
                        <button
                          onClick={() => goToPage(p)}
                          className={`min-w-[32px] h-8 text-xs font-bold rounded-[var(--radius-squircle-lg)] transition-colors ${
                            p === (currentPage ?? 1)
                              ? 'bg-blue-600 text-white'
                              : 'text-white/40 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          {p}
                        </button>
                      </div>
                    );
                  })}

                <button
                  onClick={() => goToPage((currentPage ?? 1) + 1)}
                  disabled={(currentPage ?? 1) >= (totalPages ?? 1)}
                  className="p-2 rounded-[var(--radius-squircle-lg)] text-white/40 hover:text-white hover:bg-white/5 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
