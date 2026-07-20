/**
 * Provisioning Image URL Guard
 *
 * Server-side defense-in-depth validation that rejects provisioning requests
 * containing non-persistent URL schemes (blob:, data:, javascript:).
 *
 * This runs in `executeOnboardingProvisioning` as a last-resort check
 * before the database insert, even if client-side validation is bypassed.
 */

import type { ImageCategory } from '@/types';

export function validateProvisioningImageUrls(state: {
  galleryImages: Array<{ url: string; category: ImageCategory; sort_order: number }>;
  rooms: Array<{ name: string; imageUrls: string[] }>;
}): string | null {
  // Check gallery images
  const invalidGallery = state.galleryImages.filter(
    img => img.url.startsWith('blob:') || img.url.startsWith('data:') || img.url.startsWith('javascript:'),
  );
  if (invalidGallery.length > 0) {
    if (invalidGallery.length === 1) {
      return `1 imagen de galería tiene una URL inválida. Reintentá la carga.`;
    }
    return `${invalidGallery.length} imágenes de galería tienen URLs inválidas. Reintentá la carga.`;
  }

  // Check room images
  for (const room of state.rooms) {
    const invalidRoom = room.imageUrls.filter(
      u => u.startsWith('blob:') || u.startsWith('data:') || u.startsWith('javascript:'),
    );
    if (invalidRoom.length > 0) {
      if (invalidRoom.length === 1) {
        return `La habitación "${room.name}" tiene una URL de imagen inválida. Reintentá la carga.`;
      }
      return `La habitación "${room.name}" tiene ${invalidRoom.length} URLs de imágenes inválidas. Reintentá la carga.`;
    }
  }

  return null;
}
