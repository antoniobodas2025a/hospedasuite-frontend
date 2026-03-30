import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    // 1. Recibir los datos del Cerebro (Zustand)
    const body = await request.json();
    const { adminData, hotelData, paymentToken } = body;

    // Validación de seguridad básica
    if (!adminData?.email || !adminData?.password || !hotelData?.name || !paymentToken) {
      return NextResponse.json(
        { message: 'Faltan datos críticos para la creación del hotel' },
        { status: 400 }
      );
    }

    // 2. Inicializar Supabase con Permisos de Administrador (Service Role Key)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY! 
    );

    // 3. FASE A: Crear el Usuario Administrador en Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: adminData.email,
      password: adminData.password,
      email_confirm: true, // Autoconfirmamos para evitar fricción
      user_metadata: {
        role: 'admin',
      }
    });

    if (authError || !authData.user) {
      throw new Error(`Error al crear usuario: ${authError?.message || 'Usuario nulo'}`);
    }

    const userId = authData.user.id;

    // 4. FASE B: Crear el Tenant (Hotel) y conectarlo al Usuario
    // 🚨 AUDITORÍA QA: Se añadió "location" para evitar el crash de Not-Null Constraint
    const { error: hotelError } = await supabaseAdmin.from('hotels').insert({
      owner_id: userId,
      name: hotelData.name,
      city: hotelData.city,
      location: hotelData.location || hotelData.city, // <--- CORRECCIÓN CRÍTICA DE DB
      email: adminData.email, 
      wompi_payment_source_id: paymentToken, 
      is_onboarding_complete: true,
      status: 'active', 
      config: {
        rooms_count: hotelData.rooms 
      }
    });

    // 5. MECANISMO DE DEFENSA: Rollback (Transacción Atómica)
    if (hotelError) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw new Error(`Error al crear la base de datos del hotel: ${hotelError.message}`);
    }

    // 6. Éxito Absoluto
    return NextResponse.json(
      { success: true, message: 'Hotel y Administrador creados con éxito' },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('🔥 Error Crítico en Onboarding:', error.message);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}