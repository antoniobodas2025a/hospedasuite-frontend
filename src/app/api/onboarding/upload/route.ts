/**
 * 📤 Server-side upload proxy for onboarding images.
 *
 * Bypasses browser CORS entirely by uploading from the server.
 * Used as fallback when direct browser PUT to R2 fails.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No se recibió archivo' }, { status: 400 });
    }

    const { getPresignedUploadUrl, R2_PUBLIC_URL } = await import('@/lib/r2-client');

    const key = `onboarding/${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const uploadUrl = await getPresignedUploadUrl(key, file.type || 'image/webp');
    const publicUrl = `${R2_PUBLIC_URL}/${key}`;

    // Server-side PUT to R2 (no CORS issues)
    const buffer = Buffer.from(await file.arrayBuffer());
    const res = await fetch(uploadUrl, {
      method: 'PUT',
      body: buffer,
      headers: { 'Content-Type': file.type || 'image/webp' },
    });

    if (!res.ok) {
      console.error(`[Cerebro Operativo] Server upload to R2 failed: status ${res.status}`);
      return NextResponse.json(
        { error: `Error al subir imagen (status ${res.status})` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, publicUrl, key });
  } catch (error: any) {
    console.error('🔥 Error en server upload proxy:', error);
    return NextResponse.json(
      { error: error.message || 'Error al subir imagen' },
      { status: 500 }
    );
  }
}
