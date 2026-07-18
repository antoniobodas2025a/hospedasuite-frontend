import type { ImageCategory } from "@/types";

/**
 * All valid image categories in display priority order.
 */
export const IMAGE_CATEGORIES: ImageCategory[] = [
  "exterior",
  "lobby",
  "habitacion",
  "bano",
  "amenidades",
  "restaurante",
  "entorno",
  "otros",
];

/**
 * Spanish display labels for each category (user-facing UI).
 */
export const CATEGORY_DISPLAY_ES: Record<ImageCategory, string> = {
  exterior: "Exteriores",
  lobby: "Lobby / Recepción",
  habitacion: "Habitaciones",
  bano: "Baños",
  amenidades: "Amenidades",
  restaurante: "Restaurante",
  entorno: "Entorno / Vistas",
  otros: "Otros",
};

/**
 * Category priority order for gallery display.
 * Images are grouped and sorted by this array.
 */
export const CATEGORY_PRIORITY: ImageCategory[] = [
  "exterior",
  "lobby",
  "habitacion",
  "bano",
  "amenidades",
  "restaurante",
  "entorno",
  "otros",
];
