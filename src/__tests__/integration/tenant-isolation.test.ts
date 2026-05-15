// ============================================================================
// 🔒 Tests de Integración: Aislamiento de Tenant (Tenant Isolation)
//
// Verifica que un hotel NUNCA pueda ver datos de otro hotel.
// Si este test falla, hay un data leak crítico.
// ============================================================================

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { tenantQuery } from '@/lib/tenant-guard';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

function uid(): string {
  return crypto.randomUUID();
}

describe('Tenant Isolation — un hotel nunca ve datos de otro', () => {
  const hotelA = { id: uid(), name: 'Hotel A', email: 'a@test.com', location: 'Test', subscription_plan: 'starter', status: 'active', slug: `hotel-a-${uid().slice(0, 8)}` };
  const hotelB = { id: uid(), name: 'Hotel B', email: 'b@test.com', location: 'Test', subscription_plan: 'starter', status: 'active', slug: `hotel-b-${uid().slice(0, 8)}` };
  
  const roomA = uid();
  const roomB = uid();
  const guestA = uid();
  const guestB = uid();

  beforeAll(async () => {
    // Crear hoteles
    await supabaseAdmin.from('hotels').insert([
      { ...hotelA, owner_id: uid() },
      { ...hotelB, owner_id: uid() },
    ]);

    // Crear habitaciones para cada hotel
    await supabaseAdmin.from('rooms').insert([
      { id: roomA, hotel_id: hotelA.id, name: 'Room A1', status: 'available', price: 100 },
      { id: roomB, hotel_id: hotelB.id, name: 'Room B1', status: 'available', price: 200 },
    ]);

    // Crear huéspedes para cada hotel
    await supabaseAdmin.from('guests').insert([
      { id: guestA, hotel_id: hotelA.id, full_name: 'Guest A', doc_type: 'CC', doc_number: `A-${uid().slice(0, 8)}` },
      { id: guestB, hotel_id: hotelB.id, full_name: 'Guest B', doc_type: 'CC', doc_number: `B-${uid().slice(0, 8)}` },
    ]);
  });

  afterAll(async () => {
    // Cleanup en orden inverso
    await supabaseAdmin.from('guests').delete().in('id', [guestA, guestB]);
    await supabaseAdmin.from('rooms').delete().in('id', [roomA, roomB]);
    await supabaseAdmin.from('hotels').delete().in('id', [hotelA.id, hotelB.id]);
  });

  it('🔒 Hotel A NO puede ver habitaciones de Hotel B', async () => {
    // Query directa con tenantQuery
    const { data, error } = await tenantQuery(supabaseAdmin.from('rooms').select('id, name'), hotelA.id);
    
    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data).toHaveLength(1);
    expect(data![0].id).toBe(roomA);
    expect(data![0].name).toBe('Room A1');
  });

  it('🔒 Hotel B NO puede ver habitaciones de Hotel A', async () => {
    const { data, error } = await tenantQuery(supabaseAdmin.from('rooms').select('id, name'), hotelB.id);
    
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0].id).toBe(roomB);
    expect(data![0].name).toBe('Room B1');
  });

  it('🔒 Hotel A NO puede ver huéspedes de Hotel B', async () => {
    const { data, error } = await tenantQuery(supabaseAdmin.from('guests').select('id, full_name'), hotelA.id);
    
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0].id).toBe(guestA);
  });

  it('🔒 Query sin tenantQuery retorna TODOS los datos (peligro)', async () => {
    // Esta query demuestra POR QUÉ necesitamos tenantQuery
    const { data, error } = await supabaseAdmin.from('rooms').select('id, hotel_id');
    
    expect(error).toBeNull();
    // Debería haber al menos 2 habitaciones (las de este test + otras existentes)
    expect(data!.length).toBeGreaterThanOrEqual(2);
    
    // Pero si usamos tenantQuery, solo vemos 1
    const { data: filtered } = await tenantQuery(supabaseAdmin.from('rooms').select('id'), hotelA.id);
    expect(filtered).toHaveLength(1);
  });
});
