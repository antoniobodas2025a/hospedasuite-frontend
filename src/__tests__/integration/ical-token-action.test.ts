// ============================================================================
// 🧪 Tests de Integración: regenerateIcalTokenAction
//
// Ejecuta contra SUPABASE REAL. Cada suite crea su propia data y la limpia.
// Verifica: generación de token, verificación de ownership, rechazo de room
// inválido o de otro hotel.
//
// Requiere .env.local con NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.
// Mock: getCurrentHotel (no podemos setear cookies en test de Node).
// ============================================================================

import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';

// ─── Mock getCurrentHotel ──────────────────────────────────────────────────
// Mockeamos el contexto de hotel para simular la sesión del usuario autenticado.
vi.mock('@/lib/hotel-context', () => ({
  getCurrentHotel: vi.fn(),
}));

// ─── Mock next/cache (revalidatePath es no-op en tests) ─────────────────────
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// Import después del mock para que tome los mocks
import { regenerateIcalTokenAction } from '@/app/actions/inventory';
import { getCurrentHotel } from '@/lib/hotel-context';
import type { Hotel } from '@/types';

// ─── Helpers ───────────────────────────────────────────────────────────────
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

function uid(): string {
  return crypto.randomUUID();
}

// ─── Suite ─────────────────────────────────────────────────────────────────
describe('regenerateIcalTokenAction', () => {
  const hotelId = uid();
  const ownerId = uid();
  const roomWithTokenId = uid();
  const roomWithoutTokenId = uid();
  const roomOtherHotelId = uid();
  const otherHotelId = uid();

  const originalToken = 'original-token-for-test';

  beforeAll(async () => {
    // 1. Crear hotel principal
    const { error: hErr } = await supabaseAdmin.from('hotels').insert({
      id: hotelId,
      name: 'Hotel iCal Test',
      email: 'ical-test@test.com',
      owner_id: ownerId,
      subscription_plan: 'test',
      status: 'active',
      location: 'Cali',
      slug: `ical-test-${hotelId.slice(0, 8)}`,
    });
    if (hErr) throw new Error(`Hotel: ${hErr.message}`);

    // 2. Crear otro hotel para probar ownership
    const { error: h2Err } = await supabaseAdmin.from('hotels').insert({
      id: otherHotelId,
      name: 'Other Hotel iCal Test',
      email: 'other-ical@test.com',
      owner_id: uid(),
      subscription_plan: 'test',
      status: 'active',
      location: 'Bogotá',
      slug: `other-ical-${otherHotelId.slice(0, 8)}`,
    });
    if (h2Err) throw new Error(`OtherHotel: ${h2Err.message}`);

    // 3. Room con token existente
    const { error: r1Err } = await supabaseAdmin.from('rooms').insert({
      id: roomWithTokenId,
      hotel_id: hotelId,
      name: 'Suite con Token',
      status: 'active',
      price: 200,
      ical_export_token: originalToken,
    });
    if (r1Err) throw new Error(`RoomWithToken: ${r1Err.message}`);

    // 4. Room sin token
    const { error: r2Err } = await supabaseAdmin.from('rooms').insert({
      id: roomWithoutTokenId,
      hotel_id: hotelId,
      name: 'Suite sin Token',
      status: 'active',
      price: 150,
    });
    if (r2Err) throw new Error(`RoomWithoutToken: ${r2Err.message}`);

    // 5. Room de otro hotel
    const { error: r3Err } = await supabaseAdmin.from('rooms').insert({
      id: roomOtherHotelId,
      hotel_id: otherHotelId,
      name: 'Suite Another Hotel',
      status: 'active',
      price: 300,
    });
    if (r3Err) throw new Error(`RoomOtherHotel: ${r3Err.message}`);
  });

  afterAll(async () => {
    // Cleanup en orden (FK constraints)
    await supabaseAdmin.from('rooms').delete().eq('id', roomWithTokenId);
    await supabaseAdmin.from('rooms').delete().eq('id', roomWithoutTokenId);
    await supabaseAdmin.from('rooms').delete().eq('id', roomOtherHotelId);
    await supabaseAdmin.from('hotels').delete().eq('id', hotelId);
    await supabaseAdmin.from('hotels').delete().eq('id', otherHotelId);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('✅ regenera token para room que YA tiene uno → nuevo token distinto', async () => {
    vi.mocked(getCurrentHotel).mockResolvedValue({ id: hotelId } as Hotel);

    const result = await regenerateIcalTokenAction(roomWithTokenId);

    expect(result.success).toBe(true);
    expect(result.token).toBeTruthy();
    expect(result.token).not.toBe(originalToken);

    // Verificar que el token se persistió en la DB
    const { data: room } = await supabaseAdmin
      .from('rooms')
      .select('ical_export_token')
      .eq('id', roomWithTokenId)
      .single();

    expect(room?.ical_export_token).toBe(result.token);
  });

  it('✅ genera token para room que NO tiene token → asigna nuevo token', async () => {
    vi.mocked(getCurrentHotel).mockResolvedValue({ id: hotelId } as Hotel);

    const result = await regenerateIcalTokenAction(roomWithoutTokenId);

    expect(result.success).toBe(true);
    expect(result.token).toBeTruthy();
    expect(result.token?.length).toBeGreaterThan(10);

    // Verificar persistencia
    const { data: room } = await supabaseAdmin
      .from('rooms')
      .select('ical_export_token')
      .eq('id', roomWithoutTokenId)
      .single();

    expect(room?.ical_export_token).toBe(result.token);
  });

  it('🛡️ rechaza room de OTRO hotel (SEC_VIOLATION)', async () => {
    vi.mocked(getCurrentHotel).mockResolvedValue({ id: hotelId } as Hotel);

    const result = await regenerateIcalTokenAction(roomOtherHotelId);

    expect(result.success).toBe(false);
    expect(result.error).toContain('SEC_VIOLATION');
    expect(result.token).toBeUndefined();

    // Verificar que la room sigue perteneciendo al otro hotel (no se movió)
    const { data: room } = await supabaseAdmin
      .from('rooms')
      .select('hotel_id')
      .eq('id', roomOtherHotelId)
      .single();

    // Sigue siendo del otro hotel (no hubo modificación de ownership)
    expect(room?.hotel_id).toBe(otherHotelId);
  });

  it('🛡️ rechaza roomId inexistente', async () => {
    vi.mocked(getCurrentHotel).mockResolvedValue({ id: hotelId } as Hotel);

    const result = await regenerateIcalTokenAction('00000000-0000-0000-0000-000000000000');

    expect(result.success).toBe(false);
    expect(result.error).toContain('SEC_VIOLATION');
  });

  it('🛡️ rechaza roomId vacío o inválido', async () => {
    vi.mocked(getCurrentHotel).mockResolvedValue({ id: hotelId } as Hotel);

    const result = await regenerateIcalTokenAction('');

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
