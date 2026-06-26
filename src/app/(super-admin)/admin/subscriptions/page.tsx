import { getSubscriptionsAction } from '@/app/actions/super-admin';
import type { PlanKey } from '@/config/saas-plans';
import SubscriptionsTable from './SubscriptionsTable';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 50;

// ============================================================================
// Superadmin Subscriptions Page — Server Component
//
// Fetches initial subscriptions page (page 1, no filters) and passes them
// to the interactive SubscriptionsTable client component. The table handles
// all subsequent filtering, pagination, and row actions client-side.
// ============================================================================

export default async function SubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;

  const status = typeof params.status === 'string' ? params.status : undefined;
  const planKey = typeof params.plan === 'string' ? params.plan : undefined;
  const search = typeof params.search === 'string' ? params.search : undefined;
  const page = typeof params.page === 'string' ? parseInt(params.page, 10) || 1 : 1;

  const result = await getSubscriptionsAction({
    status,
    planKey: planKey as PlanKey | undefined,
    search,
    page,
    pageSize: PAGE_SIZE,
  });

  return (
    <SubscriptionsTable
      initialSubscriptions={result.subscriptions}
      total={result.total}
      pageSize={PAGE_SIZE}
    />
  );
}
