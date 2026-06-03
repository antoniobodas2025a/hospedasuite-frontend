/**
 * Upload Validation Utilities
 *
 * Pure functions for detecting upload failures during the provisioning pipeline.
 * Extracted for testability per Strict TDD Extract-Before-Mock Rule.
 */

/**
 * Detects upload failures in the provisioning upload pipeline.
 *
 * Fails hard if ANY file didn't get uploaded — no silent fallback to blob previews.
 * Gallery is checked first; room images are checked only if gallery is clean.
 *
 * @returns null if all uploads succeeded, or a Spanish error message describing the failure.
 */
export function detectUploadFailures(params: {
  galleryFileCount: number;
  galleryUrlCount: number;
  rooms: Array<{ name: string; imageFileCount: number; imageUrlCount: number }>;
}): string | null {
  // Gallery images check
  const failedGallery = params.galleryFileCount - params.galleryUrlCount;
  if (failedGallery > 0) {
    if (params.galleryUrlCount === 0) {
      return `Ninguna imagen de galería se pudo subir (${params.galleryFileCount} intentos fallidos).`;
    }
    return `${failedGallery} de ${params.galleryFileCount} imágenes de galería no se pudieron subir.`;
  }

  // Room images check
  for (const room of params.rooms) {
    const failed = room.imageFileCount - room.imageUrlCount;
    if (failed > 0) {
      if (room.imageUrlCount === 0) {
        return `La habitación "${room.name}" no tiene imágenes subidas (${room.imageFileCount} intentos fallidos).`;
      }
      return `La habitación "${room.name}" tiene ${failed} de ${room.imageFileCount} imágenes que no se pudieron subir.`;
    }
  }

  return null;
}
