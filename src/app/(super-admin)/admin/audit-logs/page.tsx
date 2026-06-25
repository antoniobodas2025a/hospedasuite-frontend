import { supabaseAdmin } from '@/lib/supabase-admin';
import AuditLogsTable from './AuditLogsTable';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 50;

// ============================================================================
// Superadmin Audit Logs Page — Server Component
//
// Reads searchParams for filtering (actor_email, action, entity_type,
// date_from, date_to, page) and queries audit_logs via supabaseAdmin.
// Passes results + metadata to the interactive AuditLogsTable client component.
// ============================================================================

interface AuditLogRow {
  id: string;
  actor_type: string;
  actor_id: string | null;
  actor_email: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

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

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabaseAdmin
    .from('audit_logs')
    .select('*', { count: 'exact' });

  // Apply filters
  if (actorEmail) {
    query = query.ilike('actor_email', `%${actorEmail}%`);
  }
  if (action) {
    query = query.eq('action', action);
  }
  if (entityType) {
    query = query.eq('entity_type', entityType);
  }
  if (dateFrom) {
    query = query.gte('created_at', dateFrom);
  }
  if (dateTo) {
    // Include the full day by extending to end of day
    query = query.lte('created_at', dateTo + 'T23:59:59');
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to);

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  // Fetch distinct actions and entity_types for filter dropdowns
  const [{ data: actionsData }, { data: entityTypesData }] = await Promise.all([
    supabaseAdmin.from('audit_logs').select('action').order('action'),
    supabaseAdmin.from('audit_logs').select('entity_type').order('entity_type'),
  ]);

  const uniqueActions: string[] = [...new Set(((actionsData ?? []) as { action: string }[]).map((r) => r.action))];
  const uniqueEntityTypes: string[] = [...new Set(((entityTypesData ?? []) as { entity_type: string }[]).map((r) => r.entity_type))];

  return (
    <AuditLogsTable
      logs={(data as AuditLogRow[]) ?? []}
      totalPages={totalPages}
      currentPage={page}
      totalCount={count ?? 0}
      error={error?.message}
      filterActions={uniqueActions}
      filterEntityTypes={uniqueEntityTypes}
    />
  );
}
