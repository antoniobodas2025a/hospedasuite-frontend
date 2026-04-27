import { createClient } from '@/utils/supabase/server';
import { getCurrentHotel } from '@/lib/hotel-context';
import CheckoutTerminal from './CheckoutTerminal'; 
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: Promise<{ id?: string }>;
}

export default async function CheckoutPage({ searchParams }: Props) {
  const { id: targetId } = await searchParams;
  
  const hotel = await getCurrentHotel();
  if (!hotel) redirect('/dashboard');

  const supabase = await createClient();

  const { data: allActiveBookings, error: fetchError } = await supabase
    .from('bookings')
    .select(`
      id, 
      check_in, 
      check_out, 
      status, 
      total_price, 
      room:rooms (id, name, price, weekend_price), 
      guest:guests (full_name, doc_number, phone, email)
    `)
    .eq('hotel_id', hotel.id)
    .in('status', ['confirmed', 'checked_in'])
    .order('check_out', { ascending: true });

  if (fetchError) {
    return (
      <div className='p-20 text-center font-mono text-xs text-rose-500 bg-rose-500/5 border border-rose-500/10 rounded-3xl'>
        CRITICAL_DATABASE_SYNC_ERROR: Fallo de conexión con el Ledger.
      </div>
    );
  }

  // 🛡️ PROTOCOLO DE VALIDACIÓN FLEXIBLE
  if (targetId) {
    const isActive = allActiveBookings?.some(booking => booking.id === targetId);
    
    if (!isActive) {
      const { data: ownershipCheck } = await supabase
        .from('bookings')
        .select('id, status')
        .eq('id', targetId)
        .eq('hotel_id', hotel.id)
        .single();

      if (!ownershipCheck) {
        return (
          <div className='p-20 text-center'>
            <div className='inline-flex p-5 bg-rose-500/10 rounded-full mb-6 border border-rose-500/20'>
              <h2 className='text-rose-400 font-bold text-xl uppercase tracking-tighter'>Violación de Acceso</h2>
            </div>
            <p className='text-zinc-500 text-sm mt-2 font-medium'>
              El nodo financiero solicitado no pertenece a este Tenant.
            </p>
          </div>
        );
      } else if (ownershipCheck.status === 'checked_out' || ownershipCheck.status === 'cancelled') {
         // 🛡️ REPARACIÓN FORENSE: Native Anchor Tag
         // El uso de una etiqueta <a> nativa en lugar de <Link> de Next.js garantiza
         // un Hard Reload (Full Document Request) seguro desde un Server Component.
         // Esto limpia absolutamente el caché de Next.js en el cliente y purga el Sidebar.
         return (
           <div className='flex flex-col items-center justify-center h-[60vh] text-center space-y-6 animate-in fade-in zoom-in-95'>
             <div className='p-6 bg-emerald-500/10 rounded-full border border-emerald-500/20'>
                <svg className="w-12 h-12 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
             </div>
             <div>
               <h2 className='text-2xl font-bold text-zinc-100 tracking-tight'>Estadía Finalizada</h2>
               <p className='text-zinc-400 mt-2'>El folio seleccionado ya ha sido cerrado y liquidado.</p>
             </div>
             <a 
                href="/dashboard/calendar" 
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all cursor-pointer"
              >
                Volver a la Agenda
             </a>
           </div>
         );
      }
    }
  }

  // HAND-OFF AL CLIENTE
  return (
    <div className='h-full animate-in fade-in zoom-in-95 duration-700'>
      <CheckoutTerminal 
        bookings={allActiveBookings || []} 
        initialSelectedId={targetId}
        wompiPublicKey={hotel.wompi_public_key} 
      />
    </div>
  );
}