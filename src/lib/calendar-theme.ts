/**
 * Validates and normalizes primaryColor for calendar theming.
 * Filters out white colors, invalid values, and colors too light for white text.
 */
export function validatePrimaryColor(color: string | null | undefined): string | undefined {
  if (!color) return undefined;
  const trimmed = color.trim();
  const normalized = trimmed.toLowerCase();
  
  // Filter out white colors (would make selected dates invisible)
  if (normalized === '#ffffff' || normalized === '#fff' || normalized === 'white') {
    return undefined;
  }
  
  // Basic CSS color validation (hex, rgb, hsl, or CSS variable)
  const isValidHex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(trimmed);
  const isValidRgb = /^rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)$/i.test(trimmed);
  const isValidHsl = /^hsl\(\s*\d{1,3}\s*,\s*\d{1,3}%?\s*,\s*\d{1,3}%?\s*\)$/i.test(trimmed);
  const isValidVar = /^var\(--/.test(trimmed);

  if (!isValidHex && !isValidRgb && !isValidHsl && !isValidVar) {
    return undefined;
  }
  
  // Check if color is too light for white text (luminance > 0.7)
  if (isColorTooLight(trimmed)) {
    return undefined;
  }

  return trimmed;
}

/**
 * Checks if a color is too light for white text overlay.
 * Uses relative luminance formula (WCAG 2.0).
 */
function isColorTooLight(color: string): boolean {
  const rgb = parseColor(color);
  if (!rgb) return false;
  
  // Calculate relative luminance (WCAG 2.0 formula)
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  
  // If luminance > 0.7, color is too light for white text
  return luminance > 0.7;
}

/**
 * Parses a color string to RGB values.
 * Supports hex, rgb(), and hsl() formats.
 */
function parseColor(color: string): { r: number; g: number; b: number } | null {
  const normalized = color.trim().toLowerCase();
  
  // Parse hex
  if (normalized.startsWith('#')) {
    const hex = normalized.slice(1);
    if (hex.length === 3) {
      return {
        r: parseInt(hex[0] + hex[0], 16),
        g: parseInt(hex[1] + hex[1], 16),
        b: parseInt(hex[2] + hex[2], 16),
      };
    }
    if (hex.length === 6) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
      };
    }
  }
  
  // Parse rgb()
  const rgbMatch = normalized.match(/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/);
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1], 10),
      g: parseInt(rgbMatch[2], 10),
      b: parseInt(rgbMatch[3], 10),
    };
  }
  
  // Parse hsl() - convert to RGB
  const hslMatch = normalized.match(/^hsl\(\s*(\d{1,3})\s*,\s*(\d{1,3})%?\s*,\s*(\d{1,3})%?\s*\)$/);
  if (hslMatch) {
    const h = parseInt(hslMatch[1], 10) / 360;
    const s = parseInt(hslMatch[2], 10) / 100;
    const l = parseInt(hslMatch[3], 10) / 100;
    return hslToRgb(h, s, l);
  }
  
  return null;
}

/**
 * Converts HSL to RGB.
 */
function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  if (s === 0) {
    const val = Math.round(l * 255);
    return { r: val, g: val, b: val };
  }
  
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  
  return {
    r: Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    g: Math.round(hue2rgb(p, q, h) * 255),
    b: Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  };
}
