'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export default function AuthCallbackClient() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Procesar tokens del fragment de la URL (magic links)
    const hash = window.location.hash;
    if (hash && hash.includes('access_token')) {
      // Extraer tokens del fragment
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      const type = params.get('type');

      if (accessToken && refreshToken) {
        // Establecer la sesión con los tokens
        supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        }).then(({ error }) => {
          if (error) {
            console.error('Error setting session:', error);
            router.push('/login?error=session-failed');
          } else {
            // Limpiar el fragment de la URL
            window.history.replaceState(null, '', window.location.pathname);
            
            // Redirigir según el tipo
            if (type === 'recovery') {
              router.push('/auth/reset-password');
            } else if (type === 'magiclink') {
              router.push('/admin');
            } else {
              router.push('/dashboard');
            }
          }
        });
      }
    }
  }, [router, supabase.auth]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#09090b]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-zinc-400">Procesando autenticación...</p>
      </div>
    </div>
  );
}
