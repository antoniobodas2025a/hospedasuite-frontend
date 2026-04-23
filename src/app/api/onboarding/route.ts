import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  // 1. Inicialización de Supabase con Service Role (Bypass RLS)
  // persistSession: false es vital para evitar memory leaks en Serverless
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  let createdUserId: string | null = null;

  try {
    const body = await request.json();
    const { adminData, hotelData, paymentToken, acceptanceToken } = body;

    // Validación de integridad de contrato (Zero Trust)
    if (!adminData?.email || !adminData?.password || !hotelData?.name || !paymentToken) {
      return NextResponse.json(
        { success: false, message: 'Payload incompleto para provisionamiento' }, 
        { status: 400 }
      );
    }

    console.log(`🚀 [Onboarding] Iniciando provisionamiento para: ${adminData.email}`);

    // FASE A: Crear Identidad en Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: adminData.email,
      password: adminData.password,
      email_confirm: true,
      user_metadata: { 
        role: 'admin', 
        display_name: hotelData.name 
      }
    });

    if (authError || !authData.user) {
      throw new Error(`Auth Error: ${authError?.message || 'Fallo al crear identidad'}`);
    }

    createdUserId = authData.user.id;

    // FASE B: Sincronización de Perfil (Garantía de Integridad Referencial)
    const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
      id: createdUserId,
      email: adminData.email,
      full_name: 'Administrador Principal',
      role: 'admin'
    });

    if (profileError) {
      console.warn('⚠️ [Onboarding] Advertencia en tabla profiles:', profileError.message);
    }

    // FASE C: Creación del Tenant (Hotel) y Configuración de Facturación
    const { error: hotelError } = await supabaseAdmin.from('hotels').insert({
      owner_id: createdUserId,
      name: hotelData.name,
      city: hotelData.city,
      location: hotelData.location || hotelData.city,
      email: adminData.email, 
      wompi_payment_source_id: paymentToken,
      wompi_acceptance_token: acceptanceToken || 'accepted_at_onboarding',
      is_onboarding_complete: true,
      status: 'active',
      config: {
        rooms_count: hotelData.rooms,
        trial_starts_at: new Date().toISOString(),
        billing_day: 91 // Trigger para el motor de facturación diferida
      }
    });

    if (hotelError) {
      throw new Error(`Database Error (Hotels): ${hotelError.message}`);
    }

    console.log(`✅ [Onboarding] Éxito: Hotel ${hotelData.name} instanciado.`);

    return NextResponse.json({ 
      success: true, 
      message: 'Hotel y Administrador creados con éxito',
      tenantId: createdUserId 
    }, { status: 200 });

  } catch (error: any) {
    // 🛡️ PROTOCOLO DE ROLLBACK ATÓMICO
    if (createdUserId) {
      console.error(`🚨 [Onboarding] Fallo detectado. Ejecutando purga de seguridad para UID: ${createdUserId}`);
      await supabaseAdmin.auth.admin.deleteUser(createdUserId);
    }

    console.error('🔥 [CRITICAL] Colapso en Pipeline de Onboarding:', error.message);
    
    return NextResponse.json({ 
      success: false, 
      message: error.message || 'Error interno del servidor' 
    }, { status: 500 });
  }
}