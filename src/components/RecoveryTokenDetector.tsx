'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export default function RecoveryTokenDetector() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('access_token')) {
      // Extraer tokens del fragment
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      const type = params.get('type');

      if (accessToken && refreshToken) {
        // Establecer la sesión y redirigir según el tipo
        supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        }).then(async ({ error }) => {
          if (!error) {
            // Limpiar el fragment
            window.history.replaceState(null, '', window.location.pathname);
            
            // Determinar a dónde redirigir
            if (type === 'recovery') {
              router.push('/auth/reset-password');
            } else if (type === 'magiclink') {
              // Para magic links normales, verificar si es superadmin
              const { data: { user } } = await supabase.auth.getUser();
              if (user) {
                const { data: roleData } = await supabase
                  .from('user_roles')
                  .select('role')
                  .eq('user_id', user.id)
                  .single();
                
                if (roleData?.role === 'superadmin') {
                  router.push('/admin');
                } else {
                  router.push('/dashboard');
                }
              } else {
                router.push('/dashboard');
              }
            }
          }
        });
      }
    }
  }, [router, supabase.auth]);

  return null;
}
