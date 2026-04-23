'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, ScanBarcode, Menu, X, Calculator, Home, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import ShiftReportModal from '@/components/modals/ShiftReportModal';
import { MENU_ITEMS } from '@/config/menuItems';

// ==========================================
// BLOQUE 1: INTERFACES ESTRICTAS
// ==========================================

interface MenuItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  color: string;
}

export interface MobileNavViewProps {
  isVisible: boolean;
  showMenu: boolean;
  activePath: string;
  menuItems: MenuItem[];
  onToggleMenu: () => void;
  onOpenShiftModal: () => void;
  onOpenScanner?: () => void;
}

interface MobileNavProps {
  onOpenScanner?: () => void;
}

// ==========================================
// BLOQUE 2: COMPONENTE PRESENTACIONAL (UI Claude 2026)
// ==========================================

const MobileNavView: React.FC<MobileNavViewProps> = ({
  isVisible,
  showMenu,
  activePath,
  menuItems,
  onToggleMenu,
  onOpenShiftModal,
  onOpenScanner
}) => {
  return (
    <nav className="md:hidden">
      {/* Dock Inferior - Liquid Glass 2.0 */}
      <motion.div
        initial={false}
        animate={{ y: isVisible ? 0 : 100, opacity: isVisible ? 1 : 0 }}
        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
        className="fixed inset-x-4 bottom-6 z-50"
      >
        <div className="bg-zinc-900/40 backdrop-blur-3xl border border-white/5 shadow-2xl shadow-black/50 rounded-3xl p-2 flex items-center justify-between ring-1 ring-inset ring-white/10">
          
          {/* Botón Home / Quick Access */}
          <Link href="/dashboard" className={cn(
            "p-4 rounded-2xl transition-all active:scale-90",
            activePath === '/dashboard' ? "text-indigo-400 bg-indigo-500/10" : "text-zinc-500 hover:text-zinc-300"
          )}>
            <Home className="size-6 stroke-[1.5]" />
          </Link>

          {/* Botón Calendario */}
          <Link href="/dashboard/calendar" className={cn(
            "p-4 rounded-2xl transition-all active:scale-90",
            activePath === '/dashboard/calendar' ? "text-indigo-400 bg-indigo-500/10" : "text-zinc-500 hover:text-zinc-300"
          )}>
            <Calendar className="size-6 stroke-[1.5]" />
          </Link>

          {/* Botón Scanner - Centro de Acción */}
          <button 
            onClick={() => {
              if (showMenu) onToggleMenu();
              onOpenScanner?.();
            }}
            className="p-4 rounded-2xl bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 active:scale-95 transition-transform"
          >
            <ScanBarcode className="size-6 stroke-[1.5]" />
          </button>

          {/* Botón Trigger de Menú Expansivo */}
          <button
            onClick={onToggleMenu}
            className={cn(
              "p-4 rounded-2xl transition-all active:scale-90",
              showMenu ? "text-indigo-400 bg-indigo-500/10" : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            {showMenu ? <X className="size-6 stroke-[1.5]" /> : <Menu className="size-6 stroke-[1.5]" />}
          </button>
        </div>
      </motion.div>

      {/* Menú Expansivo Anti-Grid */}
      <AnimatePresence>
        {showMenu && (
          <>
            {/* Overlay de Bloqueo Ciber-blindaje */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={onToggleMenu}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            />
            
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-x-4 bottom-28 z-50 bg-[#09090b]/90 backdrop-blur-3xl rounded-[2.5rem] border border-white/5 p-6 shadow-2xl overflow-hidden flex flex-col max-h-[70vh]"
            >
              <div className="grid grid-cols-2 gap-3 overflow-y-auto custom-scrollbar pr-1 pb-4">
                {menuItems.map((item) => (
                  <Link 
                    key={item.id} 
                    href={item.href} 
                    onClick={onToggleMenu} 
                    className={cn(
                      "flex items-center gap-3 p-4 rounded-2xl border transition-all active:scale-95 group",
                      activePath === item.href 
                        ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400" 
                        : "bg-zinc-800/20 border-white/5 text-zinc-400 hover:text-zinc-200"
                    )}
                  >
                    <item.icon className={cn("size-5 stroke-[1.5]", item.color)} /> 
                    <span className="text-xs font-semibold tracking-wide truncate font-poppins">{item.label}</span>
                  </Link>
                ))}
              </div>
              
              <div className="mt-2 pt-4 border-t border-white/5">
                <button 
                  onClick={onOpenShiftModal} 
                  className="flex items-center justify-center gap-3 w-full p-4 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold font-poppins text-sm transition-all active:scale-[0.98]"
                >
                  <Calculator className="size-5 stroke-[1.5]" />
                  Cierre de Turno Operativo
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </nav>
  );
};

// ==========================================
// BLOQUE 3: COMPONENTE CONTENEDOR (Máquina de Estados)
// ==========================================

export default function MobileNav({ onOpenScanner }: MobileNavProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const pathname = usePathname();

  // Lógica forense: Detección de Scroll para ocultar/mostrar Dock
  useEffect(() => {
    const handleScroll = () => {
      if (showMenu) return; 
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

  // 🚨 CORRECCIÓN DE REGRESIÓN: Bloqueo de Scroll del body en Mobile-First
  useEffect(() => {
    if (showMenu) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    // Función de limpieza en el desmontaje (previene memory/UI leaks)
    return () => { 
      document.body.style.overflow = 'unset'; 
    };
  }, [showMenu]);

  return (
    <>
      <MobileNavView 
        isVisible={isVisible}
        showMenu={showMenu}
        activePath={pathname}
        menuItems={MENU_ITEMS}
        onToggleMenu={() => setShowMenu(!showMenu)}
        onOpenShiftModal={() => {
          setShowMenu(false);
          setIsShiftModalOpen(true);
        }}
        onOpenScanner={onOpenScanner}
      />

      <ShiftReportModal 
        isOpen={isShiftModalOpen} 
        onClose={() => setIsShiftModalOpen(false)} 
      />
    </>
  );
}