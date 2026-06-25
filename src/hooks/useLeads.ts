'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { LeadDTO, LeadFilter, LeadStatus } from '@/types/leads';
import {
  getLeadsAction,
  updateLeadStatusAction,
  updateLeadNotesAction,
  assignLeadToHotelAction,
  deleteLeadAction,
  createAdminLeadAction,
} from '@/app/actions/superadmin-leads';

// ============================================================================
// useLeads — Client-side hook for superadmin lead management panel.
//
// Mirrors useCRM.ts pattern: snapshot → server action → rollback on failure →
// router.refresh(). Receives initial server-fetched data as props.
// ============================================================================

interface UseLeadsOptions {
  initialLeads: LeadDTO[];
  initialTotal: number;
  initialPage: number;
  pageSize: number;
}

export function useLeads({
  initialLeads,
  initialTotal,
  initialPage,
  pageSize,
}: UseLeadsOptions) {
  const router = useRouter();

  // ---- State ----
  const [leads, setLeads] = useState<LeadDTO[]>(initialLeads);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPageState] = useState(initialPage);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<LeadFilter>({});

  // ---- Fetch leads (re-fetches from server with current filters + page) ----
  const fetchLeads = useCallback(
    async (override?: Partial<LeadFilter>, newPage?: number) => {
      setLoading(true);
      setError(null);
      try {
        const merged: LeadFilter = {
          ...filters,
          ...override,
          page: newPage ?? page,
          pageSize,
        };
        const result = await getLeadsAction(merged);
        setLeads(result.leads);
        setTotal(result.total);
        if (override) setFiltersState((prev) => ({ ...prev, ...override }));
        if (newPage !== undefined) setPageState(newPage);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Error fetching leads';
        setError(msg);
      } finally {
        setLoading(false);
      }
    },
    [filters, page, pageSize],
  );

  // ---- Optimistic update wrappers ----

  const updateStatus = useCallback(
    async (leadId: number, status: LeadStatus) => {
      const previous = [...leads];
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, status } : l)),
      );
      const result = await updateLeadStatusAction(String(leadId), status);
      if (!result.success) {
        setLeads(previous);
        setError(result.error ?? 'Error al actualizar estado');
        return false;
      }
      router.refresh();
      return true;
    },
    [leads, router],
  );

  const updateNotes = useCallback(
    async (leadId: number, notes: string) => {
      const previous = [...leads];
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, notes } : l)),
      );
      const result = await updateLeadNotesAction(String(leadId), notes);
      if (!result.success) {
        setLeads(previous);
        setError(result.error ?? 'Error al actualizar notas');
        return false;
      }
      router.refresh();
      return true;
    },
    [leads, router],
  );

  const assignToHotel = useCallback(
    async (leadId: number, hotelId: string | null) => {
      const previous = [...leads];
      setLeads((prev) =>
        prev.map((l) =>
          l.id === leadId ? { ...l, hotel_id: hotelId } : l,
        ),
      );
      // Server action expects string; empty string = unassign
      const result = await assignLeadToHotelAction(
        String(leadId),
        hotelId ?? '',
      );
      if (!result.success) {
        setLeads(previous);
        setError(result.error ?? 'Error al asignar hotel');
        return false;
      }
      router.refresh();
      return true;
    },
    [leads, router],
  );

  const deleteLeadById = useCallback(
    async (leadId: number) => {
      const previous = [...leads];
      setLeads((prev) => prev.filter((l) => l.id !== leadId));
      setTotal((prev) => prev - 1);
      const result = await deleteLeadAction(String(leadId));
      if (!result.success) {
        setLeads(previous);
        setTotal((prev) => prev + 1);
        setError(result.error ?? 'Error al eliminar lead');
        return false;
      }
      router.refresh();
      return true;
    },
    [leads, router],
  );

  const createLead = useCallback(
    async (data: {
      business_name: string;
      phone: string;
      email?: string;
      city?: string;
      notes?: string;
    }) => {
      const result = await createAdminLeadAction(data);
      if (result.success && result.data) {
        setLeads((prev) => [result.data, ...prev]);
        setTotal((prev) => prev + 1);
        router.refresh();
        return { success: true as const };
      }
      return {
        success: false as const,
        error: result.error ?? 'Error al crear lead',
      };
    },
    [router],
  );

  // ---- Convenience setters (trigger server re-fetch) ----
  const setPage = useCallback(
    (p: number) => fetchLeads(undefined, p),
    [fetchLeads],
  );

  const setFilters = useCallback(
    (f: Partial<LeadFilter>) => fetchLeads(f, 1),
    [fetchLeads],
  );

  const clearError = useCallback(() => setError(null), []);

  return {
    // State
    leads,
    total,
    page,
    pageSize,
    loading,
    error,
    filters,
    // Actions
    fetchLeads,
    updateStatus,
    updateNotes,
    deleteLead: deleteLeadById,
    assignToHotel,
    createLead,
    // Controls
    setPage,
    setFilters,
    clearError,
  };
}
