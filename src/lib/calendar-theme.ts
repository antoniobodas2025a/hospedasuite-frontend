/**
 * Validates and normalizes primaryColor for calendar theming.
 * Filters out white colors and invalid values.
 */
export function validatePrimaryColor(color: string | null | undefined): string | undefined {
  if (!color) return undefined;
  const normalized = color.trim().toLowerCase();
  // Filter out white colors (would make selected dates invisible)
  if (normalized === '#ffffff' || normalized === '#fff' || normalized === 'white') {
    return undefined;
  }
  // Basic CSS color validation (hex, rgb, hsl, or CSS variable)
  const isValidHex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(color);
  const isValidRgb = /^rgb\(/i.test(color);
  const isValidHsl = /^hsl\(/i.test(color);
  const isValidVar = /^var\(--/.test(color);

  if (isValidHex || isValidRgb || isValidHsl || isValidVar) {
    return color;
  }

  return undefined;
}
