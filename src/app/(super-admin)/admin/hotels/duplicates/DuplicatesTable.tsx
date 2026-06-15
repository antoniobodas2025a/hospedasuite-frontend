'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle,
  XCircle,
  Building2,
  MapPin,
  Hash,
  AlertTriangle,
  Inbox,
  X,
  ExternalLink,
  Clock,
} from 'lucide-react';
import {
  approveDuplicateHotelAction,
  rejectDuplicateHotelAction,
} from '@/app/actions/hotel-admin';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface DuplicateHotel {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  location: string | null;
  created_at: string;
  subscription_status: string;
  fingerprint_hash: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function DuplicatesTable({
  hotels,
  error,
}: {
  hotels: DuplicateHotel[];
  error?: string;
}) {
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [showRejectConfirm, setShowRejectConfirm] = useState<string | null>(null);
  const router = useRouter();

  const handleRefresh = () => {
    router.refresh();
  };

  const handleApprove = async (hotelId: string, hotelName: string) => {
    if (!confirm(`¿Aprobar "${hotelName}" y activarlo como prueba gratis?`)) return;
    setIsProcessing(hotelId);
    const res = await approveDuplicateHotelAction(hotelId);
    setIsProcessing(null);
    if (!res.success) {
      alert('Error al aprobar: ' + res.error);
      return;
    }
    handleRefresh();
  };

  const handleRejectConfirm = async (hotelId: string) => {
    setIsProcessing(hotelId);
    const res = await rejectDuplicateHotelAction(hotelId);
    setIsProcessing(null);
    setShowRejectConfirm(null);
    if (!res.success) {
      alert('Error al rechazar: ' + res.error);
      return;
    }
    handleRefresh();
  };

  if (error) {
    return (
      <div className="p-12 text-center">
        <AlertTriangle size={32} className="mx-auto text-rose-400 mb-3" />
        <p className="text-rose-400 text-sm font-medium">Error al cargar los hoteles</p>
        <p className="text-white/30 text-xs mt-1 font-mono">{error}</p>
      </div>
    );
  }

  if (hotels.length === 0) {
    return (
      <div className="p-16 text-center">
        <Inbox size={40} className="mx-auto text-white/15 mb-4" />
        <p className="text-white/30 text-sm font-medium">No hay hoteles duplicados pendientes de revisión</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-black/20 text-[10px] uppercase text-white/40 font-bold tracking-widest">
            <tr>
              <th className="p-4">Hotel</th>
              <th className="p-4">Ciudad / Ubicación</th>
              <th className="p-4">Fingerprint</th>
              <th className="p-4">Creado</th>
              <th className="p-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {hotels.map((hotel) => (
              <tr key={hotel.id} className="hover:bg-white/5 transition-colors group">
                {/* Hotel */}
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <Building2 size={16} className="text-amber-400 shrink-0" />
                    <div>
                      <div className="font-bold text-white text-sm">{hotel.name}</div>
                      <div className="text-white/30 text-[10px] font-mono">{hotel.id.slice(0, 8)}…</div>
                    </div>
                  </div>
                </td>

                {/* Ciudad / Ubicación */}
                <td className="p-4">
                  <div className="flex items-center gap-1.5">
                    <MapPin size={14} className="text-blue-400" />
                    <div>
                      <span className="text-white/80 text-sm">{hotel.city ?? '—'}</span>
                      {hotel.location && (
                        <span className="text-white/40 text-xs ml-1">· {hotel.location}</span>
                      )}
                    </div>
                  </div>
                </td>

                {/* Fingerprint */}
                <td className="p-4">
                  <div className="flex items-center gap-1.5">
                    <Hash size={14} className="text-purple-400" />
                    <span className="text-white/50 text-xs font-mono">
                      {hotel.fingerprint_hash
                        ? `${hotel.fingerprint_hash.slice(0, 12)}…`
                        : '—'}
                    </span>
                  </div>
                </td>

                {/* Fecha */}
                <td className="p-4 text-white/50 text-xs">
                  <div className="flex items-center gap-1.5">
                    <Clock size={12} />
                    {formatDate(hotel.created_at)}
                  </div>
                </td>

                {/* Acciones */}
                <td className="p-4">
                  <div className="flex items-center gap-2 justify-end">
                    <a
                      href={`/hotel/${hotel.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-[var(--radius-squircle-md)] bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition-all text-xs"
                      title="Ver página pública"
                    >
                      <ExternalLink size={12} />
                    </a>
                    <button
                      onClick={() => handleApprove(hotel.id, hotel.name)}
                      disabled={isProcessing === hotel.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-squircle-md)] bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white border border-emerald-500/20 transition-all text-xs font-bold disabled:opacity-50"
                      title="Aprobar como prueba gratis"
                    >
                      <CheckCircle size={14} />
                      Aprobar
                    </button>
                    <button
                      onClick={() => setShowRejectConfirm(hotel.id)}
                      disabled={isProcessing === hotel.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-squircle-md)] bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white border border-rose-500/20 transition-all text-xs font-bold disabled:opacity-50"
                      title="Rechazar y suspender"
                    >
                      <XCircle size={14} />
                      Rechazar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ─── Modal: Confirmación de rechazo ────────────────────────────────── */}
      <AnimatePresence>
        {showRejectConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => setShowRejectConfirm(null)}
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
                  Rechazar Hotel
                </h3>
                <button
                  onClick={() => setShowRejectConfirm(null)}
                  className="p-1.5 hover:bg-white/10 rounded-full text-white/50 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <p className="text-white/60 text-sm">
                  ¿Estás seguro de rechazar este hotel? Se suspenderá y su suscripción
                  será cancelada. El hotel no será visible en la OTA.
                </p>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowRejectConfirm(null)}
                    className="flex-1 py-2.5 px-4 rounded-[var(--radius-squircle-lg)] bg-white/5 border border-white/10 text-white/60 hover:text-white transition-all text-sm font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => handleRejectConfirm(showRejectConfirm)}
                    disabled={isProcessing === showRejectConfirm}
                    className="flex-1 py-2.5 px-4 rounded-[var(--radius-squircle-lg)] bg-rose-600 hover:bg-rose-500 text-white font-bold transition-all text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <XCircle size={16} />
                    Rechazar y Suspender
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
