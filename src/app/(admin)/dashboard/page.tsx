import { createClient } from '@/utils/supabase/server';
import { getCurrentHotel } from '@/lib/hotel-context';
import { redirect } from 'next/navigation';
import DashboardPanel from '@/components/dashboard/DashboardPanel';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const hotel = await getCurrentHotel();
  if (!hotel) redirect('/login');

  const supabase = await createClient();

  // 1. DETERMINISMO TEMPORAL ANCLADO (Zona Horaria Colombia / UTC-5)
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60000;
  const localDate = new Date(now.getTime() - offsetMs);
  
  const startOfDay = new Date(localDate);
  startOfDay.setUTCHours(0, 0, 0, 0);
  
  const endOfDay = new Date(startOfDay);
  endOfDay.setUTCDate(startOfDay.getUTCDate() + 1);

  // 2. EJECUCIÓN PARALELA CON DESAMBIGUACIÓN (PGRST201 FIX)
  const [occRes, dirtyRes, posRes, walkInRes] = await Promise.all([
    supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('hotel_id', hotel.id).eq('status', 'checked_in'),
    supabase.from('rooms').select('*', { count: 'exact', head: true }).eq('hotel_id', hotel.id).eq('status', 'dirty'),
    
    // Ledger POS
    supabase.from('service_items')
      .select('total_price, bookings!inner(hotel_id)')
      .eq('bookings.hotel_id', hotel.id)
      .gte('created_at', startOfDay.toISOString())
      .lt('created_at', endOfDay.toISOString()),
      
    // Walk-in Payments - 🛡️ REPARACIÓN: Declaración explícita de FK (fk_payments_staff)
    supabase.from('payments')
      .select('amount, staff!fk_payments_staff!inner(hotel_id)')
      .eq('staff.hotel_id', hotel.id)
      .gte('created_at', startOfDay.toISOString())
      .lt('created_at', endOfDay.toISOString())
  ]);

  // 3. REDUCCIÓN MATEMÁTICA
  const totalPosRevenue = posRes.data?.reduce((sum, item) => sum + Number(item.total_price), 0) || 0;
  const totalWalkInRevenue = walkInRes.data?.reduce((sum, payment) => sum + Number(payment.amount), 0) || 0;
  const grossRevenue = totalPosRevenue + totalWalkInRevenue;

  // 4. CONTRATO DE DATOS (Payload Serializado)
  const metrics = {
    occupiedRooms: occRes.count || 0,
    dirtyRooms: dirtyRes.count || 0,
    totalPosRevenue,
    totalWalkInRevenue,
    grossRevenue
  };

  return (
    <div className="h-full">
      {/* ALERTA VISUAL (Se ocultará si no hay errores) */}
      {(posRes.error || walkInRes.error) && (
        <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 text-xs font-mono">
          ⚠️ ERROR DB: {posRes.error?.message || walkInRes.error?.message}
        </div>
      )}
      
      <DashboardPanel hotelName={hotel.name} metrics={metrics} />
    </div>
  );
}