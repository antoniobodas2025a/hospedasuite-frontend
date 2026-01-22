import React from 'react';
import { LogOut } from 'lucide-react';
import NavButton from '../ui/NavButton'; //
import { MENU_ITEMS } from '../../config/menuItems'; // 👈 Importamos la configuración

const Sidebar = ({ hotelInfo, activeTab, setActiveTab, onLogout }) => {
  return (
    <aside className='hidden md:flex w-72 bg-[#010512] text-slate-300 flex-col shadow-2xl z-20 rounded-r-[2rem] my-4 ml-4 h-[calc(100vh-2rem)] border-r border-slate-800'>
      {/* HEADER DEL HOTEL */}
      <div className='p-8 border-b border-[#444] flex items-center gap-4'>
        <div className='w-10 h-10 rounded-full bg-cyan-600 text-white flex items-center justify-center font-serif font-bold text-lg shadow-lg shadow-cyan-500/30'>
          H
        </div>
        <div className='overflow-hidden'>
          <h2 className='font-serif font-bold text-lg truncate leading-tight'>
            {hotelInfo?.name || 'Hotel'}
          </h2>
          <p className='text-[10px] text-gray-400 uppercase tracking-widest'>
            Administración
          </p>
        </div>
      </div>

      {/* NAVEGACIÓN AUTOMÁTICA (Bucle Map) */}
      <nav className='flex-1 p-6 space-y-3 overflow-y-auto custom-scrollbar'>
        {MENU_ITEMS.map((item) => (
          <NavButton
            key={item.id}
            icon={<item.icon size={18} />}
            label={item.label}
            active={activeTab === item.id}
            onClick={() => setActiveTab(item.id)}
          />
        ))}
      </nav>

      {/* FOOTER */}
      <div className='p-6 border-t border-[#222]'>
        <button
          onClick={onLogout}
          className='flex items-center gap-3 text-[#E5E0D8] hover:text-[#8C3A3A] transition-colors text-sm font-bold w-full'
        >
          <LogOut size={18} /> Cerrar Sesión
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
