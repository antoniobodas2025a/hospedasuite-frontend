/**
 * OTA Connections API — Channel Manager
 *
 * POST /api/ota/connections — Connect a new OTA (with plan limit validation)
 * GET  /api/ota/connections?hotelId=xxx — List active connections
 * DELETE /api/ota/connections?id=xxx — Disconnect an OTA
 *
 * Plan Limits (from saas-plans.ts):
 * - Starter: 0 OTAs (Link Directo only)
 * - Pro: 3 OTAs max
 * - Enterprise: 6 OTAs max
 */

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { PLAN_LIMITS, normalizePlan, PlanKey } from '@/config/saas-plans';

// ─── Supabase Admin Client ───────────────────────────────────────
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ─── Types ───────────────────────────────────────────────────────
interface ConnectRequest {
  hotelId: string;
  otaName: string; // 'booking.com', 'airbnb', 'expedia', etc.
  icalImportUrl: string;
  icalExportUrl?: string;
  roomId?: string; // Optional: specific room, or null for hotel-wide
}

// ─── POST: Connect a new OTA ─────────────────────────────────────
export async function POST(req: Request) {
  try {
    const supabase = getAdminClient();
    const body: ConnectRequest = await req.json();
    const { hotelId, otaName, icalImportUrl, icalExportUrl, roomId } = body;

    if (!hotelId || !otaName || !icalImportUrl) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: hotelId, otaName, icalImportUrl' },
        { status: 400 }
      );
    }

    // ─── Step 1: Get hotel plan ──────────────────────────────────
    const { data: hotel, error: hotelError } = await supabase
      .from('hotels')
      .select('id, name, subscription_plan, subscription_status')
      .eq('id', hotelId)
      .single();

    if (hotelError || !hotel) {
      return NextResponse.json({ error: 'Hotel no encontrado' }, { status: 404 });
    }

    // ─── Step 2: Check plan limits ───────────────────────────────
    const plan = normalizePlan(hotel.subscription_plan);
    const limits = PLAN_LIMITS[plan];

    if (limits.maxOTAs === 0) {
      return NextResponse.json({
        error: `Tu plan ${plan} no incluye Channel Manager. Subí a Pro para conectar OTAs.`,
        upgradeRequired: true,
        currentPlan: plan,
        requiredPlan: 'pro',
        limit: limits.maxOTAs,
      }, { status: 403 });
    }

    // ─── Step 3: Count existing OTA connections ──────────────────
    const { count: existingCount, error: countError } = await supabase
      .from('rooms')
      .select('*', { count: 'exact', head: true })
      .eq('hotel_id', hotelId)
      .not('ical_import_url', 'is', null);

    if (countError) {
      console.error('[OTA] Error counting connections:', countError);
    }

    const currentCount = existingCount || 0;

    if (currentCount >= limits.maxOTAs) {
      return NextResponse.json({
        error: `Tu plan ${plan} permite hasta ${limits.maxOTAs} OTAs. Ya tenés ${currentCount} conectadas.`,
        limitExceeded: true,
        currentPlan: plan,
        currentCount,
        maxAllowed: limits.maxOTAs,
        upgradeTo: plan === 'pro' ? 'enterprise' : 'pro',
      }, { status: 403 });
    }

    // ─── Step 4: Check for duplicate connection ──────────────────
    const { data: existing, error: dupError } = await supabase
      .from('rooms')
      .select('id, name')
      .eq('hotel_id', hotelId)
      .eq('ical_import_url', icalImportUrl)
      .single();

    if (existing) {
      return NextResponse.json({
        error: `Esta URL de iCal ya está conectada a la habitación "${existing.name}".`,
        duplicate: true,
        existingRoomId: existing.id,
      }, { status: 409 });
    }

    // ─── Step 5: Update room with iCal URL ───────────────────────
    const updateQuery = supabase
      .from('rooms')
      .update({
        ical_import_url: icalImportUrl,
        ical_export_url: icalExportUrl || null,
        ical_sync_status: 'pending',
        last_ical_sync: null,
      });

    if (roomId) {
      updateQuery.eq('id', roomId);
    } else {
      // If no roomId specified, apply to first room without iCal
      updateQuery
        .eq('hotel_id', hotelId)
        .is('ical_import_url', null)
        .limit(1);
    }

    const { data: updated, error: updateError } = await updateQuery.select().single();

    if (updateError) {
      console.error('[OTA] Error updating room:', updateError);
      return NextResponse.json(
        { error: 'Error al conectar la OTA. Verificá que la habitación exista.' },
        { status: 500 }
      );
    }

    // ─── Step 6: Log the connection ──────────────────────────────
    const { supabaseAdmin } = await import('@/lib/supabase-admin');
    const { logAuditEvent } = await import('@/lib/audit-logger');

    await logAuditEvent({
      actor_type: 'api',
      actor_id: hotelId,
      action: 'ota_connected',
      entity_type: 'hotel',
      entity_id: hotelId,
      new_value: {
        ota_name: otaName,
        room_id: updated.id,
        plan: hotel.subscription_plan,
        ota_count: currentCount + 1,
        ota_limit: limits.maxOTAs,
      },
    });

    return NextResponse.json({
      success: true,
      message: `OTA ${otaName} conectada exitosamente.`,
      roomId: updated.id,
      roomName: updated.name,
      otaCount: currentCount + 1,
      otaLimit: limits.maxOTAs,
      plan: hotel.subscription_plan,
    }, { status: 200 });

  } catch (error: any) {
    console.error('[OTA] Error connecting OTA:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// ─── GET: List OTA connections for a hotel ───────────────────────
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const hotelId = searchParams.get('hotelId');

    if (!hotelId) {
      return NextResponse.json({ error: 'Falta hotelId' }, { status: 400 });
    }

    const supabase = getAdminClient();

    const { data: rooms, error } = await supabase
      .from('rooms')
      .select('id, name, ical_import_url, ical_export_url, ical_sync_status, last_ical_sync')
      .eq('hotel_id', hotelId)
      .not('ical_import_url', 'is', null);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get hotel plan info
    const { data: hotel } = await supabase
      .from('hotels')
      .select('subscription_plan')
      .eq('id', hotelId)
      .single();

    const plan = normalizePlan(hotel?.subscription_plan);
    const limits = PLAN_LIMITS[plan];

    const connections = (rooms || []).map(room => ({
      roomId: room.id,
      roomName: room.name,
      icalImportUrl: room.ical_import_url,
      icalExportUrl: room.ical_export_url,
      syncStatus: room.ical_sync_status,
      lastSync: room.last_ical_sync,
      otaName: detectOtaName(room.ical_import_url),
    }));

    return NextResponse.json({
      success: true,
      connections,
      count: connections.length,
      limit: limits.maxOTAs,
      plan,
      remaining: limits.maxOTAs - connections.length,
    }, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ─── DELETE: Disconnect an OTA ───────────────────────────────────
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const roomId = searchParams.get('roomId');

    if (!roomId) {
      return NextResponse.json({ error: 'Falta roomId' }, { status: 400 });
    }

    const supabase = getAdminClient();

    // Get room info before clearing
    const { data: room } = await supabase
      .from('rooms')
      .select('id, name, hotel_id, ical_import_url')
      .eq('id', roomId)
      .single();

    if (!room) {
      return NextResponse.json({ error: 'Habitación no encontrada' }, { status: 404 });
    }

    // Clear iCal URLs
    const { error } = await supabase
      .from('rooms')
      .update({
        ical_import_url: null,
        ical_export_url: null,
        ical_sync_status: null,
        last_ical_sync: null,
      })
      .eq('id', roomId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Audit log
    const { logAuditEvent } = await import('@/lib/audit-logger');
    await logAuditEvent({
      actor_type: 'api',
      actor_id: room.hotel_id,
      action: 'ota_disconnected',
      entity_type: 'hotel',
      entity_id: room.hotel_id,
      old_value: {
        room_id: room.id,
        room_name: room.name,
        ical_url: room.ical_import_url,
      },
    });

    return NextResponse.json({
      success: true,
      message: `OTA desconectada de "${room.name}".`,
      roomId: room.id,
    }, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ─── Helpers ─────────────────────────────────────────────────────

function detectOtaName(url: string): string {
  if (!url) return 'unknown';
  const lower = url.toLowerCase();
  if (lower.includes('booking.com')) return 'Booking.com';
  if (lower.includes('airbnb')) return 'Airbnb';
  if (lower.includes('expedia') || lower.includes('vrbo')) return 'Expedia/VRBO';
  if (lower.includes('homeaway')) return 'HomeAway';
  if (lower.includes('tripadvisor')) return 'TripAdvisor';
  return 'Other OTA';
}
