'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { getCurrentHotel } from '@/lib/hotel-context';
import { hashPin, verifyPinHash } from '@/lib/pin-security';
import { signSession, getSessionCookieOptions } from '@/lib/session-utils';

// ------------------------------------------------------------------
// 1. LOGIN DE ADMINISTRADOR / DISPOSITIVO (Email y Contraseña)
// ------------------------------------------------------------------
export async function login(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { success: false, message: error.message };
  }

  // Create staff session cookie for dashboard access
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    // Find user's hotel via staff table
    const { data: staffRecord } = await supabase
      .from('staff')
      .select('id, name, role, hotel_id')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (staffRecord) {
      const cookieStore = await cookies();
      const signedSession = signSession({
        id: staffRecord.id,
        name: staffRecord.name || user.email || '',
        role: staffRecord.role || 'admin',
        hotel_id: staffRecord.hotel_id,
      });
      cookieStore.set('hospeda_staff_session', signedSession, getSessionCookieOptions());
    } else {
      // Sin staff record → onboarding (client-side navigation, evita bug de redirect + cookies)
      return { success: true, redirectUrl: '/software/onboarding' };
    }
  }

  revalidatePath('/', 'layout');
  // Client-side navigation: evita race condition entre Set-Cookie y redirect()
  return { success: true, redirectUrl: '/dashboard' };
}

// ------------------------------------------------------------------
// 2. LOGOUT GLOBAL (Admin)
// ------------------------------------------------------------------
export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  
  // Limpiamos también la sesión del empleado si existe
  const cookieStore = await cookies();
  cookieStore.delete('hospeda_staff_session');
  
  // Client-side navigation: evita race condition entre Set-Cookie y redirect()
  return { success: true, redirectUrl: '/login' };
}

// ------------------------------------------------------------------
// 2b. LOGOUT DE STAFF (Solo cierra sesión operativa)
// ------------------------------------------------------------------
export async function logoutStaff() {
  const cookieStore = await cookies();
  cookieStore.delete('hospeda_staff_session');
  
  return { success: true, redirectUrl: '/staff-login' };
}

// ------------------------------------------------------------------
// 3. LOGIN DE STAFF (Teclado de PIN 4 Dígitos)
// ------------------------------------------------------------------
export async function verifyPin(formData: FormData) {
  try {
    const pin = formData.get('pin') as string;
    const hotelSlug = formData.get('hotel_slug') as string;

    if (!pin || pin.length !== 4) {
      throw new Error('El PIN debe ser de 4 dígitos.');
    }
    if (!hotelSlug) {
      throw new Error('Código de hotel requerido.');
    }

    // A. Resolver Hotel por Slug (Desacoplado de Admin Auth)
    const { supabaseAdmin } = await import('@/lib/supabase-admin');
    
    const { data: hotel, error: hotelError } = await supabaseAdmin
      .from('hotels')
      .select('id')
      .eq('slug', hotelSlug)
      .single();

    if (hotelError || !hotel) {
      return { success: false, message: 'Hotel no encontrado. Verifica el código.' };
    }

    // B. Buscar al empleado en la tabla "staff" de este hotel
    // Soporta tanto PINs hasheados como legacy (texto plano)
    const { data: staffList, error: staffError } = await supabaseAdmin
      .from('staff')
      .select('id, name, role, pin_code')
      .eq('hotel_id', hotel.id);

    if (staffError || !staffList || staffList.length === 0) {
      return { success: false, message: 'PIN incorrecto o no autorizado.' };
    }

    // Verificar PIN contra cada staff member (soporta hash y texto plano)
    let staffMember = null;
    for (const member of staffList) {
      const storedPin = member.pin_code as string;
      // Si el PIN almacenado tiene 64 caracteres, es un hash SHA-256
      if (storedPin.length === 64) {
        const isValid = await verifyPinHash(pin, storedPin);
        if (isValid) {
          staffMember = member;
          break;
        }
      } else {
        // Legacy: texto plano
        if (storedPin === pin) {
          staffMember = member;
          break;
        }
      }
    }

    if (!staffMember) {
      return { success: false, message: 'PIN incorrecto o no autorizado.' };
    }

    // C. Crear una sesión "ligera" para el empleado usando Cookies (Turno de 12 horas)
    const cookieStore = await cookies();
    const signedSession = signSession({
      id: staffMember.id,
      name: staffMember.name,
      role: staffMember.role,
      hotel_id: hotel.id,
    });
    
    cookieStore.set('hospeda_staff_session', signedSession, getSessionCookieOptions());

    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}