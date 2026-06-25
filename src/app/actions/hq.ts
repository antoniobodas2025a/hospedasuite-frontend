'use server';

import { supabaseAdmin } from '@/lib/supabase-admin';
import { SAAS_PLANS, normalizePlan, PLAN_LABELS, type PlanKey } from '@/config/saas-plans';
import { isTrialActive, getEffectivePlanCost, type TrialHotel } from '@/lib/trial-check';
import { requireSuperAdmin } from '@/lib/auth-guards';

export interface HotelFinancialRecord {
  hotel_id: string;
  hotel_name: string;
  total_bookings: number;
  subscription_plan: string;
  subscription_fee: number;
  accumulated_fees: number;
  total_debt: number;
}

export async function getHQFinancialReportAction() {
  try {
    await requireSuperAdmin();

    const { data: hotels, error: hotelsError } = await supabaseAdmin
      .from('hotels')
      .select('id, name, subscription_plan');

    if (hotelsError) throw new Error(`Error leyendo Tenants: ${hotelsError.message}`);

    const now = new Date();
    const colTimeStr = now.toLocaleString("en-US", { timeZone: "America/Bogota" });
    const colTime = new Date(colTimeStr);
    const startOfMonth = new Date(colTime.getFullYear(), colTime.getMonth(), 1, 0, 0, 0);

    const { data: bookings, error: bookingsError } = await supabaseAdmin
      .from('bookings')
      .select('hotel_id, platform_fee')
      .neq('status', 'cancelled')
      .gte('created_at', startOfMonth.toISOString());

    if (bookingsError) throw new Error(`Error leyendo Ledger: ${bookingsError.message}`);

    let globalSaaS = 0;
    let globalCommissions = 0;

    const report: HotelFinancialRecord[] = hotels.map((hotel: any) => {
      const hotelBookings = bookings.filter((b: any) => b.hotel_id === hotel.id);
      
      const accumulatedFees = hotelBookings.reduce((sum: number, b: any) => sum + Number(b.platform_fee || 0), 0);
      
      // 🧪 Si está en trial, el plan cuesta $0
      const trialHotel: TrialHotel = {
        subscription_status: hotel.subscription_plan ? 'trialing' : null,
        subscription_plan: hotel.subscription_plan,
        trial_ends_at: null,
      };
      const subscriptionFee = getEffectivePlanCost(trialHotel);
      
      const totalDebt = accumulatedFees + subscriptionFee;

      globalSaaS += subscriptionFee;
      globalCommissions += accumulatedFees;

      const planKey = normalizePlan(hotel.subscription_plan);

      return {
        hotel_id: hotel.id,
        hotel_name: hotel.name,
        total_bookings: hotelBookings.length,
        subscription_plan: planKey,
        subscription_fee: subscriptionFee,
        accumulated_fees: accumulatedFees,
        total_debt: totalDebt
      };
    });

    report.sort((a, b) => b.total_debt - a.total_debt);

    return { 
      success: true, 
      report, 
      kpis: {
        totalHotels: hotels.length,
        globalSaaS,
        globalCommissions,
        grandTotalExpected: globalSaaS + globalCommissions
      }
    };

  } catch (error: any) {
    console.error('[SEC-OPS] Intento fallido o error en HQ:', error.message);
    return { success: false, error: error.message };
  }
}