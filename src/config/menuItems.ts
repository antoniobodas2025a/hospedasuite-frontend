import {
  Calendar,
  Users,
  BookOpenCheck,
  Megaphone,
  Settings,
  UtensilsCrossed,
  Box,
} from 'lucide-react';

export const MENU_ITEMS = [
  {
    id: 'calendar',
    label: 'Agenda',
    icon: Calendar,
    // 🚨 CAMBIO CRÍTICO: Usamos la subruta específica para el calendario
    // Esto evita que todas las demás rutas (/settings, /pos) "hereden" la raíz
    href: '/dashboard/calendar', 
    color: 'text-cyan-500',
    bg: 'bg-cyan-50',
  },
  {
    id: 'inventory',
    label: 'Inventario',
    icon: Box,
    href: '/dashboard/inventory',
    color: 'text-blue-500',
    bg: 'bg-blue-50',
  },
  {
    id: 'guests',
    label: 'Huéspedes',
    icon: Users,
    href: '/dashboard/guests',
    color: 'text-purple-500',
    bg: 'bg-purple-50',
  },
  {
    id: 'forensic-book',
    label: 'Libro Registro',
    icon: BookOpenCheck,
    href: '/dashboard/forensic-book',
    color: 'text-emerald-500',
    bg: 'bg-emerald-50',
  },
  {
    id: 'leads',
    label: 'Marketing',
    icon: Megaphone,
    href: '/dashboard/marketing',
    color: 'text-green-500',
    bg: 'bg-green-50',
  },
  {
    id: 'menu',
    label: 'Carta Digital',
    icon: UtensilsCrossed,
    href: '/dashboard/pos',
    color: 'text-orange-500',
    bg: 'bg-orange-50',
  },
  {
    id: 'settings',
    label: 'Configuración',
    icon: Settings,
    href: '/dashboard/settings',
    color: 'text-slate-500',
    bg: 'bg-slate-50',
  },
];