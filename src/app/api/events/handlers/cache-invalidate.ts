import { revalidatePath, revalidateTag } from 'next/cache';
import { registerHandler } from '@/lib/event-handlers';

// This handler processes cache.invalidate events
// Note: cache.invalidate is NOT in the 21 schemas, so we handle it separately
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function handleCacheInvalidate(event: any): Promise<void> {
  const { paths = [], tags = [] } = event.payload as { paths?: string[]; tags?: string[] };

  for (const path of paths) {
    revalidatePath(path);
    console.log(`[cache] revalidatePath: ${path}`);
  }

  for (const tag of tags) {
    revalidateTag(tag, 'max');
    console.log(`[cache] revalidateTag: ${tag}`);
  }
}

// Register handler
registerHandler('cache.invalidate' as any, handleCacheInvalidate);
