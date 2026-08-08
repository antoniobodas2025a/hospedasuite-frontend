import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies(); // En Next.js 15, cookies() es asíncrono

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch (e) {
            // Token refresh can fail in Server Components (read-only cookies).
            // In production, the middleware handles proactive token refresh.
            // Log for debugging auth issues in Server Actions.
            if (process.env.NODE_ENV !== 'production') {
              console.warn('[Supabase] Token refresh skipped (non-critical):', e instanceof Error ? e.message : e);
            }
          }
        },
      },
    },
  );
}
