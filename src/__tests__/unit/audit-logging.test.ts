/**
 * audit-logger — Unit Tests
 *
 * Tests for logAuditEvent error resilience, entity_type union extension,
 * and old_value / new_value patterns per the superadmin audit logging spec.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Hoisted mocks ────────────────────────────────────────────────────────────
const { mockInsert, mockSupabaseAdmin } = vi.hoisted(() => {
  const insertFn = vi.fn();
  const chain: any = {
    insert: insertFn.mockReturnThis(),
    then: (resolve: any) => {
      const result = insertFn.mock.results[insertFn.mock.results.length - 1];
      const err = result?.value?.error ?? null;
      return Promise.resolve(resolve({ error: err }));
    },
  };

  return {
    mockInsert: insertFn,
    mockSupabaseAdmin: { from: vi.fn(() => chain) },
  };
});

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: mockSupabaseAdmin,
}));

import { logAuditEvent } from '@/lib/audit-logger';

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('logAuditEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // Error resilience
  // -------------------------------------------------------------------------

  it('does NOT throw when DB insert succeeds', async () => {
    mockInsert.mockReturnValue({ error: null });

    await expect(
      logAuditEvent({
        actor_type: 'user',
        action: 'test_action',
        entity_type: 'hotel',
        entity_id: 'hotel-123',
      }),
    ).resolves.toBeUndefined();
  });

  it('does NOT throw when DB insert returns an error', async () => {
    mockInsert.mockReturnValue({ error: { message: 'DB connection lost' } });

    await expect(
      logAuditEvent({
        actor_type: 'user',
        action: 'test_action',
        entity_type: 'hotel',
        entity_id: 'hotel-456',
      }),
    ).resolves.toBeUndefined();
  });

  it('does NOT throw when supabaseAdmin.from throws', async () => {
    mockInsert.mockImplementation(() => {
      throw new Error('Unexpected crash');
    });

    await expect(
      logAuditEvent({
        actor_type: 'user',
        action: 'test_action',
        entity_type: 'invoice',
        entity_id: 'inv-789',
      }),
    ).resolves.toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // Entity type union — compile-time verification via runtime call
  // -------------------------------------------------------------------------

  it('accepts "lead" as entity_type', async () => {
    mockInsert.mockReturnValue({ error: null });

    await expect(
      logAuditEvent({
        actor_type: 'user',
        action: 'lead_created',
        entity_type: 'lead',
        entity_id: 'lead-001',
        new_value: { business_name: 'Hotel Test' },
      }),
    ).resolves.toBeUndefined();
  });

  it('accepts "manual_payment" as entity_type', async () => {
    mockInsert.mockReturnValue({ error: null });

    await expect(
      logAuditEvent({
        actor_type: 'user',
        action: 'payment_approved',
        entity_type: 'manual_payment',
        entity_id: 'pay-001',
        old_value: { status: 'pending' },
        new_value: { status: 'approved' },
      }),
    ).resolves.toBeUndefined();
  });

  it('accepts "user" as entity_type', async () => {
    mockInsert.mockReturnValue({ error: null });

    await expect(
      logAuditEvent({
        actor_type: 'user',
        action: 'password_forced',
        entity_type: 'user',
        entity_id: 'usr-001',
        new_value: { password_changed: true },
      }),
    ).resolves.toBeUndefined();
  });

  it('still accepts existing entity types (hotel, invoice, subscription)', async () => {
    mockInsert.mockReturnValue({ error: null });

    await logAuditEvent({
      actor_type: 'system',
      action: 'invoice_generated',
      entity_type: 'invoice',
      entity_id: 'inv-100',
    });

    await logAuditEvent({
      actor_type: 'cron',
      action: 'subscription_renewed',
      entity_type: 'subscription',
      entity_id: 'sub-200',
    });

    expect(mockInsert).toHaveBeenCalledTimes(2);
  });

  // -------------------------------------------------------------------------
  // Old / new value patterns (spec scenarios)
  // -------------------------------------------------------------------------

  it('passes null old_value and populated new_value for creation events', async () => {
    mockInsert.mockReturnValue({ error: null });

    await logAuditEvent({
      actor_type: 'user',
      action: 'hotel_created',
      entity_type: 'hotel',
      entity_id: 'htl-new',
      old_value: null,
      new_value: { name: 'Nuevo Hotel', plan: 'pro' },
    });

    const insertCall = mockInsert.mock.calls[0][0];
    expect(insertCall.old_value).toBeNull();
    expect(insertCall.new_value).toEqual({ name: 'Nuevo Hotel', plan: 'pro' });
  });

  it('passes old_value snapshot and null new_value for deletion events', async () => {
    mockInsert.mockReturnValue({ error: null });

    await logAuditEvent({
      actor_type: 'user',
      action: 'hotel_deleted',
      entity_type: 'hotel',
      entity_id: 'htl-old',
      old_value: { name: 'Hotel Viejo', status: 'active' },
      new_value: null,
    });

    const insertCall = mockInsert.mock.calls[0][0];
    expect(insertCall.old_value).toEqual({ name: 'Hotel Viejo', status: 'active' });
    expect(insertCall.new_value).toBeNull();
  });

  it('passes both old_value and new_value for update events', async () => {
    mockInsert.mockReturnValue({ error: null });

    await logAuditEvent({
      actor_type: 'user',
      action: 'tenant_updated',
      entity_type: 'hotel',
      entity_id: 'htl-upd',
      old_value: { status: 'trialing' },
      new_value: { status: 'active' },
    });

    const insertCall = mockInsert.mock.calls[0][0];
    expect(insertCall.old_value).toEqual({ status: 'trialing' });
    expect(insertCall.new_value).toEqual({ status: 'active' });
  });

  // -------------------------------------------------------------------------
  // Actor / request context metadata
  // -------------------------------------------------------------------------

  it('passes actor metadata when provided', async () => {
    mockInsert.mockReturnValue({ error: null });

    await logAuditEvent({
      actor_type: 'user',
      actor_id: 'user-uuid-123',
      actor_email: 'admin@hospedasuite.com',
      action: 'god_mode_access',
      entity_type: 'user',
      entity_id: 'target@example.com',
      ip_address: '192.168.1.1',
      user_agent: 'Mozilla/5.0',
    });

    const insertCall = mockInsert.mock.calls[0][0];
    expect(insertCall.actor_id).toBe('user-uuid-123');
    expect(insertCall.actor_email).toBe('admin@hospedasuite.com');
    expect(insertCall.ip_address).toBe('192.168.1.1');
    expect(insertCall.user_agent).toBe('Mozilla/5.0');
  });

  it('passes null for optional fields when omitted', async () => {
    mockInsert.mockReturnValue({ error: null });

    await logAuditEvent({
      actor_type: 'webhook',
      action: 'payment_received',
      entity_type: 'invoice',
      entity_id: 'inv-minimal',
    });

    const insertCall = mockInsert.mock.calls[0][0];
    expect(insertCall.actor_id).toBeNull();
    expect(insertCall.actor_email).toBeNull();
    expect(insertCall.ip_address).toBeNull();
    expect(insertCall.user_agent).toBeNull();
    expect(insertCall.old_value).toBeNull();
    expect(insertCall.new_value).toBeNull();
  });
});
