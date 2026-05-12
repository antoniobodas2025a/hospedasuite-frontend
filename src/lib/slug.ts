// ============================================================================
// 🏷️ Generación de Slugs SEO-friendly
//
// Normaliza caracteres Unicode (acentos, ñ, etc.), elimina caracteres
// especiales, y previene colisiones consultando la DB si es necesario.
// ============================================================================

/**
 * Normaliza un nombre a slug seguro para URLs.
 * 
 * Ejemplos:
 *   "María López" → "maria-lopez"
 *   "Hotel & Spa 5⭐" → "hotel-spa-5"
 *   "  Casa   Bonita  " → "casa-bonita"
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    // Normalizar Unicode: í → i, ñ → n, ü → u, etc.
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // elimina diacríticos (acentos, diéresis)
    // Reemplazar & por 'y'
    .replace(/&/g, 'y')
    // Eliminar caracteres no alfanuméricos (excepto guiones)
    .replace(/[^a-z0-9\s-]/g, '')
    // Espacios y guiones múltiples → guión simple
    .replace(/[\s-]+/g, '-')
    // Sacar guiones del inicio y final
    .replace(/^-+|-+$/g, '');
}

/**
 * Genera un slug único consultando la DB.
 * Si el slug ya existe, agrega un sufijo numérico: "mi-hotel", "mi-hotel-1", etc.
 */
export async function generateUniqueSlug(
  name: string,
  checkExists: (slug: string) => Promise<boolean>
): Promise<string> {
  const baseSlug = generateSlug(name);
  if (!baseSlug) return 'hotel';

  let slug = baseSlug;
  let counter = 0;

  while (await checkExists(slug)) {
    counter++;
    slug = `${baseSlug}-${counter}`;
  }

  return slug;
}
