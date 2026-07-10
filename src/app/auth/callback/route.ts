export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';
  const type = searchParams.get('type');

  // Manejar OAuth code (Google, GitHub, etc.)
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Manejar magic link de recuperación de contraseña
  if (type === 'recovery') {
    // Supabase ya estableció la sesión automáticamente
    // Redirigir a la página de reset de contraseña
    return NextResponse.redirect(`${origin}/auth/reset-password`);
  }

  // Si falla, devolver al login con error
  return NextResponse.redirect(`${origin}/login?error=auth-code-error`);
}
