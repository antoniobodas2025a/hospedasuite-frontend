'use client';

import dynamic from 'next/dynamic';

const HotelDetailMap = dynamic(
  () => import('./HotelDetailMap'),
  {
    ssr: false,
    loading: () => (
      <div className="h-48 bg-muted rounded-[var(--radius-squircle-2xl)] animate-pulse" />
    ),
  }
);

export default HotelDetailMap;
