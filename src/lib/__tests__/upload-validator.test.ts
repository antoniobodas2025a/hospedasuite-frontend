import { describe, it, expect } from 'vitest';
import { detectUploadFailures } from '../upload-validator';

// ─────────────────────────────────────────────────────────────
// detectUploadFailures — upload pipeline failure detection
// ─────────────────────────────────────────────────────────────
describe('detectUploadFailures', () => {
  it('returns null when all gallery uploads succeed', () => {
    const result = detectUploadFailures({
      galleryFileCount: 5,
      galleryUrlCount: 5,
      rooms: [],
    });
    expect(result).toBeNull();
  });

  it('returns null when all gallery and room uploads succeed', () => {
    const result = detectUploadFailures({
      galleryFileCount: 3,
      galleryUrlCount: 3,
      rooms: [
        { name: 'Suite', imageFileCount: 2, imageUrlCount: 2 },
        { name: 'Doble', imageFileCount: 1, imageUrlCount: 1 },
      ],
    });
    expect(result).toBeNull();
  });

  it('returns null when there are no files to upload (empty gallery, empty rooms)', () => {
    const result = detectUploadFailures({
      galleryFileCount: 0,
      galleryUrlCount: 0,
      rooms: [],
    });
    expect(result).toBeNull();
  });

  it('detects partial gallery failure', () => {
    const result = detectUploadFailures({
      galleryFileCount: 5,
      galleryUrlCount: 3,
      rooms: [],
    });
    expect(result).not.toBeNull();
    expect(result).toContain('2 de 5');
    expect(result).toContain('galería');
  });

  it('detects complete gallery failure (zero uploads succeeded)', () => {
    const result = detectUploadFailures({
      galleryFileCount: 4,
      galleryUrlCount: 0,
      rooms: [],
    });
    expect(result).not.toBeNull();
    expect(result).toContain('Ninguna imagen');
    expect(result).toContain('4 intentos');
  });

  it('detects partial room image failure', () => {
    const result = detectUploadFailures({
      galleryFileCount: 3,
      galleryUrlCount: 3,
      rooms: [
        { name: 'Suite Presidencial', imageFileCount: 4, imageUrlCount: 2 },
      ],
    });
    expect(result).not.toBeNull();
    expect(result).toContain('Suite Presidencial');
    expect(result).toContain('2 de 4');
  });

  it('detects complete room image failure', () => {
    const result = detectUploadFailures({
      galleryFileCount: 2,
      galleryUrlCount: 2,
      rooms: [
        { name: 'Económica', imageFileCount: 3, imageUrlCount: 0 },
      ],
    });
    expect(result).not.toBeNull();
    expect(result).toContain('Económica');
    expect(result).toContain('no tiene imágenes subidas');
  });

  it('detects failure in second room while first room is OK', () => {
    const result = detectUploadFailures({
      galleryFileCount: 1,
      galleryUrlCount: 1,
      rooms: [
        { name: 'Room A', imageFileCount: 2, imageUrlCount: 2 },
        { name: 'Room B', imageFileCount: 1, imageUrlCount: 0 },
      ],
    });
    expect(result).not.toBeNull();
    expect(result).toContain('Room B');
    expect(result).not.toContain('Room A');
  });

  it('prioritizes gallery failure over room failures', () => {
    const result = detectUploadFailures({
      galleryFileCount: 3,
      galleryUrlCount: 2,
      rooms: [
        { name: 'Room X', imageFileCount: 2, imageUrlCount: 1 },
      ],
    });
    expect(result).not.toBeNull();
    expect(result).toContain('galería');
    expect(result).not.toContain('Room X');
  });

  it('handles single-file upload with single failure', () => {
    const result = detectUploadFailures({
      galleryFileCount: 1,
      galleryUrlCount: 0,
      rooms: [],
    });
    expect(result).not.toBeNull();
    expect(result).toContain('Ninguna');
    expect(result).toContain('1 intentos');
  });

  it('detects room failure when gallery is empty (zero files)', () => {
    const result = detectUploadFailures({
      galleryFileCount: 0,
      galleryUrlCount: 0,
      rooms: [
        { name: 'Loft', imageFileCount: 5, imageUrlCount: 4 },
      ],
    });
    expect(result).not.toBeNull();
    expect(result).toContain('Loft');
    expect(result).toContain('1 de 5');
  });

  it('detects room failure when multiple rooms have issues (reports first)', () => {
    const result = detectUploadFailures({
      galleryFileCount: 2,
      galleryUrlCount: 2,
      rooms: [
        { name: 'Primera', imageFileCount: 3, imageUrlCount: 2 },
        { name: 'Segunda', imageFileCount: 2, imageUrlCount: 0 },
      ],
    });
    expect(result).not.toBeNull();
    expect(result).toContain('Primera');
    expect(result).not.toContain('Segunda');
  });
});
