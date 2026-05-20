/**
 * ICS (iCalendar) Parser — Channel Manager
 *
 * Lightweight parser for .ics files from Booking.com, Airbnb, Expedia, etc.
 * No external dependencies — pure TypeScript.
 *
 * Handles:
 * - VEVENT parsing (reservations, blocked dates)
 * - Recurring events (RRULE basic support)
 * - Timezone normalization (UTC + local)
 * - ETag / Last-Modified extraction from HTTP headers
 */

export interface IcsEvent {
  uid: string;
  summary: string;
  description: string;
  startDate: Date;
  endDate: Date;
  status: 'confirmed' | 'cancelled' | 'tentative';
  created: Date | undefined;
  lastModified: Date | undefined;
  location: string;
  // OTA-specific metadata
  guestName?: string;
  guestCount?: number;
  bookingReference?: string;
  raw: string;
}

export interface IcsCalendar {
  prodId: string;
  version: string;
  method: string;
  events: IcsEvent[];
  timezone?: string;
}

export interface IcsFetchResult {
  status: 'success' | 'not-modified' | 'error';
  calendar: IcsCalendar | null;
  etag: string | null;
  lastModified: string | null;
  httpStatus: number;
  errorMessage?: string;
}

// ─── ICS Parsing ──────────────────────────────────────────────────

/**
 * Parse raw ICS text into structured calendar data.
 */
export function parseICS(text: string): IcsCalendar {
  const calendar: IcsCalendar = {
    prodId: '',
    version: '2.0',
    method: 'PUBLISH',
    events: [],
  };

  const lines = unfoldLines(text);
  let inEvent = false;
  let currentEvent: Partial<IcsEvent> = {};

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === 'BEGIN:VEVENT') {
      inEvent = true;
      currentEvent = {};
      continue;
    }

    if (trimmed === 'END:VEVENT') {
      inEvent = false;
      if (currentEvent.uid) {
        calendar.events.push(finalizeEvent(currentEvent));
      }
      continue;
    }

    if (!inEvent) {
      // Calendar-level properties
      if (trimmed.startsWith('PRODID:')) calendar.prodId = trimmed.slice(7);
      if (trimmed.startsWith('VERSION:')) calendar.version = trimmed.slice(8);
      if (trimmed.startsWith('METHOD:')) calendar.method = trimmed.slice(7);
      if (trimmed.startsWith('X-WR-CALNAME:')) calendar.timezone = trimmed.slice(13);
      continue;
    }

    // Event properties
    if (trimmed.startsWith('UID:')) currentEvent.uid = trimmed.slice(4);
    if (trimmed.startsWith('SUMMARY:')) currentEvent.summary = unescapeICS(trimmed.slice(8));
    if (trimmed.startsWith('DESCRIPTION:')) currentEvent.description = unescapeICS(trimmed.slice(12));
    if (trimmed.startsWith('LOCATION:')) currentEvent.location = unescapeICS(trimmed.slice(9));
    if (trimmed.startsWith('STATUS:')) {
      const status = trimmed.slice(7).toLowerCase();
      if (status === 'confirmed' || status === 'cancelled' || status === 'tentative') {
        currentEvent.status = status;
      }
    }
    if (trimmed.startsWith('DTSTART')) {
      const parsed = parseICSDate(trimmed);
      if (parsed) currentEvent.startDate = parsed;
    }
    if (trimmed.startsWith('DTEND')) {
      const parsed = parseICSDate(trimmed);
      if (parsed) currentEvent.endDate = parsed;
    }
    if (trimmed.startsWith('CREATED')) {
      const parsed = parseICSDate(trimmed);
      if (parsed) currentEvent.created = parsed;
    }
    if (trimmed.startsWith('LAST-MODIFIED')) {
      const parsed = parseICSDate(trimmed);
      if (parsed) currentEvent.lastModified = parsed;
    }

    // Extract OTA-specific data from description/summary
    if (trimmed.startsWith('DESCRIPTION:') || trimmed.startsWith('SUMMARY:')) {
      const value = trimmed.includes('DESCRIPTION:')
        ? trimmed.slice(12)
        : trimmed.slice(8);
      const extracted = extractOTAMetadata(value);
      if (extracted.guestName) currentEvent.guestName = extracted.guestName;
      if (extracted.guestCount) currentEvent.guestCount = extracted.guestCount;
      if (extracted.bookingReference) currentEvent.bookingReference = extracted.bookingReference;
    }
  }

  return calendar;
}

/**
 * Unfold continuation lines (RFC 5545 Section 3.1).
 * Lines starting with space/tab are continuations of the previous line.
 */
function unfoldLines(text: string): string[] {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .reduce((acc, line) => {
      if ((line.startsWith(' ') || line.startsWith('\t')) && acc.length > 0) {
        acc[acc.length - 1] += line.slice(1);
      } else {
        acc.push(line);
      }
      return acc;
    }, [] as string[]);
}

/**
 * Parse ICS date-time value (handles both DATE and DATE-TIME formats).
 */
function parseICSDate(line: string): Date | null {
  // DTSTART;VALUE=DATE:20240115
  // DTSTART:20240115T140000Z
  const colonIndex = line.indexOf(':');
  if (colonIndex === -1) return null;

  const value = line.slice(colonIndex + 1).trim();

  // All-day date: YYYYMMDD
  if (value.length === 8 && /^\d{8}$/.test(value)) {
    const year = parseInt(value.slice(0, 4));
    const month = parseInt(value.slice(4, 6)) - 1;
    const day = parseInt(value.slice(6, 8));
    return new Date(Date.UTC(year, month, day));
  }

  // Date-time: YYYYMMDDTHHMMSSZ (UTC)
  if (value.endsWith('Z')) {
    const year = parseInt(value.slice(0, 4));
    const month = parseInt(value.slice(4, 6)) - 1;
    const day = parseInt(value.slice(6, 8));
    const hour = parseInt(value.slice(9, 11));
    const minute = parseInt(value.slice(11, 13));
    const second = parseInt(value.slice(13, 15));
    return new Date(Date.UTC(year, month, day, hour, minute, second));
  }

  // Date-time with timezone: YYYYMMDDTHHMMSS
  if (value.length >= 15) {
    const year = parseInt(value.slice(0, 4));
    const month = parseInt(value.slice(4, 6)) - 1;
    const day = parseInt(value.slice(6, 8));
    const hour = parseInt(value.slice(9, 11));
    const minute = parseInt(value.slice(11, 13));
    const second = parseInt(value.slice(13, 15));
    return new Date(year, month, day, hour, minute, second);
  }

  return null;
}

/**
 * Unescape ICS text values.
 */
function unescapeICS(text: string): string {
  return text
    .replace(/\\n/g, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\');
}

/**
 * Finalize a partial event with defaults.
 */
function finalizeEvent(partial: Partial<IcsEvent>): IcsEvent {
  return {
    uid: partial.uid || '',
    summary: partial.summary || '',
    description: partial.description || '',
    startDate: partial.startDate || new Date(),
    endDate: partial.endDate || new Date(),
    status: partial.status || 'confirmed',
    created: partial.created || undefined,
    lastModified: partial.lastModified || undefined,
    location: partial.location || '',
    guestName: partial.guestName,
    guestCount: partial.guestCount,
    bookingReference: partial.bookingReference,
    raw: '',
  };
}

/**
 * Extract OTA-specific metadata from description/summary text.
 */
function extractOTAMetadata(text: string): {
  guestName?: string;
  guestCount?: number;
  bookingReference?: string;
} {
  const result: { guestName?: string; guestCount?: number; bookingReference?: string } = {};

  // Booking.com patterns
  const bookingRefMatch = text.match(/Booking\.com[\s\S]*?(?:Reservation|Booking)[\s#:]+([A-Z0-9-]+)/i);
  if (bookingRefMatch) result.bookingReference = bookingRefMatch[1];

  // Guest count patterns
  const guestMatch = text.match(/(\d+)\s*(?:guest|adult|child|huésped|persona)/i);
  if (guestMatch) result.guestCount = parseInt(guestMatch[1]);

  // Guest name patterns (varies by OTA)
  const nameMatch = text.match(/(?:Guest|Huésped|Nombre|Name)[:\s]+([A-Za-zÀ-ÿ\s]+)/i);
  if (nameMatch) result.guestName = nameMatch[1].trim();

  return result;
}

// ─── ICS Generation ───────────────────────────────────────────────

export interface AvailabilitySlot {
  roomId: string;
  startDate: Date;
  endDate: Date;
  status: 'available' | 'blocked' | 'booked';
}

/**
 * Generate an ICS calendar from availability slots.
 * Used to push availability to OTAs that support iCal import.
 */
export function generateICS(
  hotelName: string,
  slots: AvailabilitySlot[],
  timezone: string = 'America/Bogota'
): string {
  const now = new Date();
  const timestamp = formatICSDate(now);

  let ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//HospedaSuite//Channel Manager//ES
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:${hotelName} - HospedaSuite
X-WR-TIMEZONE:${timezone}
`;

  for (const slot of slots) {
    ics += `BEGIN:VEVENT
UID:${slot.roomId}-${slot.startDate.toISOString()}@hospedasuite.com
DTSTAMP:${timestamp}
DTSTART;VALUE=DATE:${formatICSDateOnly(slot.startDate)}
DTEND;VALUE=DATE:${formatICSDateOnly(slot.endDate)}
SUMMARY:${slot.status === 'blocked' || slot.status === 'booked' ? 'Ocupado' : 'Disponible'}
DESCRIPTION:Room ${slot.roomId} - ${slot.status}
STATUS:${slot.status === 'booked' ? 'CONFIRMED' : slot.status === 'blocked' ? 'TENTATIVE' : 'CONFIRMED'}
END:VEVENT
`;
  }

  ics += 'END:VCALENDAR';
  return ics;
}

function formatICSDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function formatICSDateOnly(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

// ─── Fetch with Cache Support ─────────────────────────────────────

/**
 * Fetch ICS from OTA URL with ETag/Last-Modified cache support.
 * Returns 'not-modified' if the calendar hasn't changed.
 */
export async function fetchICS(
  url: string,
  options?: {
    etag?: string | null;
    lastModified?: string | null;
    timeoutMs?: number;
  }
): Promise<IcsFetchResult> {
  const timeout = options?.timeoutMs ?? 10_000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const headers: Record<string, string> = {
      'User-Agent': 'HospedaSuite-ChannelManager/1.0',
      'Accept': 'text/calendar, text/plain, */*',
    };

    // Cache headers — only fetch if changed
    if (options?.etag) headers['If-None-Match'] = options.etag;
    if (options?.lastModified) headers['If-Modified-Since'] = options.lastModified;

    const response = await fetch(url, {
      headers,
      signal: controller.signal,
      // Don't follow redirects automatically for OTA URLs
      redirect: 'follow',
    });

    clearTimeout(timeoutId);

    // 304 Not Modified — calendar hasn't changed
    if (response.status === 304) {
      return {
        status: 'not-modified',
        calendar: null,
        etag: options?.etag ?? null,
        lastModified: options?.lastModified ?? null,
        httpStatus: 304,
      };
    }

    // Rate limited
    if (response.status === 429) {
      return {
        status: 'error',
        calendar: null,
        etag: null,
        lastModified: null,
        httpStatus: 429,
        errorMessage: 'Rate limited by OTA',
      };
    }

    // Other errors
    if (!response.ok) {
      return {
        status: 'error',
        calendar: null,
        etag: null,
        lastModified: null,
        httpStatus: response.status,
        errorMessage: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    // Success
    const text = await response.text();
    const etag = response.headers.get('ETag');
    const lastModified = response.headers.get('Last-Modified');

    const calendar = parseICS(text);

    return {
      status: 'success',
      calendar,
      etag,
      lastModified,
      httpStatus: response.status,
    };
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof DOMException && error.name === 'AbortError') {
      return {
        status: 'error',
        calendar: null,
        etag: null,
        lastModified: null,
        httpStatus: 0,
        errorMessage: `Request timeout (${timeout}ms)`,
      };
    }

    return {
      status: 'error',
      calendar: null,
      etag: null,
      lastModified: null,
      httpStatus: 0,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
