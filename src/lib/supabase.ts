import { createClient } from '@supabase/supabase-js';

// Auditoría: Usamos variables de entorno para no exponer llaves en el código
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
