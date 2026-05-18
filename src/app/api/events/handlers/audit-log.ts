import { AnyEvent } from '@/lib/event-types';
import { registerHandler } from '@/lib/event-handlers';
import { createClient } from '@/utils/supabase/server';

export async function handleAuditLog(event: AnyEvent): Promise<void> {
  const supabase = await createClient();
  
  await supabase.from('audit_log').insert({
    event_type: event.type,
    correlation_id: event.metadata.correlationId,
    hotel_id: event.metadata.hotelId || null,
    payload: event.payload,
    source: event.metadata.source,
    created_at: event.metadata.timestamp,
  });
}

registerHandler('booking.created', handleAuditLog);
registerHandler('booking.updated', handleAuditLog);
registerHandler('booking.cancelled', handleAuditLog);
registerHandler('booking.status_changed', handleAuditLog);
registerHandler('payment.received', handleAuditLog);
registerHandler('payment.approved', handleAuditLog);
registerHandler('payment.declined', handleAuditLog);
registerHandler('room.status_changed', handleAuditLog);
registerHandler('room.created', handleAuditLog);
registerHandler('room.updated', handleAuditLog);
registerHandler('room.deleted', handleAuditLog);
registerHandler('guest.created', handleAuditLog);
registerHandler('guest.updated', handleAuditLog);
registerHandler('guest.deleted', handleAuditLog);
