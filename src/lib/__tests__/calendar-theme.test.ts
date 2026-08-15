import { describe, it, expect } from 'vitest';
import { validatePrimaryColor } from '../calendar-theme';

describe('validatePrimaryColor', () => {
  describe('null/undefined/empty handling', () => {
    it('returns undefined for null', () => {
      expect(validatePrimaryColor(null)).toBeUndefined();
    });

    it('returns undefined for undefined', () => {
      expect(validatePrimaryColor(undefined)).toBeUndefined();
    });

    it('returns undefined for empty string', () => {
      expect(validatePrimaryColor('')).toBeUndefined();
    });

    it('returns undefined for whitespace only', () => {
      expect(validatePrimaryColor('   ')).toBeUndefined();
    });
  });

  describe('white color filtering', () => {
    it('rejects #ffffff', () => {
      expect(validatePrimaryColor('#ffffff')).toBeUndefined();
    });

    it('rejects #FFFFFF (uppercase)', () => {
      expect(validatePrimaryColor('#FFFFFF')).toBeUndefined();
    });

    it('rejects #fff', () => {
      expect(validatePrimaryColor('#fff')).toBeUndefined();
    });

    it('rejects "white" keyword', () => {
      expect(validatePrimaryColor('white')).toBeUndefined();
    });

    it('rejects "WHITE" keyword (uppercase)', () => {
      expect(validatePrimaryColor('WHITE')).toBeUndefined();
    });
  });

  describe('hex color validation', () => {
    it('accepts valid 6-digit hex', () => {
      expect(validatePrimaryColor('#3b82f6')).toBe('#3b82f6');
    });

    it('accepts valid 3-digit hex', () => {
      expect(validatePrimaryColor('#f60')).toBe('#f60');
    });

    it('accepts hex with uppercase letters', () => {
      expect(validatePrimaryColor('#3B82F6')).toBe('#3B82F6');
    });

    it('rejects invalid hex (wrong length)', () => {
      expect(validatePrimaryColor('#1234')).toBeUndefined();
    });

    it('rejects invalid hex (non-hex characters)', () => {
      expect(validatePrimaryColor('#gggggg')).toBeUndefined();
    });

    it('rejects hex without #', () => {
      expect(validatePrimaryColor('3b82f6')).toBeUndefined();
    });
  });

  describe('rgb() validation', () => {
    it('accepts valid rgb()', () => {
      expect(validatePrimaryColor('rgb(59, 130, 246)')).toBe('rgb(59, 130, 246)');
    });

    it('accepts rgb() with no spaces', () => {
      expect(validatePrimaryColor('rgb(59,130,246)')).toBe('rgb(59,130,246)');
    });

    it('rejects rgb() with invalid values', () => {
      expect(validatePrimaryColor('rgb(garbage)')).toBeUndefined();
    });

    it('rejects rgb() with out of range values', () => {
      expect(validatePrimaryColor('rgb(999, -50, abc)')).toBeUndefined();
    });

    it('rejects rgb() with values > 255', () => {
      expect(validatePrimaryColor('rgb(300, 0, 0)')).toBeUndefined();
      expect(validatePrimaryColor('rgb(0, 256, 0)')).toBeUndefined();
      expect(validatePrimaryColor('rgb(0, 0, 999)')).toBeUndefined();
    });

    it('accepts rgb() with max valid values', () => {
      expect(validatePrimaryColor('rgb(255, 255, 255)')).toBeUndefined(); // white
      expect(validatePrimaryColor('rgb(255, 0, 0)')).toBe('rgb(255, 0, 0)'); // red
    });
  });

  describe('hsl() validation', () => {
    it('accepts valid hsl()', () => {
      expect(validatePrimaryColor('hsl(210, 100%, 50%)')).toBe('hsl(210, 100%, 50%)');
    });

    it('rejects hsl() without % signs', () => {
      expect(validatePrimaryColor('hsl(210, 100, 50)')).toBeUndefined();
    });

    it('rejects hsl() with invalid values', () => {
      expect(validatePrimaryColor('hsl(garbage)')).toBeUndefined();
    });

    it('rejects hsl() with hue > 360', () => {
      expect(validatePrimaryColor('hsl(400, 50%, 50%)')).toBeUndefined();
    });

    it('rejects hsl() with saturation > 100', () => {
      expect(validatePrimaryColor('hsl(210, 150%, 50%)')).toBeUndefined();
    });

    it('rejects hsl() with lightness > 100', () => {
      expect(validatePrimaryColor('hsl(210, 50%, 150%)')).toBeUndefined();
    });

    it('accepts hsl() with max valid values', () => {
      expect(validatePrimaryColor('hsl(360, 100%, 50%)')).toBe('hsl(360, 100%, 50%)');
    });
  });

  describe('CSS variable validation', () => {
    it('accepts var(--brand-600)', () => {
      expect(validatePrimaryColor('var(--brand-600)')).toBe('var(--brand-600)');
    });

    it('accepts var(--custom-color)', () => {
      expect(validatePrimaryColor('var(--custom-color)')).toBe('var(--custom-color)');
    });

    it('rejects var without --', () => {
      expect(validatePrimaryColor('var(brand)')).toBeUndefined();
    });
  });

  describe('light color filtering (contrast check)', () => {
    it('rejects very light yellow (#FFFF00)', () => {
      expect(validatePrimaryColor('#FFFF00')).toBeUndefined();
    });

    it('rejects light pastel colors (#FFD700 gold)', () => {
      expect(validatePrimaryColor('#FFD700')).toBeUndefined();
    });

    it('rejects light pink (#FFB6C1)', () => {
      expect(validatePrimaryColor('#FFB6C1')).toBeUndefined();
    });

    it('accepts dark blue (#000080)', () => {
      expect(validatePrimaryColor('#000080')).toBe('#000080');
    });

    it('accepts medium colors (#3b82f6)', () => {
      expect(validatePrimaryColor('#3b82f6')).toBe('#3b82f6');
    });

    it('accepts dark colors (#1a1a1a)', () => {
      expect(validatePrimaryColor('#1a1a1a')).toBe('#1a1a1a');
    });
  });

  describe('named colors', () => {
    it('rejects "blue" (not supported)', () => {
      expect(validatePrimaryColor('blue')).toBeUndefined();
    });

    it('rejects "rebeccapurple" (not supported)', () => {
      expect(validatePrimaryColor('rebeccapurple')).toBeUndefined();
    });

    it('rejects "transparent" (not supported)', () => {
      expect(validatePrimaryColor('transparent')).toBeUndefined();
    });
  });

  describe('trimming and normalization', () => {
    it('trims whitespace', () => {
      expect(validatePrimaryColor('  #3b82f6  ')).toBe('#3b82f6');
    });

    it('preserves original case for valid colors', () => {
      expect(validatePrimaryColor('#3B82F6')).toBe('#3B82F6');
    });
  });
});
