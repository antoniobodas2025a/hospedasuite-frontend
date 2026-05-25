// ============================================================================
// 🧪 Tests: Amenity Registry — null-safe handling
// ============================================================================

import { describe, it, expect } from 'vitest';
import {
  getRoomAmenityById,
  getRoomAmenityLabel,
  getRoomAmenityIcon,
  getAmenityById,
  getAmenityLabel,
  getAmenityIcon,
} from '@/lib/amenity-registry';
import { HelpCircle } from 'lucide-react';

describe('getRoomAmenityById', () => {
  it('🏷️ returns amenity for valid ID', () => {
    const amenity = getRoomAmenityById('wifi');
    expect(amenity).not.toBeNull();
    expect(amenity?.label).toBe('Wi-Fi Gratis');
  });

  it('🚫 returns null for unknown ID', () => {
    expect(getRoomAmenityById('nonexistent')).toBeNull();
  });

  it('🚫 returns null for empty string', () => {
    expect(getRoomAmenityById('')).toBeNull();
  });

  it('🚫 returns null for typo in ID', () => {
    expect(getRoomAmenityById('wifii')).toBeNull();
  });
});

describe('getRoomAmenityLabel', () => {
  it('🏷️ returns label for valid ID', () => {
    expect(getRoomAmenityLabel('wifi')).toBe('Wi-Fi Gratis');
  });

  it('🚫 returns the ID itself for unknown (fallback)', () => {
    expect(getRoomAmenityLabel('nonexistent')).toBe('nonexistent');
  });
});

describe('getRoomAmenityIcon', () => {
  it('🏷️ returns icon for valid ID', () => {
    const icon = getRoomAmenityIcon('wifi');
    expect(icon).toBeDefined();
  });

  it('🚫 returns HelpCircle for unknown ID (no Star fallback)', () => {
    const icon = getRoomAmenityIcon('nonexistent');
    expect(icon).toBe(HelpCircle);
  });
});

describe('getAmenityById (hotel-level)', () => {
  it('🏷️ returns amenity for valid ID', () => {
    const amenity = getAmenityById('wifi');
    expect(amenity).not.toBeNull();
  });

  it('🚫 returns null for unknown ID', () => {
    expect(getAmenityById('nonexistent')).toBeNull();
  });
});

describe('getAmenityIcon (hotel-level)', () => {
  it('🚫 returns HelpCircle for unknown ID (no Star fallback)', () => {
    const icon = getAmenityIcon('nonexistent');
    expect(icon).toBe(HelpCircle);
  });
});
