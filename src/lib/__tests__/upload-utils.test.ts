import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  DEFAULT_COMPRESSION,
  THUMBNAIL_COMPRESSION,
  compressImage,
  validateCompression,
  getCompressionPreset,
} from '../upload-utils';

// Mock browser-image-compression
vi.mock('browser-image-compression', () => ({
  default: vi.fn(async (file: File, options: any) => {
    // Simulate compression based on options
    const quality = options.initialQuality || 1.0;
    const maxSizeMB = options.maxSizeMB || Infinity;
    
    // Mock compressed file with reduced size
    const compressedSize = Math.min(
      file.size * quality * 0.5, // Simulate 50% reduction from quality
      maxSizeMB * 1024 * 1024 // Respect maxSizeMB limit
    );
    
    return new File(['compressed'], file.name, { type: options.fileType || file.type });
  }),
}));

describe('upload-utils compression configuration', () => {
  describe('DEFAULT_COMPRESSION', () => {
    it('should have initialQuality set to 0.75 for optimal compression', () => {
      expect(DEFAULT_COMPRESSION.initialQuality).toBe(0.75);
    });

    it('should have maxSizeMB set to 0.5 for production-ready images', () => {
      expect(DEFAULT_COMPRESSION.maxSizeMB).toBe(0.5);
    });

    it('should use WebP format for modern browsers', () => {
      expect(DEFAULT_COMPRESSION.fileType).toBe('image/webp');
    });

    it('should use WebWorker for non-blocking compression', () => {
      expect(DEFAULT_COMPRESSION.useWebWorker).toBe(true);
    });

    it('should limit max dimension to 1920px for full-size images', () => {
      expect(DEFAULT_COMPRESSION.maxWidthOrHeight).toBe(1920);
    });
  });

  describe('THUMBNAIL_COMPRESSION', () => {
    it('should have initialQuality set to 0.70 for aggressive compression', () => {
      expect(THUMBNAIL_COMPRESSION.initialQuality).toBe(0.70);
    });

    it('should have maxSizeMB set to 0.1 for fast-loading thumbnails', () => {
      expect(THUMBNAIL_COMPRESSION.maxSizeMB).toBe(0.1);
    });

    it('should limit max dimension to 400px for thumbnails', () => {
      expect(THUMBNAIL_COMPRESSION.maxWidthOrHeight).toBe(400);
    });

    it('should use WebP format', () => {
      expect(THUMBNAIL_COMPRESSION.fileType).toBe('image/webp');
    });
  });

  describe('getCompressionPreset', () => {
    it('should return DEFAULT_COMPRESSION for "full" preset', () => {
      const preset = getCompressionPreset('full');
      expect(preset).toEqual(DEFAULT_COMPRESSION);
    });

    it('should return THUMBNAIL_COMPRESSION for "thumbnail" preset', () => {
      const preset = getCompressionPreset('thumbnail');
      expect(preset).toEqual(THUMBNAIL_COMPRESSION);
    });

    it('should return CARD_COMPRESSION for "card" preset', () => {
      const preset = getCompressionPreset('card');
      expect(preset.maxSizeMB).toBe(0.3);
      expect(preset.maxWidthOrHeight).toBe(800);
      expect(preset.initialQuality).toBe(0.75);
    });

    it('should default to DEFAULT_COMPRESSION for unknown preset', () => {
      const preset = getCompressionPreset('unknown' as any);
      expect(preset).toEqual(DEFAULT_COMPRESSION);
    });
  });
});

describe('validateCompression', () => {
  const createMockFile = (size: number, name = 'test.jpg'): File => {
    return new File(['x'.repeat(size)], name, { type: 'image/jpeg' });
  };

  it('should return compression metrics for successful compression', () => {
    const original = createMockFile(2 * 1024 * 1024); // 2MB
    const compressed = createMockFile(400 * 1024); // 400KB

    const metrics = validateCompression(original, compressed);

    expect(metrics.originalSize).toBe(2 * 1024 * 1024);
    expect(metrics.compressedSize).toBe(400 * 1024);
    expect(metrics.compressionRatio).toBeCloseTo(0.2, 2); // 20% of original
    expect(metrics.savings).toBeCloseTo(80, 0); // ~80% savings
  });

  it('should detect low compression ratio (< 60% savings)', () => {
    const original = createMockFile(1000 * 1024); // 1MB
    const compressed = createMockFile(600 * 1024); // 600KB (only 40% savings)

    const metrics = validateCompression(original, compressed);

    expect(metrics.isOptimal).toBe(false);
    expect(metrics.warning).toContain('Low compression');
  });

  it('should detect optimal compression ratio (> 70% savings)', () => {
    const original = createMockFile(2000 * 1024); // 2MB
    const compressed = createMockFile(400 * 1024); // 400KB (80% savings)

    const metrics = validateCompression(original, compressed);

    expect(metrics.isOptimal).toBe(true);
    expect(metrics.warning).toBeUndefined();
  });

  it('should handle edge case where compressed is larger than original', () => {
    const original = createMockFile(100 * 1024); // 100KB
    const compressed = createMockFile(150 * 1024); // 150KB (larger!)

    const metrics = validateCompression(original, compressed);

    expect(metrics.isOptimal).toBe(false);
    expect(metrics.warning).toContain('larger than original');
  });

  it('should calculate correct compression ratio', () => {
    const original = createMockFile(1000 * 1024);
    const compressed = createMockFile(250 * 1024);

    const metrics = validateCompression(original, compressed);

    expect(metrics.compressionRatio).toBe(0.25); // 25% of original
    expect(metrics.savings).toBe(75); // 75% savings
  });
});

describe('compressImage with quality settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should use initialQuality from DEFAULT_COMPRESSION', async () => {
    const file = new File(['test'], 'photo.jpg', { type: 'image/jpeg' });
    
    await compressImage(file, DEFAULT_COMPRESSION);

    const imageCompression = (await import('browser-image-compression')).default;
    expect(imageCompression).toHaveBeenCalledWith(
      file,
      expect.objectContaining({
        initialQuality: 0.75,
      })
    );
  });

  it('should use initialQuality from THUMBNAIL_COMPRESSION', async () => {
    const file = new File(['test'], 'photo.jpg', { type: 'image/jpeg' });
    
    await compressImage(file, THUMBNAIL_COMPRESSION);

    const imageCompression = (await import('browser-image-compression')).default;
    expect(imageCompression).toHaveBeenCalledWith(
      file,
      expect.objectContaining({
        initialQuality: 0.70,
      })
    );
  });

  it('should respect maxSizeMB limit', async () => {
    const file = new File(['test'], 'photo.jpg', { type: 'image/jpeg' });
    
    await compressImage(file, { ...DEFAULT_COMPRESSION, maxSizeMB: 0.3 });

    const imageCompression = (await import('browser-image-compression')).default;
    expect(imageCompression).toHaveBeenCalledWith(
      file,
      expect.objectContaining({
        maxSizeMB: 0.3,
      })
    );
  });
});
