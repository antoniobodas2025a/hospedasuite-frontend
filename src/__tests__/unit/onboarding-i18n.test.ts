import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ============================================================================
// Onboarding i18n — Regression tests
//
// Freeze the fix that added the missing `onboarding.roomDetail` namespace and
// `onboarding.steps.done`. If these keys go missing again, next-intl renders
// the raw key (e.g. `onboarding.roomDetail.capacityLabel`) to the hotel owner.
// ============================================================================

const ROOM_DETAIL_KEYS = [
  'namePlaceholder',
  'priceLabel',
  'currencyLabel',
  'capacityLabel',
  'bedsLabel',
  'bedTypeLabel',
  'bathroomSectionTitle',
  'bathroomLabel',
  'showerLabel',
  'hotWaterSectionTitle',
  'roomViewLabel',
  'photosAmenitiesTitle',
  'descriptionPlaceholder',
  'amenitiesLabel',
] as const;

function loadMessages(locale: 'es' | 'en'): any {
  const raw = readFileSync(resolve(process.cwd(), `messages/${locale}.json`), 'utf8');
  return JSON.parse(raw);
}

describe('onboarding i18n (regression — no raw keys)', () => {
  it.each(['es', 'en'] as const)(
    'resolves all onboarding.roomDetail keys in %s',
    (locale) => {
      const messages = loadMessages(locale);
      for (const key of ROOM_DETAIL_KEYS) {
        const value = messages.onboarding?.roomDetail?.[key];
        expect(
          value,
          `onboarding.roomDetail.${key} is missing in ${locale}.json`,
        ).toBeTypeOf('string');
        expect(value.length).toBeGreaterThan(0);
      }
    },
  );

  it('resolves onboarding.steps.done in both locales', () => {
    for (const locale of ['es', 'en'] as const) {
      const messages = loadMessages(locale);
      expect(
        messages.onboarding?.steps?.done,
        `onboarding.steps.done is missing in ${locale}.json`,
      ).toBeTypeOf('string');
    }
  });
});
