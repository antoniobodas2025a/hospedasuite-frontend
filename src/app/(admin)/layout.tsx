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

  // Obtenemos los datos del hotel desde el servidor
  const hotel = await getCurrentHotel();

  // 🚨 PROTECCIÓN DE SERIALIZACIÓN: Preparamos un objeto de usuario plano 
  const plainUser = {
    id: user.id,
    email: user.email
  };

  return (
    <div className='flex h-screen bg-slate-50 overflow-hidden'>
      {/* Sidebar para Desktop */}
      <aside className='hidden lg:block w-72 h-full'>
        <Sidebar 
          user={plainUser} 
          hotelName={hotel?.name || 'HospedaSuite'} 
        />
      </aside>

      {/* Contenido Principal */}
      <main className='flex-1 flex flex-col min-w-0 overflow-hidden relative'>
        {/* Nav para Móvil */}
        <MobileNav 
          user={plainUser} 
          hotelName={hotel?.name || 'HospedaSuite'} 
        />
        
        <div className='flex-1 overflow-y-auto p-4 lg:p-8 custom-scrollbar'>
          {children}
        </div>
      </main>
    </div>
  );
}