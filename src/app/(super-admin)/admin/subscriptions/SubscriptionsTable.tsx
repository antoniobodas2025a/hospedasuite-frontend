'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  getSubscriptionsAction,
  cancelSubscriptionAction,
  reactivateSubscriptionAction,
} from '@/app/actions/super-admin';
import type { SubscriptionRow } from '@/data/billing';
import { SAAS_PLANS, type PlanKey } from '@/config/saas-plans';
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
import ExtendTrialModal from './ExtendTrialModal';
import ChangePlanModal from './ChangePlanModal';
import {
  Receipt,
  Search,
  ChevronLeft,
  ChevronRight,
  Clock,
  ArrowLeftRight,
  XCircle,
  RotateCcw,
  Loader2,
  AlertCircle,
  Database,
  Building2,
  Calendar,
  DollarSign,
} from 'lucide-react';

// ─── Status badge styles ────────────────────────────────────────────────

const STATUS_STYLES: Record<
  string,
  { bg: string; text: string; label: string; dot: string }
> = {
  active: {
    bg: 'bg-emerald-500/10 border-emerald-500/20',
    text: 'text-emerald-400',
    label: 'Activo',
    dot: 'bg-emerald-400',
  },
  trialing: {
    bg: 'bg-amber-500/10 border-amber-500/20',
    text: 'text-amber-400',
    label: 'Prueba',
    dot: 'bg-amber-400',
  },
  past_due: {
    bg: 'bg-rose-500/10 border-rose-500/20',
    text: 'text-rose-400',
    label: 'Vencido',
    dot: 'bg-rose-400',
  },
  cancelled: {
    bg: 'bg-zinc-500/10 border-zinc-500/20',
    text: 'text-zinc-400',
    label: 'Cancelado',
    dot: 'bg-zinc-500',
  },
  paused: {
    bg: 'bg-yellow-500/10 border-yellow-500/20',
    text: 'text-yellow-400',
    label: 'Pausado',
    dot: 'bg-yellow-400',
  },
  pending_approval: {
    bg: 'bg-blue-500/10 border-blue-500/20',
    text: 'text-blue-400',
    label: 'Pendiente',
    dot: 'bg-blue-400',
  },
};

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.active;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${style.bg} ${style.text}`}
    >
      <span className={`inline-block w-1.5 h-1.5 rounded-full ${style.dot}`} />
      {style.label}
    </span>
  );
}

// ─── Plan badge ─────────────────────────────────────────────────────────

const PLAN_COLORS: Record<PlanKey, string> = {
  starter: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
  pro: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400',
  enterprise: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
};

function PlanBadge({ plan }: { plan: PlanKey }) {
  const planDef = SAAS_PLANS[plan];
  const color =
    PLAN_COLORS[plan] ?? 'bg-zinc-500/10 border-zinc-500/20 text-zinc-400';
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${color}`}
    >
      {planDef?.label ?? plan}
    </span>
  );
}

// ─── Format helpers ─────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatCurrency(cop: number): string {
  return `$${cop.toLocaleString()} COP`;
}

// ─── Filter options ─────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos los estados' },
  { value: 'active', label: 'Activo' },
  { value: 'trialing', label: 'Prueba' },
  { value: 'past_due', label: 'Vencido' },
  { value: 'cancelled', label: 'Cancelado' },
];

const PLAN_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'Todos los planes' },
  ...(Object.keys(SAAS_PLANS) as PlanKey[]).map((k) => ({
    value: k,
    label: SAAS_PLANS[k].label,
  })),
];

// ─── Props ──────────────────────────────────────────────────────────────

interface SubscriptionsTableProps {
  initialSubscriptions: SubscriptionRow[];
  total: number;
  pageSize: number;
}

export default function SubscriptionsTable({
  initialSubscriptions,
  total: initialTotal,
  pageSize,
}: SubscriptionsTableProps) {
  const router = useRouter();

  // Data state — synced from props via useEffect
  const [subscriptions, setSubscriptions] =
    useState<SubscriptionRow[]>(initialSubscriptions);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Filter state
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');

  // Modal state
  const [extendTrialSub, setExtendTrialSub] =
    useState<SubscriptionRow | null>(null);
  const [changePlanSub, setChangePlanSub] =
    useState<SubscriptionRow | null>(null);
  const [cancelConfirmSub, setCancelConfirmSub] =
    useState<SubscriptionRow | null>(null);
  const [reactivateConfirmSub, setReactivateConfirmSub] =
    useState<SubscriptionRow | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // ─── Sync from props on initial load / router.refresh() ──────────────

  useEffect(() => {
    setSubscriptions(initialSubscriptions);
    setTotal(initialTotal);
  }, [initialSubscriptions, initialTotal]);

  // ─── Fetch subscriptions ─────────────────────────────────────────────

  const fetchSubscriptions = useCallback(
    async (
      newPage: number,
      currentStatus: string,
      currentPlan: string,
      currentSearch: string,
    ) => {
      setLoading(true);
      setError(null);
      try {
        const result = await getSubscriptionsAction({
          status:
            currentStatus === 'all' ? undefined : currentStatus,
          planKey:
            currentPlan === 'all'
              ? undefined
              : (currentPlan as PlanKey | undefined),
          search: currentSearch || undefined,
          page: newPage,
          pageSize,
        });
        setSubscriptions(result.subscriptions);
        setTotal(result.total);
        setPage(newPage);
      } catch (err: unknown) {
        setError(
          (err as { message?: string }).message ??
            'Error al cargar suscripciones.',
        );
      } finally {
        setLoading(false);
      }
    },
    [pageSize],
  );

  const goToPage = useCallback(
    (p: number) => {
      fetchSubscriptions(p, statusFilter, planFilter, searchInput);
    },
    [fetchSubscriptions, statusFilter, planFilter, searchInput],
  );

  const applyFilters = useCallback(() => {
    fetchSubscriptions(1, statusFilter, planFilter, searchInput);
  }, [fetchSubscriptions, statusFilter, planFilter, searchInput]);

  const clearFilters = useCallback(() => {
    setSearchInput('');
    setStatusFilter('all');
    setPlanFilter('all');
    fetchSubscriptions(1, 'all', 'all', '');
  }, [fetchSubscriptions]);

  const hasActiveFilters =
    statusFilter !== 'all' || planFilter !== 'all' || !!searchInput;

  // ─── Row actions ────────────────────────────────────────────────────

  const handleCancel = useCallback(async () => {
    if (!cancelConfirmSub) return;
    setActionLoading(cancelConfirmSub.id);
    const result = await cancelSubscriptionAction(cancelConfirmSub.id);
    setCancelConfirmSub(null);
    setActionLoading(null);
    if (result.success) {
      router.refresh();
    } else {
      setError(result.error ?? 'Error al cancelar.');
    }
  }, [cancelConfirmSub, router]);

  const handleReactivate = useCallback(async () => {
    if (!reactivateConfirmSub) return;
    setActionLoading(reactivateConfirmSub.id);
    const result = await reactivateSubscriptionAction(reactivateConfirmSub.id);
    setReactivateConfirmSub(null);
    setActionLoading(null);
    if (result.success) {
      router.refresh();
    } else {
      setError(result.error ?? 'Error al reactivar.');
    }
  }, [reactivateConfirmSub, router]);

  // ─── Loading state (initial) ─────────────────────────────────────────

  if (loading && subscriptions.length === 0) {
    return (
      <div className="space-y-8 max-w-[1600px] mx-auto pb-20">
        <header className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-white/10 pb-6">
          <div>
            <h2 className="text-3xl font-bold text-white mb-1 flex items-center gap-2">
              <Receipt className="text-blue-500" /> Suscripciones
            </h2>
            <p className="text-white/50 text-sm">
              Gestión de suscripciones SaaS — filtros, acciones y cambios de
              plan
            </p>
          </div>
        </header>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-8 text-blue-400 animate-spin" />
          <span className="text-zinc-400 ml-3">Cargando suscripciones...</span>
        </div>
      </div>
    );
  }

  // ─── Error state (no data yet) ───────────────────────────────────────

  if (error && subscriptions.length === 0) {
    return (
      <div className="space-y-8 max-w-[1600px] mx-auto pb-20">
        <header className="flex flex-col gap-2 border-b border-white/10 pb-6">
          <h2 className="text-3xl font-bold text-white mb-1 flex items-center gap-2">
            <Receipt className="text-blue-500" /> Suscripciones
          </h2>
          <p className="text-white/50 text-sm">
            Gestión de suscripciones SaaS — filtros, acciones y cambios de plan
          </p>
        </header>
        <div className="bg-white/5 border border-white/10 rounded-[var(--radius-squircle-2xl)] p-12 text-center">
          <AlertCircle className="mx-auto text-rose-500 size-12 mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">
            Error al cargar suscripciones
          </h3>
          <p className="text-zinc-400 text-sm mb-4">{error}</p>
          <Button
            onClick={() => fetchSubscriptions(1, 'all', 'all', '')}
            variant="outline"
            className="border-white/10 text-zinc-300 hover:text-white"
          >
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  // ─── Empty state ─────────────────────────────────────────────────────

  if (!loading && subscriptions.length === 0 && !hasActiveFilters) {
    return (
      <div className="space-y-8 max-w-[1600px] mx-auto pb-20">
        <header className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-white/10 pb-6">
          <div>
            <h2 className="text-3xl font-bold text-white mb-1 flex items-center gap-2">
              <Receipt className="text-blue-500" /> Suscripciones
            </h2>
            <p className="text-white/50 text-sm">
              Gestión de suscripciones SaaS — filtros, acciones y cambios de
              plan
            </p>
          </div>
        </header>
        <div className="bg-white/5 border border-white/10 rounded-[var(--radius-squircle-2xl)] p-12 text-center">
          <Database className="mx-auto text-zinc-600 size-12 mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">
            No hay suscripciones aún
          </h3>
          <p className="text-zinc-400 text-sm">
            Cuando los hoteles se activen o comiencen períodos de prueba, sus
            suscripciones aparecerán aquí.
          </p>
        </div>
      </div>
    );
  }

  // ─── Main render ─────────────────────────────────────────────────────

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pb-20">
      {/* HEADER */}
      <header className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-white/10 pb-6">
        <div>
          <h2 className="text-3xl font-bold text-white mb-1 flex items-center gap-2">
            <Receipt className="text-blue-500" /> Suscripciones
          </h2>
          <p className="text-white/50 text-sm">
            Gestión de suscripciones SaaS — filtros, acciones y cambios de plan
          </p>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/20 px-4 py-2 rounded-[var(--radius-squircle-lg)] text-blue-400 text-xs font-bold uppercase flex items-center gap-2">
          <Receipt size={14} />
          Total: {total}
        </div>
      </header>

      {/* ERROR BANNER */}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-[var(--radius-squircle-lg)] px-4 py-3 flex items-center gap-2">
          <AlertCircle className="size-4 text-rose-400 shrink-0" />
          <p className="text-rose-400 text-xs flex-1">{error}</p>
          <button
            onClick={() => setError(null)}
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
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') applyFilters();
            }}
            placeholder="Buscar por nombre de hotel..."
            className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-zinc-500"
          />
        </div>

        {/* Status filter */}
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v)}
        >
          <SelectTrigger className="w-[170px] bg-white/5 border-white/10 text-white">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent className="bg-card border-white/10">
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-white">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Plan filter */}
        <Select value={planFilter} onValueChange={(v) => setPlanFilter(v)}>
          <SelectTrigger className="w-[170px] bg-white/5 border-white/10 text-white">
            <SelectValue placeholder="Plan" />
          </SelectTrigger>
          <SelectContent className="bg-card border-white/10">
            {PLAN_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-white">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Apply */}
        <Button
          onClick={applyFilters}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-500 text-white gap-2"
        >
          <Search className="size-4" />
          Aplicar
        </Button>

        {/* Clear */}
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
      </div>

      {/* TABLE */}
      <div className="bg-white/5 border border-white/10 rounded-[var(--radius-squircle-2xl)] overflow-hidden overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.02]">
              <th className="px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                Hotel
              </th>
              <th className="px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                Plan
              </th>
              <th className="px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                Estado
              </th>
              <th className="px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                MRR
              </th>
              <th className="px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                Período hasta
              </th>
              <th className="px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                Cancelando
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
              subscriptions.map((sub) => {
                const planDef = SAAS_PLANS[sub.plan_key];
                const mrr = planDef?.priceCOP ?? 0;
                const isCancelling = sub.cancel_at_period_end;
                const isTrialing = sub.status === 'trialing';

                return (
                  <tr
                    key={sub.id}
                    className="hover:bg-white/[0.02] transition-colors"
                  >
                    {/* Hotel */}
                    <td className="px-4 py-3 text-white font-medium max-w-[200px] truncate">
                      <span className="flex items-center gap-1.5">
                        <Building2 className="size-3 text-zinc-600 shrink-0" />
                        {sub.hotel_name || '—'}
                      </span>
                    </td>

                    {/* Plan */}
                    <td className="px-4 py-3">
                      <PlanBadge plan={sub.plan_key} />
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <StatusBadge status={sub.status} />
                    </td>

                    {/* MRR */}
                    <td className="px-4 py-3 text-zinc-300 font-mono text-xs tabular-nums">
                      <span className="flex items-center gap-1">
                        <DollarSign className="size-3 text-zinc-500" />
                        {formatCurrency(mrr)}
                      </span>
                    </td>

                    {/* Period end */}
                    <td className="px-4 py-3 text-zinc-400 text-xs whitespace-nowrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="size-3 text-zinc-600" />
                        {formatDate(sub.current_period_end)}
                      </span>
                    </td>

                    {/* Cancel at period end */}
                    <td className="px-4 py-3">
                      {isCancelling ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border bg-rose-500/10 border-rose-500/20 text-rose-400">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-400" />
                          Sí
                        </span>
                      ) : (
                        <span className="text-zinc-600 text-xs">—</span>
                      )}
                    </td>

                    {/* Created at */}
                    <td className="px-4 py-3 text-zinc-500 text-xs whitespace-nowrap">
                      {formatDate(sub.created_at)}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {actionLoading === sub.id ? (
                          <Loader2 className="size-4 text-blue-400 animate-spin" />
                        ) : (
                          <>
                            {/* Cancel */}
                            {!isCancelling &&
                              sub.status !== 'cancelled' && (
                                <Button
                                  variant="ghost"
                                  size="icon-xs"
                                  onClick={() => setCancelConfirmSub(sub)}
                                  className="text-zinc-400 hover:text-rose-400"
                                  title="Cancelar suscripción"
                                >
                                  <XCircle className="size-3.5" />
                                </Button>
                              )}

                            {/* Reactivate */}
                            {isCancelling && (
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                onClick={() => setReactivateConfirmSub(sub)}
                                className="text-zinc-400 hover:text-emerald-400"
                                title="Reactivar suscripción"
                              >
                                <RotateCcw className="size-3.5" />
                              </Button>
                            )}

                            {/* Extend Trial */}
                            {isTrialing && (
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                onClick={() => setExtendTrialSub(sub)}
                                className="text-zinc-400 hover:text-amber-400"
                                title="Extender prueba"
                              >
                                <Clock className="size-3.5" />
                              </Button>
                            )}

                            {/* Change Plan */}
                            {sub.status !== 'cancelled' && (
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                onClick={() => setChangePlanSub(sub)}
                                className="text-zinc-400 hover:text-indigo-400"
                                title="Cambiar plan"
                              >
                                <ArrowLeftRight className="size-3.5" />
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

            {/* Empty results after filter */}
            {!loading && subscriptions.length === 0 && hasActiveFilters && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center">
                  <Search className="mx-auto text-zinc-600 size-8 mb-3" />
                  <p className="text-zinc-400 text-sm">
                    No hay suscripciones que coincidan con los filtros.
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
            Página {page} de {totalPages} ({total} suscripciones)
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => goToPage(page - 1)}
              className="border-white/10 text-zinc-400 hover:text-white disabled:opacity-30"
            >
              <ChevronLeft className="size-4" />
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || loading}
              onClick={() => goToPage(page + 1)}
              className="border-white/10 text-zinc-400 hover:text-white disabled:opacity-30"
            >
              Siguiente
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ─── MODALS ───────────────────────────────────────────────────── */}

      {/* Cancel confirmation */}
      <Dialog
        open={!!cancelConfirmSub}
        onOpenChange={() => setCancelConfirmSub(null)}
      >
        <DialogContent
          className="sm:max-w-md bg-card border border-white/10 rounded-[var(--radius-squircle-2xl)]"
          showCloseButton
        >
          <DialogHeader>
            <DialogTitle className="text-white text-lg font-bold flex items-center gap-2">
              <XCircle className="size-5 text-rose-400" />
              Cancelar Suscripción
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              ¿Estás seguro de que querés cancelar la suscripción de{' '}
              <span className="text-white font-medium">
                {cancelConfirmSub?.hotel_name || 'este hotel'}
              </span>
              ? El acceso se mantendrá hasta el fin del período actual.
            </DialogDescription>
          </DialogHeader>
          {cancelConfirmSub && (
            <div className="bg-white/5 border border-white/10 rounded-[var(--radius-squircle-lg)] p-3">
              <p className="text-white font-semibold">
                {cancelConfirmSub.hotel_name}
              </p>
              <p className="text-zinc-400 text-xs mt-1">
                Plan:{' '}
                {SAAS_PLANS[cancelConfirmSub.plan_key]?.label ??
                  cancelConfirmSub.plan_key}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCancelConfirmSub(null)}
              disabled={!!actionLoading}
              className="border-white/10 text-zinc-400 hover:text-white"
            >
              Volver
            </Button>
            <Button
              onClick={handleCancel}
              disabled={!!actionLoading}
              className="bg-rose-600 hover:bg-rose-500 text-white gap-2"
            >
              <XCircle className="size-4" />
              Confirmar Cancelación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reactivate confirmation */}
      <Dialog
        open={!!reactivateConfirmSub}
        onOpenChange={() => setReactivateConfirmSub(null)}
      >
        <DialogContent
          className="sm:max-w-md bg-card border border-white/10 rounded-[var(--radius-squircle-2xl)]"
          showCloseButton
        >
          <DialogHeader>
            <DialogTitle className="text-white text-lg font-bold flex items-center gap-2">
              <RotateCcw className="size-5 text-emerald-400" />
              Reactivar Suscripción
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              ¿Querés reactivar la suscripción de{' '}
              <span className="text-white font-medium">
                {reactivateConfirmSub?.hotel_name || 'este hotel'}
              </span>
              ? Se eliminará la cancelación pendiente y el estado volverá a
              activo.
            </DialogDescription>
          </DialogHeader>
          {reactivateConfirmSub && (
            <div className="bg-white/5 border border-white/10 rounded-[var(--radius-squircle-lg)] p-3">
              <p className="text-white font-semibold">
                {reactivateConfirmSub.hotel_name}
              </p>
              <p className="text-zinc-400 text-xs mt-1">
                Plan:{' '}
                {SAAS_PLANS[reactivateConfirmSub.plan_key]?.label ??
                  reactivateConfirmSub.plan_key}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReactivateConfirmSub(null)}
              disabled={!!actionLoading}
              className="border-white/10 text-zinc-400 hover:text-white"
            >
              Volver
            </Button>
            <Button
              onClick={handleReactivate}
              disabled={!!actionLoading}
              className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2"
            >
              <RotateCcw className="size-4" />
              Reactivar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Extend Trial Modal */}
      {extendTrialSub && (
        <ExtendTrialModal
          open={!!extendTrialSub}
          onOpenChange={(open) => {
            if (!open) setExtendTrialSub(null);
          }}
          subscriptionId={extendTrialSub.id}
          currentTrialEnd={extendTrialSub.current_period_end}
          hotelName={extendTrialSub.hotel_name || 'Hotel'}
        />
      )}

      {/* Change Plan Modal */}
      {changePlanSub && (
        <ChangePlanModal
          open={!!changePlanSub}
          onOpenChange={(open) => {
            if (!open) setChangePlanSub(null);
          }}
          subscriptionId={changePlanSub.id}
          currentPlan={changePlanSub.plan_key}
          hotelName={changePlanSub.hotel_name || 'Hotel'}
        />
      )}
    </div>
  );
}
