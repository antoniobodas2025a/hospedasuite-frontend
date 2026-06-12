// ============================================================================
// 🏛️ TIPOS COMPARTIDOS — HospedaSuite
//
// Fuente única de verdad para TODAS las entidades del dominio.
// NO definas interfaces inline en hooks/actions — importalas de acá.
// ============================================================================

// --------------------------------------------------------------------------
// REVIEW STATS (Calificaciones)
// --------------------------------------------------------------------------
export interface ReviewStats {
  averageRating: number;
  totalReviews: number;
}

// --------------------------------------------------------------------------
// HOTEL (Tenant)
// --------------------------------------------------------------------------
export interface Hotel {
  id: string;
  name: string;
  owner_id?: string;
  email?: string;
  slug?: string;
  location?: string;
  city?: string;
  address?: string;
  primary_color?: string;
  cancellation_policy?: string;
  tax_rate?: number;
  cover_photo_url?: string;
  main_image_url?: string;
  gallery_urls?: string[];
  hotel_amenities?: string[];
  whatsapp_number?: string;
  description?: string;
  logo_url?: string;
  status?: string;
  subscription_plan?: 'starter' | 'pro' | 'enterprise' | string;
  subscription_status?: 'trialing' | 'active' | 'past_due' | 'grace_period' | 'cancelled' | 'pending_approval' | string;
  trial_ends_at?: string;
  billing_cycle_start?: string;
  date_paid?: string;
  wompi_integrity_secret?: string;
  wompi_events_secret?: string;
  wompi_public_key?: string;
  wompi_sandbox_mode?: boolean;
  reviewStats?: ReviewStats;
  /** Coordenadas del hotel (PRD-009: Mapa Inteligente) */
  latitude?: number | null;
  longitude?: number | null;
  precision?: string | null;
}

// --------------------------------------------------------------------------
// ROOM (Habitación / Unidad)
// --------------------------------------------------------------------------
export type RoomStatus = 'clean' | 'dirty' | 'occupied' | 'maintenance' | 'active' | string;

export interface Room {
  id: string;
  hotel_id?: string;
  name: string;
  type?: string;
  price: number;
  weekend_price?: number;
  capacity?: number;
  status: RoomStatus;
  description?: string;
  gallery?: GalleryItem[];
  amenities?: string[];
  size_sqm?: number;
  bed_type?: string;
  beds?: number;
  price_per_night?: number;
  ical_import_url?: string;
  ical_export_token?: string;
  last_ical_sync?: string;
  ical_sync_status?: 'ok' | 'error' | 'pending';
}

export interface GalleryItem {
  url: string;
  alt?: string;
  caption?: string;
}

// --------------------------------------------------------------------------
// BOOKING (Reserva / Folio)
// --------------------------------------------------------------------------
export type BookingStatus =
  | 'pending' | 'PENDING'
  | 'confirmed' | 'CONFIRMED'
  | 'checked_in' | 'CHECKED_IN'
  | 'checked_out' | 'CHECKED_OUT'
  | 'cancelled' | 'CANCELLED'
  | 'maintenance'
  | 'blocked_ota'
  | 'EXPIRED'
  | string;

export interface Booking {
  id: string;
  hotel_id: string;
  room_id: string;
  guest_id?: string;
  staff_id?: string | null;
  status: BookingStatus;
  check_in: string;
  check_out: string;
  total_price: number;
  source?: 'direct' | 'ota' | 'admin' | string;
  referral_channel?: 'instagram' | 'whatsapp' | 'facebook' | 'tiktok' | 'google' | string;
  type?: 'booking' | 'maintenance' | string;
  external_id?: string;
  guest_name?: string;
  guests?: { id?: string; full_name: string; email?: string; doc_number?: string; phone?: string };
  rooms?: { id?: string; name?: string };
  payments?: Payment[];
}

// --------------------------------------------------------------------------
// GUEST (Huésped)
// --------------------------------------------------------------------------
export interface Guest {
  id: string;
  hotel_id?: string;
  full_name: string;
  doc_type?: string;
  doc_number: string;
  phone?: string;
  email?: string;
  country?: string;
  notes?: string;
}

export interface GuestPayload {
  full_name: string;
  doc_type?: string;
  doc_number: string;
  phone?: string;
  email?: string;
  country?: string;
  notes?: string;
}

// --------------------------------------------------------------------------
// PAYMENT (Pago)
// --------------------------------------------------------------------------
export interface Payment {
  id?: string;
  booking_id?: string;
  amount: number;
  method: 'wompi' | 'cash' | 'transfer' | string;
  notes?: string;
  staff_id?: string | null;
  created_at?: string;
}

// --------------------------------------------------------------------------
// STAFF (Personal operativo)
// --------------------------------------------------------------------------
export interface Staff {
  id: string;
  hotel_id: string;
  name: string;
  role: string;
  pin_code: string;
  user_id?: string;
}

// --------------------------------------------------------------------------
// SERVICE ITEM (Consumo POS)
// --------------------------------------------------------------------------
export interface ServiceItem {
  id: string;
  booking_id: string;
  room_id: string;
  description: string;
  quantity: number;
  total_price: number;
  status: 'pending' | 'paid' | string;
  created_at?: string;
}

// --------------------------------------------------------------------------
// OTA SYNC LOG (Registro de sincronización iCal)
// --------------------------------------------------------------------------
export interface OtaSyncLog {
  id: string;
  hotel_id: string;
  rooms_synced: number;
  bookings_created: number;
  bookings_cancelled: number;
  bookings_unchanged: number;
  status: 'success' | 'partial' | 'error';
  error_message?: string;
  sync_source?: 'ical' | 'api' | 'manual';
  executed_at: string;
  duration_ms?: number;
}

// --------------------------------------------------------------------------
// OTA COMMISSION (Comisión por reserva OTA)
// --------------------------------------------------------------------------
export interface OtaCommission {
  booking_id: string;
  source: string;
  total: number;
  commission: number;
}
