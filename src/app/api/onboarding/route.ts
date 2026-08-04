export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { generateUniqueSlug } from '@/lib/slug';
import { withRateLimit } from '@/lib/api-guards';

/**
 * Verifies reCAPTCHA v3 token with Google.
 * Returns score (0.0-1.0) where higher is more human.
 */
async function verifyCaptcha(token: string, ip: string): Promise<{ success: boolean; score?: number; error?: string }> {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;
  
  // Dev mode bypass
  if (!secretKey) {
    console.warn('RECAPTCHA_SECRET_KEY not configured - bypassing in dev');
    return { success: true, score: 1.0 };
  }
  
  try {
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret: secretKey,
        response: token,
        remoteip: ip,
      }),
    });
    
    const data = await response.json();
    
    if (!data.success) {
      return { success: false, error: 'CAPTCHA verification failed' };
    }
    
    // Score: 0.0 = bot, 1.0 = human
    // Threshold: 0.5 (blocks obvious bots)
    if (data.score < 0.5) {
      return { success: false, score: data.score, error: 'Suspicious activity detected' };
    }
    
    return { success: true, score: data.score };
  } catch (error) {
    console.error('CAPTCHA verification error:', error);
    return { success: false, error: 'CAPTCHA service unavailable' };
  }
}

export const POST = withRateLimit(async (request: Request) => {

  let createdUserId: string | null = null;

  try {
    const body = await request.json();
    const { adminData, hotelData, paymentToken, acceptanceToken, captchaToken } = body;

    // 🛡️ CAPTCHA VERIFICATION: Block bots
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
               request.headers.get('x-real-ip') || 
               '127.0.0.1';
    
    if (captchaToken) {
      const captchaResult = await verifyCaptcha(captchaToken, ip);
      if (!captchaResult.success) {
        return NextResponse.json(
          { success: false, message: captchaResult.error || 'CAPTCHA verification failed' }, 
          { status: 403 }
        );
      }
    }

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

    // FASE C: Generar slug único para el hotel
    const slug = await generateUniqueSlug(hotelData.name, async (s) => {
      const { data } = await supabaseAdmin
        .from('hotels')
        .select('id')
        .eq('slug', s)
        .maybeSingle();
      return !!data;
    });

    // FASE D: Creación del Tenant (Hotel) y Configuración de Facturación
    const { data: createdHotel, error: hotelError } = await supabaseAdmin
      .from('hotels')
      .insert({
        owner_id: createdUserId,
        name: hotelData.name,
        slug,
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
          billing_day: 91, // Trigger para el motor de facturación diferida
        },
      })
      .select('id')
      .single();

    if (hotelError || !createdHotel) {
      throw new Error(`Database Error (Hotels): ${hotelError?.message}`);
    }

    console.log(`✅ [Onboarding] Éxito: Hotel ${hotelData.name} instanciado.`);

    // ─── Geocoding post-provisioning (non-blocking) ─────────────────────
    // Si falla, no se detiene el onboarding — se guarda sin coordenadas.
    try {
      const address = hotelData.address || hotelData.location || '';
      const city = hotelData.city || '';

      if (address || city) {
        const geocodeRes = await fetch(
          `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/geocode`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              address,
              city,
              country: 'Colombia',
            }),
          },
        );

        if (geocodeRes.ok) {
          const geocodeJson = await geocodeRes.json();
          if (geocodeJson.success && geocodeJson.data) {
            await supabaseAdmin.from('hotel_locations').insert({
              hotel_id: createdHotel.id,
              lat: geocodeJson.data.lat,
              lng: geocodeJson.data.lng,
              precision: geocodeJson.data.precision,
              source: 'wizard',
              raw_input: [address, city].filter(Boolean).join(', '),
              geocoded_at: new Date().toISOString(),
            });
            console.log(`📍 [Onboarding] Coordenadas guardadas para ${hotelData.name}`);
          }
        }
      }
    } catch (geocodeErr) {
      // Non-blocking: log but don't fail onboarding
      console.warn(
        `📍 [Onboarding] Geocoding no disponible para ${hotelData.name}:`,
        geocodeErr instanceof Error ? geocodeErr.message : geocodeErr,
      );
    }

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
}, { limit: 10, windowMs: 60000 }); // 10 requests per minute