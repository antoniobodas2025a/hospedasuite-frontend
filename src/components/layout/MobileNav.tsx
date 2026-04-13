'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Calendar, ScanBarcode, Menu, X, Calculator, Home } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ShiftReportModal from '@/components/modals/ShiftReportModal';
import { MENU_ITEMS } from '@/config/menuItems';

interface MobileNavProps {
  onOpenScanner?: () => void;
}

export default function MobileNav({ onOpenScanner }: MobileNavProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const pathname = usePathname();
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);

  // 🚨 FIX QA: Lógica de Scroll Restaurada y Protegida
  useEffect(() => {
    const handleScroll = () => {
      if (showMenu) return; // Si el menú está abierto, prohibido ocultar el Dock
      
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 50) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      setLastScrollY(currentScrollY);
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY, showMenu]);

  // 🚨 FIX QA: Bloquear scroll del fondo (body) cuando el menú está activo (Regla Mobile-First)
  useEffect(() => {
    if (showMenu) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    
    return () => { document.body.style.overflow = 'unset'; };
  }, [showMenu]);

  return (
    <>
      {/* 1. BARRA FLOTANTE MINIMALISTA (DOCK) */}
      <AnimatePresence>
        {isVisible && (
          <motion.nav 
            initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className='fixed bottom-4 left-4 right-4 z-[60] md:hidden'
          >
            <div className='bg-hospeda-950/95 backdrop-blur-xl rounded-[2rem] shadow-[0_8px_32px_rgba(0,0,0,0.5)] border border-white/10 p-2'>
              <div className='flex items-center justify-around px-2'>
                <Link href='/dashboard' onClick={() => setShowMenu(false)} className={`p-3 rounded-2xl transition-all active:scale-95 ${pathname === '/dashboard' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'}`}>
                  <Home size={22} strokeWidth={2}/>
                </Link>
                <Link href='/dashboard/calendar' onClick={() => setShowMenu(false)} className={`p-3 rounded-2xl transition-all active:scale-95 ${pathname === '/dashboard/calendar' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'}`}>
                  <Calendar size={22} strokeWidth={2}/>
                </Link>
                
                <button onClick={() => { setShowMenu(false); onOpenScanner?.(); }} className='p-3 rounded-2xl text-slate-400 hover:text-white transition-all active:scale-95'>
                  <ScanBarcode size={22} strokeWidth={2} />
                </button>
                
                <button onClick={() => setShowMenu(!showMenu)} className={`p-3 rounded-2xl transition-all active:scale-95 ${showMenu ? 'bg-hospeda-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
                  {showMenu ? <X size={22} strokeWidth={2} /> : <Menu size={22} strokeWidth={2} />}
                </button>
              </div>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>

      {/* 2. OVERLAY OSCURO (Toca afuera para cerrar - Ciber-blindaje UX) */}
      <AnimatePresence>
        {showMenu && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-hospeda-950/80 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setShowMenu(false)}
          />
        )}
      </AnimatePresence>

      {/* 3. MENÚ DESPLEGABLE DE PANTALLA COMPLETA */}
      <AnimatePresence>
        {showMenu && (
          <motion.div 
            initial={{ opacity: 0, y: 30, scale: 0.95 }} 
            animate={{ opacity: 1, y: 0, scale: 1 }} 
            exit={{ opacity: 0, y: 30, scale: 0.95 }} 
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className='fixed inset-x-4 bottom-24 bg-[#1a1a1a]/95 backdrop-blur-2xl rounded-[2rem] shadow-2xl border border-white/10 p-6 z-50 md:hidden overflow-hidden flex flex-col max-h-[70vh]'
          >
            <div className='grid grid-cols-2 gap-3 overflow-y-auto custom-scrollbar pr-1 pb-2'>
              {MENU_ITEMS.map((item) => (
                <Link key={item.id} href={item.href} onClick={() => setShowMenu(false)} className='flex items-center gap-3 p-4 rounded-2xl text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 transition-all active:scale-95'>
                  <item.icon size={20} className={item.color} /> 
                  <span className='text-xs font-bold tracking-wide truncate'>{item.label}</span>
                </Link>
              ))}
            </div>
            
            <div className='mt-2 pt-4 border-t border-white/10 flex-shrink-0'>
              <button onClick={() => { setShowMenu(false); setIsShiftModalOpen(true); }} className='flex items-center justify-center gap-2 w-full p-4 rounded-2xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 font-bold transition-all active:scale-95'>
                <Calculator size={18} /> Cierre de Turno
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isShiftModalOpen && <ShiftReportModal onClose={() => setIsShiftModalOpen(false)} />}
    </>
  );
}