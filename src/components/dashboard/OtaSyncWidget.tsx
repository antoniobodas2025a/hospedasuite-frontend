'use client';

import { useState, useCallback } from 'react';
import { RefreshCw, CheckCircle2, AlertCircle, Clock, ExternalLink, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { OtaSyncStatus } from '@/app/actions/ota-sync';
import { triggerManualSyncAction } from '@/app/actions/ota-sync';

interface OtaSyncWidgetProps {
  initialStatus: OtaSyncStatus;
  hotelId: string;
}

export default function OtaSyncWidget({ initialStatus, hotelId }: OtaSyncWidgetProps) {
  const [status, setStatus] = useState(initialStatus);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const handleSync = useCallback(async () => {
    setIsSyncing(true);
    setSyncError(null);

    try {
      const result = await triggerManualSyncAction(hotelId);
      if (result.success) {
        // Refrescar después de 3 segundos (tiempo para que QStash procese)
        setTimeout(() => {
          window.location.reload();
        }, 3000);
      } else {
        setSyncError(result.error || 'Error desconocido');
      }
    } catch {
      setSyncError('Error de conexión');
    } finally {
      setIsSyncing(false);
    }
  }, [hotelId]);

  if (!status.hasIcalConfigured) {
    return null; // No mostrar widget si no hay iCal configurado
  }

  const lastSync = status.lastSync;
  const syncStatusColor = lastSync?.status === 'success'
    ? 'text-emerald-500'
    : lastSync?.status === 'partial'
      ? 'text-amber-500'
      : lastSync?.status === 'error'
        ? 'text-rose-500'
        : 'text-muted-foreground';

  const syncStatusIcon = lastSync?.status === 'success'
    ? <CheckCircle2 className="size-4 text-emerald-500" />
    : lastSync?.status === 'partial'
      ? <AlertCircle className="size-4 text-amber-500" />
      : lastSync?.status === 'error'
        ? <AlertCircle className="size-4 text-rose-500" />
        : <Clock className="size-4 text-muted-foreground" />;

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin < 1) return 'Hace menos de 1 min';
    if (diffMin < 60) return `Hace ${diffMin} min`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `Hace ${diffHr}h`;
    return `Hace ${Math.floor(diffHr / 24)}d`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-6 rounded-[var(--radius-squircle-2xl)] border border-border relative overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="size-10 bg-sky-500/10 text-sky-400 rounded-[var(--radius-squircle-lg)] flex items-center justify-center border border-sky-500/20">
            <ExternalLink className="size-5 stroke-[1.5]" />
          </div>
          <div>
            <h3 className="text-muted-foreground text-xs font-bold uppercase tracking-widest">
              Sincronización OTA
            </h3>
            <p className="text-xs text-muted-foreground">
              {status.roomsWithIcal}/{status.totalRooms} habitaciones conectadas
            </p>
          </div>
        </div>

        {/* Sync button */}
        <button
          onClick={handleSync}
          disabled={isSyncing}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-[var(--radius-squircle-lg)] text-xs font-bold transition-all',
            isSyncing
              ? 'bg-muted text-muted-foreground cursor-not-allowed'
              : 'bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 border border-sky-500/20'
          )}
        >
          {isSyncing ? (
            <>
              <Loader2 className="size-3 animate-spin" />
              Sync...
            </>
          ) : (
            <>
              <RefreshCw className="size-3" />
              Sync ahora
            </>
          )}
        </button>
      </div>

      {/* Sync error */}
      {syncError && (
        <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-[var(--radius-squircle-lg)] text-xs text-rose-400">
          Error: {syncError}
        </div>
      )}

      {/* Last sync status */}
      {lastSync ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            {syncStatusIcon}
            <span className={cn('font-bold', syncStatusColor)}>
              {lastSync.status === 'success' ? 'Sincronizado' : lastSync.status === 'partial' ? 'Parcial' : 'Error'}
            </span>
            <span className="text-muted-foreground text-xs ml-auto">
              {formatTimeAgo(lastSync.executed_at)}
            </span>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="glass-card p-2 rounded-[var(--radius-squircle-md)]">
              <p className="text-lg font-bold text-emerald-400">{lastSync.bookings_created}</p>
              <p className="text-[10px] text-muted-foreground uppercase">Nuevas</p>
            </div>
            <div className="glass-card p-2 rounded-[var(--radius-squircle-md)]">
              <p className="text-lg font-bold text-rose-400">{lastSync.bookings_cancelled}</p>
              <p className="text-[10px] text-muted-foreground uppercase">Canceladas</p>
            </div>
            <div className="glass-card p-2 rounded-[var(--radius-squircle-md)]">
              <p className="text-lg font-bold text-muted-foreground">{lastSync.bookings_unchanged}</p>
              <p className="text-[10px] text-muted-foreground uppercase">Sin cambios</p>
            </div>
          </div>

          {/* Duration */}
          {lastSync.duration_ms && (
            <p className="text-[10px] text-muted-foreground text-center">
              Duración: {lastSync.duration_ms}ms
            </p>
          )}
        </div>
      ) : (
        <div className="text-center py-4 text-muted-foreground text-sm">
          Sin sincronizaciones registradas
        </div>
      )}

      {/* Recent syncs */}
      {status.recentSyncs.length > 1 && (
        <div className="mt-4 pt-4 border-t border-border/40">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-2">
            Historial reciente
          </p>
          <div className="space-y-1">
            {status.recentSyncs.slice(1, 4).map((sync) => (
              <div key={sync.id} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  {sync.status === 'success' ? (
                    <CheckCircle2 className="size-3 text-emerald-500" />
                  ) : sync.status === 'partial' ? (
                    <AlertCircle className="size-3 text-amber-500" />
                  ) : (
                    <AlertCircle className="size-3 text-rose-500" />
                  )}
                  <span className="text-muted-foreground">
                    +{sync.bookings_created} / -{sync.bookings_cancelled}
                  </span>
                </div>
                <span className="text-muted-foreground/60">
                  {formatTimeAgo(sync.executed_at)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
