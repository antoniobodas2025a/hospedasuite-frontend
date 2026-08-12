import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================================================
// createPublicLeadAction — Regression tests
//
// Freeze the fix for the broken public lead form:
//   1. The action must succeed for a visitor with NO staff session (no tenant guard).
//   2. The insert uses `status: 'new'` and the `Lead: <email>` sentinel.
//   3. Validation rejects invalid email before touching the DB.
// ============================================================================

const { mockInsert, mockPushKlaviyo } = vi.hoisted(() => ({
  mockInsert: vi.fn(),
  mockPushKlaviyo: vi.fn(),
}));

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({ insert: mockInsert })),
  },
}));

vi.mock('@/lib/klaviyo-mcp', () => ({
  pushToKlaviyoMcp: mockPushKlaviyo,
}));

import { createPublicLeadAction } from '@/app/actions/public-lead';

describe('createPublicLeadAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPushKlaviyo.mockResolvedValue(undefined);
  });

  it('returns success for a lead without a staff session (no tenant guard)', async () => {
    mockInsert.mockResolvedValue({ error: null });

    const result = await createPublicLeadAction({
      email: 'maria@test.com',
      phone: '+57 300 123',
      plan_interest: 'pro',
      room_count: 2,
    });

    expect(result.success).toBe(true);
  });

  it('inserts with status "new" and the "Lead: <email>" sentinel', async () => {
    mockInsert.mockResolvedValue({ error: null });

    await createPublicLeadAction({
      email: 'maria@test.com',
      phone: '+57 300 123',
      plan_interest: 'pro',
      room_count: 2,
    });

    expect(mockInsert).toHaveBeenCalledWith([
      expect.objectContaining({
        business_name: 'Lead: maria@test.com',
        phone: '+57 300 123',
        status: 'new',
      }),
    ]);
  });

  it('rejects invalid email without hitting the DB', async () => {
    const result = await createPublicLeadAction({
      email: 'not-an-email',
      phone: '+57 300 123',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Email inválido');
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('propagates the DB error message', async () => {
    mockInsert.mockResolvedValue({ error: { message: 'DB down' } });

    const result = await createPublicLeadAction({
      email: 'maria@test.com',
      phone: '+57 300 123',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('DB down');
  });
});
