'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { getCurrentHotel } from '@/lib/hotel-context';

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
// 2. LOGOUT GLOBAL
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
// 3. LOGIN DE STAFF (Teclado de PIN 4 Dígitos) 🚨 NUEVO
// ------------------------------------------------------------------
export async function verifyPin(formData: FormData) {
  try {
    const pin = formData.get('pin') as string;
    if (!pin || pin.length !== 4) {
      throw new Error('El PIN debe ser de 4 dígitos.');
    }

    // A. Validar que el dispositivo ya está conectado a un hotel
    const hotel = await getCurrentHotel();
    if (!hotel) {
      return { success: false, message: 'Dispositivo no vinculado a un hotel.' };
    }

    // B. Buscar al empleado en la tabla "staff" de este hotel
    const supabase = await createClient();
    const { data: staffMember, error } = await supabase
      .from('staff')
      .select('id, name, role')
      .eq('hotel_id', hotel.id)
      .eq('pin_code', pin)
      .single();

    if (error || !staffMember) {
      return { success: false, message: 'PIN incorrecto o no autorizado.' };
    }

    // C. Crear una sesión "ligera" para el empleado usando Cookies (Turno de 12 horas)
    const cookieStore = await cookies();
    cookieStore.set('hospeda_staff_session', JSON.stringify({
      id: staffMember.id,
      name: staffMember.name,
      role: staffMember.role
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