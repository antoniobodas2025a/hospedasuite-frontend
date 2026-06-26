import { supabaseAdmin } from '@/lib/supabase-admin';
import { getFeatureFlagsAction } from '@/app/actions/superadmin-feature-flags';
import FeatureFlagsTable from './FeatureFlagsTable';

export const dynamic = 'force-dynamic';

const MAX_HOTELS = 200;

// ============================================================================
// Superadmin Feature Flags Page — Server Component
//
// Fetches all feature flags and hotel list for the scope filter dropdown.
// Passes data as props to the interactive FeatureFlagsTable client component.
// Mirrors admin/leads/page.tsx pattern.
// ============================================================================

export default async function FeatureFlagsPage() {
  // Fetch all feature flags (server-side)
  const flags = await getFeatureFlagsAction();

  // Pre-fetch hotels for hotel_id scope display
  const { data: hotelData, error: hotelError } = await supabaseAdmin
    .from('hotels')
    .select('id, name')
    .order('created_at', { ascending: false })
    .limit(MAX_HOTELS);

  const hotels = hotelError || !hotelData ? [] : hotelData;

  return (
    <FeatureFlagsTable
      initialFlags={flags}
      hotels={hotels}
    />
  );
}
