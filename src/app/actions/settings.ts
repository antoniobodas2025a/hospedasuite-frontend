'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

// Definimos la interfaz aquí para no depender del hook del cliente
interface HotelSettings {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  tax_rate: number;
  primary_color: string;
  wompi_public_key?: string;
  wompi_integrity_secret?: string;
}

export async function saveSettingsAction(settings: HotelSettings) {
  // 1. Iniciamos el Cliente SUPREMO (Service Role)
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  try {
    // 2. Ejecutamos la actualización ignorando RLS
    const { error } = await supabaseAdmin
      .from('hotels')
      .update({
        name: settings.name,
        address: settings.address,
        phone: settings.phone,
        email: settings.email,
        tax_rate: settings.tax_rate,
        primary_color: settings.primary_color,
        wompi_public_key: settings.wompi_public_key,
        wompi_integrity_secret: settings.wompi_integrity_secret,
      })
      .eq('id', settings.id);

    if (error) throw new Error(error.message);

    // 3. Obligamos a Next.js a refrescar los datos visuales
    revalidatePath('/dashboard/settings');

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
