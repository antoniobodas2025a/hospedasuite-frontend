import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

/**
 * Cron Job: Manual Payment Lifecycle & Urgency
 * Runs every hour to check and update payment statuses.
 * 
 * Logic:
 * - Day 0: pending_approval (Active)
 * - Day 25: Warning banner
 * - Day 29: Urgent banner
 * - Day 30: past_due (Restricted)
 * - Day 31: Critical urgent banner
 * - Day 32: cancelled (Hidden)
 */
export async function GET(request: NextRequest) {
  // Verify cron secret if needed
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date();

  // 1. Find hotels pending approval
  const { data: pendingHotels, error } = await supabase
    .from('hotels')
    .select('id, subscription_status, trial_ends_at, status, name')
    .eq('subscription_status', 'pending_approval');

  if (error || !pendingHotels) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }

  let updated = 0;

  for (const hotel of pendingHotels) {
    if (!hotel.trial_ends_at) continue;

    const deadline = new Date(hotel.trial_ends_at);
    const daysUntilDeadline = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const daysOverdue = Math.ceil((now.getTime() - deadline.getTime()) / (1000 * 60 * 60 * 24));

    // Day 30: Deadline reached -> past_due
    if (daysUntilDeadline <= 0 && hotel.subscription_status === 'pending_approval') {
      await supabase
        .from('hotels')
        .update({ subscription_status: 'past_due' })
        .eq('id', hotel.id);
      updated++;
      continue;
    }

    // Day 32: 2 days overdue -> cancelled (hidden)
    if (daysOverdue >= 2) {
      await supabase
        .from('hotels')
        .update({ 
          subscription_status: 'cancelled',
          status: 'draft' // Hide from public
        })
        .eq('id', hotel.id);
      updated++;
    }
  }

  // 2. Check past_due hotels for Day 32 transition
  const { data: pastDueHotels } = await supabase
    .from('hotels')
    .select('id, trial_ends_at, status')
    .eq('subscription_status', 'past_due');

  if (pastDueHotels) {
    for (const hotel of pastDueHotels) {
      if (!hotel.trial_ends_at) continue;
      const deadline = new Date(hotel.trial_ends_at);
      const daysOverdue = Math.ceil((now.getTime() - deadline.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysOverdue >= 2 && hotel.status !== 'draft') {
        await supabase
          .from('hotels')
          .update({ 
            subscription_status: 'cancelled',
            status: 'draft'
          })
          .eq('id', hotel.id);
        updated++;
      }
    }
  }

  return NextResponse.json({ success: true, updated });
}

// Vercel Cron configuration
export const config = {
  runtime: 'edge',
};
