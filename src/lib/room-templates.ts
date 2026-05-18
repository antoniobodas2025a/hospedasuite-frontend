export type PropertyType = 'hotel' | 'glamping' | 'cabanas' | 'hostal' | 'apartamento';

export interface RoomTemplate {
  id: string;
  name: string;
  suggestedAmenities: string[];
  defaultCapacity: number;
  defaultBeds: number;
  priceRange: [number, number]; // [min, max] in COP
  description: string;
}

export const ROOM_TEMPLATES: Record<PropertyType, RoomTemplate[]> = {
  hotel: [
    {
      id: 'standard',
      name: 'Habitación Estándar',
      suggestedAmenities: ['wifi', 'tv', 'ac', 'private-bathroom'],
      defaultCapacity: 2,
      defaultBeds: 1,
      priceRange: [80000, 200000],
      description: 'Habitación cómoda con todo lo esencial para una estadía placentera.',
    },
    {
      id: 'suite',
      name: 'Suite Premium',
      suggestedAmenities: ['wifi', 'tv', 'ac', 'private-bathroom', 'minibar', 'balcony'],
      defaultCapacity: 3,
      defaultBeds: 2,
      priceRange: [200000, 500000],
      description: 'Espacio amplio con detalles de lujo y vista privilegiada.',
    },
    {
      id: 'double',
      name: 'Habitación Doble',
      suggestedAmenities: ['wifi', 'tv', 'ac', 'private-bathroom'],
      defaultCapacity: 4,
      defaultBeds: 2,
      priceRange: [120000, 300000],
      description: 'Ideal para familias, con espacio para todos.',
    },
  ],
  glamping: [
    {
      id: 'domo',
      name: 'Domo Estelar',
      suggestedAmenities: ['wifi', 'private-bathroom', 'heater', 'skylight'],
      defaultCapacity: 2,
      defaultBeds: 1,
      priceRange: [250000, 600000],
      description: 'Domo geodésico con vista al cielo nocturno.',
    },
    {
      id: 'cabana-premium',
      name: 'Cabaña Premium',
      suggestedAmenities: ['wifi', 'private-bathroom', 'heater', 'kitchenette', 'fireplace'],
      defaultCapacity: 4,
      defaultBeds: 2,
      priceRange: [300000, 700000],
      description: 'Cabaña de lujo rodeada de naturaleza.',
    },
    {
      id: 'tienda-lujo',
      name: 'Tienda de Lujo',
      suggestedAmenities: ['wifi', 'private-bathroom', 'heater'],
      defaultCapacity: 2,
      defaultBeds: 1,
      priceRange: [150000, 400000],
      description: 'Glamping auténtico con todas las comodidades.',
    },
  ],
  cabanas: [
    {
      id: 'cabana-familiar',
      name: 'Cabaña Familiar',
      suggestedAmenities: ['wifi', 'private-bathroom', 'kitchenette', 'bbq', 'parking'],
      defaultCapacity: 6,
      defaultBeds: 3,
      priceRange: [200000, 500000],
      description: 'Espacio amplio para toda la familia.',
    },
    {
      id: 'cabana-romantica',
      name: 'Cabaña Romántica',
      suggestedAmenities: ['wifi', 'private-bathroom', 'jacuzzi', 'fireplace'],
      defaultCapacity: 2,
      defaultBeds: 1,
      priceRange: [250000, 600000],
      description: 'El refugio perfecto para parejas.',
    },
    {
      id: 'cabana-jacuzzi',
      name: 'Cabaña con Jacuzzi',
      suggestedAmenities: ['wifi', 'private-bathroom', 'jacuzzi', 'kitchenette'],
      defaultCapacity: 4,
      defaultBeds: 2,
      priceRange: [300000, 700000],
      description: 'Relajación total con jacuzzi privado.',
    },
  ],
  hostal: [
    {
      id: 'cama-dormitorio',
      name: 'Cama en Dormitorio',
      suggestedAmenities: ['wifi', 'shared-bathroom', 'locker'],
      defaultCapacity: 1,
      defaultBeds: 1,
      priceRange: [30000, 80000],
      description: 'Opción económica para viajeros solitarios.',
    },
    {
      id: 'habitacion-privada',
      name: 'Habitación Privada',
      suggestedAmenities: ['wifi', 'private-bathroom', 'tv'],
      defaultCapacity: 2,
      defaultBeds: 1,
      priceRange: [60000, 150000],
      description: 'Privacidad con precio accesible.',
    },
  ],
  apartamento: [
    {
      id: 'apartamento-completo',
      name: 'Apartamento Completo',
      suggestedAmenities: ['wifi', 'kitchen', 'washer', 'tv', 'parking'],
      defaultCapacity: 4,
      defaultBeds: 2,
      priceRange: [150000, 400000],
      description: 'Tu hogar lejos de casa.',
    },
    {
      id: 'studio',
      name: 'Studio',
      suggestedAmenities: ['wifi', 'kitchenette', 'tv'],
      defaultCapacity: 2,
      defaultBeds: 1,
      priceRange: [100000, 250000],
      description: 'Espacio compacto y funcional.',
    },
  ],
};

export function getTemplatesForProperty(type: PropertyType): RoomTemplate[] {
  return ROOM_TEMPLATES[type] || [];
}

export function getTemplateById(type: PropertyType, templateId: string): RoomTemplate | undefined {
  return ROOM_TEMPLATES[type]?.find(t => t.id === templateId);
}
