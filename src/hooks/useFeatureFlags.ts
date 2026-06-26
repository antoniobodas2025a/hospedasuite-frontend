'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { FeatureFlagRow } from '@/data/superadmin';
import {
  getFeatureFlagsAction,
  createFeatureFlagAction,
  updateFeatureFlagAction,
  deleteFeatureFlagAction,
  toggleFeatureFlagAction,
} from '@/app/actions/superadmin-feature-flags';
import type { CreateFlagInput, UpdateFlagInput } from '@/app/actions/superadmin-feature-flags';

// ============================================================================
// useFeatureFlags — Client-side hook for superadmin feature flag management.
//
// Mirrors useLeads.ts pattern: snapshot → server action → rollback on failure →
// router.refresh(). Receives initial server-fetched data as props.
// ============================================================================

interface UseFeatureFlagsOptions {
  initialFlags: FeatureFlagRow[];
}

export function useFeatureFlags({ initialFlags }: UseFeatureFlagsOptions) {
  const router = useRouter();

  // ---- State ----
  const [flags, setFlags] = useState<FeatureFlagRow[]>(initialFlags);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ---- Fetch flags from server ----
  const fetchFlags = useCallback(async (hotelId?: string | null) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getFeatureFlagsAction(hotelId);
      setFlags(result);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error fetching feature flags';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  // ---- Optimistic toggle ----
  const toggleFlag = useCallback(
    async (flagId: string) => {
      const previous = [...flags];
      // Optimistically flip the enabled state
      setFlags((prev) =>
        prev.map((f) =>
          f.id === flagId ? { ...f, enabled: !f.enabled } : f,
        ),
      );
      const result = await toggleFeatureFlagAction(flagId);
      if (!result.success) {
        setFlags(previous);
        setError(result.error ?? 'Error al cambiar estado del flag');
        return false;
      }
      router.refresh();
      return true;
    },
    [flags, router],
  );

  // ---- Create flag ----
  const createFlag = useCallback(
    async (input: CreateFlagInput) => {
      const result = await createFeatureFlagAction(input);
      if (result.success && result.data) {
        setFlags((prev) => [result.data!, ...prev]);
        router.refresh();
        return { success: true as const };
      }
      return {
        success: false as const,
        error: result.error ?? 'Error al crear flag',
      };
    },
    [router],
  );

  // ---- Update flag ----
  const updateFlag = useCallback(
    async (flagId: string, input: UpdateFlagInput) => {
      const previous = [...flags];
      setFlags((prev) =>
        prev.map((f) =>
          f.id === flagId
            ? {
                ...f,
                flag_name: input.flag_name ?? f.flag_name,
                description: input.description !== undefined ? input.description : f.description,
                enabled: input.enabled ?? f.enabled,
                hotel_id: input.hotel_id !== undefined ? input.hotel_id : f.hotel_id,
              }
            : f,
        ),
      );
      const result = await updateFeatureFlagAction(flagId, input);
      if (!result.success) {
        setFlags(previous);
        setError(result.error ?? 'Error al actualizar flag');
        return false;
      }
      router.refresh();
      return true;
    },
    [flags, router],
  );

  // ---- Delete flag ----
  const deleteFlag = useCallback(
    async (flagId: string) => {
      const previous = [...flags];
      setFlags((prev) => prev.filter((f) => f.id !== flagId));
      const result = await deleteFeatureFlagAction(flagId);
      if (!result.success) {
        setFlags(previous);
        setError(result.error ?? 'Error al eliminar flag');
        return false;
      }
      router.refresh();
      return true;
    },
    [flags, router],
  );

  const clearError = useCallback(() => setError(null), []);

  return {
    // State
    flags,
    loading,
    error,
    // Actions
    fetchFlags,
    toggleFlag,
    createFlag,
    updateFlag,
    deleteFlag,
    // Controls
    clearError,
  };
}
