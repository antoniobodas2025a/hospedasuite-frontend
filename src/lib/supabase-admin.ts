/**
 * 🛡️ Singleton — Supabase Admin Client
 *
 * Un único cliente con SERVICE_ROLE_KEY para bypass de RLS en server actions.
 * Evita duplicación y reduce superficie de ataque.
 */

import { createClient } from '@supabase/supabase-js';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
}

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false, // No guardar sesiones en server-side
      autoRefreshToken: false,
    },
  }
);
