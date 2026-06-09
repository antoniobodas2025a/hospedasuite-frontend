'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { getCurrentHotel } from '@/lib/hotel-context';
import { hashPin, verifyPinHash } from '@/lib/pin-security';

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

  revalidatePath('/', 'layout');
  redirect('/dashboard');
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
  
  redirect('/login');
}

// ------------------------------------------------------------------
// 2b. LOGOUT DE STAFF (Solo cierra sesión operativa)
// ------------------------------------------------------------------
export async function logoutStaff() {
  const cookieStore = await cookies();
  cookieStore.delete('hospeda_staff_session');
  
  redirect('/staff-login');
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
    cookieStore.set('hospeda_staff_session', JSON.stringify({
      id: staffMember.id,
      name: staffMember.name,
      role: staffMember.role,
      hotel_id: hotel.id // Vinculación explícita al hotel
    }), {
      httpOnly: true, // Protege contra XSS
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 12 // Expira en 12 horas
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}