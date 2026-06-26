import { getSystemHealth } from '@/lib/health-checks';
import SystemHealthDashboard from './SystemHealthDashboard';

export const dynamic = 'force-dynamic';

/**
 * System Health Dashboard — server component.
 *
 * Fetches health data directly via health-checks lib functions
 * (no HTTP overhead) and passes the report to the client component
 * for rendering interactive status badges and tables.
 */
export default async function SystemHealthPage() {
  const health = await getSystemHealth();

  return <SystemHealthDashboard data={health} />;
}
