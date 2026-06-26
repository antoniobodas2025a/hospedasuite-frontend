'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle,
  XCircle,
  Eye,
  X,
  Building2,
  Clock,
  DollarSign,
  Smartphone,
  Receipt,
} from 'lucide-react';
import { approveManualPayment, rejectManualPayment } from '@/app/actions/manual-payments';
import Image from 'next/image';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface PaymentWithHotel {
  id: string;
  hotel_id: string;
  user_id: string;
  amount: number;
  method: 'nequi' | 'daviplata';
  status: 'pending' | 'approved' | 'rejected';
  receipt_url: string;
  rejection_reason?: string | null;
  created_at: string;
  approved_at?: string | null;
  approved_by?: string | null;
  hotels: {
    name: string;
    city: string | null;
    email: string | null;
  } | null;
}

interface ManualPaymentRowProps {
  payment: PaymentWithHotel;
  onRefresh: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function methodLabel(method: 'nequi' | 'daviplata'): string {
  return method === 'nequi' ? 'Nequi' : 'Daviplata';
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function ManualPaymentRow({ payment, onRefresh }: ManualPaymentRowProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const hotel = payment.hotels;
  const isPending = payment.status === 'pending';

  const handleApprove = async () => {
    if (!confirm(`¿Aprobar el pago de ${hotel?.name ?? '...'} por ${formatCurrency(payment.amount)}?`)) return;
    setIsProcessing(true);
    const res = await approveManualPayment(payment.id);
    setIsProcessing(false);
    if (!res.success) {
      alert('Error al aprobar: ' + res.error);
      return;
    }
    onRefresh();
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      alert('Debés proporcionar un motivo de rechazo.');
      return;
    }
    setIsProcessing(true);
    const res = await rejectManualPayment(payment.id, rejectReason.trim());
    setIsProcessing(false);
    if (!res.success) {
      alert('Error al rechazar: ' + res.error);
      return;
    }
    setShowRejectInput(false);
    setRejectReason('');
    onRefresh();
  };

  const statusBadge = () => {
    switch (payment.status) {
      case 'pending':
        return (
          <span className="px-3 py-1 rounded-full text-[9px] font-bold uppercase border tracking-widest bg-amber-500/10 text-amber-400 border-amber-500/20">
            Pendiente
          </span>
        );
      case 'approved':
        return (
          <span className="px-3 py-1 rounded-full text-[9px] font-bold uppercase border tracking-widest bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
            Aprobado
          </span>
        );
      case 'rejected':
        return (
          <span className="px-3 py-1 rounded-full text-[9px] font-bold uppercase border tracking-widest bg-rose-500/10 text-rose-400 border-rose-500/20">
            Rechazado
          </span>
        );
    }
  };

  return (
    <>
      <tr className="hover:bg-white/5 transition-colors group">
        {/* Hotel */}
        <td className="p-4">
          <div className="flex items-center gap-2">
            <Building2 size={16} className="text-blue-400 shrink-0" />
            <div>
              <div className="font-bold text-white text-sm">{hotel?.name ?? '—'}</div>
              <div className="text-white/30 text-[10px] font-mono">{payment.hotel_id.slice(0, 8)}…</div>
            </div>
          </div>
        </td>

        {/* Monto */}
        <td className="p-4">
          <div className="flex items-center gap-1.5">
            <DollarSign size={14} className="text-emerald-400" />
            <span className="font-mono font-bold text-white tabular-nums">
              {formatCurrency(payment.amount)}
            </span>
          </div>
        </td>

        {/* Método */}
        <td className="p-4">
          <div className="flex items-center gap-1.5">
            <Smartphone size={14} className="text-indigo-400" />
            <span className="text-white/80 text-sm">{methodLabel(payment.method)}</span>
          </div>
        </td>

        {/* Comprobante */}
        <td className="p-4">
          <button
            onClick={() => setShowReceipt(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-squircle-md)] bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all text-xs"
          >
            <Eye size={14} />
            <span>Ver</span>
          </button>
        </td>

        {/* Fecha */}
        <td className="p-4 text-white/50 text-xs">
          <div className="flex items-center gap-1.5">
            <Clock size={12} />
            {formatDate(payment.created_at)}
          </div>
        </td>

        {/* Estado */}
        <td className="p-4">{statusBadge()}</td>

        {/* Acciones */}
        <td className="p-4">
          {isPending ? (
            <div className="flex items-center gap-2">
              <button
                onClick={handleApprove}
                disabled={isProcessing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-squircle-md)] bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white border border-emerald-500/20 transition-all text-xs font-bold disabled:opacity-50"
                title="Aprobar pago"
              >
                <CheckCircle size={14} />
                Aprobar
              </button>
              <button
                onClick={() => {
                  setShowRejectInput(true);
                  setRejectReason('');
                }}
                disabled={isProcessing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-squircle-md)] bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white border border-rose-500/20 transition-all text-xs font-bold disabled:opacity-50"
                title="Rechazar pago"
              >
                <XCircle size={14} />
                Rechazar
              </button>
            </div>
          ) : payment.status === 'rejected' && payment.rejection_reason ? (
            <div className="text-rose-400/70 text-xs max-w-[160px] leading-tight">
              <span className="text-[10px] font-bold uppercase tracking-widest text-rose-400/50">Motivo:</span>{' '}
              {payment.rejection_reason}
            </div>
          ) : (
            <span className="text-white/30 text-xs">—</span>
          )}
        </td>
      </tr>

      {/* ─── Modal: Rechazo (input de motivo) ──────────────────────────────── */}
      <AnimatePresence>
        {showRejectInput && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => setShowRejectInput(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border border-white/10 rounded-[var(--radius-squircle-2xl)] w-full max-w-md shadow-2xl overflow-hidden"
            >
              <div className="p-5 border-b border-white/10 flex justify-between items-center bg-black/20">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <XCircle size={18} className="text-rose-400" />
                  Rechazar Pago
                </h3>
                <button
                  onClick={() => setShowRejectInput(false)}
                  className="p-1.5 hover:bg-white/10 rounded-full text-white/50 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <p className="text-white/60 text-sm">
                  Estás rechazando el pago de{' '}
                  <strong className="text-white">{hotel?.name ?? '…'}</strong> por{' '}
                  <strong className="text-white">{formatCurrency(payment.amount)}</strong>.
                </p>
                <div>
                  <label className="text-[10px] uppercase tracking-widest font-bold text-white/50 mb-1.5 block ml-1">
                    Motivo del rechazo
                  </label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Ej: El comprobante no es legible, el monto no coincide…"
                    rows={3}
                    className="w-full bg-black/40 border border-white/10 rounded-[var(--radius-squircle-lg)] p-3 text-white text-sm outline-none focus:border-rose-500/50 resize-none"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowRejectInput(false)}
                    className="flex-1 py-2.5 px-4 rounded-[var(--radius-squircle-lg)] bg-white/5 border border-white/10 text-white/60 hover:text-white transition-all text-sm font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={isProcessing || !rejectReason.trim()}
                    className="flex-1 py-2.5 px-4 rounded-[var(--radius-squircle-lg)] bg-rose-600 hover:bg-rose-500 text-white font-bold transition-all text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <XCircle size={16} />
                    Rechazar Pago
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Modal: Comprobante ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {showReceipt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => setShowReceipt(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border border-white/10 rounded-[var(--radius-squircle-2xl)] w-full max-w-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-5 border-b border-white/10 flex justify-between items-center bg-black/20">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <Receipt size={18} className="text-blue-400" />
                  Comprobante — {hotel?.name ?? '…'}
                </h3>
                <button
                  onClick={() => setShowReceipt(false)}
                  className="p-1.5 hover:bg-white/10 rounded-full text-white/50 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="p-6 flex items-center justify-center bg-black/40 min-h-[300px]">
                {payment.receipt_url.match(/\.pdf$/i) ? (
                  <div className="text-center text-white/50 space-y-3">
                    <Receipt size={48} className="mx-auto text-white/30" />
                    <p className="text-sm">Comprobante PDF</p>
                    <a
                      href={payment.receipt_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block px-4 py-2 rounded-[var(--radius-squircle-lg)] bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition-all"
                    >
                      Abrir PDF
                    </a>
                  </div>
                ) : (
                  <Image
                    src={payment.receipt_url}
                    alt={`Comprobante de ${hotel?.name ?? 'pago'}`}
                    width={800}
                    height={600}
                    unoptimized
                    className="max-w-full max-h-[60vh] rounded-[var(--radius-squircle-xl)] shadow-lg object-contain"
                  />
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
