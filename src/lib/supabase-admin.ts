/**
 * 🛡️ Singleton — Supabase Admin Client
 *
 * Un único cliente con SERVICE_ROLE_KEY para bypass de RLS en server actions.
 * Evita duplicación y reduce superficie de ataque.
 *
 * Build-time safe: usa dummy values durante compilación para evitar
 * que Next.js 16 colapse al importar este módulo en Collecting page data.
 * En runtime, Coolify inyecta las variables reales.
 */

import { createClient } from '@supabase/supabase-js';

// 1. Proveer valores temporales inofensivos si no existen durante el Buildtime
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dummy.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "dummy_key_for_build_time_only";

// 2. Inicializar el cliente administrador de forma segura
export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceKey,
  {
    auth: {
      persistSession: false, // No guardar sesiones en server-side
      autoRefreshToken: false,
    },
  }
);
