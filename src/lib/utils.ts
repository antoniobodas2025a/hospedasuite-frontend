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
