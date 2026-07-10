'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export default function RecoveryTokenDetector() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('access_token') && hash.includes('type=recovery')) {
      // Extraer tokens del fragment
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');

      if (accessToken && refreshToken) {
        // Establecer la sesión y redirigir a reset-password
        supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        }).then(({ error }) => {
          if (!error) {
            // Limpiar el fragment y redirigir
            window.history.replaceState(null, '', window.location.pathname);
            router.push('/auth/reset-password');
          }
        });
      }
    }
  }, [router, supabase.auth]);

  return null;
}
