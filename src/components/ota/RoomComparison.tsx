'use client';

import dynamic from 'next/dynamic';
import RoomComparisonSkeleton from './RoomComparisonSkeleton';

const RoomComparison = dynamic(() => import('./RoomComparisonContent'), {
  loading: () => <RoomComparisonSkeleton />,
  ssr: false,
});

export default RoomComparison;
