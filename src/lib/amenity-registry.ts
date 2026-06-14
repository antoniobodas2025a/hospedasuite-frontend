import { Wifi, Car, Waves, Coffee, Snowflake, Tv, Dumbbell, Utensils, Wine, Bath, Mountain, Palmtree, Shield, Phone, CreditCard, Luggage, Key, Flame, Sun, Droplets, BedDouble, Wind, ShowerHead, HelpCircle } from 'lucide-react';

// ============================================================================
// AMENITY REGISTRY — Fuente unica de verdad para amenidades del hotel
//
// Usado por:
// - SettingsPanel.tsx (tab Perfil Channel — botones de amenidades)
// - Channel page (hotel/[slug]/page.tsx — renderizado de amenidades)
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

export function getAmenityById(id: string): AmenityDefinition | null {
  return AMENITY_REGISTRY[id] || null;
}

export function getAmenityLabel(id: string): string {
  return AMENITY_REGISTRY[id]?.label || id;
}

export function getAmenityIcon(id: string): React.ElementType {
  return AMENITY_REGISTRY[id]?.icon || HelpCircle;
}

// ============================================================================
// ROOM AMENITY REGISTRY — Fuente unica de verdad para amenidades de habitacion
//
// Usado por:
// - RoomEditorModal.tsx (seleccion de comodidades)
// - AvailabilitySearchBar.tsx (filtros de amenidades Channel unificados)
// - RoomComparison.tsx (tabla comparativa Channel)
// - RoomCard.tsx (badges de storytelling Channel)
// - RoomShowcaseModal.tsx (amenity glass Channel)
// - onboarding/page.tsx (wizard de aprovisionamiento)
//
// Para agregar una nueva amenidad de habitacion:
// 1. Agregar entrada aqui con id, label, icon
// 2. Opcional: agregar storyTitle y storyDescription para Channel storytelling
// ============================================================================

export interface RoomAmenityDefinition {
  id: string;
  label: string;
  icon: React.ElementType;
  storyTitle?: string;
  storyDescription?: string;
}

export const ROOM_AMENITY_REGISTRY: Record<string, RoomAmenityDefinition> = {
  wifi: {
    id: 'wifi',
    label: 'Wi-Fi Gratis',
    icon: Wifi,
    storyTitle: 'Conexion Ininterrumpida',
    storyDescription: 'Alta velocidad mediante fibra optica para mantenerse conectado o desconectar bajo sus propios terminos.',
  },
  tv: {
    id: 'tv',
    label: 'TV Pantalla Plana',
    icon: Tv,
    storyTitle: 'Entretenimiento Premium',
    storyDescription: 'Pantalla de alta definicion con contenido bajo demanda para sus noches de descanso.',
  },
  ac: {
    id: 'ac',
    label: 'Climatizacion',
    icon: Snowflake,
    storyTitle: 'Climatizacion Perfecta',
    storyDescription: 'Control termico de precision para ignorar el frio de la montana o el calor de la tarde.',
  },
  jacuzzi: {
    id: 'jacuzzi',
    label: 'Jacuzzi',
    icon: Bath,
    storyTitle: 'Burbujas de Relajacion',
    storyDescription: 'Sumerja sus sentidos en hidromasaje privado con vistas inigualables al valle.',
  },
  bano_privado: {
    id: 'bano_privado',
    label: 'Bano Privado',
    icon: ShowerHead,
    storyTitle: 'Refugio Intimo',
    storyDescription: 'Bano exclusivo de la habitacion con acabados premium para su total comodidad.',
  },
  parking: {
    id: 'parking',
    label: 'Parqueadero',
    icon: Car,
  },
  minibar: {
    id: 'minibar',
    label: 'Minibar',
    icon: Coffee,
    storyTitle: 'Minibar de Autor',
    storyDescription: 'Una seleccion curada de sabores locales lista para ser descubierta a su llegada.',
  },
  chimenea: {
    id: 'chimenea',
    label: 'Chimenea',
    icon: Flame,
    storyTitle: 'Fuego Procer',
    storyDescription: 'Chimenea real de lena para calentar conversaciones y revivir la nostalgia boyacense.',
  },
  techo_panoramico: {
    id: 'techo_panoramico',
    label: 'Techo Panoramico',
    icon: Sun,
    storyTitle: 'Cielo de Plata',
    storyDescription: 'Visualizacion directa a la Via Lactea desde la comodidad absoluta de su domo.',
  },
  ducha_lluvia: {
    id: 'ducha_lluvia',
    label: 'Ducha Lluvia',
    icon: Droplets,
    storyTitle: 'Ducha Sensorial',
    storyDescription: 'Arquitectura hidrica disenada para simular una lluvia constante de alta presion.',
  },
  cama_premium: {
    id: 'cama_premium',
    label: 'Cama Premium',
    icon: BedDouble,
    storyTitle: 'Santuario de Hilos',
    storyDescription: 'Ropa de cama de alta calidad para un descanso reparador entre montanas.',
  },
  balcon: {
    id: 'balcon',
    label: 'Balcon',
    icon: Mountain,
  },
};

export function getRoomAmenityById(id: string): RoomAmenityDefinition | null {
  const entry = ROOM_AMENITY_REGISTRY[id];
  if (!entry) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[amenity-registry] Unknown room amenity ID: "${id}". Skipping render.`);
    }
    return null;
  }
  return entry;
}

export function getRoomAmenityLabel(id: string): string {
  return ROOM_AMENITY_REGISTRY[id]?.label || id;
}

export function getRoomAmenityIcon(id: string): React.ElementType {
  return ROOM_AMENITY_REGISTRY[id]?.icon || HelpCircle;
}
