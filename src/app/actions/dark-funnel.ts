import { supabaseAdmin } from '@/lib/supabase-admin';

export interface DarkFunnelMetrics {
  totalLeads: number;
  aiReferrals: {
    total: number;
    chatgpt: number;
    perplexity: number;
  };
  trendIntercepts: number;
  topCities: { city: string; leads: number }[];
  recentLeads: {
    id: string;
    email: string;
    city: string;
    attack_line: string;
    created_at: string;
  }[];
}

/**
 * Fetches dark funnel metrics from Supabase.
 * Currently aggregates from hunted_leads and bookings tables.
 * Once dark_funnel_events table is created, this will query it directly.
 */
export async function getDarkFunnelMetrics(): Promise<{ success: boolean; data?: DarkFunnelMetrics; error?: string }> {
  try {
    // 1. Fetch leads from hunted_leads table
    const { data: leads, error: leadsError } = await supabaseAdmin
      .from('hunted_leads')
      .select('id, email, city, attack_line, created_at')
      .order('created_at', { ascending: false })
      .limit(50);

    if (leadsError) {
      // Table might not exist yet, return zeros
      return {
        success: true,
        data: {
          totalLeads: 0,
          aiReferrals: { total: 0, chatgpt: 0, perplexity: 0 },
          trendIntercepts: 0,
          topCities: [],
          recentLeads: [],
        },
      };
    }

    // 2. Aggregate metrics
    const totalLeads = leads?.length || 0;
    const cityCounts: Record<string, number> = {};
    leads?.forEach((lead: any) => {
      const city = lead.city || 'Desconocida';
      cityCounts[city] = (cityCounts[city] || 0) + 1;
    });

    const topCities = Object.entries(cityCounts)
      .map(([city, leads]) => ({ city, leads }))
      .sort((a, b) => b.leads - a.leads)
      .slice(0, 5);

    const recentLeads = (leads || []).slice(0, 10).map((lead: any) => ({
      id: lead.id,
      email: lead.email || '',
      city: lead.city || 'Desconocida',
      attack_line: lead.attack_line || 'N/A',
      created_at: lead.created_at || new Date().toISOString(),
    }));

    // 3. AI Referrals & Trend Intercepts (currently tracked client-side, will be server-side later)
    // For now, we return structured zeros until the dark_funnel_events table is created.
    // In production, these would be queried from the events table.
    const aiReferrals = { total: 0, chatgpt: 0, perplexity: 0 };
    const trendIntercepts = 0;

    return {
      success: true,
      data: {
        totalLeads,
        aiReferrals,
        trendIntercepts,
        topCities,
        recentLeads,
      },
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error fetching metrics',
    };
  }
}
