// @vitest-environment jsdom
import '../../../__tests__/bun-test-dom-setup';
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import ReviewsSection from '@/components/ota/ReviewsSection';

vi.mock('next/dynamic', () => ({
  __esModule: true,
  default: (_loader: () => Promise<unknown>, options: { loading?: () => React.ReactNode }) => {
    function DynamicLoading() {
      return options?.loading ? options.loading() : null;
    }
    return DynamicLoading;
  },
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('@/app/actions/ota', () => ({
  getApprovedReviewsAction: vi.fn(() => Promise.resolve({ success: true, data: [] })),
  getReviewStatsAction: vi.fn(() => Promise.resolve({ success: true, data: { overall: 0, total: 0, breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } } })),
}));

vi.mock('@/components/ota/ReviewFormWithToggle', () => ({
  __esModule: true,
  default: () => <div data-testid="review-form">ReviewForm</div>,
}));

vi.mock('@/components/ui/glass', () => ({
  SectionHeader: ({ title }: { title: string }) => <div data-testid="section-header">{title}</div>,
}));

describe('ReviewsSection', () => {
  it('renders the loading skeleton while the reviews chunk is loading', () => {
    const { getByTestId } = render(
      <ReviewsSection hotelId="hotel-1" hotelName="Hotel Test" />
    );
    expect(getByTestId('review-skeleton')).toBeInTheDocument();
  });
});
