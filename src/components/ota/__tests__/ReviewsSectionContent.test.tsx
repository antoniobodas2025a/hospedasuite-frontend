// @vitest-environment jsdom
import '../../../__tests__/bun-test-dom-setup';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, waitFor } from '@testing-library/react';
import ReviewsSectionContent, { StarRating, timeAgo } from '@/components/ota/ReviewsSectionContent';

const mockReviews = [
  {
    id: 'review-1',
    guest_name: 'Ana',
    guest_location: 'Bogotá',
    rating: 5,
    comment: 'Excellent stay!',
    stay_date: '2026-07-15',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
  },
  {
    id: 'review-2',
    guest_name: 'Luis',
    guest_location: null,
    rating: 4,
    comment: 'Very good hotel.',
    stay_date: null,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
  },
];

const mockStats = {
  overall: 4.5,
  total: 2,
  breakdown: { 5: 1, 4: 1, 3: 0, 2: 0, 1: 0 },
};

let resolveReviews: (value: { success: boolean; data?: typeof mockReviews }) => void = () => {};
let resolveStats: (value: { success: boolean; data?: typeof mockStats }) => void = () => {};

vi.mock('@/app/actions/ota', () => ({
  getApprovedReviewsAction: vi.fn(() => new Promise((resolve) => { resolveReviews = resolve; })),
  getReviewStatsAction: vi.fn(() => new Promise((resolve) => { resolveStats = resolve; })),
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, string | number | Date>) => {
    const messages: Record<string, string> = {
      'reviews.noReviewsYet': 'No reviews yet',
      'reviews.noReviewsDesc': 'Be the first to review {hotelName}',
      'reviews.guestReviews': 'Guest Reviews',
      'reviews.verifiedReviews': '{count} verified reviews',
      'reviews.ofReviews': 'of {count} reviews',
      'reviews.excellent': 'Excellent',
      'reviews.veryGood': 'Very Good',
      'reviews.average': 'Average',
      'reviews.poor': 'Poor',
      'reviews.terrible': 'Terrible',
      'reviews.stay': 'Stay',
      'reviews.helpful': 'Helpful',
      'reviews.today': 'Today',
      'reviews.yesterday': 'Yesterday',
      'reviews.daysAgo': '{count} days ago',
      'reviews.weeksAgo': '{count} weeks ago',
      'reviews.monthsAgo': '{count} months ago',
      'reviews.yearsAgo': '{count} years ago',
    };
    let result = messages[key] ?? key;
    if (values) {
      Object.entries(values).forEach(([k, v]) => {
        result = result.replace(`{${k}}`, String(v));
      });
    }
    return result;
  },
}));

vi.mock('@/components/ui/glass', () => ({
  SectionHeader: ({ title, subtitle }: { title: string; subtitle?: string }) => (
    <div data-testid="section-header">
      <h2>{title}</h2>
      {subtitle && <p>{subtitle}</p>}
    </div>
  ),
}));

vi.mock('./ReviewFormWithToggle', () => ({
  __esModule: true,
  default: ({ hotelId, hotelName }: { hotelId: string; hotelName: string }) => (
    <div data-testid="review-form">ReviewForm {hotelId} {hotelName}</div>
  ),
}));

vi.mock('./ReviewSkeleton', () => ({
  __esModule: true,
  default: () => <div data-testid="review-skeleton">ReviewSkeleton</div>,
}));

describe('ReviewsSectionContent', () => {
  beforeEach(() => {
    resolveReviews = () => {};
    resolveStats = () => {};
    vi.clearAllMocks();
  });

  it('shows the loading skeleton while fetching reviews', () => {
    const { getAllByTestId } = render(<ReviewsSectionContent hotelId="hotel-1" hotelName="Hotel Test" />);
    expect(getAllByTestId('review-skeleton').length).toBe(2);
  });

  it('renders the empty state when there are no reviews', async () => {
    const { getByText, queryAllByTestId } = render(
      <ReviewsSectionContent hotelId="hotel-1" hotelName="Hotel Test" />
    );

    resolveReviews({ success: true, data: [] });
    resolveStats({ success: true, data: { overall: 0, total: 0, breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } } });

    await waitFor(() => {
      expect(getByText('No reviews yet')).toBeInTheDocument();
      expect(getByText('Be the first to review Hotel Test')).toBeInTheDocument();
    });
  });

  it('renders reviews and stats after loading', async () => {
    const { getByText, getAllByTestId } = render(
      <ReviewsSectionContent hotelId="hotel-1" hotelName="Hotel Test" />
    );

    resolveReviews({ success: true, data: mockReviews });
    resolveStats({ success: true, data: mockStats });

    await waitFor(() => {
      expect(getByText('Guest Reviews')).toBeInTheDocument();
      expect(getByText('Ana')).toBeInTheDocument();
      expect(getByText('Luis')).toBeInTheDocument();
      expect(getByText('Excellent stay!')).toBeInTheDocument();
    });

    expect(getAllByTestId('section-header').length).toBe(1);
  });
});

describe('timeAgo', () => {
  const t = (key: string, values?: Record<string, string | number | Date>) => {
    const map: Record<string, string> = {
      'reviews.today': 'Today',
      'reviews.yesterday': 'Yesterday',
      'reviews.daysAgo': '{count} days ago',
      'reviews.weeksAgo': '{count} weeks ago',
      'reviews.monthsAgo': '{count} months ago',
      'reviews.yearsAgo': '{count} years ago',
    };
    let result = map[key] ?? key;
    if (values) {
      Object.entries(values).forEach(([k, v]) => {
        result = result.replace(`{${k}}`, String(v));
      });
    }
    return result;
  };

  it('returns today for a recent review', () => {
    expect(timeAgo(new Date().toISOString(), t)).toBe('Today');
  });

  it('returns days ago for a review from a few days ago', () => {
    const date = new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString();
    expect(timeAgo(date, t)).toBe('3 days ago');
  });
});

describe('StarRating', () => {
  it('renders five stars', () => {
    const { container } = render(<StarRating rating={3} />);
    expect(container.querySelectorAll('svg').length).toBe(5);
  });
});
