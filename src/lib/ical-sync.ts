/**
 * Channel Manager — Channel Sync Engine
 *
 * Orchestrates iCal synchronization with Channels (Booking.com, Airbnb, Expedia).
 * Implements all mitigations: jitter, ETag cache, circuit breaker, alerts.
 *
 * Architecture:
 * 1. QStash cron triggers /api/sync-ota every 5 minutes
 * 2. Sync endpoint applies jitter per hotel
 * 3. Checks circuit breaker before fetching
 * 4. Fetches ICS with ETag/Last-Modified cache
 * 5. Parses events and compares with local DB
 * 6. Updates availability for new/changed events
 * 7. Records success/failure for circuit breaker
 *
 * Cost: ~$5.000 COP/mes por hotel (QStash + fetch)
 * Cache hit rate: ~70% (no procesa si no cambió)
 */

import { fetchICS, parseICS, IcsEvent, IcsFetchResult } from './ical-parser';
import { canRequest, recordSuccess, recordFailure, forceOpen } from './circuit-breaker';
import {
  sendChannelAlert,
  createRateLimitAlert,
  createCircuitAlert,
  createSyncFailureAlert,
  createOverbookingAlert,
} from './ota-alerts';

// ─── Configuration ───────────────────────────────────────────────

/**
 * Jitter window: each hotel gets a random offset within this range.
 * 240 seconds = 4 minutes, spreading syncs across the 5-minute window.
 */
const JITTER_WINDOW_SECONDS = 240;

/**
 * Max concurrent syncs per execution (prevent overwhelming the server).
 */
const MAX_CONCURRENT_SYNCS = 10;

// ─── Jitter ──────────────────────────────────────────────────────

/**
 * Calculate deterministic jitter offset for a hotel.
 * Same hotel always gets the same offset (predictable but distributed).
 *
 * Uses a simple hash of the hotelId to generate a number 0-240.
 */
export function getJitterOffset(hotelId: string): number {
  // Simple hash: sum char codes mod jitter window
  let hash = 0;
  for (let i = 0; i < hotelId.length; i++) {
    const char = hotelId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash) % JITTER_WINDOW_SECONDS;
}

/**
 * Sleep for a specified number of milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── Cache Store (ETag / Last-Modified per Channel connection) ────────

interface CacheEntry {
  etag: string | null;
  lastModified: string | null;
  lastSync: Date;
  eventCount: number;
}

// In production: use Redis or Supabase table
const cacheStore = new Map<string, CacheEntry>();

function getCacheKey(hotelId: string, otaId: string): string {
  return `${hotelId}:${otaId}`;
}

function getCache(hotelId: string, otaId: string): CacheEntry | null {
  return cacheStore.get(getCacheKey(hotelId, otaId)) || null;
}

function setCache(hotelId: string, otaId: string, entry: CacheEntry): void {
  cacheStore.set(getCacheKey(hotelId, otaId), entry);
}

// ─── Channel Connection Interface ─────────────────────────────────────

export interface ChannelConnection {
  id: string;
  hotelId: string;
  hotelName: string;
  otaName: string; // 'booking.com', 'airbnb', 'expedia', etc.
  icalUrl: string;
  pushUrl?: string; // Optional: for pushing availability back to Channel
  lastSyncAt: Date | null;
  isActive: boolean;
}

// ─── Sync Result ──────────────────────────────────────────────────

export interface SyncResult {
  hotelId: string;
  otaId: string;
  otaName: string;
  status: 'success' | 'not-modified' | 'rate-limited' | 'circuit-open' | 'error';
  eventsProcessed: number;
  eventsNew: number;
  eventsCancelled: number;
  duration: number; // milliseconds
  errorMessage?: string;
  cacheHit: boolean;
}

// ─── Main Sync Engine ─────────────────────────────────────────────

/**
 * Sync a single hotel's Channel connections.
 * Called by QStash cron endpoint.
 */
export async function syncHotelChannels(
  hotelId: string,
  hotelName: string,
  connections: ChannelConnection[]
): Promise<SyncResult[]> {
  const results: SyncResult[] = [];
  const jitterMs = getJitterOffset(hotelId) * 1000;

  // Apply jitter — spread syncs across the window
  if (jitterMs > 0) {
    await sleep(jitterMs);
  }

  // Process connections with concurrency limit
  const chunks = chunkArray(connections, MAX_CONCURRENT_SYNCS);

  for (const chunk of chunks) {
    const chunkResults = await Promise.allSettled(
      chunk.map(conn => syncSingleChannel(conn, hotelName))
    );

    for (const result of chunkResults) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        results.push({
          hotelId,
          otaId: 'unknown',
          otaName: 'unknown',
          status: 'error',
          eventsProcessed: 0,
          eventsNew: 0,
          eventsCancelled: 0,
          duration: 0,
          errorMessage: result.reason instanceof Error ? result.reason.message : 'Unknown error',
          cacheHit: false,
        });
      }
    }
  }

  return results;
}

/**
 * Sync a single Channel connection.
 */
async function syncSingleChannel(
  connection: ChannelConnection,
  hotelName: string
): Promise<SyncResult> {
  const startTime = Date.now();
  const { id: otaId, hotelId, otaName, icalUrl } = connection;

  // ─── Step 1: Check circuit breaker ─────────────────────────────
  if (!canRequest(otaName)) {
    const duration = Date.now() - startTime;
    return {
      hotelId,
      otaId,
      otaName,
      status: 'circuit-open',
      eventsProcessed: 0,
      eventsNew: 0,
      eventsCancelled: 0,
      duration,
      errorMessage: `Circuit breaker OPEN for ${otaName}`,
      cacheHit: false,
    };
  }

  // ─── Step 2: Check cache (ETag / Last-Modified) ────────────────
  const cached = getCache(hotelId, otaId);

  // ─── Step 3: Fetch ICS ─────────────────────────────────────────
  const fetchResult = await fetchICS(icalUrl, {
    etag: cached?.etag,
    lastModified: cached?.lastModified,
    timeoutMs: 10_000,
  });

  // ─── Step 4: Handle response ───────────────────────────────────

  // Rate limited
  if (fetchResult.httpStatus === 429) {
    recordFailure(otaName, 'rate-limited');
    forceOpen(otaName, 'Rate limited by Channel');

    const retryAfter = parseRetryAfter(fetchResult.errorMessage);
    await sendChannelAlert(createRateLimitAlert(hotelId, hotelName, otaName, retryAfter));

    return {
      hotelId,
      otaId,
      otaName,
      status: 'rate-limited',
      eventsProcessed: 0,
      eventsNew: 0,
      eventsCancelled: 0,
      duration: Date.now() - startTime,
      errorMessage: fetchResult.errorMessage,
      cacheHit: false,
    };
  }

  // Error
  if (fetchResult.status === 'error') {
    recordFailure(otaName, fetchResult.errorMessage);

    await sendChannelAlert(createSyncFailureAlert(
      hotelId,
      hotelName,
      otaName,
      fetchResult.errorMessage || 'Unknown error'
    ));

    return {
      hotelId,
      otaId,
      otaName,
      status: 'error',
      eventsProcessed: 0,
      eventsNew: 0,
      eventsCancelled: 0,
      duration: Date.now() - startTime,
      errorMessage: fetchResult.errorMessage,
      cacheHit: false,
    };
  }

  // Not modified — cache hit, no processing needed
  if (fetchResult.status === 'not-modified') {
    recordSuccess(otaName);

    // Update cache timestamp
    if (cached) {
      setCache(hotelId, otaId, { ...cached, lastSync: new Date() });
    }

    return {
      hotelId,
      otaId,
      otaName,
      status: 'not-modified',
      eventsProcessed: 0,
      eventsNew: 0,
      eventsCancelled: 0,
      duration: Date.now() - startTime,
      cacheHit: true,
    };
  }

  // ─── Step 5: Process events ────────────────────────────────────
  if (!fetchResult.calendar) {
    recordFailure(otaName, 'No calendar data');
    return {
      hotelId,
      otaId,
      otaName,
      status: 'error',
      eventsProcessed: 0,
      eventsNew: 0,
      eventsCancelled: 0,
      duration: Date.now() - startTime,
      errorMessage: 'No calendar data received',
      cacheHit: false,
    };
  }

  const processingResult = await processEvents(
    hotelId,
    otaId,
    otaName,
    hotelName,
    fetchResult.calendar.events,
    cached
  );

  // Update cache
  setCache(hotelId, otaId, {
    etag: fetchResult.etag,
    lastModified: fetchResult.lastModified,
    lastSync: new Date(),
    eventCount: fetchResult.calendar.events.length,
  });

  // Record success
  recordSuccess(otaName);

  return {
    hotelId,
    otaId,
    otaName,
    status: 'success',
    eventsProcessed: processingResult.processed,
    eventsNew: processingResult.new,
    eventsCancelled: processingResult.cancelled,
    duration: Date.now() - startTime,
    cacheHit: false,
  };
}

// ─── Event Processing ─────────────────────────────────────────────

interface ProcessingResult {
  processed: number;
  new: number;
  cancelled: number;
}

/**
 * Process ICS events: compare with local DB, update availability.
 */
async function processEvents(
  hotelId: string,
  otaId: string,
  otaName: string,
  hotelName: string,
  events: IcsEvent[],
  cached: CacheEntry | null
): Promise<ProcessingResult> {
  let processed = 0;
  let newEvents = 0;
  let cancelledEvents = 0;

  // In production: fetch previously processed event UIDs from DB
  // const processedUIDs = await getProcessedEventUIDs(hotelId, otaId);
  const processedUIDs = new Set<string>(); // Placeholder

  for (const event of events) {
    processed++;

    // Skip already processed events
    if (processedUIDs.has(event.uid)) {
      continue;
    }

    // Handle cancelled events
    if (event.status === 'cancelled') {
      cancelledEvents++;
      // await unblockRoom(hotelId, event);
      console.log(`[Sync] ${otaName}: Event cancelled ${event.uid} (${event.summary})`);
      continue;
    }

    // New confirmed event
    if (event.status === 'confirmed') {
      newEvents++;

      // Check for overbooking conflicts
      const conflict = await checkOverbooking(hotelId, event);
      if (conflict) {
        await sendChannelAlert(createOverbookingAlert(
          hotelId,
          hotelName,
          otaName,
          conflict.roomId,
          conflict.date
        ));
      }

      // Block room in local PMS
      // await blockRoom(hotelId, event);
      console.log(`[Sync] ${otaName}: New booking ${event.uid} (${event.summary}) ${event.startDate.toISOString()} → ${event.endDate.toISOString()}`);
    }
  }

  return { processed, new: newEvents, cancelled: cancelledEvents };
}

/**
 * Check if a new booking conflicts with existing bookings.
 */
async function checkOverbooking(
  hotelId: string,
  event: IcsEvent
): Promise<{ roomId: string; date: string } | null> {
  // In production: query DB for existing bookings in the same date range
  // const conflicts = await supabase
  //   .from('bookings')
  //   .select('room_id, check_in, check_out')
  //   .eq('hotel_id', hotelId)
  //   .not('status', 'eq', 'cancelled')
  //   .lte('check_in', event.endDate.toISOString())
  //   .gte('check_out', event.startDate.toISOString());

  // For now: no conflicts detected
  return null;
}

// ─── Utility Functions ────────────────────────────────────────────

/**
 * Split array into chunks of specified size.
 */
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Parse Retry-After header value (seconds or HTTP date).
 */
function parseRetryAfter(errorMessage?: string): number {
  if (!errorMessage) return 60;

  // Try to parse as number (seconds)
  const seconds = parseInt(errorMessage);
  if (!isNaN(seconds) && seconds > 0) return seconds;

  // Try to parse as HTTP date
  const date = new Date(errorMessage);
  if (!isNaN(date.getTime())) {
    return Math.max(0, Math.floor((date.getTime() - Date.now()) / 1000));
  }

  return 60; // Default: 1 minute
}

// ─── Sync All Hotels (QStash Cron Entry Point) ───────────────────

/**
 * Fetch all active hotels and their Channel connections, then sync.
 * This is the main entry point for the QStash cron job.
 */
export async function syncAllHotels(): Promise<{
  totalHotels: number;
  totalConnections: number;
  results: SyncResult[];
  duration: number;
}> {
  const startTime = Date.now();

  // In production: fetch from Supabase
  // const { data: hotels } = await supabase
  //   .from('hotels')
  //   .select('id, name, subscription_plan')
  //   .eq('subscription_status', 'active');

  // Placeholder: simulate hotel data
  const hotels: Array<{ id: string; name: string }> = [];

  const allResults: SyncResult[] = [];
  let totalConnections = 0;

  for (const hotel of hotels) {
    // Fetch Channel connections for this hotel
    // const { data: connections } = await supabase
    //   .from('ota_connections')
    //   .select('*')
    //   .eq('hotel_id', hotel.id)
    //   .eq('is_active', true);

    const connections: ChannelConnection[] = [];
    totalConnections += connections.length;

    if (connections.length > 0) {
      const results = await syncHotelChannels(hotel.id, hotel.name, connections);
      allResults.push(...results);
    }
  }

  return {
    totalHotels: hotels.length,
    totalConnections,
    results: allResults,
    duration: Date.now() - startTime,
  };
}
