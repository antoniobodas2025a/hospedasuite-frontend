export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth-guards';
import { getSystemHealth } from '@/lib/health-checks';

/**
 * GET /api/admin/health
 *
 * Returns aggregated system health for all monitored subsystems:
 * database, events, webhooks, cron, and storage.
 *
 * Protected: requires superadmin role.
 * Target latency: <500ms (all checks run in parallel via Promise.all).
 */
export async function GET() {
  try {
    await requireSuperAdmin();
  } catch (err: any) {
    const message = err?.message ?? 'Unauthorized';
    if (message.includes('No autenticado')) {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 403 });
  }

  try {
    const health = await getSystemHealth();
    return NextResponse.json(health, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Health check failed', detail: err?.message ?? 'Unknown error' },
      { status: 500 }
    );
  }
}
