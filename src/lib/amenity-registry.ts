import { Wifi, Car, Waves, Coffee, Star, Snowflake, Tv, Dumbbell, Utensils, Wine, Bath, Mountain, Palmtree, Shield, Phone, CreditCard, Luggage, Key } from 'lucide-react';

// ============================================================================
// AMENITY REGISTRY — Fuente unica de verdad para amenidades del hotel
//
// Usado por:
// - SettingsPanel.tsx (tab Perfil OTA — botones de amenidades)
// - OTA page (hotel/[slug]/page.tsx — renderizado de amenidades)
//
// Para agregar una nueva amenidad:
// 1. Agregar entrada aqui con id, label, icon
// 2. Agregar boton en SettingsPanel HOTEL_AMENITIES array
// ============================================================================

export interface AmenityDefinition {
  id: string;
  label: string;
  icon: React.ElementType;
}

export const AMENITY_REGISTRY: Record<string, AmenityDefinition> = {
  wifi: { id: 'wifi', label: 'Wi-Fi Gratis', icon: Wifi },
  parking: { id: 'parking', label: 'Parqueadero', icon: Car },
  pool: { id: 'pool', label: 'Piscina', icon: Waves },
  breakfast: { id: 'breakfast', label: 'Desayuno', icon: Coffee },
  ac: { id: 'ac', label: 'Aire Acondicionado', icon: Snowflake },
  tv: { id: 'tv', label: 'TV Pantalla Plana', icon: Tv },
  gym: { id: 'gym', label: 'Gimnasio', icon: Dumbbell },
  restaurant: { id: 'restaurant', label: 'Restaurante', icon: Utensils },
  bar: { id: 'bar', label: 'Bar', icon: Wine },
  spa: { id: 'spa', label: 'Spa', icon: Bath },
  mountain_view: { id: 'mountain_view', label: 'Vista a la Montana', icon: Mountain },
  beach_access: { id: 'beach_access', label: 'Acceso a Playa', icon: Palmtree },
  safe: { id: 'safe', label: 'Caja Fuerte', icon: Shield },
  phone: { id: 'phone', label: 'Telefono', icon: Phone },
  credit_card: { id: 'credit_card', label: 'Acepta Tarjetas', icon: CreditCard },
  luggage_storage: { id: 'luggage_storage', label: 'Guarda Equipaje', icon: Luggage },
  keyless_entry: { id: 'keyless_entry', label: 'Check-in Digital', icon: Key },
};

export const DEFAULT_AMENITY = { id: 'default', label: 'Amenidad', icon: Star };

export function getAmenityById(id: string): AmenityDefinition {
  return AMENITY_REGISTRY[id] || DEFAULT_AMENITY;
}

export function getAmenityLabel(id: string): string {
  return AMENITY_REGISTRY[id]?.label || id;
}

export function getAmenityIcon(id: string): React.ElementType {
  return AMENITY_REGISTRY[id]?.icon || DEFAULT_AMENITY.icon;
}
