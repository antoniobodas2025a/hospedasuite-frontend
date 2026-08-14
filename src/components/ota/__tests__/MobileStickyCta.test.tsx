// @vitest-environment jsdom
import '../../../__tests__/bun-test-dom-setup';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, cleanup } from '@testing-library/react';
import MobileStickyCta from '../MobileStickyCta';

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const messages: Record<string, string> = {
      'ota.mobileCta.from': 'Desde',
      'ota.mobileCta.copPerNight': 'COP/noche',
      'ota.mobileCta.reserve': 'Reservar',
      'ota.mobileCta.checkAvailability': 'Ver disponibilidad',
    };
    return messages[key] ?? key;
  },
}));

describe('MobileStickyCta', () => {
  afterEach(() => {
    cleanup();
  });

  it('displays the starting price without any IVA label', () => {
    const { getByText, queryByText } = render(
      <MobileStickyCta
        minPrice={250000}
        availableCount={1}
        checkIn="2026-08-10"
        checkOut="2026-08-11"
      />
    );

    expect(getByText(/250,000/)).toBeInTheDocument();
    expect(queryByText(/\+ IVA/i)).not.toBeInTheDocument();
    expect(queryByText(/Sin IVA/i)).not.toBeInTheDocument();
  });

  it('shows the reserve action when dates are selected', () => {
    const { getByText } = render(
      <MobileStickyCta
        minPrice={250000}
        availableCount={2}
        checkIn="2026-08-10"
        checkOut="2026-08-11"
      />
    );

    expect(getByText(/Reservar/i)).toBeInTheDocument();
  });
});
