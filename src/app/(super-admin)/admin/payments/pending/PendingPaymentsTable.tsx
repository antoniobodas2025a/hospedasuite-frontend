'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { AlertTriangle, Inbox } from 'lucide-react';
import ManualPaymentRow from '@/components/super-admin/ManualPaymentRow';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface PaymentWithHotel {
  id: string;
  hotel_id: string;
  user_id: string;
  amount: number;
  method: 'nequi' | 'daviplata';
  status: 'pending' | 'approved' | 'rejected';
  receipt_url: string;
  rejection_reason?: string;
  created_at: string;
  approved_at?: string;
  approved_by?: string;
  hotels: {
    name: string;
    city: string | null;
    email: string | null;
  } | null;
}

type TabKey = 'pending' | 'approved' | 'rejected';

// ─── Componente ───────────────────────────────────────────────────────────────

export default function PendingPaymentsTable({
  payments,
  error,
}: {
  payments: PaymentWithHotel[];
  error?: string;
}) {
  const [activeTab, setActiveTab] = useState<TabKey>('pending');
  const router = useRouter();

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'pending', label: 'Pendientes' },
    { key: 'approved', label: 'Aprobados' },
    { key: 'rejected', label: 'Rechazados' },
  ];

  const filtered = payments.filter((p) => p.status === activeTab);

  const handleRefresh = () => {
    router.refresh();
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
            const count = payments.filter((p) => p.status === tab.key).length;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`relative px-6 py-4 text-sm font-bold transition-colors ${
                  isActive
                    ? 'text-white'
                    : 'text-white/40 hover:text-white/70'
                }`}
              >
                {tab.label}
                <span
                  className={`ml-2 text-[10px] px-1.5 py-0.5 rounded-full ${
                    isActive
                      ? 'bg-blue-500/20 text-blue-400'
                      : 'bg-white/5 text-white/30'
                  }`}
                >
                  {count}
                </span>
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
      {filtered.length === 0 ? (
        <div className="p-16 text-center">
          <Inbox size={40} className="mx-auto text-white/15 mb-4" />
          <p className="text-white/30 text-sm font-medium">No hay pagos {activeTab === 'pending' ? 'pendientes' : activeTab === 'approved' ? 'aprobados' : 'rechazados'}</p>
        </div>
      ) : (
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
              {filtered.map((payment) => (
                <ManualPaymentRow
                  key={payment.id}
                  payment={payment}
                  onRefresh={handleRefresh}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
