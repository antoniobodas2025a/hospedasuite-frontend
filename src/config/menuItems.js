// src/config/menuItems.js
import {
  Calendar,
  LayoutDashboard,
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
    color: 'text-cyan-500', // Color para móvil
    bg: 'bg-cyan-50', // Fondo para móvil
  },
  {
    id: 'inventory',
    label: 'Inventario',
    icon: Box, // Unificamos iconos (Usamos Box que es más claro para stock)
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
    id: 'forensic-book', // 👈 AQUÍ ESTÁ TU NUEVO MÓDULO
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
    id: 'menu', // Carta digital (estaba en móvil, lo agregamos aquí también)
    label: 'Carta Digital',
    icon: UtensilsCrossed,
    color: 'text-orange-500',
    bg: 'bg-orange-50',
  },
  {
    id: 'settings',
    label: 'Configuración',
    icon: Settings,
    color: 'text-slate-500',
    bg: 'bg-slate-50',
  },
];
