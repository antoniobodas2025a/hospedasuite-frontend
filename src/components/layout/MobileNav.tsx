'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Calendar,
  UtensilsCrossed,
  Loader2,
  Mic,
  ScanBarcode,
  Menu,
  X,
  Calculator
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MENU_ITEMS } from '@/config/menuItems';
import ShiftReportModal from '@/components/modals/ShiftReportModal';

interface MobileNavProps {
  onVoiceAction?: () => void;
  isListening?: boolean;
  isProcessing?: boolean;
  onOpenScanner?: () => void;
}

const MobileNav = ({
  onVoiceAction,
  isListening = false,
  isProcessing = false,
  onOpenScanner,
}: MobileNavProps) => {
  const [showMenu, setShowMenu] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const pathname = usePathname();
  const router = useRouter();

  // 🚨 Estado para el Arqueo de Caja
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);

  // 🧠 LÓGICA SCROLL-AWARE
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

  const handleMenuClick = (href: string) => {
    router.push(href);
    setShowMenu(false);
  };

  const isActive = (href: string) =>
    pathname === href || (pathname.startsWith(href) && href !== '/dashboard');

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
            className='fixed inset-0 z-[80] bg-hospeda-950/95 backdrop-blur-2xl flex flex-col justify-end pb-36 px-6 md:hidden'
            onClick={() => setShowMenu(false)}
          >
            <div className='mb-8 text-center'>
              <div className='w-12 h-1 bg-white/10 rounded-full mx-auto mb-6'></div>
              <h3 className='text-xl font-display font-bold text-white'>
                Menú de Gestión
              </h3>
            </div>

            <div className='grid grid-cols-2 gap-4' onClick={(e) => e.stopPropagation()}>
              {MENU_ITEMS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleMenuClick(item.href)}
                  className={`p-5 rounded-[24px] flex flex-col items-center justify-center gap-3 border border-white/5 shadow-lg active:scale-95 transition-all ${
                    isActive(item.href) ? 'bg-white/10' : 'bg-white/5'
                  }`}
                >
                  <item.icon size={28} className={item.color} strokeWidth={1.5} />
                  <span className='text-xs font-bold text-slate-300 tracking-wide uppercase'>{item.label}</span>
                </button>
              ))}
            </div>

            {/* 🚨 NUEVO: BOTÓN DE CIERRE DE TURNO EN MÓVIL */}
            <div className='mt-6 pt-6 border-t border-white/10' onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => { setShowMenu(false); setIsShiftModalOpen(true); }}
                className='w-full p-4 rounded-[24px] bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 text-emerald-400 font-bold border border-emerald-500/30 flex items-center justify-center gap-3 active:scale-95 transition-all'
              >
                <Calculator size={24} /> Cierre de Turno
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. DOCK FLOTANTE INTELIGENTE (Sin Cambios) */}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            className='fixed bottom-6 left-0 right-0 mx-auto w-[90%] max-w-[380px] z-[90] h-[72px] md:hidden'
          >
            <div className='w-full h-full bg-[#1a1a1a]/90 backdrop-blur-2xl text-white rounded-[28px] shadow-[0_8px_32px_rgba(0,0,0,0.4)] px-4 flex justify-between items-center border border-white/10 relative'>
              
              <div className='flex gap-1'>
                <Link href='/dashboard' className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${pathname === '/dashboard' ? 'bg-white/10 text-cyan-400' : 'text-gray-400 hover:text-white'}`}>
                  <Calendar size={22} strokeWidth={2} />
                </Link>
                <Link href='/dashboard/menu' className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${pathname === '/dashboard/menu' ? 'bg-white/10 text-orange-400' : 'text-gray-400 hover:text-white'}`}>
                  <UtensilsCrossed size={22} strokeWidth={2} />
                </Link>
              </div>

              {/* BOTÓN CENTRAL (VOICE AI) */}
              <div className='absolute left-1/2 -translate-x-1/2 -top-6'>
                <button onClick={onVoiceAction} disabled={isProcessing} className={`w-16 h-16 rounded-[24px] flex items-center justify-center border-[4px] border-[#F3F4F6] transition-all shadow-xl ${isListening ? 'bg-red-500 scale-110 shadow-red-500/40' : isProcessing ? 'bg-slate-800 scale-100' : 'bg-gradient-to-tr from-hospeda-400 to-hospeda-600 shadow-hospeda-500/30 active:scale-95'}`}>
                  {isProcessing ? <Loader2 size={24} className='text-white animate-spin' /> : <Mic size={24} className='text-white' strokeWidth={2} />}
                </button>
              </div>

              <div className='flex gap-1'>
                <button onClick={onOpenScanner} className='w-12 h-12 rounded-2xl flex items-center justify-center text-gray-400 hover:text-white transition-all'>
                  <ScanBarcode size={22} strokeWidth={2} />
                </button>
                <button onClick={() => setShowMenu(!showMenu)} className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${showMenu ? 'bg-white/10 text-white rotate-90' : 'text-gray-400 hover:text-white'}`}>
                  {showMenu ? <X size={22} /> : <Menu size={22} />}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🚨 MODAL DE ARQUEO INYECTADO */}
      <ShiftReportModal isOpen={isShiftModalOpen} onClose={() => setIsShiftModalOpen(false)} />
    </>
  );
};

export default MobileNav;