import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Transforma URLs de Supabase Storage para usar el endpoint de render
 * que sirve imágenes optimizadas (bajo 1MB para Next.js Image API).
 *
 * Next.js tiene un límite hardcodeado de 1MB para optimización de imágenes.
 * Las fotos de Supabase pueden pesar 5MB+. Usamos /storage/v1/render/image/public/
 * para que Supabase redimensione antes de que Next.js la procese.
 *
 * Tiers de calidad recomendados:
 * - Hero/Full: width=1200, quality=80
 * - Card:      width=640,  quality=75
 * - Thumb:     width=128,  quality=50
 *
 * TODO: Al migrar a PostgreSQL + VPS, esta función se reemplaza por
 * un custom loader que apunte al storage local o Cloudflare R2.
 */
export function optimizeSupabaseUrl(
  url: string,
  options?: { width?: number; quality?: number }
): string {
  if (!url || !url.includes('supabase.co/storage/v1/object/public/')) {
    return url;
  }

  const width = options?.width ?? 1200;
  const quality = options?.quality ?? 75;

  return url
    .replace('/storage/v1/object/public/', '/storage/v1/render/image/public/')
    .replace(/\?.*$/, '')
    + `?width=${width}&quality=${quality}`;
}
