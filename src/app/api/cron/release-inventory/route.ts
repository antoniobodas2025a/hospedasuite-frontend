import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Inicialización con privilegios administrativos
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  try {
    // 1. Validación Zero-Trust: Solo Vercel puede invocar este endpoint
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.error('🚨 [SecOps] Intento no autorizado de ejecutar el Cron de Liberación.');
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    console.log('🧹 [Inventario] Iniciando escaneo de reservas huérfanas...');

    // 2. Calcular la barrera de tiempo (15 minutos atrás en formato ISO)
    const expirationTime = new Date(Date.now() - 15 * 60 * 1000).toISOString();

    // 3. Ejecutar la limpieza masiva
    const { data: expiredBookings, error } = await supabaseAdmin
      .from('bookings')
      .update({ status: 'EXPIRED' }) // O 'CANCELLED', según prefiera su regla de negocio
      .eq('status', 'PENDING')
      .lt('created_at', expirationTime)
      .select('id, room_id');

    if (error) throw new Error(`Fallo en la purga: ${error.message}`);

    const count = expiredBookings?.length || 0;
    console.log(`✅ [Inventario] Escaneo completado. Se liberaron ${count} habitaciones atrapadas.`);

    return NextResponse.json({ 
      success: true, 
      message: 'Purga de inventario ejecutada', 
      released_count: count 
    }, { status: 200 });

  } catch (error: any) {
    console.error('❌ [Inventario] Fallo crítico en el Cron Job:', error.message);
    return NextResponse.json({ error: 'Fallo interno en purga' }, { status: 500 });
  }
}