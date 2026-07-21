import { describe, it, expect } from 'vitest';
import { validateProvisioningImageUrls } from '../provisioning-guard';

// ─────────────────────────────────────────────────────────────
// validateProvisioningImageUrls — server-side blob/data URL guard
// ─────────────────────────────────────────────────────────────
describe('validateProvisioningImageUrls', () => {
  it('returns null when all URLs are valid HTTPS', () => {
    const result = validateProvisioningImageUrls({
      galleryImages: [{ url: 'https://r2.dev/hotels/photo.webp', category: 'exterior', sort_order: 0 }],
      rooms: [
        { name: 'Suite', imageUrls: ['https://r2.dev/hotels/room.webp'] },
      ],
    });
    expect(result).toBeNull();
  });

  it('returns null for empty gallery and rooms with empty image arrays', () => {
    const result = validateProvisioningImageUrls({
      galleryImages: [],
      rooms: [
        { name: 'Habitación', imageUrls: [] },
      ],
    });
    expect(result).toBeNull();
  });

  it('returns null for empty gallery and no rooms', () => {
    const result = validateProvisioningImageUrls({
      galleryImages: [],
      rooms: [],
    });
    expect(result).toBeNull();
  });

  it('returns error for blob: URL in galleryImages', () => {
    const result = validateProvisioningImageUrls({
      galleryImages: [{ url: 'blob:http://localhost/abc-123', category: 'exterior', sort_order: 0 }],
      rooms: [],
    });
    expect(result).not.toBeNull();
    expect(result).toContain('URL inválida');
    expect(result).toContain('galería');
  });

  it('returns error for data: URL in galleryImages', () => {
    const result = validateProvisioningImageUrls({
      galleryImages: [{ url: 'data:image/png;base64,abc', category: 'exterior', sort_order: 0 }],
      rooms: [],
    });
    expect(result).not.toBeNull();
  });

  it('returns error for javascript: URL in galleryImages', () => {
    const result = validateProvisioningImageUrls({
      galleryImages: [{ url: 'javascript:alert(1)', category: 'exterior', sort_order: 0 }],
      rooms: [],
    });
    expect(result).not.toBeNull();
  });

  it('returns error for blob: URL in room imageUrls', () => {
    const result = validateProvisioningImageUrls({
      galleryImages: [{ url: 'https://valid.com/img.webp', category: 'exterior', sort_order: 0 }],
      rooms: [
        { name: 'Suite Deluxe', imageUrls: ['blob:http://localhost/room'] },
      ],
    });
    expect(result).not.toBeNull();
    expect(result).toContain('Suite Deluxe');
    expect(result).toContain('inválida');
  });

  it('returns error for data: URL in room imageUrls', () => {
    const result = validateProvisioningImageUrls({
      galleryImages: [],
      rooms: [
        { name: 'Doble', imageUrls: ['data:image/jpeg;base64,xyz'] },
      ],
    });
    expect(result).not.toBeNull();
    expect(result).toContain('Doble');
  });

  it('detects mixed valid and invalid URLs in gallery', () => {
    const result = validateProvisioningImageUrls({
      galleryImages: [
        { url: 'https://valid.com/a.webp', category: 'exterior', sort_order: 0 },
        { url: 'blob:invalid', category: 'lobby', sort_order: 1 }
      ],
      rooms: [],
    });
    expect(result).not.toBeNull();
  });

  it('detects blob URL among multiple rooms (reports count)', () => {
    const result = validateProvisioningImageUrls({
      galleryImages: [{ url: 'https://cdn.example.com/1.webp', category: 'exterior', sort_order: 0 }],
      rooms: [
        { name: 'Room A', imageUrls: ['https://cdn.example.com/room-a.webp'] },
        { name: 'Room B', imageUrls: ['https://cdn.example.com/room-b.webp', 'blob:broken'] },
      ],
    });
    expect(result).not.toBeNull();
    expect(result).toContain('Room B');
    expect(result).not.toContain('Room A');
  });

  it('prioritizes gallery error over room errors', () => {
    const result = validateProvisioningImageUrls({
      galleryImages: [{ url: 'blob:gallery-error', category: 'exterior', sort_order: 0 }],
      rooms: [
        { name: 'Room X', imageUrls: ['blob:room-error'] },
      ],
    });
    expect(result).not.toBeNull();
    expect(result).toContain('galería');
    expect(result).not.toContain('Room X');
  });

  it('includes count of invalid URLs in gallery error', () => {
    const result = validateProvisioningImageUrls({
      galleryImages: [
        { url: 'blob:1', category: 'exterior', sort_order: 0 },
        { url: 'https://ok.com/a.webp', category: 'lobby', sort_order: 1 },
        { url: 'blob:2', category: 'habitacion', sort_order: 2 },
        { url: 'blob:3', category: 'bano', sort_order: 3 }
      ],
      rooms: [],
    });
    expect(result).not.toBeNull();
    expect(result).toContain('3');
    expect(result).toContain('galería');
  });
});
