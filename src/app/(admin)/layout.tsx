import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import MobileNav from '@/components/layout/MobileNav';
import { getCurrentHotel } from '@/lib/hotel-context';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect('/login');
  }

  // Obtenemos los datos del hotel desde el servidor de forma segura
  const hotel = await getCurrentHotel();

  // 🚨 PROTECCIÓN DE SERIALIZACIÓN: Preparamos un objeto de usuario plano 
  // Previene fugas (leaks) de objetos complejos Supabase hacia componentes Client (RSC Boundary)
  const plainUser = {
    id: user.id,
    email: user.email
  };

  return (
    // Océano Profundo dark theme — PMS/Dashboard
    <div className='flex h-screen bg-sidebar text-sidebar-foreground overflow-hidden font-poppins selection:bg-brand-500/30 selection:text-brand-200 dark'>
      
      {/* Sidebar para Desktop */}
      <div className='hidden lg:block w-72 h-full border-r border-sidebar-border bg-sidebar/50 relative z-20'>
        <Sidebar 
          user={plainUser} 
          hotelName={hotel?.name || 'HospedaSuite'} 
        />
      </div>

      {/* Contenido Principal */}
      <main className='flex-1 flex flex-col min-w-0 overflow-hidden relative bg-background'>
        {/* Nav para Móvil */}
        <MobileNav />
        
        {/* Área de Renderizado de Hijos (Paneles) */}
        <div className='flex-1 overflow-y-auto p-4 lg:p-8 custom-scrollbar relative z-10'>
          {children}
        </div>
      </main>
    </div>
  );
}