import { 
  LayoutDashboard, 
  Calendar, 
  Package, 
  Users, 
  ShoppingCart, 
  BarChart3, 
  Settings,
  Sparkles,
  BookOpenCheck,
  Megaphone,
  CreditCard,
  type LucideIcon
} from 'lucide-react';

/**
 * Mac 2026 — Ley de Miller: ≤5 chunks semánticos por pantalla.
 * Los 10 módulos se agrupan en 4 categorías cognitivas.
 */

export interface MenuItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  color?: string;
  bg?: string;
  /** Plan mínimo requerido para ver este ítem. Si no se cumple, se muestra bloqueado. */
  minPlan?: 'starter' | 'pro' | 'enterprise';
}

export interface MenuGroup {
  id: string;
  label: string;
  items: MenuItem[];
}

export const MENU_GROUPS: MenuGroup[] = [
  {
    id: 'operations',
    label: 'Operaciones',
    items: [
      {
        id: 'dashboard',
        label: 'Vista General',
        href: '/dashboard',
        icon: LayoutDashboard,
        color: 'text-blue-500',
        bg: 'bg-blue-500/10'
      },
      {
        id: 'calendar',
        label: 'Agenda',
        href: '/dashboard/calendar',
        icon: Calendar,
        color: 'text-indigo-500',
        bg: 'bg-indigo-500/10'
      },
      {
        id: 'inventory',
        label: 'Inventario',
        href: '/dashboard/inventory',
        icon: Package,
        color: 'text-amber-500',
        bg: 'bg-amber-500/10'
      },
    ]
  },
  {
    id: 'services',
    label: 'Servicios',
    items: [
      {
        id: 'housekeeping',
        label: 'Limpieza',
        href: '/dashboard/housekeeping',
        icon: Sparkles,
        color: 'text-emerald-400',
        bg: 'bg-emerald-400/10'
      },
      {
        id: 'guests',
        label: 'Huéspedes',
        href: '/dashboard/guests',
        icon: Users,
        color: 'text-rose-500',
        bg: 'bg-rose-500/10'
      },
      {
        id: 'pos',
        label: 'Carta Digital',
        href: '/dashboard/pos',
        icon: ShoppingCart,
        color: 'text-purple-500',
        bg: 'bg-purple-500/10'
      },
    ]
  },
  {
    id: 'management',
    label: 'Gestión',
    items: [
      {
        id: 'forensic-book',
        label: 'Libro Registro',
        href: '/dashboard/forensic-book',
        icon: BookOpenCheck,
        color: 'text-emerald-500',
        bg: 'bg-emerald-500/10',
      },
      {
        id: 'leads',
        label: 'Marketing',
        href: '/dashboard/marketing',
        icon: Megaphone,
        color: 'text-green-500',
        bg: 'bg-green-500/10',
        minPlan: 'enterprise',
      },
      {
        id: 'reports',
        label: 'Reportes',
        href: '/dashboard/reports',
        icon: BarChart3,
        color: 'text-emerald-500',
        bg: 'bg-emerald-500/10',
        minPlan: 'enterprise',
      },
    ]
  },
  {
    id: 'system',
    label: 'Sistema',
    items: [
      {
        id: 'billing',
        label: 'Facturación',
        href: '/dashboard/billing',
        icon: CreditCard,
        color: 'text-emerald-400',
        bg: 'bg-emerald-400/10',
        minPlan: 'starter',
      },
      {
        id: 'settings',
        label: 'Configuración',
        href: '/dashboard/settings',
        icon: Settings,
        color: 'text-zinc-500',
        bg: 'bg-zinc-500/10'
      },
    ]
  },
];

/** Flat export for backward compatibility */
export const MENU_ITEMS: MenuItem[] = MENU_GROUPS.flatMap(g => g.items);
