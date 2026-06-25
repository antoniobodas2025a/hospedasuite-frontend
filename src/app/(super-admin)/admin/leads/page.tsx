import { supabaseAdmin } from '@/lib/supabase-admin';
import { getLeadsAction } from '@/app/actions/superadmin-leads';
import type { HotelOption } from '@/types/leads';
import LeadsTable from './LeadsTable';

export const dynamic = 'force-dynamic';

const DEFAULT_PAGE_SIZE = 50;
const MAX_HOTELS = 200;

// ============================================================================
// Superadmin Leads Page — Server Component
//
// Fetches initial leads (page 1) and hotel list for the assignment dropdown.
// Passes all data as props to the interactive LeadsTable client component.
// Replaces the previous read-only inline table.
// ============================================================================

export default async function LeadsPage() {
  // Fetch initial page of leads (server-side)
  const leadsResult = await getLeadsAction({
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
  });

  // Pre-fetch hotels for assignment dropdown
  const { data: hotelData, error: hotelError } = await supabaseAdmin
    .from('hotels')
    .select('id, name')
    .order('created_at', { ascending: false })
    .limit(MAX_HOTELS);

  const hotels: HotelOption[] = hotelError || !hotelData ? [] : hotelData;

  return (
    <LeadsTable
      initialLeads={leadsResult.leads}
      totalCount={leadsResult.total}
      initialPage={1}
      pageSize={DEFAULT_PAGE_SIZE}
      hotels={hotels}
    />
  );
}
