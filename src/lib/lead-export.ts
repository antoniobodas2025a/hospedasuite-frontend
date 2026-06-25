// ============================================================================
// Lead CSV Export — Client-side utility for superadmin lead management panel.
//
// Generates RFC 4180 compliant CSV from LeadDTO arrays and triggers a
// browser download via Blob + URL.createObjectURL.
//
// No server round-trip required — export is pure client-side.
// ============================================================================

import type { LeadDTO } from '@/types/leads';

// Column order for CSV export (matches the expanded table view)
const CSV_COLUMNS: (keyof LeadDTO)[] = [
  'id',
  'business_name',
  'phone',
  'city_search',
  'status',
  'notes',
  'address',
  'website',
  'rating',
  'ai_pitch',
  'hotel_id',
  'google_place_id',
  'created_at',
];

const CSV_HEADERS: Record<keyof LeadDTO, string> = {
  id: 'ID',
  business_name: 'Negocio',
  phone: 'Teléfono',
  city_search: 'Ciudad',
  status: 'Estado',
  notes: 'Notas',
  address: 'Dirección',
  website: 'Sitio Web',
  rating: 'Rating',
  ai_pitch: 'AI Pitch',
  hotel_id: 'Hotel ID',
  google_place_id: 'Google Place ID',
  created_at: 'Creado',
};

// ---------------------------------------------------------------------------
// RFC 4180 escaping
// ---------------------------------------------------------------------------

function escapeCSVField(value: unknown): string {
  if (value === null || value === undefined) return '';

  const str = String(value);

  // If the field contains commas, double quotes, or newlines, wrap in quotes
  // and double any internal double quotes per RFC 4180 §2.7
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

// ---------------------------------------------------------------------------
// Generate filename
// ---------------------------------------------------------------------------

function defaultFilename(): string {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return `leads-export-${yyyy}-${mm}-${dd}.csv`;
}

// ---------------------------------------------------------------------------
// Main export function
// ---------------------------------------------------------------------------

export function exportLeadsToCSV(leads: LeadDTO[], filename?: string): void {
  // Build CSV rows
  const headerRow = CSV_COLUMNS.map((col) => CSV_HEADERS[col]).join(',');

  const dataRows = leads.map((lead) =>
    CSV_COLUMNS.map((col) => escapeCSVField(lead[col])).join(','),
  );

  const csvContent = [headerRow, ...dataRows].join('\n');

  // Create Blob and trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename ?? defaultFilename();
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();

  // Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
