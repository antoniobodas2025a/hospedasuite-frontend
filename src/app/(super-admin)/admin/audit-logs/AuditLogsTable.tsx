'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Calendar,
  AlertTriangle,
  Inbox,
} from 'lucide-react';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface AuditLogRow {
  id: string;
  actor_type: string;
  actor_id: string | null;
  actor_email: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function JsonCell({ value }: { value: Record<string, unknown> | null }) {
  const [open, setOpen] = useState(false);

  if (!value || Object.keys(value).length === 0) {
    return <span className="text-white/20 text-xs italic">—</span>;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors font-mono"
      >
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        {open ? 'Ocultar' : 'Ver JSON'}
      </button>
      <AnimatePresence>
        {open && (
          <motion.pre
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute z-20 left-0 mt-1 p-3 bg-[#0f0f13] border border-white/10 rounded-[var(--radius-squircle-lg)] text-[10px] text-white/60 font-mono whitespace-pre-wrap max-w-[380px] overflow-auto shadow-xl"
          >
            {JSON.stringify(value, null, 2)}
          </motion.pre>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function AuditLogsTable({
  logs,
  totalPages,
  currentPage,
  totalCount,
  error,
  filterActions,
  filterEntityTypes,
}: {
  logs: AuditLogRow[];
  totalPages: number;
  currentPage: number;
  totalCount: number;
  error?: string;
  filterActions: string[];
  filterEntityTypes: string[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read current filters from URL
  const currentAction = searchParams.get('action') ?? '';
  const currentEntityType = searchParams.get('entity_type') ?? '';
  const currentActorEmail = searchParams.get('actor_email') ?? '';
  const currentDateFrom = searchParams.get('date_from') ?? '';
  const currentDateTo = searchParams.get('date_to') ?? '';

  // Local form state (synced from URL on mount)
  const [actorEmail, setActorEmail] = useState(currentActorEmail);
  const [action, setAction] = useState(currentAction);
  const [entityType, setEntityType] = useState(currentEntityType);
  const [dateFrom, setDateFrom] = useState(currentDateFrom);
  const [dateTo, setDateTo] = useState(currentDateTo);
  const [filtersVisible, setFiltersVisible] = useState(
    !!currentAction || !!currentEntityType || !!currentActorEmail || !!currentDateFrom || !!currentDateTo
  );

  const applyFilters = () => {
    const params = new URLSearchParams();
    if (actorEmail.trim()) params.set('actor_email', actorEmail.trim());
    if (action) params.set('action', action);
    if (entityType) params.set('entity_type', entityType);
    if (dateFrom) params.set('date_from', dateFrom);
    if (dateTo) params.set('date_to', dateTo);
    params.set('page', '1'); // Reset to page 1 on new filter
    router.push(`/admin/audit-logs?${params.toString()}`);
  };

  const clearFilters = () => {
    setActorEmail('');
    setAction('');
    setEntityType('');
    setDateFrom('');
    setDateTo('');
    router.push('/admin/audit-logs');
  };

  const goToPage = (p: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(p));
    router.push(`/admin/audit-logs?${params.toString()}`);
  };

  const hasActiveFilters = !!currentAction || !!currentEntityType || !!currentActorEmail || !!currentDateFrom || !!currentDateTo;

  if (error) {
    return (
      <div className="p-12 text-center">
        <AlertTriangle size={32} className="mx-auto text-rose-400 mb-3" />
        <p className="text-rose-400 text-sm font-medium">Error al cargar los registros de auditoría</p>
        <p className="text-white/30 text-xs mt-1 font-mono">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pb-20">
      {/* HEADER */}
      <header className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-white/10 pb-6">
        <div>
          <h2 className="text-3xl font-bold text-white mb-1 flex items-center gap-2">
            <Search className="text-blue-500" /> Registros de Auditoría
          </h2>
          <p className="text-white/50 text-sm">
            Trazabilidad completa de acciones de superadministradores
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setFiltersVisible(!filtersVisible)}
            className={`flex items-center gap-2 px-4 py-2 rounded-[var(--radius-squircle-lg)] text-xs font-bold transition-colors ${
              filtersVisible || hasActiveFilters
                ? 'bg-blue-500/10 border border-blue-500/20 text-blue-400'
                : 'bg-white/5 border border-white/10 text-white/50 hover:text-white/80'
            }`}
          >
            <Filter size={14} />
            Filtros
            {hasActiveFilters && (
              <span className="bg-blue-500/20 text-blue-400 text-[10px] px-1.5 py-0.5 rounded-full">
                Activos
              </span>
            )}
          </button>
          <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-[var(--radius-squircle-lg)] text-white/40 text-xs font-bold uppercase flex items-center gap-2">
            Total: {totalCount}
          </div>
        </div>
      </header>

      {/* FILTERS */}
      <AnimatePresence>
        {filtersVisible && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="bg-white/5 border border-white/10 rounded-[var(--radius-squircle-2xl)] p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Actor Email */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Email del Actor</label>
                <input
                  type="text"
                  value={actorEmail}
                  onChange={(e) => setActorEmail(e.target.value)}
                  placeholder="ej: admin@hotel.com"
                  className="w-full bg-black/30 border border-white/10 rounded-[var(--radius-squircle-lg)] px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500/50 transition-colors"
                />
              </div>

              {/* Action Select */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Acción</label>
                <select
                  value={action}
                  onChange={(e) => setAction(e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-[var(--radius-squircle-lg)] px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-colors appearance-none"
                >
                  <option value="">Todas</option>
                  {filterActions.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>

              {/* Entity Type Select */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Tipo de Entidad</label>
                <select
                  value={entityType}
                  onChange={(e) => setEntityType(e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-[var(--radius-squircle-lg)] px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-colors appearance-none"
                >
                  <option value="">Todos</option>
                  {filterEntityTypes.map((et) => (
                    <option key={et} value={et}>
                      {et}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date From */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold flex items-center gap-1.5">
                  <Calendar size={12} /> Desde
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-[var(--radius-squircle-lg)] px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-colors [color-scheme:dark]"
                />
              </div>

              {/* Date To */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold flex items-center gap-1.5">
                  <Calendar size={12} /> Hasta
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-[var(--radius-squircle-lg)] px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-colors [color-scheme:dark]"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-end gap-2">
                <button
                  onClick={applyFilters}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold py-2 px-4 rounded-[var(--radius-squircle-lg)] transition-colors"
                >
                  Aplicar
                </button>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="flex-1 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white/80 text-sm font-bold py-2 px-4 rounded-[var(--radius-squircle-lg)] transition-colors border border-white/10"
                  >
                    Limpiar
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TABLE */}
      <div className="bg-white/5 border border-white/10 rounded-[var(--radius-squircle-2xl)] overflow-hidden">
        {logs.length === 0 ? (
          <div className="p-16 text-center">
            <Inbox size={40} className="mx-auto text-white/15 mb-4" />
            <p className="text-white/30 text-sm font-medium">
              {hasActiveFilters ? 'No hay resultados para los filtros aplicados' : 'No hay registros de auditoría'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-black/20 text-[10px] uppercase text-white/40 font-bold tracking-widest">
                  <tr>
                    <th className="p-4">Fecha</th>
                    <th className="p-4">Actor</th>
                    <th className="p-4">Acción</th>
                    <th className="p-4">Entidad</th>
                    <th className="p-4">ID Entidad</th>
                    <th className="p-4">Valor Anterior</th>
                    <th className="p-4">Valor Nuevo</th>
                    <th className="p-4">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {logs.map((log) => (
                    <tr
                      key={log.id}
                      className="hover:bg-white/[0.03] transition-colors"
                    >
                      <td className="p-4 text-xs text-white/60 font-mono whitespace-nowrap">
                        {formatDate(log.created_at)}
                      </td>
                      <td className="p-4">
                        <div className="text-xs text-white/80 font-medium truncate max-w-[180px]">
                          {log.actor_email || log.actor_id || log.actor_type}
                        </div>
                        {log.actor_email && log.actor_id && (
                          <div className="text-[10px] text-white/30 font-mono truncate max-w-[180px]">
                            {log.actor_id.slice(0, 8)}...
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <span className="text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full font-mono whitespace-nowrap">
                          {log.action}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                          {log.entity_type}
                        </span>
                      </td>
                      <td className="p-4 text-xs text-white/40 font-mono max-w-[120px] truncate">
                        {log.entity_id.slice(0, 12)}...
                      </td>
                      <td className="p-4">
                        <JsonCell value={log.old_value} />
                      </td>
                      <td className="p-4">
                        <JsonCell value={log.new_value} />
                      </td>
                      <td className="p-4 text-[10px] text-white/30 font-mono whitespace-nowrap">
                        {log.ip_address || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* PAGINATION */}
            {totalPages > 1 && (
              <div className="border-t border-white/10 px-6 py-4 flex items-center justify-between">
                <p className="text-xs text-white/30">
                  Página {currentPage} de {totalPages} ({totalCount} registros)
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage <= 1}
                    className="p-2 rounded-[var(--radius-squircle-lg)] text-white/40 hover:text-white hover:bg-white/5 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft size={16} />
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => {
                      // Show first, last, current, and neighbors
                      if (p === 1 || p === totalPages) return true;
                      if (Math.abs(p - currentPage) <= 1) return true;
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
                              p === currentPage
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
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                    className="p-2 rounded-[var(--radius-squircle-lg)] text-white/40 hover:text-white hover:bg-white/5 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
