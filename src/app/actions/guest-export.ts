/**
 * Export Guest Data for SIRE/TRA Compliance
 * 
 * Generates a CSV file with guest information required by Migración Colombia.
 * Fields: Nombre Completo, Tipo Documento, Número Documento, Nacionalidad, Fecha Check-in, Fecha Check-out
 */

import { supabaseAdmin } from '@/lib/supabase-admin';

export interface GuestExportRecord {
  nombre_completo: string;
  tipo_documento: string;
  numero_documento: string;
  nacionalidad: string;
  fecha_checkin: string;
  fecha_checkout: string;
  habitacion: string;
}

export async function exportGuestDataForSIRE(hotelId: string, startDate?: string, endDate?: string): Promise<{ success: boolean; data?: GuestExportRecord[]; error?: string }> {
  try {
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

/**
 * Converts guest records to CSV format
 */
export function guestDataToCSV(records: GuestExportRecord[]): string {
  const headers = ['Nombre Completo', 'Tipo Documento', 'Número Documento', 'Nacionalidad', 'Fecha Check-in', 'Fecha Check-out', 'Habitación'];
  
  const rows = records.map(r => [
    r.nombre_completo,
    r.tipo_documento,
    r.numero_documento,
    r.nacionalidad,
    r.fecha_checkin,
    r.fecha_checkout,
    r.habitacion,
  ]);

  // Escape CSV fields (handle commas and quotes)
  const escapeCsv = (val: string) => {
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(escapeCsv).join(',')),
  ].join('\n');

  // Add BOM for Excel compatibility with Spanish characters
  return '\uFEFF' + csvContent;
}
