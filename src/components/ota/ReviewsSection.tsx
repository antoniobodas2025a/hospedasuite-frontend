'use client';

import dynamic from 'next/dynamic';
import ReviewSkeleton from './ReviewSkeleton';

const ReviewsSection = dynamic(() => import('./ReviewsSectionContent'), {
  loading: () => <ReviewSkeleton />,
  ssr: false,
});

export default ReviewsSection;
