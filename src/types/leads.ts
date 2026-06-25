// ============================================================================
// Lead Types — Data layer types for the superadmin lead management panel.
//
// LeadDTO matches the hunted_leads table schema exactly.
// LeadStatus constrains the allowed status values for superadmin operations.
// LeadFilter captures all client-side filter/search/pagination parameters.
// LeadListResult is the standardized paginated response envelope.
// ============================================================================

export type LeadStatus = 'new' | 'contacted' | 'converted' | 'lost';

export const VALID_LEAD_STATUSES: LeadStatus[] = [
  'new',
  'contacted',
  'converted',
  'lost',
];

export interface LeadDTO {
  id: number;
  created_at: string;
  business_name: string;
  google_place_id?: string | null;
  address?: string | null;
  phone?: string | null;
  rating?: number | null;
  website?: string | null;
  ai_pitch?: string | null;
  city_search?: string | null;
  status?: string | null;
  notes?: string | null;
  hotel_id?: string | null;
}

export interface LeadFilter {
  search?: string;
  status?: LeadStatus;
  city?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export interface LeadListResult {
  leads: LeadDTO[];
  total: number;
  page: number;
  pageSize: number;
}

// Simplified hotel option for dropdown pre-fetch
export interface HotelOption {
  id: string;
  name: string;
}
