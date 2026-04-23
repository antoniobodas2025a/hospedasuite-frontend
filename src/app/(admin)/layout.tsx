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
    // 🛡️ ACTUALIZACIÓN CLAUDE 2026: bg-zinc-950 establece el lienzo oscuro base para todo el PMS
    <div className='flex h-screen bg-zinc-950 text-zinc-50 overflow-hidden font-poppins selection:bg-indigo-500/30 selection:text-indigo-200'>
      
      {/* Sidebar para Desktop */}
      <aside className='hidden lg:block w-72 h-full border-r border-zinc-800/50 bg-zinc-950/50 relative z-20'>
        <Sidebar 
          user={plainUser} 
          hotelName={hotel?.name || 'HospedaSuite'} 
        />
      </aside>

      {/* Contenido Principal */}
      <main className='flex-1 flex flex-col min-w-0 overflow-hidden relative bg-[#09090b]'>
        {/* Nav para Móvil */}
        <MobileNav 
          user={plainUser} 
          hotelName={hotel?.name || 'HospedaSuite'} 
        />
        
        {/* Área de Renderizado de Hijos (Paneles) */}
        <div className='flex-1 overflow-y-auto p-4 lg:p-8 custom-scrollbar relative z-10'>
          {children}
        </div>
      </main>
    </div>
  );
}