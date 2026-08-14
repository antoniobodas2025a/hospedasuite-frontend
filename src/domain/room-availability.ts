export type DateRange = {
  from: Date;
  to: Date;
};

export type RoomPricing = {
  weekdayPrice: number;
  weekendPrice: number;
};

export type Availability = {
  date: string;
  available: boolean;
  price: number;
};

export type PriceBreakdown = {
  subtotal: number;
  total: number;
};

export type RoomDetail = {
  id: string;
  name: string;
  description: string | null;
  capacity: number;
  beds: number;
  bedType: string;
  gallery: string[];
  amenities: string[];
  pricePerNight: number;
  weekendPrice: number;
  status: 'active' | 'inactive' | 'maintenance';
  restricted?: boolean;
};

export type HotelContext = {
  id: string;
  name: string;
  slug: string;
  city: string;
  totalRooms: number;
  subscriptionStatus: 'active' | 'inactive' | 'past_due' | 'cancelled';
  status: 'active' | 'inactive' | 'pending';
  cancellationPolicy: string | null;
  primaryColor: string;
};

export type RoomDetailState =
  | 'loading'
  | 'gallery'
  | 'dates_selected'
  | 'sold_out'
  | 'error';

export enum UIState {
  LOADING = 'LOADING',
  GALLERY = 'GALLERY',
  DATES_SELECTED = 'DATES_SELECTED',
  SOLD_OUT = 'SOLD_OUT',
  ERROR = 'ERROR',
}

export type DayPrice = {
  date: string;
  dayOfWeek: number;
  price: number;
  isWeekend: boolean;
};

export type ValidatedDates = {
  checkIn: Date;
  checkOut: Date;
};

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function isWeekend(date: Date): boolean {
  const day = date.getUTCDay();
  return day === 5 || day === 6;
}

export function calculateNights(checkIn: Date, checkOut: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((checkOut.getTime() - checkIn.getTime()) / msPerDay);
}

export function detectIntent(
  checkIn: Date,
  checkOut: Date
): 'weekend' | 'weekday' | 'long_stay' | 'any' {
  const nights = calculateNights(checkIn, checkOut);

  if (nights <= 0) {
    return 'any';
  }

  if (nights >= 5) {
    return 'long_stay';
  }

  const current = new Date(checkIn.getTime());
  for (let i = 0; i < nights; i++) {
    if (isWeekend(current)) {
      return 'weekend';
    }
    current.setDate(current.getDate() + 1);
  }

  return 'weekday';
}

export function validateAndParseDates(
  checkInStr?: string | null,
  checkOutStr?: string | null
): ValidatedDates | null {
  if (!checkInStr || !checkOutStr) {
    return null;
  }

  if (!ISO_DATE_REGEX.test(checkInStr) || !ISO_DATE_REGEX.test(checkOutStr)) {
    return null;
  }

  const checkIn = new Date(`${checkInStr}T12:00:00Z`);
  const checkOut = new Date(`${checkOutStr}T12:00:00Z`);

  if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
    return null;
  }

  if (checkOut.getTime() <= checkIn.getTime()) {
    return null;
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  if (checkOut.getTime() <= today.getTime()) {
    return null;
  }

  return { checkIn, checkOut };
}
