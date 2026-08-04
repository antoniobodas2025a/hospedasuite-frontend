/**
 * Guest Export Helpers - Pure functions (no server dependencies)
 */

export interface GuestExportRecord {
  nombre_completo: string;
  tipo_documento: string;
  numero_documento: string;
  nacionalidad: string;
  fecha_checkin: string;
  fecha_checkout: string;
  habitacion: string;
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
