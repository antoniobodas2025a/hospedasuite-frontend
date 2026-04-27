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
  Megaphone
} from 'lucide-react';

export const MENU_ITEMS = [
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
  // 🚀 MÓDULO CERTIFICADO: Logística de Limpieza
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
  },
  {
    id: 'reports',
    label: 'Reportes',
    href: '/dashboard/reports',
    icon: BarChart3,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10'
  },
  {
    id: 'settings',
    label: 'Configuración',
    href: '/dashboard/settings',
    icon: Settings,
    color: 'text-zinc-500',
    bg: 'bg-zinc-500/10'
  }
];