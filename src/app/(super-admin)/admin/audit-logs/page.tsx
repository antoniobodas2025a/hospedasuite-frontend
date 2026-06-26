import { getAuditLogs, getAuditLogFilterOptions } from '@/data/superadmin';
import AuditLogsTable from './AuditLogsTable';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 50;

// ============================================================================
// Superadmin Audit Logs Page — Server Component
//
// Reads searchParams for filtering (actor_email, action, entity_type,
// date_from, date_to, page) and queries audit_logs via DAL.
// Passes results + metadata to the interactive AuditLogsTable client component.
// ============================================================================

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;

  const actorEmail = typeof params.actor_email === 'string' ? params.actor_email : '';
  const action = typeof params.action === 'string' ? params.action : '';
  const entityType = typeof params.entity_type === 'string' ? params.entity_type : '';
  const dateFrom = typeof params.date_from === 'string' ? params.date_from : '';
  const dateTo = typeof params.date_to === 'string' ? params.date_to : '';
  const page = typeof params.page === 'string' ? parseInt(params.page, 10) || 1 : 1;

  const [{ logs, total }, { actions, entityTypes }] = await Promise.all([
    getAuditLogs({
      actorEmail: actorEmail || undefined,
      action: action || undefined,
      entityType: entityType || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      page,
      pageSize: PAGE_SIZE,
    }),
    getAuditLogFilterOptions(),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <AuditLogsTable
      logs={logs}
      totalPages={totalPages}
      currentPage={page}
      totalCount={total}
      filterActions={actions}
      filterEntityTypes={entityTypes}
    />
  );
}
