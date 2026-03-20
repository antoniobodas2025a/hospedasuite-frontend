'use server';

import { createClient } from '@/utils/supabase/server'; // 🚨 IMPORTAMOS EL CLIENTE SEGURO

export async function getDashboardStats(hotelId: string) {
  try {
    // 🚨 1. Instanciamos DENTRO de la función usando las cookies de sesión (Seguro y Rápido)
    const supabase = await createClient();

    // Validamos que el usuario esté realmente autenticado
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autorizado');

    // 2. BLINDAJE DE ZONA HORARIA (TIMEZONE SHIFT FIX)
    const timeZone = 'America/Bogota';
    const formatter = new Intl.DateTimeFormat('en-CA', { 
      timeZone, 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit' 
    });
    
    const today = formatter.format(new Date()); 
    const [yearStr, monthStr] = today.split('-');
    const year = parseInt(yearStr);
    const month = parseInt(monthStr);

    const firstDay = `${year}-${monthStr}-01`;
    const lastDayDate = new Date(year, month, 0); 
    const lastDay = `${year}-${monthStr}-${String(lastDayDate.getDate()).padStart(2, '0')}`;

    // 3. Traer todas las habitaciones
    const { data: rooms, error: roomsError } = await supabase
      .from('rooms')
      .select('id')
      .eq('hotel_id', hotelId);

    if (roomsError) throw new Error(`Error BD (Habitaciones): ${roomsError.message}`);
    const totalRooms = rooms?.length || 0;

    // 4. Traer reservas
    const { data: monthBookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, total_price, check_in, check_out, status, guests(full_name)')
      .eq('hotel_id', hotelId)
      .lte('check_in', lastDay)
      .gte('check_out', firstDay)
      .neq('status', 'cancelled');

    if (bookingsError) throw new Error(`Error BD (Reservas): ${bookingsError.message}`);

    // 5. Cálculos Rápidos
    const totalRevenue = monthBookings?.reduce((sum, booking) => sum + (booking.total_price || 0), 0) || 0;
    const occupiedToday = monthBookings?.filter(b => b.check_in <= today && b.check_out > today).length || 0;
    const occupancyRate = totalRooms > 0 ? Math.round((occupiedToday / totalRooms) * 100) : 0;

    // 6. Preparar datos para el Gráfico
    const chartData = [
      { name: 'Semana 1', ingresos: 0 },
      { name: 'Semana 2', ingresos: 0 },
      { name: 'Semana 3', ingresos: 0 },
      { name: 'Semana 4', ingresos: 0 },
    ];

    monthBookings?.forEach(booking => {
      if (!booking.check_in) return; // Defensa contra fechas nulas
      const parts = booking.check_in.split('-');
      if (parts.length < 3) return; // Defensa contra formatos extraños

      const dayOfMonth = parseInt(parts[2]);
      const revenue = booking.total_price || 0;
      
      if (dayOfMonth <= 7) chartData[0].ingresos += revenue;
      else if (dayOfMonth <= 14) chartData[1].ingresos += revenue;
      else if (dayOfMonth <= 21) chartData[2].ingresos += revenue;
      else chartData[3].ingresos += revenue;
    });

    // 7. Buscar llegadas (Manejando el error correctamente)
    const { data: upcomingArrivals, error: arrivalsError } = await supabase
      .from('bookings')
      .select('id, check_in, check_out, total_price, guests(full_name), rooms(name)')
      .eq('hotel_id', hotelId)
      .gte('check_in', today)
      .neq('status', 'cancelled')
      .order('check_in', { ascending: true })
      .limit(5);

    if (arrivalsError) throw new Error(`Error BD (Llegadas): ${arrivalsError.message}`);

    // 8. Retornar paquete de éxito
    return {
      success: true,
      data: {
        totalRevenue,
        occupancyRate,
        totalBookings: monthBookings?.length || 0,
        chartData,
        upcomingArrivals: upcomingArrivals || []
      }
    };

  } catch (error: any) {
    console.error('🔥 Error Crítico en getDashboardStats:', error.message);
    return { success: false, error: error.message };
  }
}