import type { GalleryItem } from '@/types';
import type {
  RoomDetail,
  HotelContext,
  ValidatedDates,
  Availability,
  RoomDetailState,
  DayPrice,
} from '@/domain/room-availability';
import { calculateNights } from '@/domain/room-availability';
import { buildRoomPricingBreakdown } from '@/lib/pricing';

// ============================================================================
// AMENITY LABEL MAP — Lightweight, server-safe labels for room amenity IDs
//
// Duplicates a small subset of src/lib/amenity-registry.ts so the ViewModel
// stays a pure function with no React component dependencies.
// ============================================================================

const AMENITY_LABELS: Record<string, string> = {
  wifi: 'Wi-Fi Gratis',
  tv: 'TV Pantalla Plana',
  ac: 'Climatización',
  minibar: 'Minibar',
  chimenea: 'Chimenea',
  cama_premium: 'Cama Premium',
  jacuzzi: 'Jacuzzi',
  bano_privado: 'Baño Privado',
  ducha_lluvia: 'Ducha Lluvia',
  mountain_view: 'Vista a la Montaña',
  beach_access: 'Acceso a Playa',
  techo_panoramico: 'Techo Panorámico',
  balcon: 'Balcón',
};

// ============================================================================
// TYPES
// ============================================================================

export interface Amenity {
  id: string;
  label: string;
}

export interface Suggestion {
  id: string;
  name: string;
  price: number;
  checkIn?: Date;
  checkOut?: Date;
}

export interface PriceBreakdown {
  weekdayPrice: number;
  weekendPrice: number;
  weekdayNights: number;
  weekendNights: number;
  subtotal: number;
  tax: number;
  total: number;
  taxRate: number;
  breakdown: DayPrice[];
}

export interface RoomDetailViewModelInput {
  room: RoomDetail | null;
  hotel: HotelContext | null;
  dates: ValidatedDates | null;
  /**
   * Optional availability for the selected date range.
   * When omitted, the room is assumed to be available.
   */
  availability?: Availability[];
}

export interface RoomDetailViewModelOutput {
  state: RoomDetailState;
  roomName: string;
  hotelName: string;
  hotelSlug: string;
  totalHotelRooms: number;
  pricePerNight: number;
  weekendPrice: number;
  taxRate: number;
  pricing: PriceBreakdown | null;
  gallery: GalleryItem[];
  coverImage: string;
  description: string;
  capacity: number;
  beds: number;
  bedType: string;
  amenities: Amenity[];
  cancellationPolicy: string | null;
  suggestions: Suggestion[];
  showOtherRooms: boolean;
  breadcrumb: { label: string; href: string };
  canBook: boolean;
  error: string | null;
  roomId: string;
  primaryColor: string;
  initialCheckIn?: Date;
  initialCheckOut?: Date;
  bookedDates?: string[];
}

// ============================================================================
// PURE HELPERS
// ============================================================================

function toISODate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function isHotelActive(hotel: HotelContext): boolean {
  return hotel.status === 'active' && hotel.subscriptionStatus !== 'cancelled';
}

function isAvailabilityForDates(
  dates: ValidatedDates,
  availability?: Availability[]
): boolean {
  if (!availability || availability.length === 0) {
    return true;
  }

  const nights = calculateNights(dates.checkIn, dates.checkOut);
  const current = new Date(dates.checkIn.getTime());

  for (let i = 0; i < nights; i++) {
    const date = toISODate(current);
    const entry = availability.find((a) => a.date === date);
    if (!entry || !entry.available) {
      return false;
    }
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return true;
}

function buildPricing(
  room: RoomDetail,
  hotel: HotelContext,
  dates: ValidatedDates
): PriceBreakdown {
  return buildRoomPricingBreakdown({
    pricePerNight: room.pricePerNight,
    weekendPrice: room.weekendPrice,
    taxRate: hotel.taxRate,
    checkIn: dates.checkIn,
    checkOut: dates.checkOut,
  });
}

function buildGallery(rawGallery: string[]): GalleryItem[] {
  const gallery: GalleryItem[] = rawGallery
    .filter((url) => typeof url === 'string' && url.length > 0)
    .map((url) => ({ url }));

  if (gallery.length === 0) {
    gallery.push({ url: '/logo.png' });
  }

  return gallery;
}

function buildAmenities(rawAmenities: string[]): Amenity[] {
  return rawAmenities.map((id) => ({
    id,
    label: AMENITY_LABELS[id] || id,
  }));
}

function buildSuggestions(): Suggestion[] {
  // SuggestAlternatives is a future use-case; the ViewModel returns an empty
  // array until the suggestor is wired in a later work unit.
  return [];
}

function errorOutput(): RoomDetailViewModelOutput {
  return {
    state: 'error',
    roomName: '',
    hotelName: '',
    hotelSlug: '',
    totalHotelRooms: 0,
    pricePerNight: 0,
    weekendPrice: 0,
    taxRate: 0,
    pricing: null,
    gallery: [],
    coverImage: '/logo.png',
    description: '',
    capacity: 0,
    beds: 0,
    bedType: '',
    amenities: [],
    cancellationPolicy: null,
    suggestions: [],
    showOtherRooms: false,
    breadcrumb: { label: '', href: '' },
    canBook: false,
    error: 'Room not found or hotel inactive',
    roomId: '',
    primaryColor: '',
  };
}

// ============================================================================
// VIEWMODEL
// ============================================================================

export function roomDetailViewModel(
  input: RoomDetailViewModelInput
): RoomDetailViewModelOutput {
  const { room, hotel, dates, availability } = input;

  if (!room || !hotel || !isHotelActive(hotel)) {
    return errorOutput();
  }

  const gallery = buildGallery(room.gallery);
  const amenities = buildAmenities(room.amenities);
  const showOtherRooms = hotel.totalRooms > 1;
  const restricted = room.restricted === true;
  const pastDue = hotel.subscriptionStatus === 'past_due';
  const canBook = !restricted && !pastDue;

  const base = {
    roomName: room.name,
    hotelName: hotel.name,
    hotelSlug: hotel.slug,
    totalHotelRooms: hotel.totalRooms,
    pricePerNight: room.pricePerNight,
    weekendPrice: room.weekendPrice > 0 ? room.weekendPrice : room.pricePerNight * 1.2,
    taxRate: hotel.taxRate,
    gallery,
    coverImage: gallery[0].url,
    description: room.description ?? '',
    capacity: room.capacity,
    beds: room.beds,
    bedType: room.bedType,
    amenities,
    cancellationPolicy: hotel.cancellationPolicy,
    suggestions: [],
    showOtherRooms,
    breadcrumb: {
      label: `${hotel.name} / ${room.name}`,
      href: `/hotel/${hotel.slug}`,
    },
    canBook,
    error: null,
    roomId: room.id,
    primaryColor: hotel.primaryColor,
    initialCheckIn: dates?.checkIn,
    initialCheckOut: dates?.checkOut,
    bookedDates: [],
  };

  if (!dates) {
    return {
      ...base,
      state: 'calendar_first',
      pricing: null,
    };
  }

  const pricing = buildPricing(room, hotel, dates);

  if (!isAvailabilityForDates(dates, availability)) {
    return {
      ...base,
      state: 'sold_out',
      pricing,
      suggestions: buildSuggestions(),
    };
  }

  return {
    ...base,
    state: 'detail',
    pricing,
  };
}
