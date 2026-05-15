'use client';

import { useEffect } from 'react';
import { initPostHog, identifyHotel } from '@/lib/analytics';

interface PostHogProviderProps {
  hotelId?: string;
  email?: string;
  name?: string;
}

/**
 * Inicializa PostHog e identifica al hotel actual.
 * Se monta una vez en el layout admin.
 */
export default function PostHogProvider({ hotelId, email, name }: PostHogProviderProps) {
  useEffect(() => {
    initPostHog();

    if (hotelId) {
      identifyHotel(hotelId, email, name);
    }
  }, [hotelId, email, name]);

  return null;
}
