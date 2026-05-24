'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Menu, X, Calculator, Home, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { springGentle, springSnappy } from '@/lib/mac2026/spring';
import ShiftReportModal from '@/components/modals/ShiftReportModal';
import { MENU_ITEMS, type MenuItem as MenuItemType } from '@/config/menuItems';
import { logout } from '@/app/actions/auth';

interface MobileNavViewProps {
  isVisible: boolean;
  showMenu: boolean;
  activePath: string;
  menuItems: MenuItemType[];
  onToggleMenu: () => void;
  onOpenShiftModal: () => void;
  onRevealDock: () => void;
  onLogout: () => void;
}

interface MobileNavProps {
  subscriptionPlan?: 'starter' | 'pro' | 'enterprise';
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
  onRevealDock,
  onLogout
}) => {
  return (
    <nav className="md:hidden">
      {/* Edge-tap zone: when dock is hidden, tap bottom edge to reveal */}
      {!isVisible && !showMenu && (
        <div
          className="fixed inset-x-0 bottom-0 h-12 z-[calc(var(--z-sticky)-1)]"
          onClick={onRevealDock}
          aria-hidden="true"
        />
      )}

      {/* Dock Inferior — Liquid Glass 2.0 + Spring Physics */}
      <motion.div
        initial={false}
        animate={{ y: isVisible ? 0 : 100, opacity: isVisible ? 1 : 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30, mass: 0.8 }}
        className="fixed inset-x-4 bottom-6 z-[var(--z-sticky)]"
      >
        <div className="glass-panel shadow-2xl shadow-black/50 rounded-[var(--radius-squircle-2xl)] p-2 flex items-center justify-between ring-1 ring-inset ring-border">
          
          {/* Botón Home */}
          <Link href="/dashboard" className={cn(
            "p-4 rounded-[var(--radius-squircle-lg)] transition-all active:scale-90",
            activePath === '/dashboard' ? "text-brand-400 bg-brand-500/10" : "text-muted-foreground hover:text-sidebar-foreground"
          )}>
            <Home className="size-6 stroke-[1.5]" />
          </Link>

          {/* Botón Calendario */}
          <Link href="/dashboard/calendar" className={cn(
            "p-4 rounded-[var(--radius-squircle-lg)] transition-all active:scale-90",
            activePath === '/dashboard/calendar' ? "text-brand-400 bg-brand-500/10" : "text-muted-foreground hover:text-sidebar-foreground"
          )}>
            <Calendar className="size-6 stroke-[1.5]" />
          </Link>

          {/* Espaciador central */}
          <div className="flex-1" />

          {/* Botón Trigger de Menú Expansivo */}
          <motion.button
            onClick={onToggleMenu}
            className={cn(
              "p-4 rounded-[var(--radius-squircle-lg)] transition-all active:scale-90",
              showMenu ? "text-brand-400 bg-brand-500/10" : "text-muted-foreground hover:text-sidebar-foreground"
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
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[calc(var(--z-overlay)-1)]"
            />
            
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={springGentle({ stiffness: 200, damping: 25, mass: 1.2 })}
              className="fixed inset-x-4 bottom-28 z-[var(--z-overlay)] glass-panel shadow-2xl overflow-hidden flex flex-col max-h-[60vh]"
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
                        ? "bg-brand-500/10 border-brand-500/20 text-brand-400" 
                        : "bg-muted border-border text-sidebar-foreground/70 hover:text-sidebar-foreground"
                    )}
                  >
                    <item.icon className={cn("size-5 stroke-[1.5]", item.color)} /> 
                    <span className="text-xs font-semibold tracking-wide truncate">{item.label}</span>
                  </Link>
                ))}
              </div>
              
                <div className="mt-2 pt-4 border-t border-border">
                  <motion.button 
                    onClick={onOpenShiftModal} 
                    className="flex items-center justify-center gap-3 w-full p-4 rounded-[var(--radius-squircle-lg)] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold text-sm transition-all"
                    whileTap={{ scale: 0.98 }}
                    transition={springSnappy()}
                  >
                    <Calculator className="size-5 stroke-[1.5]" />
                    Cierre de Turno
                  </motion.button>
                  
                  {/* Logout — Mac 2026: destructive action, subtle affordance */}
                  <motion.button 
                    onClick={() => { onToggleMenu(); onLogout(); }} 
                    className="flex items-center justify-center gap-3 w-full p-4 rounded-[var(--radius-squircle-lg)] text-rose-400/70 hover:text-rose-400 hover:bg-rose-500/5 border border-transparent hover:border-rose-500/10 font-bold text-sm transition-all mt-2"
                    whileTap={{ scale: 0.98 }}
                    transition={springSnappy()}
                  >
                    <LogOut className="size-5 stroke-[1.5]" />
                    Finalizar Sesión
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

export default function MobileNav({ subscriptionPlan = 'starter' }: MobileNavProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const lastScrollYRef = useRef(0);
  const tickingRef = useRef(false);
  const pathname = usePathname();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error durante la terminación de sesión:', error);
    }
  };

  // Smart dock visibility: hide on scroll down, show on scroll up or at top
  useEffect(() => {
    const handleScroll = () => {
      if (showMenu || tickingRef.current) return;
      tickingRef.current = true;

      requestAnimationFrame(() => {
        const currentScrollY = window.scrollY;
        const lastScrollY = lastScrollYRef.current;

        // Always show at top of page
        if (currentScrollY < 20) {
          setIsVisible(true);
        }
        // Scrolling down → hide
        else if (currentScrollY > lastScrollY + 8) {
          setIsVisible(false);
        }
        // Scrolling up → show
        else if (currentScrollY < lastScrollY - 8) {
          setIsVisible(true);
        }

        lastScrollYRef.current = currentScrollY;
        tickingRef.current = false;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [showMenu]);

  // Show dock on route change (user needs navigation context)
  useEffect(() => {
    setIsVisible(true);
    lastScrollYRef.current = 0;
  }, [pathname]);

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

  // Filtra ítems de menú según el plan (gating por suscripción)
  const planLevel = { starter: 0, pro: 1, enterprise: 2 } as const;
  const currentLevel = planLevel[subscriptionPlan];
  const visibleMenuItems = MENU_ITEMS.filter(item =>
    !item.minPlan || currentLevel >= (planLevel[item.minPlan] ?? 0)
  );

  return (
    <>
      <MobileNavView 
        isVisible={isVisible}
        showMenu={showMenu}
        activePath={pathname}
        menuItems={visibleMenuItems}
        onToggleMenu={() => setShowMenu(!showMenu)}
        onRevealDock={() => setIsVisible(true)}
        onOpenShiftModal={() => {
          setShowMenu(false);
          setIsShiftModalOpen(true);
        }}
        onLogout={handleLogout}
      />

      <ShiftReportModal 
        isOpen={isShiftModalOpen} 
        onClose={() => setIsShiftModalOpen(false)} 
      />
    </>
  );
}
