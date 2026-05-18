import { AnyEvent } from '@/lib/event-types';
import { registerHandler } from '@/lib/event-handlers';
import { Client } from '@upstash/qstash';

export async function handleOtaSync(event: AnyEvent): Promise<void> {
  if (event.type !== 'ota.sync.requested') return;

  const { hotelId, roomId } = event.payload as { hotelId: string; roomId?: string };
  
  const qstash = new Client({ token: process.env.QSTASH_TOKEN! });
  
  await qstash.publishJSON({
    url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/webhooks/qstash/sync-hotel`,
    body: { hotelId, roomId },
  });
  
  console.log(`[ota-sync] Triggered sync for hotel ${hotelId}`);
}

registerHandler('ota.sync.requested', handleOtaSync);
