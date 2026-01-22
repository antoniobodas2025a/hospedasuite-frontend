/**
 * Definición estricta de límites financieros.
 */

export const STEP_VALUE = 5000; // Saltos de $5.000 COP

export const PRICING_TIERS = [
  {
    id: 'A',
    label: 'Lujo Flash',
    minPrice: 120000, // Suelo mínimo
    maxPrice: 190000, // HARD CAP (Techo de cristal)
    description: 'Alta gama, ubicación premium.',
  },
  {
    id: 'B',
    label: 'Confort',
    minPrice: 70000,
    maxPrice: 95000, // HARD CAP
    description: 'Baño privado, servicios estándar.',
  },
  {
    id: 'C',
    label: 'Mochila',
    minPrice: 30000,
    maxPrice: 45000, // HARD CAP
    description: 'Básico, limpio, seguro.',
  },
];

export const formatCurrency = (value) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(value);
};
