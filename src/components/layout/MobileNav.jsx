import React, { useState, useEffect } from 'react';
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
  BookOpenCheck, // ✨ 1. NUEVA IMPORTACIÓN
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // 🧠 LÓGICA SCROLL-AWARE (INTACTA)
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (showMenu) {
        setIsVisible(true);
        return;
      }
      if (Math.abs(currentScrollY - lastScrollY) < 10) return;
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      setLastScrollY(currentScrollY);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY, showMenu]);

  const handleMenuClick = (tabId) => {
    setActiveTab(tabId);
    setShowMenu(false);
  };

  const menuItems = [
    {
      id: 'menu',
      label: 'Carta Digital',
      icon: UtensilsCrossed,
      color: 'text-orange-500',
      bg: 'bg-orange-50',
    },
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
    // ✨ 2. NUEVO ÍTEM: LIBRO DE REGISTRO
    {
      id: 'forensic-book',
      label: 'Libro Registro',
      icon: BookOpenCheck,
      color: 'text-emerald-500',
      bg: 'bg-emerald-50',
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

  return (
    <>
      {/* 1. OVERLAY DEL MENÚ GRID */}
      <AnimatePresence>
        {showMenu && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className='fixed inset-0 z-[80] bg-white/95 backdrop-blur-2xl flex flex-col justify-end pb-36 px-6'
            onClick={() => setShowMenu(false)}
          >
            <div className='mb-8 text-center'>
              <div className='w-12 h-1 bg-slate-200 rounded-full mx-auto mb-6'></div>
              <h3 className='text-xl font-serif font-bold text-slate-800'>
                Menú de Gestión
              </h3>
            </div>
            {/* Grid ajustado automáticamente */}
            <div
              className='grid grid-cols-2 gap-4'
              onClick={(e) => e.stopPropagation()}
            >
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleMenuClick(item.id)}
                  className={`p-5 rounded-[24px] flex flex-col items-center justify-center gap-3 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] active:scale-95 transition-all ${item.bg}`}
                >
                  <item.icon
                    size={28}
                    className={item.color}
                    strokeWidth={1.5}
                  />
                  <span className='text-xs font-bold text-slate-600 tracking-wide uppercase'>
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. DOCK FLOTANTE INTELIGENTE (INTACTO) */}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            // 👇 MANTIENE LA CORRECCIÓN DE CENTRADO
            className='fixed bottom-6 left-0 right-0 mx-auto w-[90%] max-w-[380px] z-[90] h-[72px]'
          >
            <div className='w-full h-full bg-[#1a1a1a]/90 backdrop-blur-2xl text-white rounded-[28px] shadow-[0_8px_32px_rgba(0,0,0,0.4)] px-4 flex justify-between items-center border border-white/10 relative'>
              {/* IZQUIERDA */}
              <div className='flex gap-1'>
                <button
                  onClick={() => {
                    setActiveTab('calendar');
                    setShowMenu(false);
                  }}
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                    activeTab === 'calendar'
                      ? 'bg-white/10 text-cyan-400'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Calendar
                    size={22}
                    strokeWidth={2}
                  />
                </button>
                <button
                  onClick={onOpenRoomService}
                  className='w-12 h-12 rounded-2xl flex items-center justify-center text-gray-400 hover:text-white transition-all'
                >
                  <UtensilsCrossed
                    size={22}
                    strokeWidth={2}
                  />
                </button>
              </div>

              {/* 🎙️ BOTÓN CENTRAL (FLOTANDO FUERA) - LÓGICA CONSERVADA */}
              <div className='absolute left-1/2 -translate-x-1/2 -top-6'>
                <button
                  onClick={voiceAction}
                  disabled={isProcessing}
                  className={`w-16 h-16 rounded-[24px] flex items-center justify-center border-[4px] border-[#F3F4F6] transition-all shadow-xl ${
                    isListening
                      ? 'bg-red-500 scale-110 shadow-red-500/40'
                      : isProcessing
                        ? 'bg-slate-800 scale-100'
                        : 'bg-gradient-to-tr from-cyan-500 to-blue-600 shadow-cyan-500/30 active:scale-95'
                  }`}
                >
                  {isProcessing ? (
                    <Loader2
                      size={24}
                      className='text-white animate-spin'
                    />
                  ) : (
                    <Mic
                      size={24}
                      className='text-white'
                      strokeWidth={2}
                    />
                  )}
                </button>
              </div>

              {/* DERECHA */}
              <div className='flex gap-1'>
                <button
                  onClick={onOpenScanner}
                  className='w-12 h-12 rounded-2xl flex items-center justify-center text-gray-400 hover:text-white transition-all'
                >
                  <ScanBarcode
                    size={22}
                    strokeWidth={2}
                  />
                </button>
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                    showMenu
                      ? 'bg-white/10 text-white rotate-90'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {showMenu ? <X size={22} /> : <Menu size={22} />}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default MobileNav;
