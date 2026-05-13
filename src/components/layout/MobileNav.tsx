'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, ScanBarcode, Menu, X, Calculator, Home, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { springGentle, springSnappy } from '@/lib/mac2026/spring';
import ShiftReportModal from '@/components/modals/ShiftReportModal';
import { MENU_ITEMS, type MenuItem as MenuItemType } from '@/config/menuItems';

interface MobileNavViewProps {
  isVisible: boolean;
  showMenu: boolean;
  activePath: string;
  menuItems: MenuItemType[];
  onToggleMenu: () => void;
  onOpenShiftModal: () => void;
  onOpenScanner?: () => void;
}

interface MobileNavProps {
  onOpenScanner?: () => void;
}

// ==========================================
// BLOQUE 2: COMPONENTE PRESENTACIONAL
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
      {/* Dock Inferior — Liquid Glass 2.0 + Spring Physics */}
      <motion.div
        initial={false}
        animate={{ y: isVisible ? 0 : 100, opacity: isVisible ? 1 : 0 }}
        transition={springGentle()}
        className="fixed inset-x-4 bottom-6 z-50"
      >
        <div className="glass-panel shadow-2xl shadow-black/50 rounded-[var(--radius-squircle-2xl)] p-2 flex items-center justify-between ring-1 ring-inset ring-white/10">
          
          {/* Botón Home / Quick Access */}
          <Link href="/dashboard" className={cn(
            "p-4 rounded-[var(--radius-squircle-lg)] transition-all active:scale-90",
            activePath === '/dashboard' ? "text-indigo-400 bg-indigo-500/10" : "text-zinc-500 hover:text-zinc-300"
          )}>
            <Home className="size-6 stroke-[1.5]" />
          </Link>

          {/* Botón Calendario */}
          <Link href="/dashboard/calendar" className={cn(
            "p-4 rounded-[var(--radius-squircle-lg)] transition-all active:scale-90",
            activePath === '/dashboard/calendar' ? "text-indigo-400 bg-indigo-500/10" : "text-zinc-500 hover:text-zinc-300"
          )}>
            <Calendar className="size-6 stroke-[1.5]" />
          </Link>

          {/* Botón Scanner - Centro de Acción */}
          <motion.button 
            onClick={() => {
              if (showMenu) onToggleMenu();
              onOpenScanner?.();
            }}
            className="p-4 rounded-[var(--radius-squircle-lg)] bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 transition-transform"
            whileTap={{ scale: 0.95 }}
            transition={springSnappy()}
          >
            <ScanBarcode className="size-6 stroke-[1.5]" />
          </motion.button>

          {/* Botón Trigger de Menú Expansivo */}
          <motion.button
            onClick={onToggleMenu}
            className={cn(
              "p-4 rounded-[var(--radius-squircle-lg)] transition-all active:scale-90",
              showMenu ? "text-indigo-400 bg-indigo-500/10" : "text-zinc-500 hover:text-zinc-300"
            )}
            whileTap={{ scale: 0.9 }}
            transition={springSnappy()}
          >
            {showMenu ? <X className="size-6 stroke-[1.5]" /> : <Menu className="size-6 stroke-[1.5]" />}
          </motion.button>
        </div>
      </motion.div>

      {/* Menú Expansivo — Spring Physics */}
      <AnimatePresence>
        {showMenu && (
          <>
            {/* Overlay */}
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
              transition={springGentle({ stiffness: 200, damping: 25, mass: 1.2 })}
              className="fixed inset-x-4 bottom-28 z-50 glass-panel shadow-2xl overflow-hidden flex flex-col max-h-[70vh]"
            >
              <div className="grid grid-cols-2 gap-3 overflow-y-auto custom-scrollbar pr-1 pb-4">
                {menuItems.map((item) => (
                  <Link 
                    key={item.id} 
                    href={item.href} 
                    onClick={onToggleMenu} 
                    className={cn(
                      "flex items-center gap-3 p-4 rounded-[var(--radius-squircle-lg)] border transition-all active:scale-95 group",
                      activePath === item.href 
                        ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400" 
                        : "bg-zinc-800/20 border-white/5 text-zinc-400 hover:text-zinc-200"
                    )}
                  >
                    <item.icon className={cn("size-5 stroke-[1.5]", item.color)} /> 
                    <span className="text-xs font-semibold tracking-wide truncate">{item.label}</span>
                  </Link>
                ))}
              </div>
              
              <div className="mt-2 pt-4 border-t border-white/5">
                <motion.button 
                  onClick={onOpenShiftModal} 
                  className="flex items-center justify-center gap-3 w-full p-4 rounded-[var(--radius-squircle-lg)] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold text-sm transition-all"
                  whileTap={{ scale: 0.98 }}
                  transition={springSnappy()}
                >
                  <Calculator className="size-5 stroke-[1.5]" />
                  Cierre de Turno Operativo
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </nav>
  );
};

// ==========================================
// BLOQUE 3: COMPONENTE CONTENEDOR
// ==========================================

export default function MobileNav({ onOpenScanner }: MobileNavProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const pathname = usePathname();

  // Detección de Scroll para ocultar/mostrar Dock
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

  // Bloqueo de Scroll del body en Mobile-First
  useEffect(() => {
    if (showMenu) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
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
