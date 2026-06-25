'use client';

import React, { useState, useCallback } from 'react';
import type { LeadDTO, LeadStatus, HotelOption } from '@/types/leads';
import { VALID_LEAD_STATUSES } from '@/types/leads';
import { useLeads } from '@/hooks/useLeads';
import { exportLeadsToCSV } from '@/lib/lead-export';
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
import LeadEditModal from './LeadEditModal';
import LeadCreateModal from './LeadCreateModal';
import {
  Users,
  Search,
  Download,
  Plus,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  Loader2,
  AlertCircle,
  Database,
  Building2,
  Phone,
  MapPin,
} from 'lucide-react';

// ============================================================================
// LeadsTable — Client component for the superadmin lead management table.
//
// Receives initial server-fetched data and manages all client-side
// interactivity: search, filter, pagination, inline status changes,
// edit modal, create modal, delete confirmation, and CSV export.
// ============================================================================

// ---- Status badge helper ----
const STATUS_STYLES: Record<LeadStatus, { bg: string; text: string; label: string; dot: string }> = {
  new: {
    bg: 'bg-blue-500/10 border-blue-500/20',
    text: 'text-blue-400',
    label: 'Nuevo',
    dot: 'bg-blue-400',
  },
  contacted: {
    bg: 'bg-indigo-500/10 border-indigo-500/20',
    text: 'text-indigo-400',
    label: 'Contactado',
    dot: 'bg-indigo-400',
  },
  converted: {
    bg: 'bg-emerald-500/10 border-emerald-500/20',
    text: 'text-emerald-400',
    label: 'Convertido',
    dot: 'bg-emerald-400',
  },
  lost: {
    bg: 'bg-zinc-500/10 border-zinc-500/20',
    text: 'text-zinc-400',
    label: 'Perdido',
    dot: 'bg-zinc-500',
  },
};

function StatusBadge({ status }: { status: LeadStatus }) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.new;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${style.bg} ${style.text}`}
    >
      <span className={`inline-block w-1.5 h-1.5 rounded-full ${style.dot}`} />
      {style.label}
    </span>
  );
}

// ---- Props ----
interface LeadsTableProps {
  initialLeads: LeadDTO[];
  totalCount: number;
  initialPage: number;
  pageSize: number;
  hotels: HotelOption[];
}

export default function LeadsTable({
  initialLeads,
  totalCount,
  initialPage,
  pageSize,
  hotels,
}: LeadsTableProps) {
  // Hook
  const {
    leads,
    total,
    page,
    loading,
    error,
    filters,
    updateStatus,
    updateNotes,
    deleteLead,
    assignToHotel,
    createLead,
    setPage,
    setFilters,
    clearError,
  } = useLeads({
    initialLeads,
    initialTotal: totalCount,
    initialPage,
    pageSize,
  });

  // Local UI state
  const [searchInput, setSearchInput] = useState('');
  const [cityInput, setCityInput] = useState('');
  const [editingLead, setEditingLead] = useState<LeadDTO | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [deletingLead, setDeletingLead] = useState<LeadDTO | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [statusChanging, setStatusChanging] = useState<number | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // ---- Search ----
  const handleSearch = useCallback(
    (value: string) => {
      setSearchInput(value);
      setFilters({ search: value || undefined });
    },
    [setFilters],
  );

  // ---- Status filter ----
  const handleStatusFilter = useCallback(
    (value: string) => {
      setFilters({
        status: value === 'all' ? undefined : (value as LeadStatus),
      });
    },
    [setFilters],
  );

  // ---- City filter ----
  const handleCityFilter = useCallback(
    (value: string) => {
      setCityInput(value);
      setFilters({ city: value || undefined });
    },
    [setFilters],
  );

  // ---- Clear all filters ----
  const clearFilters = useCallback(() => {
    setSearchInput('');
    setCityInput('');
    setFilters({ search: undefined, status: undefined, city: undefined });
    clearError();
  }, [setFilters, clearError]);

  // ---- Status change (inline) ----
  const handleStatusChange = useCallback(
    async (leadId: number, newStatus: LeadStatus) => {
      setStatusChanging(leadId);
      await updateStatus(leadId, newStatus);
      setStatusChanging(null);
    },
    [updateStatus],
  );

  // ---- Edit ----
  const handleEdit = useCallback((lead: LeadDTO) => {
    setEditingLead(lead);
    setEditModalOpen(true);
  }, []);

  // ---- Delete ----
  const confirmDelete = useCallback((lead: LeadDTO) => {
    setDeletingLead(lead);
    setDeleteConfirmOpen(true);
  }, []);

  const handleDelete = useCallback(async () => {
    if (!deletingLead) return;
    const ok = await deleteLead(deletingLead.id);
    setDeleteConfirmOpen(false);
    setDeletingLead(null);
    if (!ok) {
      // Error is already set by the hook
    }
  }, [deletingLead, deleteLead]);

  // ---- Export ----
  const handleExport = useCallback(() => {
    const statusLabel = filters.status ?? 'todos';
    const date = new Date();
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const filename = `leads-export-${statusLabel}-${yyyy}-${mm}-${dd}.csv`;
    exportLeadsToCSV(leads, filename);
  }, [leads, filters.status]);

  // ---- Hotel name lookup ----
  const getHotelName = useCallback(
    (hotelId: string | null | undefined): string => {
      if (!hotelId) return '—';
      const hotel = hotels.find((h) => h.id === hotelId);
      return hotel?.name ?? '—';
    },
    [hotels],
  );

  const hasActiveFilters =
    !!filters.search || !!filters.status || !!filters.city;

  // ---- Loading skeleton ----
  if (loading && leads.length === 0) {
    return (
      <div className="space-y-8 max-w-[1600px] mx-auto pb-20">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-white/10 pb-6">
          <div>
            <h2 className="text-3xl font-bold text-white mb-1 flex items-center gap-2">
              <Users className="text-blue-500" /> Leads
            </h2>
            <p className="text-white/50 text-sm">
              Gestión de leads — búsqueda, filtros y acciones CRUD
            </p>
          </div>
        </header>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-8 text-blue-400 animate-spin" />
          <span className="text-zinc-400 ml-3">Cargando leads...</span>
        </div>
      </div>
    );
  }

  // ---- Error state (when no leads loaded) ----
  if (error && leads.length === 0) {
    return (
      <div className="space-y-8 max-w-[1600px] mx-auto pb-20">
        <header className="flex flex-col gap-2 border-b border-white/10 pb-6">
          <h2 className="text-3xl font-bold text-white mb-1 flex items-center gap-2">
            <Users className="text-blue-500" /> Leads
          </h2>
          <p className="text-white/50 text-sm">
            Gestión de leads — búsqueda, filtros y acciones CRUD
          </p>
        </header>
        <div className="bg-white/5 border border-white/10 rounded-[var(--radius-squircle-2xl)] p-12 text-center">
          <AlertCircle className="mx-auto text-rose-500 size-12 mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">
            Error al cargar leads
          </h3>
          <p className="text-zinc-400 text-sm mb-4">{error}</p>
          <Button
            onClick={() => setFilters({})}
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
  if (!loading && leads.length === 0 && !hasActiveFilters) {
    return (
      <div className="space-y-8 max-w-[1600px] mx-auto pb-20">
        <header className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-white/10 pb-6">
          <div>
            <h2 className="text-3xl font-bold text-white mb-1 flex items-center gap-2">
              <Users className="text-blue-500" /> Leads
            </h2>
            <p className="text-white/50 text-sm">
              Gestión de leads — búsqueda, filtros y acciones CRUD
            </p>
          </div>
          <Button
            onClick={() => setCreateModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2"
          >
            <Plus className="size-4" />
            Agregar Lead
          </Button>
        </header>
        <div className="bg-white/5 border border-white/10 rounded-[var(--radius-squircle-2xl)] p-12 text-center">
          <Database className="mx-auto text-zinc-600 size-12 mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">
            No hay leads aún
          </h3>
          <p className="text-zinc-400 text-sm mb-6">
            Cuando los visitantes completen el formulario de captura, aparecerán
            aquí. También podés crear leads manualmente.
          </p>
          <Button
            onClick={() => setCreateModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2"
          >
            <Plus className="size-4" />
            Crear Primer Lead
          </Button>
        </div>

        <LeadCreateModal
          open={createModalOpen}
          onOpenChange={setCreateModalOpen}
          onCreateLead={createLead}
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
            <Users className="text-blue-500" /> Leads
          </h2>
          <p className="text-white/50 text-sm">
            Gestión de leads — búsqueda, filtros y acciones CRUD
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-blue-500/10 border border-blue-500/20 px-4 py-2 rounded-[var(--radius-squircle-lg)] text-blue-400 text-xs font-bold uppercase flex items-center gap-2">
            <Users size={14} />
            Total: {total}
          </div>
          <Button
            onClick={() => setCreateModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2"
          >
            <Plus className="size-4" />
            Agregar Lead
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
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Buscar por nombre o teléfono..."
            className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-zinc-500"
          />
        </div>

        {/* Status filter */}
        <Select
          value={filters.status ?? 'all'}
          onValueChange={handleStatusFilter}
        >
          <SelectTrigger className="w-[160px] bg-white/5 border-white/10 text-white">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent className="bg-card border-white/10">
            <SelectItem value="all" className="text-zinc-400">
              Todos los estados
            </SelectItem>
            {VALID_LEAD_STATUSES.map((s) => (
              <SelectItem key={s} value={s} className="text-white">
                {STATUS_STYLES[s]?.label ?? s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* City filter */}
        <div className="relative w-[180px]">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
          <Input
            value={cityInput}
            onChange={(e) => handleCityFilter(e.target.value)}
            placeholder="Filtrar ciudad..."
            className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-zinc-500"
          />
        </div>

        {/* Clear filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-zinc-400 hover:text-white"
          >
            Limpiar filtros
          </Button>
        )}

        {/* Export */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          className="border-white/10 text-zinc-400 hover:text-white gap-2 ml-auto"
        >
          <Download className="size-4" />
          Exportar CSV
        </Button>
      </div>

      {/* TABLE */}
      <div className="bg-white/5 border border-white/10 rounded-[var(--radius-squircle-2xl)] overflow-hidden overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.02]">
              <th className="px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                Negocio
              </th>
              <th className="px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                Teléfono
              </th>
              <th className="px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                Ciudad
              </th>
              <th className="px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                Estado
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
                <td colSpan={7} className="px-4 py-8 text-center">
                  <Loader2 className="size-5 text-blue-400 animate-spin inline-block" />
                  <span className="text-zinc-400 text-xs ml-2">
                    Actualizando...
                  </span>
                </td>
              </tr>
            )}
            {!loading &&
              leads.map((lead) => (
                <tr
                  key={lead.id}
                  className="hover:bg-white/[0.02] transition-colors"
                >
                  {/* Business name */}
                  <td className="px-4 py-3 text-white font-medium max-w-[200px] truncate">
                    {lead.business_name || '—'}
                  </td>

                  {/* Phone */}
                  <td className="px-4 py-3 text-zinc-400 font-mono text-xs">
                    {lead.phone || '—'}
                  </td>

                  {/* City */}
                  <td className="px-4 py-3 text-zinc-400 text-xs">
                    {lead.city_search || '—'}
                  </td>

                  {/* Status — inline dropdown */}
                  <td className="px-4 py-3">
                    {statusChanging === lead.id ? (
                      <Loader2 className="size-3 text-blue-400 animate-spin" />
                    ) : (
                      <Select
                        value={(lead.status as LeadStatus) ?? 'new'}
                        onValueChange={(v) =>
                          handleStatusChange(lead.id, v as LeadStatus)
                        }
                      >
                        <SelectTrigger
                          size="sm"
                          className="h-7 text-[10px] bg-transparent border-none px-1 hover:bg-white/5"
                        >
                          <SelectValue>
                            <StatusBadge
                              status={(lead.status as LeadStatus) ?? 'new'}
                            />
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="bg-card border-white/10">
                          {VALID_LEAD_STATUSES.map((s) => (
                            <SelectItem key={s} value={s} className="text-white">
                              <StatusBadge status={s} />
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </td>

                  {/* Hotel */}
                  <td className="px-4 py-3 text-zinc-400 text-xs max-w-[150px] truncate">
                    <span className="flex items-center gap-1">
                      <Building2 className="size-3 text-zinc-600 shrink-0" />
                      {getHotelName(lead.hotel_id)}
                    </span>
                  </td>

                  {/* Created */}
                  <td className="px-4 py-3 text-zinc-500 text-xs whitespace-nowrap">
                    {lead.created_at
                      ? new Date(lead.created_at).toLocaleDateString(
                          'es-CO',
                          {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          },
                        )
                      : '—'}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => handleEdit(lead)}
                        className="text-zinc-400 hover:text-indigo-400"
                        title="Editar"
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => confirmDelete(lead)}
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
            {!loading && leads.length === 0 && hasActiveFilters && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center">
                  <Search className="mx-auto text-zinc-600 size-8 mb-3" />
                  <p className="text-zinc-400 text-sm">
                    No hay leads que coincidan con los filtros.
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
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
            Página {page} de {totalPages} ({total} leads)
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

      {/* MODALS */}
      <LeadEditModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        lead={editingLead}
        hotels={hotels}
        onSaveStatus={updateStatus}
        onSaveNotes={updateNotes}
        onAssignHotel={assignToHotel}
      />

      <LeadCreateModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onCreateLead={createLead}
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
              Eliminar Lead
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              ¿Estás seguro de que querés eliminar este lead? Esta acción no se
              puede deshacer.
            </DialogDescription>
          </DialogHeader>

          {deletingLead && (
            <div className="bg-white/5 border border-white/10 rounded-[var(--radius-squircle-lg)] p-3">
              <p className="text-white font-semibold">
                {deletingLead.business_name}
              </p>
              {deletingLead.phone && (
                <p className="text-zinc-400 text-xs mt-1 flex items-center gap-1">
                  <Phone className="size-3" />
                  {deletingLead.phone}
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteConfirmOpen(false);
                setDeletingLead(null);
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
