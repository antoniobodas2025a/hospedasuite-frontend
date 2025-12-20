import { PRICING_TIERS } from '../config/pricingRules';

/**
 * BASE DE DATOS DE SOCIOS (Simulación)
 * Aquí registras cada hotel con su PIN único y su Tier inmutable.
 * El Tier se asigna en la visita de clasificación y NO se puede cambiar por software.
 */

export const HOTEL_DB = [
  {
    id: 1,
    name: 'La Posada del Virrey',
    pin: '1980', // PIN SECRETO
    tierId: 'A', // Tier A (Lujo) - FIJO
    lastPrice: 190000, // Precio guardado anteriormente
  },
  {
    id: 2,
    name: 'Hotel Villa Real',
    pin: '2024',
    tierId: 'B', // Tier B (Confort) - FIJO
    lastPrice: 95000,
  },
  {
    id: 3,
    name: 'Hostal El Caminante',
    pin: '1234',
    tierId: 'C', // Tier C (Mochila) - FIJO
    lastPrice: 45000,
  },
];

// Helper para buscar hotel por PIN
export const authenticateHotel = (inputPin) => {
  return HOTEL_DB.find((hotel) => hotel.pin === inputPin);
};

// Helper para obtener las reglas del Tier de un hotel específico
export const getHotelTierRules = (tierId) => {
  return PRICING_TIERS.find((t) => t.id === tierId);
};
