import { NextRequest, NextResponse } from 'next/server';
import { AllEventSchemas, AnyEvent } from '@/lib/event-types';
import { getHandlers } from '@/lib/event-handlers';
import { createClient } from '@/utils/supabase/server';

// Verify QStash signature (reuse existing pattern from webhooks)
async function verifyQStashSignature(request: NextRequest): Promise<boolean> {
  const signature = request.headers.get('upstash-signature');
  if (!signature) return false;
  
  // For now, accept all requests from QStash
  // In production, verify with QSTASH_SIGNING_SECRET
  return true;
}

// Check if event was already processed (idempotency)
async function isEventProcessed(eventType: string, correlationId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('processed_events')
    .select('id')
    .eq('event_type', eventType)
    .eq('correlation_id', correlationId)
    .maybeSingle();
  
  return !!data;
}

// Mark event as processed
async function markEventProcessed(eventType: string, correlationId: string, payloadHash: string): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from('processed_events')
    .insert({
      event_type: eventType,
      correlation_id: correlationId,
      payload_hash: payloadHash,
      status: 'processed',
    });
}

// Simple hash for payload
function hashPayload(payload: unknown): string {
  const str = JSON.stringify(payload);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}

export async function POST(request: NextRequest) {
  try {
    // Verify signature
    if (!await verifyQStashSignature(request)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Parse event
    const body = await request.json();
    
    // Validate against Zod schema
    const parseResult = AllEventSchemas.safeParse(body);
    if (!parseResult.success) {
      console.error('[events] Invalid event payload:', parseResult.error.issues);
      return NextResponse.json({ error: 'Invalid event payload' }, { status: 400 });
    }

    const event = parseResult.data;
    const { type: eventType, metadata } = event;
    const { correlationId } = metadata;

    // Idempotency check
    if (await isEventProcessed(eventType, correlationId)) {
      console.log(`[events] Duplicate event skipped: ${eventType} (${correlationId})`);
      return NextResponse.json({ status: 'duplicate' }, { status: 200 });
    }

    // Get registered handlers
    const handlers = getHandlers(eventType as any);
    if (handlers.length === 0) {
      console.log(`[events] No handlers registered for ${eventType}`);
      // Still mark as processed
      await markEventProcessed(eventType, correlationId, hashPayload(event.payload));
      return NextResponse.json({ status: 'no-handlers' }, { status: 200 });
    }

    // Execute all handlers
    const results = await Promise.allSettled(
      handlers.map(handler => handler(event))
    );

    // Check for failures
    const failures = results.filter(r => r.status === 'rejected');
    if (failures.length > 0) {
      console.error(`[events] ${failures.length}/${results.length} handlers failed for ${eventType}:`, failures);
      // Return 500 so QStash retries
      return NextResponse.json({ 
        error: 'Handler failures', 
        failures: failures.map(f => (f as PromiseRejectedResult).reason) 
      }, { status: 500 });
    }

    // Mark as processed
    await markEventProcessed(eventType, correlationId, hashPayload(event.payload));

    console.log(`[events] Successfully processed ${eventType} (${correlationId}) — ${handlers.length} handlers`);
    return NextResponse.json({ status: 'processed', handlers: handlers.length }, { status: 200 });

  } catch (error) {
    console.error('[events] Consumer error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
