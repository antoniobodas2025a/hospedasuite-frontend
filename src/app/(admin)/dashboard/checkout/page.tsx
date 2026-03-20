import { createClient } from '@/utils/supabase/server';
import CheckoutPanel from '@/components/dashboard/CheckoutPanel';
import { getCurrentHotel } from '@/lib/hotel-context';

export const dynamic = 'force-dynamic';

export default async function CheckoutPage() {
  const hotel = await getCurrentHotel();
  if (!hotel) return <div className='p-10 text-center font-bold text-slate-500'>No se encontró propiedad asociada.</div>;

  const supabase = await createClient();

  const { data: bookings } = await supabase
    .from('bookings')
    .select(`id, check_in, check_out, total_price, status, room:rooms (id, name), guest:guests (full_name, doc_number)`)
    .eq('hotel_id', hotel.id)
    .in('status', ['confirmed', 'checked_in']) 
    .order('check_out', { ascending: true }); 

  return (
    <div className='h-full'>
      {/* 👇 NUEVO: Le pasamos la llave pública de Wompi que el dueño guardó en Configuración */}
      <CheckoutPanel 
        bookings={bookings || []} 
        wompiPublicKey={hotel.wompi_public_key} 
      />
    </div>
  );
}