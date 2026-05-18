/**
 * Configuración centralizada de fuentes de imágenes.
 *
 * Para cambiar de Supabase a R2 (o cualquier otro storage),
 * solo modificás las variables de entorno y este archivo.
 *
 * Variables de entorno (.env.local):
 *   IMAGE_BASE_URL      = URL base de las imágenes (R2 CDN, S3, etc.)
 *   IMAGE_FALLBACK_URL  = URL de fallback (ej: Supabase durante transición)
 *   IMAGE_SOURCE        = 'r2' | 'supabase' | 'local' | 'external'
 *
 * Next.js Image es la capa de optimización (AVIF/WebP, lazy loading,
 * responsive sizing), no el CDN. Todas las imágenes pasan por next/image
 * para aplicar transformaciones unificadas independientemente del origen.
 *
 * Uso en componentes:
 *   import { getImageUrl } from '@/lib/image-config';
 *   <Image src={getImageUrl('covers/mi-foto.jpg')} fill alt="..." />
 */

export type ImageSource = 'r2' | 'supabase' | 'local' | 'external';

// ─── Configuración desde variables de entorno ──────────────────────

const IMAGE_SOURCE = (process.env.NEXT_PUBLIC_IMAGE_SOURCE || 'supabase') as ImageSource;
const IMAGE_BASE_URL = process.env.NEXT_PUBLIC_IMAGE_BASE_URL || '';
const IMAGE_FALLBACK_URL = process.env.NEXT_PUBLIC_IMAGE_FALLBACK_URL || '';

// ─── Presets por fuente ────────────────────────────────────────────

const PRESETS: Record<ImageSource, { baseUrl: string; fallback: string }> = {
  r2: {
    baseUrl: 'https://pub-75809b4a12c441b891f9b5a2316c2cc2.r2.dev',
    fallback: '',
  },
  supabase: {
    baseUrl: 'https://auaqpomuivfhomlkvhju.supabase.co/storage/v1/object/public/hotel-media',
    fallback: '',
  },
  local: {
    baseUrl: '/uploads', // Sirve desde public/uploads del VPS
    fallback: '',
  },
  external: {
    baseUrl: '', // Cada imagen tiene su URL completa
    fallback: '',
  },
};

// ─── Funciones públicas ────────────────────────────────────────────

/**
 * Construye la URL completa de una imagen según la fuente configurada.
 *
 * @param relativePath - Ruta relativa dentro del bucket (ej: 'covers/foto.jpg')
 * @returns URL completa de la imagen
 *
 * Ejemplos:
 *   getImageUrl('covers/mi-foto.jpg')
 *   → Supabase: https://auaqpomuivfhomlkvhju.supabase.co/storage/v1/object/public/hotel-media/covers/mi-foto.jpg
 *   → R2: https://images.hospedasuite.com/covers/mi-foto.jpg
 *   → Local: /uploads/covers/mi-foto.jpg
 */
export function getImageUrl(relativePath: string): string {
  if (!relativePath) return '';

  // Si ya es una URL absoluta (https://), devolverla tal cual
  if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
    return relativePath;
  }

  // Si empieza con /, es ruta local absoluta
  if (relativePath.startsWith('/')) {
    return relativePath;
  }

  const preset = PRESETS[IMAGE_SOURCE];
  const baseUrl = IMAGE_BASE_URL || preset.baseUrl;

  // Si no hay base URL configurada, fallback a la fuente anterior
  if (!baseUrl) {
    const fallbackPreset = PRESETS.supabase; // Siempre fallback a Supabase
    if (fallbackPreset.baseUrl) {
      return `${fallbackPreset.baseUrl}/${relativePath}`;
    }
    return relativePath;
  }

  return `${baseUrl}/${relativePath}`;
}

/**
 * Extrae el path relativo de una URL completa.
 * Útil para migrar: toma una URL de Supabase y devuelve el path para R2.
 *
 * @param fullUrl - URL completa
 * @returns Path relativo (ej: 'covers/mi-foto.jpg')
 */
export function extractRelativePath(fullUrl: string): string {
  if (!fullUrl) return '';

  // Supabase: extraer path después del bucket name
  const supabaseMatch = fullUrl.match(/\/object\/public\/[^/]+\/(.+)/);
  if (supabaseMatch) return supabaseMatch[1];

  // R2/S3: extraer path después del dominio
  const urlMatch = fullUrl.match(/:\/\/[^/]+\/(.+)/);
  if (urlMatch) return urlMatch[1];

  // Ya es relativo
  return fullUrl;
}

/**
 * Convierte una URL de Supabase a su equivalente en R2.
 *
 * @param supabaseUrl - URL completa de Supabase
 * @param r2BaseUrl - URL base de R2 (default: preset)
 * @returns URL de R2
 */
export function supabaseToR2(supabaseUrl: string, r2BaseUrl?: string): string {
  const relativePath = extractRelativePath(supabaseUrl);
  const r2Base = r2BaseUrl || PRESETS.r2.baseUrl;
  return `${r2Base}/${relativePath}`;
}

// ─── Helper para componentes ───────────────────────────────────────

/**
 * Resuelve la URL completa de una imagen para usar con next/image.
 *
 * Next.js Image es la capa de optimización (AVIF/WebP, lazy loading,
 * responsive sizing) — todas las imágenes, sin importar su origen,
 * pasan por next/image para aplicar transformaciones unificadas.
 *
 * Usage:
 *   const { url } = resolveImage('covers/foto.jpg');
 *   <Image src={url} fill alt="..." />
 */
export function resolveImage(relativePath: string) {
  const url = getImageUrl(relativePath);
  return { url, useNative: false };
}

// ─── Multi-size URL resolution ─────────────────────────────────────

export type ImageSize = 'thumb' | 'card' | 'full';

/**
 * Deriva la URL de un tamaño específico desde una URL base.
 *
 * Convención de nombres:
 *   - `image.webp` (legacy, sin sufijo) → fallback a la misma URL
 *   - `image_full.webp` → full size
 *   - `image_card.webp` → card size (640px)
 *   - `image_thumb.webp` → thumbnail (256px)
 *
 * Para imágenes legacy sin sufijo, devuelve la URL original.
 * Next.js Image optimiza al vuelo como fallback.
 *
 * @param baseUrl - URL completa de la imagen (generalmente la versión full)
 * @param size - Tamaño deseado: 'thumb' | 'card' | 'full'
 * @returns URL del tamaño solicitado
 */
export function getImageSizeUrl(baseUrl: string, size: ImageSize): string {
  if (!baseUrl) return '';

  // Si ya tiene el sufijo correcto, devolver tal cual
  if (baseUrl.includes(`_${size}.webp`) || baseUrl.includes(`_${size}.jpg`) || baseUrl.includes(`_${size}.png`)) {
    return baseUrl;
  }

  // Si tiene otro sufijo de tamaño, reemplazarlo
  const sizePattern = /_(thumb|card|full)\.(webp|jpg|png|jpeg)$/i;
  if (sizePattern.test(baseUrl)) {
    return baseUrl.replace(sizePattern, `_${size}.$2`);
  }

  // Si no tiene sufijo (legacy), agregar el sufijo antes de la extensión
  const extPattern = /\.(webp|jpg|png|jpeg)(\?.*)?$/i;
  const match = baseUrl.match(extPattern);
  if (match) {
    const ext = match[1];
    const query = match[2] || '';
    return baseUrl.replace(extPattern, `_${size}.${ext}${query}`);
  }

  // Si no se puede determinar la extensión, fallback a la URL original
  return baseUrl;
}

/**
 * Extrae el blurDataURL de una URL si está almacenado como query param.
 * Para imágenes nuevas, el blurDataURL se genera al subir y se pasa
 * como prop separado. Esta función es un fallback para casos edge.
 */
export function extractBlurDataUrl(url: string): string | null {
  if (!url) return null;
  try {
    const urlObj = new URL(url);
    return urlObj.searchParams.get('blur') || null;
  } catch {
    return null;
  }
}

// ─── Blur metadata type ─────────────────────────────────────────────

export type ImageBlurMeta = {
  main_image_blur?: string;
  cover_photo_blur?: string;
  gallery_blurs?: { url: string; blur: string }[];
};

// ─── SrcSet builder ─────────────────────────────────────────────────

/**
 * Construye un string srcSet con los 3 tamaños para <img srcSet>.
 *
 * Formato: "thumb_url 256w, card_url 640w, full_url 1920w"
 *
 * @param baseUrl - URL base de la imagen (generalmente la versión full)
 * @returns String srcSet listo para usar en un atributo srcSet
 */
export function buildSrcSet(baseUrl: string): string {
  if (!baseUrl) return '';
  const thumb = getImageSizeUrl(baseUrl, 'thumb');
  const card = getImageSizeUrl(baseUrl, 'card');
  const full = getImageSizeUrl(baseUrl, 'full');
  return `${thumb} 256w, ${card} 640w, ${full} 1920w`;
}
