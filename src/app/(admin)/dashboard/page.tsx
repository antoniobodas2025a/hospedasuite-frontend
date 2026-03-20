import { getCurrentHotel } from '@/lib/hotel-context';
import OverviewPanel from '@/components/dashboard/OverviewPanel';
import { LogOut, ShieldAlert } from 'lucide-react';
import { logout } from '@/app/actions/auth';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  // 1. OBTENCIÓN SEGURA DEL TENANT (Server Side)
  // El candado de seguridad se mantiene intacto.
  const hotel = await getCurrentHotel();

  // --- ESCENARIO DE ERROR: USUARIO SIN HOTEL ---
  if (!hotel) {
    return (
      <div className='h-screen flex flex-col items-center justify-center bg-gray-50 text-center p-4'>
        <div className='bg-white p-8 rounded-2xl shadow-xl border border-red-100 max-w-md w-full'>
          <div className='w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4'>
            <ShieldAlert className='text-red-600 w-8 h-8' />
          </div>
          <h1 className='text-xl font-bold text-gray-900 mb-2'>
            Cuenta sin Propiedad
          </h1>
          <p className='text-gray-500 mb-6 text-sm'>
            Tu usuario ha iniciado sesión correctamente, pero no está vinculado
            a ningún Hotel en el sistema.
          </p>

          <form action={logout}>
            <button className='w-full flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 text-white font-bold py-3 px-4 rounded-xl transition-all'>
              <LogOut size={16} /> Cerrar Sesión
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 2. RENDERIZAR EL CEREBRO NUEVO (OverviewPanel)
  // Al pasarle el hotel.id, el OverviewPanel se encarga de usar su propia Server Action
  // para traer los datos y activar los WebSockets (Realtime) en el cliente.
  return (
    <div className='h-full'>
      <OverviewPanel hotelId={hotel.id} />
    </div>
  );
}