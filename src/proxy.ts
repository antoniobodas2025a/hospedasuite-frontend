import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/utils/supabase/middleware';

// 🚨 FIX QA CRÍTICO: Cambio de convención Next.js 16 (middleware -> proxy)
export async function proxy(request: NextRequest) {
  // 1. EL PORTERO PRINCIPAL (Valida y refresca la sesión JWT de Supabase)
  const response = await updateSession(request);

  if (response.headers.has('Location') || response.status >= 300) {
    return response;
  }

  const path = request.nextUrl.pathname;

  // =======================================================================
  // 🔐 EL GUARDIA INTERNO (Protección de Configuración por PIN)
  // =======================================================================
  if (path.startsWith('/dashboard/settings')) {
    const staffSessionCookie = request.cookies.get('hospeda_staff_session')?.value;

    if (staffSessionCookie) {
      try {
        const staffData = JSON.parse(staffSessionCookie);
        
        if (staffData.role !== 'Administrador' && staffData.role !== 'owner') {
          return NextResponse.redirect(new URL('/dashboard', request.url));
        }
      } catch (error) {
        console.error('Violación de seguridad: Cookie de PIN corrupta.');
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};