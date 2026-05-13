'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut, Calculator, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import NavButton from '../ui/NavButton';
import { MENU_GROUPS } from '@/config/menuItems';
import { logout } from '@/app/actions/auth';
import ShiftReportModal from '@/components/modals/ShiftReportModal';

interface MenuItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  color?: string;
}

export interface SidebarViewProps {
  hotelName: string;
  user?: {
    id: string;
    email?: string;
  };
  currentPath: string;
  onLogout: () => void;
  onOpenShiftModal: () => void;
}

interface SidebarProps {
  hotelName?: string;
  user?: {
    id: string;
    email?: string;
  };
}

const SidebarView: React.FC<SidebarViewProps> = ({
  hotelName,
  user,
  currentPath,
  onLogout,
  onOpenShiftModal
}) => {
  return (
    <aside className="hidden md:flex w-72 glass-panel text-sidebar-foreground flex-col shadow-2xl z-20 rounded-r-[var(--radius-squircle-3xl)] my-4 ml-4 h-[calc(100vh-2rem)] sticky top-4">
      {/* Hotel Brand Context */}
      <div className="p-8 border-b border-border flex items-center gap-4">
        <div className="size-10 rounded-[var(--radius-squircle-lg)] bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/20">
          {hotelName?.[0] || 'H'}
        </div>
        <div className="flex flex-col min-w-0">
          <h1 className="font-bold text-sidebar-foreground truncate text-sm tracking-tight">{hotelName}</h1>
          <p className="text-[10px] text-muted-foreground font-mono tracking-widest uppercase">Panel Principal</p>
        </div>
      </div>

      {/* Navegación agrupada — Ley de Miller: 4 chunks */}
      <nav className="flex-1 p-6 overflow-y-auto custom-scrollbar space-y-6">
        {MENU_GROUPS.map((group) => {
          const hasActive = group.items.some(item =>
            currentPath === item.href || (currentPath.startsWith(item.href) && item.href !== '/dashboard')
          );

          return (
            <div key={group.id}>
              {/* Section header — only visible when group has active item or on hover */}
              <h2 className={cn(
                "text-[10px] font-bold uppercase tracking-widest mb-2 px-4 transition-colors duration-200",
                hasActive ? "text-brand-400" : "text-muted-foreground/40"
              )}>
                {group.label}
              </h2>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive = currentPath === item.href || (currentPath.startsWith(item.href) && item.href !== '/dashboard');
                  const showBadge = item.id === 'housekeeping';

                  return (
                    <Link key={item.id} href={item.href} className="block group relative">
                      <NavButton
                        icon={<item.icon className={cn("size-4.5 stroke-[1.5]", isActive ? "text-brand-400" : "text-muted-foreground group-hover:text-sidebar-foreground")} />}
                        label={item.label}
                        active={isActive}
                      />
                      {showBadge && (
                        <span
                          className="absolute right-4 top-1/2 -translate-y-1/2 size-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)] animate-pulse"
                          aria-hidden="true"
                        />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Acciones de Sistema */}
      <div className="p-6 border-t border-border space-y-1">
        <button
          onClick={onOpenShiftModal}
          className="flex items-center gap-3 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-accent transition-all text-xs font-semibold w-full px-4 py-3 rounded-[var(--radius-squircle-lg)] group"
        >
          <Calculator className="size-4.5 stroke-[1.5] text-success/70 group-hover:text-success" />
          Cierre de Turno
        </button>

        <button
          onClick={onLogout}
          className="flex items-center gap-3 text-sidebar-foreground/70 hover:text-destructive hover:bg-destructive/5 transition-all text-xs font-semibold w-full px-4 py-3 rounded-[var(--radius-squircle-lg)] group"
        >
          <LogOut className="size-4.5 stroke-[1.5] group-hover:translate-x-1 transition-transform" />
          Finalizar Sesión
        </button>

        {/* User Identity Chip */}
        <div className="mt-4 px-4 py-3 rounded-[var(--radius-squircle-xl)] bg-muted border border-border flex items-center gap-3">
          <div className="size-7 rounded-full bg-sidebar-accent flex items-center justify-center text-[10px] font-bold text-sidebar-accent-foreground border border-border">
            {user?.email?.[0].toUpperCase() || 'U'}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] text-sidebar-foreground/70 font-medium truncate">{user?.email}</span>
            <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-tighter">Plan Pro</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default function Sidebar({ hotelName = 'HospedaSuite', user }: SidebarProps) {
  const pathname = usePathname();
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error durante la terminación de sesión:', error);
    }
  };

  return (
    <>
      <SidebarView
        hotelName={hotelName}
        user={user}
        currentPath={pathname}
        onLogout={handleLogout}
        onOpenShiftModal={() => setIsShiftModalOpen(true)}
      />

      <ShiftReportModal
        isOpen={isShiftModalOpen}
        onClose={() => setIsShiftModalOpen(false)}
      />
    </>
  );
}
