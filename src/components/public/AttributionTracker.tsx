'use client';

import { useEffect } from 'react';

export default function AttributionTracker() {
  useEffect(() => {
    // Si el usuario pisa la OTA, guardamos la huella por 24 horas
    const expires = new Date();
    expires.setTime(expires.getTime() + 24 * 60 * 60 * 1000);
    document.cookie = `hospeda_source=ota; expires=${expires.toUTCString()}; path=/`;
  }, []);

  return null; // Es un componente fantasma, no renderiza nada visual
}
