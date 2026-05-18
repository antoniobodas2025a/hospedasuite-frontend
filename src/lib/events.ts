import { Client } from '@upstash/qstash';
import { EventEmitter } from 'events';
import { AllEventSchemas, AnyEvent, EventType } from './event-types';
import { randomUUID } from 'crypto';

// ── Configuration ───────────────────────────────────────────────
const QSTASH_URL = process.env.QSTASH_URL;

const isProduction = process.env.NODE_ENV === 'production';
const eventDrivenMode = process.env.EVENT_DRIVEN_MODE === 'true';

// ── QStash client (production) ──────────────────────────────────
let qstashClient: Client | null = null;

function getQstashClient(): Client {
  if (!qstashClient) {
    qstashClient = new Client({
      token: process.env.QSTASH_TOKEN!,
      baseUrl: QSTASH_URL,
    });
  }
  return qstashClient;
}

// ── In-memory EventEmitter (development) ────────────────────────
const devEmitter = new EventEmitter();

// ── Event publishing ────────────────────────────────────────────
export async function emitEvent<T extends EventType>(
  type: T,
  payload: Extract<AnyEvent, { type: T }>['payload'],
  metadata?: Partial<AnyEvent['metadata']>
): Promise<void> {
  // If event-driven mode is disabled, skip entirely
  if (!eventDrivenMode && !isProduction) {
    console.log(`[events] emitEvent skipped (EVENT_DRIVEN_MODE=false): ${type}`);
    return;
  }

  // Build the full event object
  const event: AnyEvent = {
    type,
    payload: payload as AnyEvent['payload'],
    metadata: {
      correlationId: metadata?.correlationId || randomUUID(),
      timestamp: metadata?.timestamp || new Date().toISOString(),
      source: metadata?.source || 'server-action',
      hotelId: metadata?.hotelId,
    },
  } as AnyEvent;

  // Validate against Zod schema
  const parseResult = AllEventSchemas.safeParse(event);
  if (!parseResult.success) {
    console.error(`[events] Schema validation failed for ${type}:`, parseResult.error.issues);
    throw new Error(`Invalid event payload for ${type}: ${parseResult.error.message}`);
  }

  if (isProduction) {
    // Production: publish to QStash
    await publishToQstash(event);
  } else {
    // Development: emit to in-memory EventEmitter
    console.log(`[events] ${type}`, JSON.stringify(event, null, 2));
    devEmitter.emit(type, event);
  }
}

async function publishToQstash(event: AnyEvent): Promise<void> {
  const client = getQstashClient();

  try {
    await client.publishJSON({
      url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/events/handler`,
      body: event,
      headers: {
        'Content-Type': 'application/json',
        'X-Event-Type': event.type,
        'X-Correlation-Id': event.metadata.correlationId,
      },
      retries: 3,
      delay: '30s',
    });

    console.log(`[events] Published ${event.type} (correlationId: ${event.metadata.correlationId})`);
  } catch (error) {
    console.error(`[events] Failed to publish ${event.type}:`, error);
    // Don't throw — event emission should not block the main flow
    // The DLQ will catch failed deliveries
  }
}

// ── Development helpers ─────────────────────────────────────────
export function onEvent<T extends EventType>(
  type: T,
  handler: (event: Extract<AnyEvent, { type: T }>) => void | Promise<void>
): void {
  if (!isProduction) {
    devEmitter.on(type, handler);
  }
}

export function offEvent<T extends EventType>(
  type: T,
  handler: (event: Extract<AnyEvent, { type: T }>) => void | Promise<void>
): void {
  if (!isProduction) {
    devEmitter.off(type, handler);
  }
}

// ── Cache invalidation helper ───────────────────────────────────
export async function emitCacheInvalidation(
  paths: string[] = [],
  tags: string[] = []
): Promise<void> {
  // cache.invalidate is NOT in the 21 schemas yet — added in PR 2
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (emitEvent as any)('cache.invalidate', { paths, tags });
}
