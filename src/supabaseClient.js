// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// VALIDACIÓN DE SEGURIDAD (Fase de Producción)
// Asegura que las variables no solo existan, sino que sean strings válidos antes de instanciar.
if (typeof supabaseUrl !== 'string' || !supabaseUrl.startsWith('https')) {
  console.error('❌ Error Crítico: VITE_SUPABASE_URL no es una URL válida.');
}

if (!supabaseAnonKey || supabaseAnonKey.length < 20) {
  console.error(
    '❌ Error Crítico: VITE_SUPABASE_ANON_KEY parece ser inválida o está vacía.'
  );
}

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '¡Faltan las variables de entorno de Supabase! Revisa tu archivo .env'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
