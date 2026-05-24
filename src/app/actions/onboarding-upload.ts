'use server';

import { createClient } from '@/utils/supabase/server';

/**
 * Genera URL presignada para onboarding (usa userId porque el hotel no existe aún).
 * El browser sube directo a R2 — el servidor solo autentica y firma.
 */
export async function getPresignedOnboardingUrlAction(
  fileName: string,
  contentType: string = 'image/webp'
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'No autenticado' };

    const { getPresignedUploadUrl, R2_PUBLIC_URL } = await import('@/lib/r2-client');

    const key = `onboarding/${user.id}/${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const uploadUrl = await getPresignedUploadUrl(key, contentType);
    const publicUrl = `${R2_PUBLIC_URL}/${key}`;

    return { success: true, uploadUrl, publicUrl, key };
  } catch (error: any) {
    console.error('🔥 Error generando presigned URL para onboarding:', error);
    return { success: false, error: error.message || 'Error al generar URL de subida' };
  }
}
