/**
 * REGLAS DE NEGOCIO: LEYVAPASS
 * Definición inmutable de los límites de precios (Hard Caps).
 * Object.freeze previene modificaciones accidentales en tiempo de ejecución.
 */

export const PRICING_TIERS = Object.freeze({
  A: {
    id: 'A',
    label: 'Lujo Flash',
    hardCap: 190000, // $190k
    description: 'Alta gama, ubicación premium.',
  },
  B: {
    id: 'B',
    label: 'Confort',
    hardCap: 95000, // $95k
    description: 'Baño privado, servicios estándar.',
  },
  C: {
    id: 'C',
    label: 'Mochila',
    hardCap: 45000, // $45k
    description: 'Básico, limpio, seguro.',
  },
});

// Helper para obtener el cap rápidamente por ID
export const getHardCap = (tierId) => {
  return PRICING_TIERS[tierId]?.hardCap || 0;
};
