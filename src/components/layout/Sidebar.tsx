'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut, Calculator } from 'lucide-react';
import NavButton from '../ui/NavButton';
import { MENU_ITEMS } from '@/config/menuItems';
import { logout } from '@/app/actions/auth';
import ShiftReportModal from '@/components/modals/ShiftReportModal';

interface SidebarProps {
  hotelName?: string;
  // 🚨 Añadimos el usuario plano para mantener compatibilidad con layout.tsx
  user?: {
    id: string;
    email?: string;
  };
}

const Sidebar = ({ hotelName = 'HospedaSuite', user }: SidebarProps) => {
  const pathname = usePathname();
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);

  return (
    <aside className='hidden md:flex w-72 bg-hospeda-950 text-slate-300 flex-col shadow-2xl z-20 rounded-r-[2rem] my-4 ml-4 h-[calc(100vh-2rem)] border-r border-slate-800 sticky top-4'>
      {/* HEADER DEL HOTEL */}
      <div className='p-8 border-b border-white/5 flex items-center gap-4'>
        <div className='w-10 h-10 rounded-full bg-hospeda-600 text-white flex items-center justify-center font-display font-bold text-lg shadow-lg shadow-hospeda-500/30'>
          {hotelName.charAt(0)}
        </div>
        <div className='overflow-hidden'>
          <h2 className='font-display font-bold text-lg truncate leading-tight text-white'>
            {hotelName}
          </h2>
          <p className='text-[10px] text-hospeda-400 uppercase tracking-widest'>
            Panel Forense
          </p>
        </div>
      </div>

      {/* NAVEGACIÓN AUTOMÁTICA */}
      <nav className='flex-1 p-6 space-y-2 overflow-y-auto custom-scrollbar'>
        {MENU_ITEMS.map((item) => {
          const isActive =
            pathname === item.href ||
            (pathname.startsWith(item.href) && item.href !== '/dashboard');

          return (
            <Link key={item.id} href={item.href} className='block'>
              <NavButton icon={<item.icon size={18} />} label={item.label} active={isActive} />
            </Link>
          );
        })}
      </nav>

      {/* FOOTER - ACCIONES GLOBALES */}
      <div className='p-6 border-t border-white/5 space-y-2'>
        
        {/* BOTÓN DE ARQUEO DE CAJA */}
        <button
          onClick={() => setIsShiftModalOpen(true)}
          className='flex items-center gap-3 text-slate-400 hover:text-white hover:bg-white/5 transition-colors text-sm font-bold w-full px-4 py-3 rounded-xl'
        >
          <Calculator size={18} /> Cierre de Turno
        </button>

        {/* LOGOUT SEGURO */}
        <button
          onClick={() => logout()}
          className='flex items-center gap-3 text-slate-400 hover:text-red-400 transition-colors text-sm font-bold w-full px-4 py-3 hover:bg-red-500/10 rounded-xl'
        >
          <LogOut size={18} /> Cerrar Sesión
        </button>
      </div>

      {/* MODAL DE ARQUEO INYECTADO */}
      <ShiftReportModal isOpen={isShiftModalOpen} onClose={() => setIsShiftModalOpen(false)} />
    </aside>
  );
};

export default Sidebar;