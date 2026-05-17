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
 * Uso en componentes:
 *   import { getImageUrl } from '@/lib/image-config';
 *   <img src={getImageUrl('covers/mi-foto.jpg')} />
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

/**
 * Determina si una imagen debe servirse con <img> (CDN externo)
 * o con <Image> de Next.js (optimización local).
 *
 * @param url - URL de la imagen
 * @returns true si usar <img> directo, false si usar <Image>
 */
export function shouldUseNativeImg(url: string): boolean {
  // CDN externo (R2, Supabase, S3) → ya optimizan, usar <img>
  if (url.includes('supabase.co')) return true;
  if (url.includes('r2.dev')) return true;
  if (url.includes('cloudflare')) return true;
  if (url.includes('s3.') || url.includes('amazonaws.com')) return true;

  // Imágenes locales o de Next.js → usar <Image> para AVIF/WebP
  return false;
}

// ─── Helper para componentes ───────────────────────────────────────

/**
 * Hook/función para usar en componentes que necesitan saber
 * qué tipo de componente de imagen usar.
 *
 * Usage:
 *   const { url, useNative } = resolveImage('covers/foto.jpg');
 *   {useNative ? <img src={url} /> : <Image src={url} fill />}
 */
export function resolveImage(relativePath: string) {
  const url = getImageUrl(relativePath);
  const useNative = shouldUseNativeImg(url);
  return { url, useNative };
}
