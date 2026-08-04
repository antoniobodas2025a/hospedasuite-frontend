/**
 * Export Guest Data for SIRE/TRA Compliance
 * 
 * Generates a CSV file with guest information required by Migración Colombia.
 * Fields: Nombre Completo, Tipo Documento, Número Documento, Nacionalidad, Fecha Check-in, Fecha Check-out
 */

'use server';

import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireHotelAccess } from '@/lib/tenant-guard';
import { cookies } from 'next/headers';
import { guestDataToCSV, type GuestExportRecord } from '@/lib/guest-export-helpers';

export { guestDataToCSV, type GuestExportRecord };

export async function exportGuestDataForSIRE(hotelId: string, startDate?: string, endDate?: string): Promise<{ success: boolean; data?: GuestExportRecord[]; error?: string }> {
  try {
    // 🛡️ TENANT GUARD: Verify hotel ownership via staff session
    const { allowed, error: guardError } = await requireHotelAccess(hotelId, (await cookies()).get('hospeda_staff_session')?.value);
    if (!allowed) {
      return { success: false, error: guardError };
    }

    let query = supabaseAdmin
      .from('bookings')
      .select(`
        id,
        check_in,
        check_out,
        guests (full_name, doc_number, doc_type, nationality),
        rooms (name)
      `)
      .eq('hotel_id', hotelId)
      .eq('status', 'CONFIRMED')
      .order('check_in', { ascending: false });

    if (startDate) {
      query = query.gte('check_in', startDate);
    }
    if (endDate) {
      query = query.lte('check_in', endDate);
    }

    const { data: bookings, error } = await query.limit(500);

    if (error) {
      return { success: false, error: error.message };
    }

    const records: GuestExportRecord[] = (bookings || [])
      .filter((b: any) => b.guests && b.guests.length > 0)
      .map((booking: any) => {
        const guest = booking.guests[0];
        return {
          nombre_completo: guest.full_name || 'N/A',
          tipo_documento: guest.doc_type || 'CC',
          numero_documento: guest.doc_number || 'N/A',
          nacionalidad: guest.nationality || 'Colombiana',
          fecha_checkin: booking.check_in || '',
          fecha_checkout: booking.check_out || '',
          habitacion: booking.rooms?.[0]?.name || 'N/A',
        };
      });

    return { success: true, data: records };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Error exporting data' };
  }
}
