'use client';

import React, { useState, useCallback, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { revokeSuperadminRoleAction } from '@/app/actions/super-admin';
import type { UserRoleRow } from '@/data/billing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import GrantRoleModal from './GrantRoleModal';
import CreateSuperadminModal from './CreateSuperadminModal';
import {
  Users,
  Search,
  ShieldCheck,
  ShieldOff,
  UserPlus,
  Loader2,
  AlertTriangle,
  Database,
  Building2,
  Mail,
  Calendar,
} from 'lucide-react';

// ─── Role badge ─────────────────────────────────────────────────────────

const ROLE_STYLES: Record<
  string,
  { bg: string; text: string; label: string; dot: string }
> = {
  superadmin: {
    bg: 'bg-purple-500/10 border-purple-500/20',
    text: 'text-purple-400',
    label: 'Superadmin',
    dot: 'bg-purple-400',
  },
  owner: {
    bg: 'bg-blue-500/10 border-blue-500/20',
    text: 'text-blue-400',
    label: 'Dueño',
    dot: 'bg-blue-400',
  },
  admin: {
    bg: 'bg-emerald-500/10 border-emerald-500/20',
    text: 'text-emerald-400',
    label: 'Admin',
    dot: 'bg-emerald-400',
  },
  staff: {
    bg: 'bg-zinc-500/10 border-zinc-500/20',
    text: 'text-zinc-400',
    label: 'Staff',
    dot: 'bg-zinc-500',
  },
};

function RoleBadge({ role }: { role: string }) {
  const style = ROLE_STYLES[role] ?? ROLE_STYLES.staff;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${style.bg} ${style.text}`}
    >
      <span className={`inline-block w-1.5 h-1.5 rounded-full ${style.dot}`} />
      {style.label}
    </span>
  );
}

// ─── Format helpers ────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// ─── Props ──────────────────────────────────────────────────────────────

interface UsersTableProps {
  initialUsers: UserRoleRow[];
}

export default function UsersTable({ initialUsers }: UsersTableProps) {
  const router = useRouter();
  const [isPending] = useTransition();

  // Data
  const [users] = useState<UserRoleRow[]>(initialUsers);

  // Search (client-side filter by email)
  const [searchTerm, setSearchTerm] = useState('');

  // Action loading
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [grantModalOpen, setGrantModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Revoke confirmation
  const [revokeTarget, setRevokeTarget] = useState<UserRoleRow | null>(null);

  // ─── Filtered users ─────────────────────────────────────────────────

  const filteredUsers = searchTerm
    ? users.filter((u) =>
        (u.email ?? '').toLowerCase().includes(searchTerm.toLowerCase()),
      )
    : users;

  // ─── Revoke handler ─────────────────────────────────────────────────

  const handleRevoke = useCallback(async () => {
    if (!revokeTarget) return;
    setRevokingId(revokeTarget.user_id);
    setError(null);
    const result = await revokeSuperadminRoleAction(revokeTarget.user_id);
    setRevokeTarget(null);
    setRevokingId(null);
    if (result.success) {
      router.refresh();
    } else {
      setError(result.error ?? 'Error al revocar el rol.');
    }
  }, [revokeTarget, router]);

  // ─── Loading state ─────────────────────────────────────────────────

  if (users.length === 0) {
    return (
      <div className="space-y-8 max-w-[1600px] mx-auto pb-20">
        <header className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-white/10 pb-6">
          <div>
            <h2 className="text-3xl font-bold text-white mb-1 flex items-center gap-2">
              <Users className="text-blue-500" /> Usuarios
            </h2>
            <p className="text-white/50 text-sm">
              Gestión de usuarios y roles del sistema
            </p>
          </div>
        </header>
        <div className="bg-white/5 border border-white/10 rounded-[var(--radius-squircle-2xl)] p-12 text-center">
          <Database className="mx-auto text-zinc-600 size-12 mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">
            No hay usuarios registrados
          </h3>
          <p className="text-zinc-400 text-sm mb-6">
            Cuando se creen usuarios en el sistema, aparecerán aquí con sus
            roles.
          </p>
          <Button
            onClick={() => setCreateModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2"
          >
            <UserPlus className="size-4" />
            Crear Primer Superadmin
          </Button>
        </div>

        <CreateSuperadminModal
          open={createModalOpen}
          onOpenChange={setCreateModalOpen}
        />
      </div>
    );
  }

  // ─── Main render ────────────────────────────────────────────────────

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pb-20">
      {/* HEADER */}
      <header className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-white/10 pb-6">
        <div>
          <h2 className="text-3xl font-bold text-white mb-1 flex items-center gap-2">
            <Users className="text-blue-500" /> Usuarios
          </h2>
          <p className="text-white/50 text-sm">
            Gestión de usuarios y roles del sistema
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-blue-500/10 border border-blue-500/20 px-4 py-2 rounded-[var(--radius-squircle-lg)] text-blue-400 text-xs font-bold uppercase flex items-center gap-2">
            <Users size={14} />
            Total: {users.length}
          </div>
          <Button
            onClick={() => setGrantModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white gap-2"
          >
            <ShieldCheck className="size-4" />
            Otorgar Rol
          </Button>
          <Button
            onClick={() => setCreateModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2"
          >
            <UserPlus className="size-4" />
            Crear Superadmin
          </Button>
        </div>
      </header>

      {/* ERROR BANNER */}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-[var(--radius-squircle-lg)] px-4 py-3 flex items-center gap-2">
          <AlertTriangle className="size-4 text-rose-400 shrink-0" />
          <p className="text-rose-400 text-xs flex-1">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-rose-300 text-xs hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>
      )}

      {/* SEARCH */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[250px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por email..."
            className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-zinc-500"
          />
        </div>
        {searchTerm && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSearchTerm('')}
            className="text-zinc-400 hover:text-white"
          >
            Limpiar
          </Button>
        )}
      </div>

      {/* TABLE */}
      <div className="bg-white/5 border border-white/10 rounded-[var(--radius-squircle-2xl)] overflow-hidden overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.02]">
              <th className="px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                Email
              </th>
              <th className="px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                Rol
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
            {filteredUsers.map((u) => {
              const isSuperadmin = u.role === 'superadmin';
              const isOwner = u.role === 'owner';

              return (
                <tr
                  key={u.id}
                  className="hover:bg-white/[0.02] transition-colors"
                >
                  {/* Email */}
                  <td className="px-4 py-3 text-white font-medium max-w-[280px] truncate">
                    <span className="flex items-center gap-1.5">
                      <Mail className="size-3 text-zinc-600 shrink-0" />
                      {u.email || '—'}
                    </span>
                  </td>

                  {/* Role */}
                  <td className="px-4 py-3">
                    <RoleBadge role={u.role} />
                  </td>

                  {/* Hotel (only for owners) */}
                  <td className="px-4 py-3 text-zinc-400 text-xs max-w-[180px] truncate">
                    {isOwner && u.hotel_name ? (
                      <span className="flex items-center gap-1.5">
                        <Building2 className="size-3 text-zinc-600 shrink-0" />
                        {u.hotel_name}
                      </span>
                    ) : (
                      <span className="text-zinc-600">—</span>
                    )}
                  </td>

                  {/* Created at */}
                  <td className="px-4 py-3 text-zinc-500 text-xs whitespace-nowrap">
                    <span className="flex items-center gap-1">
                      <Calendar className="size-3 text-zinc-600" />
                      {formatDate(u.created_at)}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {revokingId === u.user_id ? (
                        <Loader2 className="size-4 text-rose-400 animate-spin" />
                      ) : (
                        <>
                          {/* Revoke superadmin */}
                          {isSuperadmin && (
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => setRevokeTarget(u)}
                              className="text-zinc-400 hover:text-rose-400"
                              title="Revocar rol superadmin"
                            >
                              <ShieldOff className="size-3.5" />
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}

            {/* Empty search results */}
            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center">
                  <Search className="mx-auto text-zinc-600 size-8 mb-3" />
                  <p className="text-zinc-400 text-sm">
                    No hay usuarios que coincidan con &quot;{searchTerm}&quot;.
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearchTerm('')}
                    className="mt-2 text-zinc-400 hover:text-white"
                  >
                    Limpiar búsqueda
                  </Button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ─── MODALS ───────────────────────────────────────────────────── */}

      {/* Grant Role Modal */}
      <GrantRoleModal
        open={grantModalOpen}
        onOpenChange={setGrantModalOpen}
      />

      {/* Create Superadmin Modal */}
      <CreateSuperadminModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
      />

      {/* Revoke Confirmation Dialog */}
      <Dialog
        open={!!revokeTarget}
        onOpenChange={() => setRevokeTarget(null)}
      >
        <DialogContent
          className="sm:max-w-md bg-card border border-white/10 rounded-[var(--radius-squircle-2xl)]"
          showCloseButton
        >
          <DialogHeader>
            <DialogTitle className="text-white text-lg font-bold flex items-center gap-2">
              <ShieldOff className="size-5 text-rose-400" />
              Revocar Rol Superadmin
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              ¿Estás seguro de que querés revocar el rol de superadministrador
              de este usuario? Perderá acceso al panel de administración.
            </DialogDescription>
          </DialogHeader>

          {revokeTarget && (
            <div className="bg-white/5 border border-white/10 rounded-[var(--radius-squircle-lg)] p-3">
              <p className="text-white font-semibold flex items-center gap-2">
                <Mail className="size-3.5 text-zinc-400" />
                {revokeTarget.email || '(sin email)'}
              </p>
              <p className="text-zinc-400 text-xs mt-1">
                Rol actual: <RoleBadge role={revokeTarget.role} />
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRevokeTarget(null)}
              disabled={!!revokingId}
              className="border-white/10 text-zinc-400 hover:text-white"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleRevoke}
              disabled={!!revokingId || isPending}
              className="bg-rose-600 hover:bg-rose-500 text-white gap-2"
            >
              <ShieldOff className="size-4" />
              Revocar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
