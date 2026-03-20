import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function activateAll() {
  console.log('⚡ Activando todos los hoteles para pruebas...');
  
  const { error } = await supabase
    .from('hotels')
    .update({ status: 'active' }) // Forzamos el estado a ACTIVE
    .neq('status', 'active');    // Solo a los que no lo estén

  if (error) console.error('❌ Error:', error.message);
  else console.log('✅ ¡Todos los hoteles están ahora en estado ACTIVE!');
}

activateAll();