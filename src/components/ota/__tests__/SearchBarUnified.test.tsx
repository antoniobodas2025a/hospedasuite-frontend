// @vitest-environment jsdom
import '../../../__tests__/bun-test-dom-setup';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, cleanup, fireEvent } from '@testing-library/react';
import SearchBarUnified from '@/components/ota/SearchBarUnified';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const messages: Record<string, string> = {
      'ota.search.destination': 'Destination',
      'ota.search.stay': 'Stay',
      'ota.search.guests': 'Guests',
      'ota.search.guest_one': 'guest',
      'ota.search.guest_other': 'guests',
      'ota.search.selectDates': 'Select dates',
      'ota.search.suggestedWeekend': 'Weekend',
      'ota.search.thisWeekend': 'This weekend',
      'ota.search.nextWeek': 'Next week',
      'ota.search.nextMonth': 'Next month',
      'ota.search.confirmDates': 'Confirm',
      'ota.search.clearDates': 'Clear',
      'common.close': 'Close',
      'ota.search.selectGuests': 'Select guests',
      'ota.search.departure': 'Departure',
    };
    return messages[key] ?? key;
  },
  useLocale: () => 'es',
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/lib/date-locale', () => ({
  getDateFnsLocale: () => undefined,
}));

vi.mock('next/dynamic', () => ({
  __esModule: true,
  default: (_loader: () => Promise<unknown>, options: { loading?: () => React.ReactNode }) => {
    function DynamicLoading() {
      return options?.loading ? options.loading() : null;
    }
    return DynamicLoading;
  },
}));

vi.mock('@/components/ota/LocationAutocomplete', () => ({
  default: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <input value={value} onChange={(e) => onChange(e.target.value)} data-testid="location-input" />
  ),
}));

vi.mock('@/components/ota/GuestSelector', () => ({
  default: ({ value, onChange }: { value: number; onChange: (v: number) => void }) => (
    <div data-testid="guest-selector">
      <button type="button" onClick={() => onChange(value + 1)}>Increase</button>
    </div>
  ),
}));

vi.mock('react-day-picker', () => ({
  DayPicker: ({ onSelect }: { onSelect?: (range: { from: Date; to: Date }) => void }) => (
    <div role="application" aria-label="calendar">
      <button
        type="button"
        onClick={() => onSelect?.({ from: new Date('2026-07-20'), to: new Date('2026-07-25') })}
      >
        Select range
      </button>
    </div>
  ),
  DateRange: class {},
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const rest = { ...props };
      ['initial', 'animate', 'exit', 'transition', 'layoutId', 'style'].forEach((key) => {
        delete rest[key];
      });
      return <div {...rest}>{children}</div>;
    },
    button: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const rest = { ...props };
      ['initial', 'animate', 'exit', 'transition', 'whileHover', 'whileTap', 'layoutId'].forEach((key) => {
        delete rest[key];
      });
      return <button {...rest}>{children}</button>;
    },
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('SearchBarUnified', () => {
  afterEach(() => {
    cleanup();
  });

  describe('dates popover', () => {
    it('opens an inline popover when the dates zone is clicked', () => {
      const { container, getByLabelText, queryByLabelText } = render(<SearchBarUnified />);
      fireEvent.click(getByLabelText('Select dates'));
      const calendar = queryByLabelText('calendar');
      expect(calendar).toBeInTheDocument();
      expect(container.contains(calendar)).toBe(true);
      // The calendar should be inside the inline popover, not in a portal
      // (portal wrapper is fixed-positioned; inline popover is absolute inside the container)
      expect(calendar?.closest('.fixed')).toBeNull();
    });

    it('auto-confirms the selected range and closes the popover', () => {
      const onSearch = vi.fn();
      const { getByLabelText, getByText, queryByLabelText } = render(<SearchBarUnified onSearch={onSearch} />);
      fireEvent.click(getByLabelText('Select dates'));
      fireEvent.click(getByText('Select range'));
      expect(queryByLabelText('calendar')).not.toBeInTheDocument();
      expect(onSearch).toHaveBeenCalledWith({
        location: '',
        checkin: '2026-07-20',
        checkout: '2026-07-25',
        guests: 2,
      });
    });

    it('toggles the popover closed when the dates zone is clicked again', () => {
      const { getByLabelText, queryByLabelText } = render(<SearchBarUnified />);
      const datesZone = getByLabelText('Select dates');
      fireEvent.click(datesZone);
      expect(queryByLabelText('calendar')).toBeInTheDocument();
      fireEvent.click(datesZone);
      expect(queryByLabelText('calendar')).not.toBeInTheDocument();
    });
  });

  describe('guests modal', () => {
    it('renders the guests modal through a portal', () => {
      const { container, getByLabelText, getByRole } = render(<SearchBarUnified />);
      fireEvent.click(getByLabelText('Select guests'));
      const heading = getByRole('heading', { name: 'Guests' });
      expect(heading).toBeInTheDocument();
      expect(container.contains(heading)).toBe(false);
      // Portal modal is fixed-positioned and a direct child of document.body
      expect(heading.closest('.fixed')).toBeInTheDocument();
    });
  });
});
