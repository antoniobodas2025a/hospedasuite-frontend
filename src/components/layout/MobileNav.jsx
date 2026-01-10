import React, { useState } from 'react';
import {
  Calendar,
  UtensilsCrossed,
  Loader2,
  Mic,
  ScanBarcode,
  Menu,
  X,
  Users,
  Box,
  Megaphone,
  Settings,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Agrega "onOpenRoomService" a la lista de props
const MobileNav = ({
  activeTab,
  setActiveTab,
  voiceAction,
  isListening,
  isProcessing,
  onOpenScanner,
  onOpenRoomService,
}) => {
  const [showMenu, setShowMenu] = useState(false);

  // Módulos que irán dentro del Menú Desplegable
  const menuItems = [
    // 👇👇👇 NUEVO MÓDULO: CARTA DIGITAL 👇👇👇
    {
      id: 'menu', // Esto activará setActiveTab('menu') en DashboardPage
      label: 'Carta Digital',
      icon: UtensilsCrossed, // Reutilizamos el icono de comida para coherencia
      color: 'text-orange-500',
      bg: 'bg-orange-50',
    },
    // 👆👆👆 FIN DEL NUEVO MÓDULO 👆👆👆

    {
      id: 'inventory',
      label: 'Inventario',
      icon: Box,
      color: 'text-blue-500',
      bg: 'bg-blue-50',
    },
    {
      id: 'guests',
      label: 'Huéspedes',
      icon: Users,
      color: 'text-purple-500',
      bg: 'bg-purple-50',
    },
    {
      id: 'leads',
      label: 'Marketing',
      icon: Megaphone,
      color: 'text-green-500',
      bg: 'bg-green-50',
    },
    {
      id: 'settings',
      label: 'Ajustes',
      icon: Settings,
      color: 'text-slate-500',
      bg: 'bg-slate-50',
    },
  ];

  const handleMenuClick = (tabId) => {
    setActiveTab(tabId);
    setShowMenu(false);
  };

  return (
    <>
      {/* 1. OVERLAY DEL MENÚ GRID */}
      <AnimatePresence>
        {showMenu && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className='fixed inset-0 z-[80] bg-white/95 backdrop-blur-xl flex flex-col justify-end pb-36 px-6'
            onClick={() => setShowMenu(false)} // Cierra al tocar fuera
          >
            <div className='mb-6 text-center'>
              <h3 className='text-lg font-serif font-bold text-slate-700'>
                Menú de Gestión
              </h3>
              <p className='text-xs text-slate-400'>
                Todo tu hotel en tu bolsillo
              </p>
            </div>

            <div
              className='grid grid-cols-2 gap-4'
              onClick={(e) => e.stopPropagation()}
            >
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleMenuClick(item.id)}
                  className={`p-4 rounded-2xl flex flex-col items-center justify-center gap-2 border border-slate-100 shadow-sm transition-all active:scale-95 ${item.bg}`}
                >
                  <item.icon
                    size={28}
                    className={item.color}
                  />
                  <span className='text-sm font-bold text-slate-700'>
                    {item.label}
                  </span>
                </button>
              ))}
            </div>

            {/* 🗑️ AQUÍ ELIMINÉ EL BOTÓN CERRAR FLOTANTE QUE SOBRABA */}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. DOCK PRINCIPAL (SIEMPRE VISIBLE) */}
      <div className='fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-[#2C2C2C] text-white rounded-[2rem] shadow-2xl px-6 py-4 flex justify-between items-center z-[90] border border-white/10'>
        {/* AGENDA (Core) */}
        <button
          onClick={() => {
            setActiveTab('calendar');
            setShowMenu(false);
          }}
          className={`relative p-2 transition-all ${
            activeTab === 'calendar'
              ? 'text-cyan-400 scale-110'
              : 'text-gray-400'
          }`}
        >
          <Calendar size={24} />
          {activeTab === 'calendar' && (
            <span className='absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 bg-cyan-400 rounded-full' />
          )}
        </button>

        {/* ROOM SERVICE (Operativo) */}
        <button
          onClick={onOpenRoomService}
          className='p-2 text-gray-400 hover:text-white transition-all'
        >
          <UtensilsCrossed size={24} />
        </button>
        {/* 🎙️ BOTÓN CENTRAL: IA DE VOZ */}
        <div className='relative -top-0'>
          <button
            onClick={voiceAction}
            disabled={isProcessing} // Desactivar click mientras piensa
            className={`w-16 h-16 rounded-full flex items-center justify-center border-4 border-[#F8FAFC] transform transition-all duration-300 ${
              isListening
                ? 'bg-red-500 scale-110 shadow-[0_0_30px_rgba(239,68,68,0.6)]'
                : isProcessing
                ? 'bg-slate-800 scale-100' // Color oscuro mientras piensa
                : 'bg-gradient-to-tr from-cyan-500 to-blue-600 shadow-[0_0_20px_rgba(6,182,212,0.4)] active:scale-95'
            }`}
          >
            {/* Si está procesando mostramos SPINNER, si no el MIC */}
            {isProcessing ? (
              <Loader2
                size={28}
                className='text-cyan-400 animate-spin'
              />
            ) : (
              <>
                {isListening && (
                  <span className='absolute inset-0 rounded-full border-2 border-white animate-ping opacity-75'></span>
                )}
                <Mic
                  size={28}
                  className={`text-white transition-transform ${
                    isListening ? 'scale-110' : ''
                  }`}
                />
              </>
            )}
          </button>
        </div>

        {/* ESCÁNER (Herramienta) */}
        <button
          onClick={onOpenScanner}
          className='p-2 text-gray-400 hover:text-white transition-all'
        >
          <ScanBarcode size={24} />
        </button>

        {/* 🍔 MENÚ (El acceso al resto de la App) */}
        <button
          onClick={() => setShowMenu(!showMenu)}
          className={`p-2 transition-all ${
            showMenu ? 'text-cyan-400 rotate-90' : 'text-gray-400'
          }`}
        >
          {/* Este botón ya cambia a X cuando el menú está abierto */}
          {showMenu ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
    </>
  );
};

export default MobileNav;
