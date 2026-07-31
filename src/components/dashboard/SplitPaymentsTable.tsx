'use client';

import { motion } from 'framer-motion';
import { springGentle } from '@/lib/mac2026/spring';
import { cn } from '@/lib/utils';

interface SplitPayment {
  id: string;
  booking_id: string;
  total_amount: number;
  hotel_amount: number;
  platform_amount: number;
  split_status: string;
  hotel_payout_status: string;
  created_at: string;
}

interface SplitPaymentsTableProps {
  payments: SplitPayment[];
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

const STATUS_STYLES: Record<string, string> = {
  DISBURSED: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  COMPLETED: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  PENDING: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  FAILED: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
};

const STATUS_LABELS: Record<string, string> = {
  DISBURSED: 'Depositado',
  COMPLETED: 'Completado',
  PENDING: 'Pendiente',
  FAILED: 'Fallido',
};

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] || 'text-muted-foreground bg-muted border-border';
  const label = STATUS_LABELS[status] || status;

  return (
    <span
      className={cn(
        'inline-flex items-center text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full border',
        style,
      )}
    >
      {label}
    </span>
  );
}

export default function SplitPaymentsTable({ payments }: SplitPaymentsTableProps) {
  if (payments.length === 0) {
    return (
      <div className="glass-card p-12 border border-border text-center">
        <p className="text-muted-foreground font-medium">
          Aun no tienes pagos divididos.
        </p>
        <p className="text-sm text-muted-foreground/70 mt-2">
          Los pagos apareceran aqui cuando recibas tu primera reserva.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card overflow-hidden border border-border">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left p-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                Fecha
              </th>
              <th className="text-left p-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                Booking
              </th>
              <th className="text-right p-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                Total
              </th>
              <th className="text-right p-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                Tu Parte (92%)
              </th>
              <th className="text-right p-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                Comision (8%)
              </th>
              <th className="text-center p-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                Estado
              </th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment, index) => (
              <motion.tr
                key={payment.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ ...springGentle(), delay: index * 0.03 }}
                className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors"
              >
                <td className="p-4 text-sm text-foreground">
                  {formatDate(payment.created_at)}
                </td>
                <td className="p-4 text-sm font-mono text-muted-foreground">
                  {payment.booking_id.slice(0, 8)}...
                </td>
                <td className="p-4 text-sm text-foreground text-right font-medium tabular-nums">
                  {formatCOP(payment.total_amount)}
                </td>
                <td className="p-4 text-sm text-emerald-400 text-right font-bold tabular-nums">
                  {formatCOP(payment.hotel_amount)}
                </td>
                <td className="p-4 text-sm text-amber-400 text-right font-medium tabular-nums">
                  {formatCOP(payment.platform_amount)}
                </td>
                <td className="p-4 text-center">
                  <StatusBadge status={payment.hotel_payout_status} />
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
