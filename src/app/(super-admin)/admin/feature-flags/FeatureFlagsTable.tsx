'use client';

import React, { useState, useCallback, useMemo } from 'react';
import type { FeatureFlagRow } from '@/data/superadmin';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import CreateFlagModal from './CreateFlagModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Flag,
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  Loader2,
  AlertCircle,
  Database,
  Building2,
  Globe,
} from 'lucide-react';

// ============================================================================
// FeatureFlagsTable — Client component for superadmin feature flag management.
//
// Receives initial server-fetched data and manages all client-side
// interactivity: search, scope filter, inline toggles, create modal,
// delete confirmation, and pagination.
// Mirrors LeadsTable.tsx pattern.
// ============================================================================

// ---- Scope badge helper ----
function ScopeBadge({ hotelId }: { hotelId: string | null }) {
  if (!hotelId) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border bg-emerald-500/10 border-emerald-500/20 text-emerald-400">
        <Globe className="size-3" />
        Global
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border bg-indigo-500/10 border-indigo-500/20 text-indigo-400">
      <Building2 className="size-3" />
      Per-Hotel
    </span>
  );
}

// ---- Inline toggle switch ----
function InlineToggle({
  enabled,
  loading,
  onToggle,
}: {
  enabled: boolean;
  loading: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={loading}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-[#09090b] ${
        enabled ? 'bg-blue-600' : 'bg-white/10'
      } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      role="switch"
      aria-checked={enabled}
    >
      {loading ? (
        <Loader2 className="absolute left-1 size-3 text-white animate-spin" />
      ) : (
        <span
          className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      )}
    </button>
  );
}

// ---- Props ----
interface FeatureFlagsTableProps {
  initialFlags: FeatureFlagRow[];
  hotels: { id: string; name: string }[];
}

const PAGE_SIZE = 25;

export default function FeatureFlagsTable({
  initialFlags,
  hotels,
}: FeatureFlagsTableProps) {
  // Hook
  const {
    flags: allFlags,
    loading,
    error,
    toggleFlag,
    createFlag,
    deleteFlag,
    clearError,
  } = useFeatureFlags({ initialFlags });

  // Local UI state
  const [searchInput, setSearchInput] = useState('');
  const [scopeFilter, setScopeFilter] = useState<string>('all');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [deletingFlag, setDeletingFlag] = useState<FeatureFlagRow | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  // ---- Hotel name lookup ----
  const hotelMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const h of hotels) {
      map.set(h.id, h.name);
    }
    return map;
  }, [hotels]);

  const getHotelName = useCallback(
    (hotelId: string | null): string => {
      if (!hotelId) return '—';
      return hotelMap.get(hotelId) ?? '—';
    },
    [hotelMap],
  );

  // ---- Filtered flags ----
  const filteredFlags = useMemo(() => {
    let result = allFlags;

    // Scope filter
    if (scopeFilter === 'global') {
      result = result.filter((f) => f.hotel_id === null);
    } else if (scopeFilter === 'per-hotel') {
      result = result.filter((f) => f.hotel_id !== null);
    }

    // Search
    if (searchInput.trim()) {
      const term = searchInput.toLowerCase().trim();
      result = result.filter(
        (f) =>
          f.flag_key.toLowerCase().includes(term) ||
          f.flag_name.toLowerCase().includes(term),
      );
    }

    return result;
  }, [allFlags, scopeFilter, searchInput]);

  // ---- Pagination ----
  const totalPages = Math.max(1, Math.ceil(filteredFlags.length / PAGE_SIZE));
  const paginatedFlags = filteredFlags.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  // Reset page when filters change
  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
    setPage(1);
  }, []);

  const handleScopeChange = useCallback((value: string) => {
    setScopeFilter(value);
    setPage(1);
  }, []);

  // ---- Toggle ----
  const handleToggle = useCallback(
    async (flagId: string) => {
      setTogglingId(flagId);
      await toggleFlag(flagId);
      setTogglingId(null);
    },
    [toggleFlag],
  );

  // ---- Delete ----
  const confirmDelete = useCallback((flag: FeatureFlagRow) => {
    setDeletingFlag(flag);
    setDeleteConfirmOpen(true);
  }, []);

  const handleDelete = useCallback(async () => {
    if (!deletingFlag) return;
    const ok = await deleteFlag(deletingFlag.id);
    setDeleteConfirmOpen(false);
    setDeletingFlag(null);
    if (!ok) {
      // Error is already set by the hook
    }
  }, [deletingFlag, deleteFlag]);

  const hasActiveFilters = searchInput.trim() !== '' || scopeFilter !== 'all';

  // ---- Loading skeleton ----
  if (loading && allFlags.length === 0) {
    return (
      <div className="space-y-8 max-w-[1600px] mx-auto pb-20">
        <header className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-white/10 pb-6">
          <div>
            <h2 className="text-3xl font-bold text-white mb-1 flex items-center gap-2">
              <Flag className="text-blue-500" /> Feature Flags
            </h2>
            <p className="text-white/50 text-sm">
              Gestión de feature flags — globales y por hotel
            </p>
          </div>
        </header>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-8 text-blue-400 animate-spin" />
          <span className="text-zinc-400 ml-3">Cargando flags...</span>
        </div>
      </div>
    );
  }

  // ---- Error state (when no flags loaded) ----
  if (error && allFlags.length === 0) {
    return (
      <div className="space-y-8 max-w-[1600px] mx-auto pb-20">
        <header className="flex flex-col gap-2 border-b border-white/10 pb-6">
          <h2 className="text-3xl font-bold text-white mb-1 flex items-center gap-2">
            <Flag className="text-blue-500" /> Feature Flags
          </h2>
          <p className="text-white/50 text-sm">
            Gestión de feature flags — globales y por hotel
          </p>
        </header>
        <div className="bg-white/5 border border-white/10 rounded-[var(--radius-squircle-2xl)] p-12 text-center">
          <AlertCircle className="mx-auto text-rose-500 size-12 mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">
            Error al cargar flags
          </h3>
          <p className="text-zinc-400 text-sm mb-4">{error}</p>
          <Button
            onClick={() => clearError()}
            variant="outline"
            className="border-white/10 text-zinc-300 hover:text-white"
          >
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  // ---- Empty state ----
  if (!loading && allFlags.length === 0 && !hasActiveFilters) {
    return (
      <div className="space-y-8 max-w-[1600px] mx-auto pb-20">
        <header className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-white/10 pb-6">
          <div>
            <h2 className="text-3xl font-bold text-white mb-1 flex items-center gap-2">
              <Flag className="text-blue-500" /> Feature Flags
            </h2>
            <p className="text-white/50 text-sm">
              Gestión de feature flags — globales y por hotel
            </p>
          </div>
          <Button
            onClick={() => setCreateModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2"
          >
            <Plus className="size-4" />
            Crear Flag
          </Button>
        </header>
        <div className="bg-white/5 border border-white/10 rounded-[var(--radius-squircle-2xl)] p-12 text-center">
          <Database className="mx-auto text-zinc-600 size-12 mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">
            No hay feature flags aún
          </h3>
          <p className="text-zinc-400 text-sm mb-6">
            Creá tu primer feature flag para empezar a controlar funcionalidades
            con granularidad global o por hotel.
          </p>
          <Button
            onClick={() => setCreateModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2"
          >
            <Plus className="size-4" />
            Crear Primer Flag
          </Button>
        </div>

        <CreateFlagModal
          open={createModalOpen}
          onOpenChange={setCreateModalOpen}
          onCreateFlag={createFlag}
          hotels={hotels}
        />
      </div>
    );
  }

  // ---- Main render ----
  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pb-20">
      {/* HEADER */}
      <header className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-white/10 pb-6">
        <div>
          <h2 className="text-3xl font-bold text-white mb-1 flex items-center gap-2">
            <Flag className="text-blue-500" /> Feature Flags
          </h2>
          <p className="text-white/50 text-sm">
            Gestión de feature flags — globales y por hotel
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-blue-500/10 border border-blue-500/20 px-4 py-2 rounded-[var(--radius-squircle-lg)] text-blue-400 text-xs font-bold uppercase flex items-center gap-2">
            <Flag size={14} />
            Total: {allFlags.length}
          </div>
          <Button
            onClick={() => setCreateModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2"
          >
            <Plus className="size-4" />
            Crear Flag
          </Button>
        </div>
      </header>

      {/* ERROR BANNER */}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-[var(--radius-squircle-lg)] px-4 py-3 flex items-center gap-2">
          <AlertCircle className="size-4 text-rose-400 shrink-0" />
          <p className="text-rose-400 text-xs flex-1">{error}</p>
          <button
            onClick={clearError}
            className="text-rose-300 text-xs hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>
      )}

      {/* TOOLBAR */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
          <Input
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Buscar por key o nombre..."
            className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-zinc-500"
          />
        </div>

        {/* Scope filter */}
        <Select value={scopeFilter} onValueChange={handleScopeChange}>
          <SelectTrigger className="w-[180px] bg-white/5 border-white/10 text-white">
            <SelectValue placeholder="Scope" />
          </SelectTrigger>
          <SelectContent className="bg-card border-white/10">
            <SelectItem value="all" className="text-white">
              Todos
            </SelectItem>
            <SelectItem value="global" className="text-white">
              Global
            </SelectItem>
            <SelectItem value="per-hotel" className="text-white">
              Per-Hotel
            </SelectItem>
          </SelectContent>
        </Select>

        {/* Clear filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchInput('');
              setScopeFilter('all');
              setPage(1);
              clearError();
            }}
            className="text-zinc-400 hover:text-white"
          >
            Limpiar filtros
          </Button>
        )}
      </div>

      {/* TABLE */}
      <div className="bg-white/5 border border-white/10 rounded-[var(--radius-squircle-2xl)] overflow-hidden overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.02]">
              <th className="px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                Flag Key
              </th>
              <th className="px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                Nombre
              </th>
              <th className="px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                Descripción
              </th>
              <th className="px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                Habilitado
              </th>
              <th className="px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                Scope
              </th>
              <th className="px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                Hotel
              </th>
              <th className="px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                Creado
              </th>
              <th className="px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-right">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center">
                  <Loader2 className="size-5 text-blue-400 animate-spin inline-block" />
                  <span className="text-zinc-400 text-xs ml-2">
                    Actualizando...
                  </span>
                </td>
              </tr>
            )}
            {!loading &&
              paginatedFlags.map((flag) => (
                <tr
                  key={flag.id}
                  className="hover:bg-white/[0.02] transition-colors"
                >
                  {/* Flag Key */}
                  <td className="px-4 py-3 text-white font-mono text-xs max-w-[200px] truncate">
                    {flag.flag_key}
                  </td>

                  {/* Flag Name */}
                  <td className="px-4 py-3 text-white font-medium max-w-[200px] truncate">
                    {flag.flag_name}
                  </td>

                  {/* Description */}
                  <td className="px-4 py-3 text-zinc-400 text-xs max-w-[250px] truncate">
                    {flag.description || '—'}
                  </td>

                  {/* Enabled — inline toggle */}
                  <td className="px-4 py-3">
                    <InlineToggle
                      enabled={flag.enabled}
                      loading={togglingId === flag.id}
                      onToggle={() => handleToggle(flag.id)}
                    />
                  </td>

                  {/* Scope */}
                  <td className="px-4 py-3">
                    <ScopeBadge hotelId={flag.hotel_id} />
                  </td>

                  {/* Hotel name */}
                  <td className="px-4 py-3 text-zinc-400 text-xs max-w-[150px] truncate">
                    {getHotelName(flag.hotel_id)}
                  </td>

                  {/* Created */}
                  <td className="px-4 py-3 text-zinc-500 text-xs whitespace-nowrap">
                    {new Date(flag.created_at).toLocaleDateString('es-CO', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => confirmDelete(flag)}
                        className="text-zinc-400 hover:text-rose-400"
                        title="Eliminar"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}

            {/* Empty results after filter */}
            {!loading && filteredFlags.length === 0 && hasActiveFilters && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center">
                  <Search className="mx-auto text-zinc-600 size-8 mb-3" />
                  <p className="text-zinc-400 text-sm">
                    No hay flags que coincidan con los filtros.
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchInput('');
                      setScopeFilter('all');
                      setPage(1);
                    }}
                    className="mt-2 text-zinc-400 hover:text-white"
                  >
                    Limpiar filtros
                  </Button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-zinc-500 text-xs">
            Página {page} de {totalPages} ({filteredFlags.length} flags)
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => setPage(page - 1)}
              className="border-white/10 text-zinc-400 hover:text-white disabled:opacity-30"
            >
              <ChevronLeft className="size-4" />
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || loading}
              onClick={() => setPage(page + 1)}
              className="border-white/10 text-zinc-400 hover:text-white disabled:opacity-30"
            >
              Siguiente
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {/* CREATE MODAL */}
      <CreateFlagModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onCreateFlag={createFlag}
        hotels={hotels}
      />

      {/* DELETE CONFIRMATION */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent
          className="sm:max-w-md bg-card border border-white/10 rounded-[var(--radius-squircle-2xl)]"
          showCloseButton
        >
          <DialogHeader>
            <DialogTitle className="text-white text-lg font-bold flex items-center gap-2">
              <Trash2 className="size-5 text-rose-400" />
              Eliminar Feature Flag
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              ¿Estás seguro de que querés eliminar este feature flag? Esta
              acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>

          {deletingFlag && (
            <div className="bg-white/5 border border-white/10 rounded-[var(--radius-squircle-lg)] p-3">
              <p className="text-white font-semibold font-mono text-sm">
                {deletingFlag.flag_key}
              </p>
              <p className="text-zinc-400 text-xs mt-1">
                {deletingFlag.flag_name}
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteConfirmOpen(false);
                setDeletingFlag(null);
              }}
              disabled={loading}
              className="border-white/10 text-zinc-400 hover:text-white"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleDelete}
              disabled={loading}
              className="bg-rose-600 hover:bg-rose-500 text-white gap-2"
            >
              <Trash2 className="size-4" />
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
