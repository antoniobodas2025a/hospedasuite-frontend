'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut, Calculator, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import NavButton from '../ui/NavButton';
import { MENU_ITEMS } from '@/config/menuItems';
import { logout } from '@/app/actions/auth';
import ShiftReportModal from '@/components/modals/ShiftReportModal';

// ==========================================
// BLOQUE 1: INTERFACES ESTRICTAS (Co-Location)
// ==========================================

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
  menuItems: MenuItem[];
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

// ==========================================
// BLOQUE 2: COMPONENTE PRESENTACIONAL (UI Claude 2026)
// ==========================================

const SidebarView: React.FC<SidebarViewProps> = ({
  hotelName,
  user,
  menuItems,
  currentPath,
  onLogout,
  onOpenShiftModal
}) => {
  return (
    <aside className="hidden md:flex w-72 bg-[#09090b]/80 backdrop-blur-xl text-zinc-300 flex-col shadow-2xl z-20 rounded-r-3xl my-4 ml-4 h-[calc(100vh-2rem)] border border-white/5 sticky top-4">
      {/* Hotel Brand Context */}
      <div className="p-8 border-b border-white/5 flex items-center gap-4">
        <div className="size-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/20">
          {hotelName?.[0] || 'H'}
        </div>
        <div className="flex flex-col min-w-0">
          <h1 className="font-bold text-zinc-100 truncate text-sm tracking-tight">{hotelName}</h1>
          <p className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase">Admin Terminal</p>
        </div>
      </div>

      {/* Navegación de Telemetría */}
      <nav className="flex-1 p-6 space-y-1.5 overflow-y-auto custom-scrollbar">
        {menuItems.map((item) => {
          const isActive = currentPath === item.href || (currentPath.startsWith(item.href) && item.href !== '/dashboard');
          return (
            <Link key={item.id} href={item.href} className="block group">
              <NavButton 
                icon={<item.icon className={cn("size-4.5 stroke-[1.5]", isActive ? "text-indigo-400" : "text-zinc-500 group-hover:text-zinc-300")} />} 
                label={item.label} 
                active={isActive} 
              />
            </Link>
          );
        })}
      </nav>

      {/* Acciones de Sistema */}
      <div className="p-6 border-t border-white/5 space-y-1">
        <button
          onClick={onOpenShiftModal}
          className="flex items-center gap-3 text-zinc-400 hover:text-zinc-100 hover:bg-white/5 transition-all text-xs font-semibold w-full px-4 py-3 rounded-xl group"
        >
          <Calculator className="size-4.5 stroke-[1.5] text-emerald-500/70 group-hover:text-emerald-400" /> 
          Cierre de Turno
        </button>

        <button
          onClick={onLogout}
          className="flex items-center gap-3 text-zinc-400 hover:text-red-400 hover:bg-red-500/5 transition-all text-xs font-semibold w-full px-4 py-3 rounded-xl group"
        >
          <LogOut className="size-4.5 stroke-[1.5] group-hover:translate-x-1 transition-transform" /> 
          Finalizar Sesión
        </button>

        {/* User Identity Chip */}
        <div className="mt-4 px-4 py-3 rounded-2xl bg-zinc-800/30 border border-white/5 flex items-center gap-3">
          <div className="size-7 rounded-full bg-zinc-700 flex items-center justify-center text-[10px] font-bold text-zinc-400 border border-white/10">
            {user?.email?.[0].toUpperCase() || 'U'}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] text-zinc-400 font-medium truncate">{user?.email}</span>
            <span className="text-[9px] text-zinc-600 uppercase font-bold tracking-tighter">Plan Pro</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

// ==========================================
// BLOQUE 3: COMPONENTE CONTENEDOR (Máquina de Estados)
// ==========================================

export default function Sidebar({ hotelName = 'HospedaSuite', user }: SidebarProps) {
  const pathname = usePathname();
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);

  // Lógica Forense: Orquestación segura del cierre de sesión
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
        menuItems={MENU_ITEMS}
        currentPath={pathname}
        onLogout={handleLogout}
        onOpenShiftModal={() => setIsShiftModalOpen(true)}
      />

      {/* Renderizado Adyacente (Previene recortes Z-Index en el aside) */}
      <ShiftReportModal 
        isOpen={isShiftModalOpen} 
        onClose={() => setIsShiftModalOpen(false)} 
      />
    </>
  );
}