import { describe, it, expect } from 'vitest';
import { validateImageFile, MAX_FILE_SIZE_MB, ALLOWED_MIME_TYPES } from '@/lib/upload-utils';

describe('R2 Upload Validation (Heurística #5)', () => {
  // ─── S1: Prevención local para evitar Status 400 ───

  it('debe rechazar archivos vacíos', () => {
    const emptyFile = new File([''], 'empty.jpg', { type: 'image/jpeg' });
    const result = validateImageFile(emptyFile);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('vacío');
  });

  it('debe rechazar archivos que exceden el límite de tamaño', () => {
    const bigFile = new File([new ArrayBuffer(MAX_FILE_SIZE_MB * 1024 * 1024 + 1)], 'huge.jpg', { type: 'image/jpeg' });
    const result = validateImageFile(bigFile);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('muy grande');
  });

  it('debe rechazar tipos MIME no soportados', () => {
    const pdfFile = new File(['content'], 'document.pdf', { type: 'application/pdf' });
    const result = validateImageFile(pdfFile);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Formato no soportado');
  });

  it('debe aceptar JPEG válido', () => {
    const jpegFile = new File(['content'], 'photo.jpg', { type: 'image/jpeg' });
    const result = validateImageFile(jpegFile);
    expect(result.valid).toBe(true);
  });

  it('debe aceptar PNG válido', () => {
    const pngFile = new File(['content'], 'photo.png', { type: 'image/png' });
    const result = validateImageFile(pngFile);
    expect(result.valid).toBe(true);
  });

  it('debe aceptar WebP válido', () => {
    const webpFile = new File(['content'], 'photo.webp', { type: 'image/webp' });
    const result = validateImageFile(webpFile);
    expect(result.valid).toBe(true);
  });

  it('debe rechazar archivos con nombres inválidos', () => {
    // A file with a name that becomes empty after sanitization
    const badNameFile = new File(['content'], ' ', { type: 'image/jpeg' });
    const result = validateImageFile(badNameFile);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Nombre de archivo inválido');
  });

  // ─── Mutation Tests ───

  it('MUTACIÓN: si se elimina la validación de tamaño, el test debe fallar', () => {
    // This test proves the size check exists
    const bigFile = new File([new ArrayBuffer(MAX_FILE_SIZE_MB * 1024 * 1024 + 1)], 'huge.jpg', { type: 'image/jpeg' });
    expect(validateImageFile(bigFile).valid).toBe(false);
  });

  it('MUTACIÓN: si se elimina la validación de MIME type, el test debe fallar', () => {
    // This test proves the MIME check exists
    const pdfFile = new File(['content'], 'document.pdf', { type: 'application/pdf' });
    expect(validateImageFile(pdfFile).valid).toBe(false);
  });

  it('ALLOWED_MIME_TYPES debe incluir al menos jpeg, png y webp', () => {
    expect(ALLOWED_MIME_TYPES).toContain('image/jpeg');
    expect(ALLOWED_MIME_TYPES).toContain('image/png');
    expect(ALLOWED_MIME_TYPES).toContain('image/webp');
  });
});

describe('R2 Error Messages (Heurística #2: Modelo Mental)', () => {
  it('los mensajes de error de upload-utils.ts NO deben contener jerga técnica', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const content = fs.readFileSync(
      path.resolve(process.cwd(), 'src/lib/upload-utils.ts'),
      'utf8'
    );

    // Must NOT expose technical jargon in user-facing error messages
    // (Comments and variable names are OK — we only check throw new Error(...) strings)
    const errorMessages = content.match(/throw new Error\([^)]+\)/g) || [];
    for (const msg of errorMessages) {
      expect(msg).not.toContain('R2 upload failed');
      expect(msg).not.toContain('R2 Connectivity Critical');
      expect(msg).not.toContain('status 400');
      expect(msg).not.toContain('CORS');
    }

    // Must contain user-friendly messages
    expect(content).toContain('No se pudo');
  });

  it('los mensajes de error de r2-upload.ts NO deben contener jerga técnica', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const content = fs.readFileSync(
      path.resolve(process.cwd(), 'src/lib/r2-upload.ts'),
      'utf8'
    );

    expect(content).not.toContain('R2 upload failed');
    expect(content).not.toContain('R2 Connectivity Critical');
    expect(content).not.toContain('status 400');
  });

  it('MUTACIÓN: si se reintroduce "R2 upload failed" en upload-utils debe fallar', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const content = fs.readFileSync(
      path.resolve(process.cwd(), 'src/lib/upload-utils.ts'),
      'utf8'
    );
    expect(content).not.toContain('R2 upload failed');
  });

  it('MUTACIÓN: si se reintroduce "R2 upload failed" en r2-upload debe fallar', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const content = fs.readFileSync(
      path.resolve(process.cwd(), 'src/lib/r2-upload.ts'),
      'utf8'
    );
    expect(content).not.toContain('R2 upload failed');
  });
});
